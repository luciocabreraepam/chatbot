import type { UsageData } from "@/lib/buildPayload";

export const parseAnthropicLine = (line: string): string => {
  if (!line.startsWith("data: ")) return "";
  const payload = line.slice(6).trim();
  try {
    const chunk = JSON.parse(payload) as {
      type: string;
      delta?: { type: string; text?: string };
    };
    if (chunk.type === "content_block_delta" && chunk.delta?.type === "text_delta") {
      return chunk.delta.text ?? "";
    }
    return "";
  } catch {
    return "";
  }
};

export const parseAnthropicUsage = (line: string): UsageData | null => {
  if (!line.startsWith("data: ")) return null;
  const payload = line.slice(6).trim();
  try {
    const chunk = JSON.parse(payload) as Record<string, unknown>;

    // message_start carries the authoritative input token count
    if (chunk.type === "message_start") {
      const msg = chunk.message as Record<string, unknown> | undefined;
      const usage = msg?.usage as Record<string, unknown> | undefined;
      if (usage?.input_tokens !== undefined) {
        return { inputTokens: Number(usage.input_tokens) };
      }
    }

    // message_delta carries the authoritative output token count
    // LiteLLM also includes input_tokens here instead of in message_start
    if (chunk.type === "message_delta") {
      const usage = chunk.usage as Record<string, unknown> | undefined;
      if (usage?.output_tokens !== undefined) {
        return {
          ...(usage.input_tokens !== undefined && { inputTokens: Number(usage.input_tokens) }),
          outputTokens: Number(usage.output_tokens),
          ...(usage.cache_read_input_tokens !== undefined && {
            cacheReadInputTokens: Number(usage.cache_read_input_tokens),
          }),
        };
      }
    }

    return null;
  } catch {
    return null;
  }
};
