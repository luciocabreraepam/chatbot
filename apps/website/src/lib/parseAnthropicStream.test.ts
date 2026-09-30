import { describe, expect, it } from "vite-plus/test";
import { parseAnthropicLine, parseAnthropicUsage } from "./parseAnthropicStream";

describe("parseAnthropicLine", () => {
  it("extracts text from content_block_delta / text_delta", () => {
    const line = `data: ${JSON.stringify({
      type: "content_block_delta",
      delta: { type: "text_delta", text: "Hello" },
    })}`;
    expect(parseAnthropicLine(line)).toBe("Hello");
  });

  it("returns empty string for non-text_delta events", () => {
    const line = `data: ${JSON.stringify({ type: "message_start" })}`;
    expect(parseAnthropicLine(line)).toBe("");
  });

  it("returns empty string for non-data lines", () => {
    expect(parseAnthropicLine("event: message_start")).toBe("");
  });

  it("returns empty string for invalid JSON", () => {
    expect(parseAnthropicLine("data: {bad")).toBe("");
  });
});

describe("parseAnthropicUsage", () => {
  it("parses input tokens from message_start", () => {
    const line = `data: ${JSON.stringify({
      type: "message_start",
      message: { usage: { input_tokens: 12 } },
    })}`;
    const result = parseAnthropicUsage(line);
    expect(result).toEqual({ inputTokens: 12 });
  });

  it("parses output tokens from message_delta", () => {
    const line = `data: ${JSON.stringify({
      type: "message_delta",
      usage: { output_tokens: 30 },
    })}`;
    const result = parseAnthropicUsage(line);
    expect(result).toEqual({ outputTokens: 30 });
  });

  it("includes cache_read_input_tokens when present", () => {
    const line = `data: ${JSON.stringify({
      type: "message_delta",
      usage: { output_tokens: 10, cache_read_input_tokens: 5 },
    })}`;
    const result = parseAnthropicUsage(line);
    expect(result).toEqual({ outputTokens: 10, cacheReadInputTokens: 5 });
  });

  it("returns null for unrelated event types", () => {
    const line = `data: ${JSON.stringify({ type: "content_block_start" })}`;
    expect(parseAnthropicUsage(line)).toBeNull();
  });

  it("returns null for non-data lines", () => {
    expect(parseAnthropicUsage("event: message_start")).toBeNull();
  });
});
