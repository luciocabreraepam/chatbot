import { describe, expect, it } from "vite-plus/test";
import {
  parseOpenAIChatUsage,
  parseOpenAILine,
  parseOpenAIResponsesLine,
  parseOpenAIResponsesUsage,
} from "./parseOpenAiStream";

describe("parseOpenAILine", () => {
  it("extracts content from a delta chunk", () => {
    const line = `data: ${JSON.stringify({ choices: [{ delta: { content: "Hello" } }] })}`;
    expect(parseOpenAILine(line)).toBe("Hello");
  });

  it("returns empty string for [DONE]", () => {
    expect(parseOpenAILine("data: [DONE]")).toBe("");
  });

  it("returns empty string for non-data lines", () => {
    expect(parseOpenAILine("event: message_start")).toBe("");
  });

  it("returns empty string for invalid JSON", () => {
    expect(parseOpenAILine("data: {broken")).toBe("");
  });

  it("returns empty string when delta has no content", () => {
    const line = `data: ${JSON.stringify({ choices: [{ delta: {} }] })}`;
    expect(parseOpenAILine(line)).toBe("");
  });
});

describe("parseOpenAIResponsesLine", () => {
  it("extracts delta from response.output_text.delta events", () => {
    const line = `data: ${JSON.stringify({ type: "response.output_text.delta", delta: "Hi" })}`;
    expect(parseOpenAIResponsesLine(line)).toBe("Hi");
  });

  it("returns empty string for unrelated event types", () => {
    const line = `data: ${JSON.stringify({ type: "response.created" })}`;
    expect(parseOpenAIResponsesLine(line)).toBe("");
  });

  it("returns empty string for [DONE]", () => {
    expect(parseOpenAIResponsesLine("data: [DONE]")).toBe("");
  });
});

describe("parseOpenAIChatUsage", () => {
  it("parses classic prompt_tokens/completion_tokens", () => {
    const line = `data: ${JSON.stringify({ usage: { prompt_tokens: 10, completion_tokens: 5 } })}`;
    const result = parseOpenAIChatUsage(line);
    expect(result).toEqual({ inputTokens: 10, outputTokens: 5 });
  });

  it("parses newer input_tokens/output_tokens", () => {
    const line = `data: ${JSON.stringify({ usage: { input_tokens: 20, output_tokens: 8 } })}`;
    const result = parseOpenAIChatUsage(line);
    expect(result).toEqual({ inputTokens: 20, outputTokens: 8 });
  });

  it("returns null when chunk has no usage field", () => {
    const line = `data: ${JSON.stringify({ choices: [{ delta: { content: "text" } }] })}`;
    expect(parseOpenAIChatUsage(line)).toBeNull();
  });

  it("returns null for [DONE]", () => {
    expect(parseOpenAIChatUsage("data: [DONE]")).toBeNull();
  });
});

describe("parseOpenAIResponsesUsage", () => {
  it("parses usage from response.completed event", () => {
    const line = `data: ${JSON.stringify({
      type: "response.completed",
      response: { usage: { input_tokens: 15, output_tokens: 7 } },
    })}`;
    const result = parseOpenAIResponsesUsage(line);
    expect(result).toEqual({ inputTokens: 15, outputTokens: 7 });
  });

  it("returns null for non-response.completed events", () => {
    const line = `data: ${JSON.stringify({ type: "response.created" })}`;
    expect(parseOpenAIResponsesUsage(line)).toBeNull();
  });
});
