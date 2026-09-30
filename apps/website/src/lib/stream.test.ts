// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { buildRequestPayload, streamChat } from "@/lib/stream";
import type { StreamCallbacks } from "@/lib/stream";

// ---------------------------------------------------------------------------
// buildRequestPayload
// ---------------------------------------------------------------------------
describe("buildRequestPayload", () => {
  const messages = [
    { role: "user" as const, content: "Hello" },
    { role: "assistant" as const, content: "Hi" },
  ];

  it("produces an anthropic payload with max_tokens and no temperature", () => {
    const result = JSON.parse(
      buildRequestPayload({ payloadFormat: "anthropic", model: "claude-3", messages }),
    );
    expect(result.model).toBe("claude-3");
    expect(result.stream).toBe(true);
    expect(result.max_tokens).toBe(2048);
    expect(result.temperature).toBeUndefined();
    expect(result.messages).toEqual(messages);
  });

  it("extracts system prompt for anthropic format", () => {
    const withSystem = [
      { role: "system" as const, content: "You are helpful" },
      { role: "user" as const, content: "Hello" },
    ];
    const result = JSON.parse(
      buildRequestPayload({ payloadFormat: "anthropic", model: "m", messages: withSystem }),
    );
    expect(result.system).toBe("You are helpful");
    expect(result.messages).toEqual([{ role: "user", content: "Hello" }]);
  });

  it("omits system key when no system message in anthropic format", () => {
    const result = JSON.parse(
      buildRequestPayload({ payloadFormat: "anthropic", model: "m", messages }),
    );
    expect(Object.keys(result)).not.toContain("system");
  });

  it("produces an openai-responses payload with input key", () => {
    const result = JSON.parse(
      buildRequestPayload({ payloadFormat: "openai-responses", model: "gpt-4o", messages }),
    );
    expect(result.model).toBe("gpt-4o");
    expect(result.stream).toBe(true);
    expect(result.temperature).toBe(0.7);
    expect(result.max_output_tokens).toBe(2048);
    expect(result.input).toEqual(messages);
    expect(result.messages).toBeUndefined();
  });

  it("produces an openai-chat payload with messages key", () => {
    const result = JSON.parse(
      buildRequestPayload({ payloadFormat: "openai-chat", model: "gpt-4", messages }),
    );
    expect(result.model).toBe("gpt-4");
    expect(result.stream).toBe(true);
    expect(result.temperature).toBe(0.7);
    expect(result.max_tokens).toBe(2048);
    expect(result.messages).toEqual(messages);
    expect(result.input).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// streamChat — SSE integration tests
// ---------------------------------------------------------------------------

const makeSSEStream = (lines: string[]): ReadableStream<Uint8Array> => {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const line of lines) {
        controller.enqueue(encoder.encode(line));
      }
      controller.close();
    },
  });
};

const makeMockCallbacks = (): StreamCallbacks & {
  chunks: string[];
  errors: Error[];
  completed: boolean;
} => {
  const chunks: string[] = [];
  const errors: Error[] = [];
  let completed = false;
  return {
    chunks,
    errors,
    get completed() {
      return completed;
    },
    onChunk: (c) => chunks.push(c),
    onFirstToken: vi.fn(),
    onComplete: () => {
      completed = true;
    },
    onError: (e) => errors.push(e),
  };
};

const BASE_ARGS = {
  vendor: "openai" as const,
  baseUrl: "https://api.openai.com",
  apiKey: "sk-test",
  model: "gpt-4",
  endpointPath: "/v1/chat/completions",
};

describe("streamChat", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("parses openai-chat SSE chunks and fires onChunk", async () => {
    const sseLines = [
      'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
      "data: [DONE]\n\n",
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(makeSSEStream(sseLines), {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        }),
      ),
    );

    const cbs = makeMockCallbacks();
    await streamChat({ ...BASE_ARGS, payloadFormat: "openai-chat", messages: [], callbacks: cbs });

    expect(cbs.chunks).toEqual(["Hello", " world"]);
    expect(cbs.completed).toBe(true);
    expect(cbs.errors).toHaveLength(0);
  });

  it("parses anthropic SSE content_block_delta chunks", async () => {
    const sseLines = [
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hi"}}\n',
      "\n",
      'data: {"type":"message_delta","usage":{"output_tokens":3}}\n',
      "\n",
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(makeSSEStream(sseLines), {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        }),
      ),
    );

    const cbs = makeMockCallbacks();
    await streamChat({
      vendor: "anthropic",
      baseUrl: "https://api.anthropic.com",
      apiKey: "sk-ant",
      model: "claude-3",
      endpointPath: "/v1/messages",
      payloadFormat: "anthropic",
      messages: [],
      callbacks: cbs,
    });

    expect(cbs.chunks).toContain("Hi");
    expect(cbs.errors).toHaveLength(0);
  });

  it("parses openai-responses SSE response.output_text.delta chunks", async () => {
    const sseLines = [
      'data: {"type":"response.output_text.delta","delta":"Yo"}\n',
      "\n",
      'data: {"type":"response.completed","response":{"usage":{"input_tokens":5,"output_tokens":2}}}\n',
      "\n",
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(makeSSEStream(sseLines), {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        }),
      ),
    );

    const cbs = makeMockCallbacks();
    await streamChat({
      ...BASE_ARGS,
      endpointPath: "/v1/responses",
      payloadFormat: "openai-responses",
      messages: [],
      callbacks: cbs,
    });

    expect(cbs.chunks).toContain("Yo");
    expect(cbs.errors).toHaveLength(0);
  });

  it("calls onError when fetch rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network down")));

    const cbs = makeMockCallbacks();
    await streamChat({ ...BASE_ARGS, payloadFormat: "openai-chat", messages: [], callbacks: cbs });

    expect(cbs.errors).toHaveLength(1);
    expect(cbs.errors[0]?.message).toBe("Network down");
    expect(cbs.completed).toBe(false);
  });

  it("calls onError when API returns non-ok status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("Unauthorized", { status: 401 })),
    );

    const cbs = makeMockCallbacks();
    await streamChat({ ...BASE_ARGS, payloadFormat: "openai-chat", messages: [], callbacks: cbs });

    expect(cbs.errors).toHaveLength(1);
    expect(cbs.errors[0]?.message).toContain("401");
  });

  it("handles a JSON (non-streaming) response", async () => {
    const json = {
      choices: [{ message: { content: "Full answer" } }],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(json), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const cbs = makeMockCallbacks();
    await streamChat({ ...BASE_ARGS, payloadFormat: "openai-chat", messages: [], callbacks: cbs });

    expect(cbs.chunks).toContain("Full answer");
    expect(cbs.completed).toBe(true);
  });
});
