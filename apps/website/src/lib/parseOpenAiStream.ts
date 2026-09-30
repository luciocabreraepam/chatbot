import type { UsageData } from "@/lib/buildPayload";

export const parseOpenAILine = (line: string): string => {
  if (!line.startsWith("data: ")) return "";
  const payload = line.slice(6).trim();
  if (payload === "[DONE]") return "";
  try {
    const chunk = JSON.parse(payload) as {
      choices: readonly { delta: { content?: string } }[];
    };
    return chunk.choices?.[0]?.delta?.content ?? "";
  } catch {
    return "";
  }
};

export const parseOpenAIResponsesLine = (line: string): string => {
  if (!line.startsWith("data: ")) return "";
  const payload = line.slice(6).trim();
  if (payload === "[DONE]") return "";
  try {
    const chunk = JSON.parse(payload) as { type?: string; delta?: string };
    if (chunk.type === "response.output_text.delta" && typeof chunk.delta === "string") {
      return chunk.delta;
    }
    return "";
  } catch {
    return "";
  }
};

export const parseOpenAIChatUsage = (line: string): UsageData | null => {
  if (!line.startsWith("data: ")) return null;
  const payload = line.slice(6).trim();
  if (payload === "[DONE]") return null;
  try {
    const chunk = JSON.parse(payload) as Record<string, unknown>;
    const usage = chunk.usage as Record<string, unknown> | undefined;
    if (!usage) return null;
    // Handles both prompt_tokens/completion_tokens (classic) and input_tokens/output_tokens (newer)
    const inputTokens = usage.prompt_tokens ?? usage.input_tokens;
    const outputTokens = usage.completion_tokens ?? usage.output_tokens;
    if (inputTokens === undefined && outputTokens === undefined) return null;
    return {
      ...(inputTokens !== undefined && { inputTokens: Number(inputTokens) }),
      ...(outputTokens !== undefined && { outputTokens: Number(outputTokens) }),
    };
  } catch {
    return null;
  }
};

export const parseOpenAIResponsesUsage = (line: string): UsageData | null => {
  if (!line.startsWith("data: ")) return null;
  const payload = line.slice(6).trim();
  try {
    const chunk = JSON.parse(payload) as Record<string, unknown>;
    if (chunk.type !== "response.completed") return null;
    const response = chunk.response as Record<string, unknown> | undefined;
    const usage = response?.usage as Record<string, unknown> | undefined;
    if (!usage) return null;
    const inputTokens = usage.input_tokens ?? usage.prompt_tokens;
    const outputTokens = usage.output_tokens ?? usage.completion_tokens;
    if (inputTokens === undefined && outputTokens === undefined) return null;
    return {
      ...(inputTokens !== undefined && { inputTokens: Number(inputTokens) }),
      ...(outputTokens !== undefined && { outputTokens: Number(outputTokens) }),
    };
  } catch {
    return null;
  }
};
