import type { PayloadFormat } from "@/lib/vendors";

export const STREAM_DEFAULTS = {
  maxTokens: 2048,
  temperature: 0.7,
  anthropicApiVersion: "2023-06-01",
} as const;

export type StreamableMessage = {
  readonly role: "user" | "assistant" | "system";
  readonly content: string;
};

export type RequestPayloadArgs = {
  readonly payloadFormat: PayloadFormat;
  readonly model: string;
  readonly messages: readonly StreamableMessage[];
};

export type UsageData = {
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly cacheReadInputTokens?: number;
};

export const buildRequestPayload = ({
  payloadFormat,
  model,
  messages,
}: RequestPayloadArgs): string => {
  if (payloadFormat === "anthropic") {
    const system = messages.find((m) => m.role === "system")?.content;
    const chatMessages = messages.filter((m) => m.role !== "system");
    return JSON.stringify(
      {
        model,
        ...(system !== undefined && { system }),
        messages: chatMessages,
        stream: true,
        max_tokens: STREAM_DEFAULTS.maxTokens,
      },
      null,
      2,
    );
  }

  if (payloadFormat === "openai-responses") {
    return JSON.stringify(
      {
        model,
        input: messages,
        stream: true,
        temperature: STREAM_DEFAULTS.temperature,
        max_output_tokens: STREAM_DEFAULTS.maxTokens,
      },
      null,
      2,
    );
  }

  // openai-chat (default)
  return JSON.stringify(
    {
      model,
      messages,
      stream: true,
      temperature: STREAM_DEFAULTS.temperature,
      max_tokens: STREAM_DEFAULTS.maxTokens,
    },
    null,
    2,
  );
};
