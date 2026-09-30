import type { PayloadFormat, VendorId } from "@/lib/vendors";
import {
  STREAM_DEFAULTS,
  buildRequestPayload,
  type StreamableMessage,
  type UsageData,
} from "@/lib/buildPayload";
import { parseAnthropicLine, parseAnthropicUsage } from "@/lib/parseAnthropicStream";
import {
  parseOpenAIChatUsage,
  parseOpenAILine,
  parseOpenAIResponsesLine,
  parseOpenAIResponsesUsage,
} from "@/lib/parseOpenAiStream";

export type { RequestPayloadArgs, StreamableMessage, UsageData } from "@/lib/buildPayload";
export { buildRequestPayload } from "@/lib/buildPayload";

export type RequestMetadataCallbackArgs = {
  readonly endpoint: string;
  readonly headers: readonly { readonly name: string; readonly value: string }[];
  readonly host: string;
  readonly method: string;
};

export type HttpMetadataCallbackArgs = {
  readonly status: number;
  readonly statusText: string;
  readonly responseTime: number;
  readonly headers?: readonly { readonly name: string; readonly value: string }[];
};

export type SseRawEvent = {
  readonly event?: string;
  readonly data: unknown;
};

export type StreamCallbacks = {
  readonly onChunk: (content: string) => void;
  readonly onFirstToken: (ttft: number) => void;
  readonly onRequestMetadata?: (metadata: RequestMetadataCallbackArgs) => void;
  readonly onHttpMetadata?: (metadata: HttpMetadataCallbackArgs) => void;
  readonly onTokenCount?: (count: number) => void;
  readonly onUsage?: (usage: UsageData) => void;
  readonly onRawEvent?: (event: SseRawEvent) => void;
  readonly onComplete: (totalDuration: number) => void | Promise<void>;
  readonly onError: (error: Error) => void;
};

export type StreamArgs = {
  readonly vendor: VendorId;
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly model: string;
  readonly endpointPath: string;
  readonly payloadFormat: PayloadFormat;
  readonly messages: readonly StreamableMessage[];
  readonly callbacks: StreamCallbacks;
};

type ParsedEventResult = {
  readonly content: string;
  readonly usage: UsageData | null;
};

const extractJsonContent = (json: Record<string, unknown>, format: PayloadFormat): string => {
  if (format === "openai-responses") {
    const output = json.output as readonly Record<string, unknown>[] | undefined;
    return (
      output
        ?.flatMap((item) => {
          const content = item.content as readonly Record<string, unknown>[] | undefined;
          return content?.map((c) => (c.type === "output_text" ? (c.text as string) : "")) ?? [];
        })
        .join("") ?? ""
    );
  }
  if (format === "openai-chat") {
    const choices = json.choices as readonly Record<string, unknown>[] | undefined;
    const message = choices?.[0]?.message as Record<string, unknown> | undefined;
    return typeof message?.content === "string" ? message.content : "";
  }
  // anthropic
  const content = json.content as readonly Record<string, unknown>[] | undefined;
  return (content?.find((c) => c.type === "text")?.text as string | undefined) ?? "";
};

const estimateTokensFromChunk = (chunk: string): number => {
  const wordCount = chunk.split(/\s+/).filter((word) => word.length > 0).length;
  return Math.ceil(wordCount * 1.3);
};

const parseEventByFormat = (dataLine: string, format: PayloadFormat): ParsedEventResult => {
  if (format === "anthropic") {
    return { content: parseAnthropicLine(dataLine), usage: parseAnthropicUsage(dataLine) };
  }
  if (format === "openai-responses") {
    return {
      content: parseOpenAIResponsesLine(dataLine),
      usage: parseOpenAIResponsesUsage(dataLine),
    };
  }
  return { content: parseOpenAILine(dataLine), usage: parseOpenAIChatUsage(dataLine) };
};

const extractResponseHeaders = (
  response: Response,
): readonly { readonly name: string; readonly value: string }[] => {
  const headers: { name: string; value: string }[] = [];
  response.headers.forEach((value, name) => {
    headers.push({ name, value });
  });
  return headers;
};

export const streamChat = async ({
  vendor,
  baseUrl,
  apiKey,
  model,
  endpointPath,
  payloadFormat,
  messages,
  callbacks,
}: StreamArgs): Promise<void> => {
  const {
    onChunk,
    onFirstToken,
    onRequestMetadata,
    onHttpMetadata,
    onTokenCount,
    onUsage,
    onRawEvent,
    onComplete,
    onError,
  } = callbacks;

  const isAnthropicVendor = vendor === "anthropic";
  const isLocalVendor = vendor === "lmstudio" || vendor === "ollama" || vendor === "lemonade";
  const isDev = import.meta.env.DEV;

  const LOCAL_PROXY_PREFIX: Partial<Record<VendorId, string>> = {
    lmstudio: "/api/lmstudio",
    ollama: "/api/ollama",
    lemonade: "/api/lemonade",
  };
  const proxyPrefix = isDev && isLocalVendor ? LOCAL_PROXY_PREFIX[vendor] : undefined;
  const endpoint = proxyPrefix ? `${proxyPrefix}${endpointPath}` : `${baseUrl}${endpointPath}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  };

  if (vendor === "openai" && apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  } else if (vendor === "litellm") {
    const liteLlmKey = import.meta.env.VITE_LITE_LLM_API_KEY;
    if (liteLlmKey) headers["Authorization"] = `Bearer ${liteLlmKey}`;
  } else if (isAnthropicVendor && apiKey) {
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = STREAM_DEFAULTS.anthropicApiVersion;
  }

  const body = buildRequestPayload({ payloadFormat, model, messages });
  const startTime = Date.now();
  let firstTokenReceived = false;
  let totalTokensGenerated = 0;

  try {
    if (onRequestMetadata) {
      const maskedHeaders = Object.entries(headers).map(([name, value]) => ({
        name,
        value:
          name.toLowerCase() === "authorization" || name.toLowerCase() === "x-api-key"
            ? "<YOUR_API_KEY>"
            : value,
      }));
      onRequestMetadata({ endpoint, headers: maskedHeaders, host: baseUrl, method: "POST" });
    }

    const response = await fetch(endpoint, { method: "POST", headers, body });
    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API error ${response.status}: ${errText}`);
    }

    if (onHttpMetadata) {
      onHttpMetadata({
        status: response.status,
        statusText: response.statusText,
        responseTime,
        headers: extractResponseHeaders(response),
      });
    }

    if (!response.body) {
      throw new Error("Response body is null — server did not stream.");
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const json = (await response.json()) as Record<string, unknown>;
      onRawEvent?.({ data: json });
      const content = extractJsonContent(json, payloadFormat);
      if (content) {
        onFirstToken(Date.now() - startTime);
        onChunk(content);
      }
      await onComplete(Date.now() - startTime);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let pendingEventType: string | undefined;
    let pendingEventData: string | undefined;

    const flushPendingEvent = (): void => {
      if (pendingEventData === undefined) return;

      let parsed: unknown;
      try {
        parsed = JSON.parse(pendingEventData);
      } catch {
        parsed = pendingEventData;
      }

      onRawEvent?.({ event: pendingEventType, data: parsed });

      const dataLine = `data: ${pendingEventData}`;
      const { content, usage } = parseEventByFormat(dataLine, payloadFormat);
      if (usage && onUsage) onUsage(usage);

      if (content) {
        if (!firstTokenReceived) {
          firstTokenReceived = true;
          onFirstToken(Date.now() - startTime);
        }
        onChunk(content);
        totalTokensGenerated += estimateTokensFromChunk(content);
        if (onTokenCount) onTokenCount(totalTokensGenerated);
      }

      pendingEventType = undefined;
      pendingEventData = undefined;
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        flushPendingEvent();
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed) {
          flushPendingEvent();
          continue;
        }

        if (trimmed === "data: [DONE]") {
          flushPendingEvent();
          continue;
        }

        if (trimmed.startsWith("event: ")) {
          pendingEventType = trimmed.slice(7).trim();
        } else if (trimmed.startsWith("data: ")) {
          pendingEventData = trimmed.slice(6).trim();
        }
      }
    }

    await onComplete(Date.now() - startTime);
  } catch (err) {
    onError(err instanceof Error ? err : new Error(String(err)));
  }
};
