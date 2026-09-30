import { useCallback, useRef, useState } from "react";
import { getAllConversations, saveConversation, saveMessage } from "@/lib/db";
import type {
  Conversation,
  Message,
  MessageExecutionMetrics,
  MessageHttpMetadata,
  MessageRequestMetadata,
} from "@/lib/db";
import { buildRequestPayload, streamChat } from "@/lib/stream";
import type { SseRawEvent } from "@/lib/stream";
import type { EndpointDef, VendorId } from "@/lib/vendors";

type StreamMetrics = {
  startTime: number;
  ttft: number;
  inputTokenCount: number;
  tokenCount: number;
  rawEvents: SseRawEvent[];
  requestPayload: string;
  requestMetadata?: MessageRequestMetadata;
  httpMetadata?: MessageHttpMetadata;
  responseStartTime?: number;
};

const estimateTokens = (text: string): number => Math.ceil(text.split(/\s+/).length * 1.3);

type UseStreamingArgs = {
  readonly model: string;
  readonly vendor: VendorId;
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly endpoint: EndpointDef;
  readonly messages: readonly Message[];
  readonly conversations: readonly Conversation[];
  readonly activeConvIdRef: React.RefObject<string | null>;
  readonly setMessages: React.Dispatch<React.SetStateAction<readonly Message[]>>;
  readonly setConversations: React.Dispatch<React.SetStateAction<readonly Conversation[]>>;
  readonly setActiveConvId: React.Dispatch<React.SetStateAction<string | null>>;
  readonly setSelectedMessageId: React.Dispatch<React.SetStateAction<string | null>>;
};

export type UseStreamingReturn = {
  readonly isStreaming: boolean;
  readonly streamingContent: string;
  readonly streamError: string | null;
  readonly handleSendMessage: (content: string) => Promise<void>;
  readonly clearStream: () => void;
  readonly dismissError: () => void;
};

export const useStreaming = ({
  model,
  vendor,
  baseUrl,
  apiKey,
  endpoint,
  messages,
  conversations,
  activeConvIdRef,
  setMessages,
  setConversations,
  setActiveConvId,
  setSelectedMessageId,
}: UseStreamingArgs): UseStreamingReturn => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [streamError, setStreamError] = useState<string | null>(null);

  const metricsRef = useRef<StreamMetrics>({
    startTime: 0,
    ttft: 0,
    inputTokenCount: 0,
    tokenCount: 0,
    rawEvents: [],
    requestPayload: "",
  });

  const clearStream = useCallback(() => {
    setStreamingContent("");
  }, []);

  const dismissError = useCallback(() => setStreamError(null), []);

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!model || isStreaming) return;

      const newConvId =
        activeConvIdRef.current ?? `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      const isFirstMessage = activeConvIdRef.current === null;
      if (isFirstMessage) {
        const conv: Conversation = {
          id: newConvId,
          title: content.slice(0, 52) + (content.length > 52 ? "…" : ""),
          vendor,
          model,
          updatedAt: Date.now(),
        };
        setActiveConvId(newConvId);
        activeConvIdRef.current = newConvId;
        await saveConversation(conv);
        setConversations(await getAllConversations());
      } else {
        const conv: Conversation = {
          id: newConvId,
          title: conversations.find((c) => c.id === newConvId)?.title ?? content.slice(0, 52),
          vendor,
          model,
          updatedAt: Date.now(),
        };
        await saveConversation(conv);
        setConversations(await getAllConversations());
      }

      const userMsg: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        conversationId: newConvId,
        role: "user",
        content,
        timestamp: Date.now(),
        requestPayload: JSON.stringify({
          vendor,
          model,
          timestamp: Date.now(),
          userInput: content,
        }),
      };

      setMessages((prev) => [...prev, userMsg]);
      await saveMessage(userMsg);

      const historyForStream = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const requestPayloadStr = buildRequestPayload({
        payloadFormat: endpoint.payloadFormat,
        model,
        messages: historyForStream,
      });

      metricsRef.current = {
        startTime: Date.now(),
        ttft: 0,
        inputTokenCount: historyForStream.reduce((sum, m) => sum + estimateTokens(m.content), 0),
        tokenCount: 0,
        rawEvents: [],
        requestPayload: requestPayloadStr,
      };

      setIsStreaming(true);
      setStreamingContent("");
      setStreamError(null);

      // Local accumulator — single source of truth during streaming (F-005 fix)
      let accumulated = "";

      await streamChat({
        vendor,
        baseUrl,
        apiKey,
        model,
        endpointPath: endpoint.path,
        payloadFormat: endpoint.payloadFormat,
        messages: historyForStream,
        callbacks: {
          onChunk: (chunk) => {
            accumulated += chunk;
            setStreamingContent((prev) => prev + chunk);
            metricsRef.current.tokenCount += estimateTokens(chunk);
          },
          onRawEvent: (event) => {
            metricsRef.current.rawEvents.push(event);
          },
          onFirstToken: (ttft) => {
            metricsRef.current.ttft = ttft;
            metricsRef.current.responseStartTime = Date.now();
          },
          onRequestMetadata: (metadata) => {
            metricsRef.current.requestMetadata = metadata as MessageRequestMetadata;
          },
          onHttpMetadata: (metadata) => {
            metricsRef.current.httpMetadata = metadata as MessageHttpMetadata;
          },
          onTokenCount: (totalTokens) => {
            metricsRef.current.tokenCount = totalTokens;
          },
          onUsage: (usage) => {
            if (usage.inputTokens !== undefined)
              metricsRef.current.inputTokenCount = usage.inputTokens;
            if (usage.outputTokens !== undefined)
              metricsRef.current.tokenCount = usage.outputTokens;
          },
          onComplete: async (totalDuration) => {
            const m = metricsRef.current;
            const elapsedSeconds = (totalDuration - m.ttft) / 1000;
            const metrics: MessageExecutionMetrics = {
              ttft: m.ttft,
              inputTokens: m.inputTokenCount,
              tokensGenerated: m.tokenCount,
              totalTokens: m.inputTokenCount + m.tokenCount,
              tokensPerSecond: elapsedSeconds > 0 ? m.tokenCount / elapsedSeconds : 0,
              totalDuration,
              latencyBreakdown: m.responseStartTime
                ? { networkLatency: m.ttft, processingTime: totalDuration - m.ttft }
                : undefined,
            };

            const convIdNow = activeConvIdRef.current ?? newConvId;
            const assistantMsg: Message = {
              id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              conversationId: convIdNow,
              role: "assistant",
              content: accumulated,
              timestamp: Date.now(),
              requestPayload: m.requestPayload,
              requestMetadata: m.requestMetadata,
              rawResponse: JSON.stringify(m.rawEvents),
              httpMetadata: m.httpMetadata,
              metrics,
            };

            setMessages((prev) => [...prev, assistantMsg]);
            setIsStreaming(false);
            setStreamingContent("");
            setSelectedMessageId(assistantMsg.id);

            try {
              await saveMessage(assistantMsg);
            } catch (e) {
              console.error(e);
            }
          },
          onError: (error) => {
            console.error("Stream error:", error);
            setIsStreaming(false);
            setStreamingContent("");
            setStreamError(error instanceof Error ? error.message : "Stream failed");
          },
        },
      });
    },
    [
      model,
      isStreaming,
      vendor,
      baseUrl,
      apiKey,
      endpoint,
      messages,
      conversations,
      activeConvIdRef,
      setMessages,
      setConversations,
      setActiveConvId,
      setSelectedMessageId,
    ],
  );

  return {
    isStreaming,
    streamingContent,
    streamError,
    handleSendMessage,
    clearStream,
    dismissError,
  };
};
