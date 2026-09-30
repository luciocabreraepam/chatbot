import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { useStreaming } from "./useStreaming.hook";

vi.mock("@/lib/db", () => ({
  getAllConversations: vi
    .fn()
    .mockResolvedValue([
      { id: "conv-1", title: "Test", vendor: "openai", model: "gpt-4o", updatedAt: 1 },
    ]),
  saveConversation: vi.fn().mockResolvedValue(undefined),
  saveMessage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/stream", () => ({
  buildRequestPayload: vi.fn().mockReturnValue('{"mock":"payload"}'),
  streamChat: vi.fn(),
}));

// Flushes all pending microtasks and macrotasks (gives state updates time to commit)
const flushAll = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const makeArgs = (activeConvId: string | null = null) => ({
  model: "gpt-4o",
  vendor: "openai" as const,
  baseUrl: "https://api.openai.com",
  apiKey: "sk-test",
  endpoint: {
    id: "chat-completions",
    label: "Chat",
    path: "/v1/chat/completions",
    payloadFormat: "openai-chat" as const,
  },
  messages: [
    {
      id: "msg-0",
      conversationId: "conv-1",
      role: "user" as const,
      content: "previous",
      timestamp: 1,
    },
  ],
  conversations: [
    { id: "conv-1", title: "Test", vendor: "openai" as const, model: "gpt-4o", updatedAt: 1 },
  ],
  activeConvIdRef: { current: activeConvId } as React.RefObject<string | null>,
  setMessages: vi.fn(),
  setConversations: vi.fn(),
  setActiveConvId: vi.fn(),
  setSelectedMessageId: vi.fn(),
});

describe("useStreaming", () => {
  beforeEach(() => vi.clearAllMocks());

  it("initializes with idle state", () => {
    const { result } = renderHook(() => useStreaming(makeArgs()));
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.streamingContent).toBe("");
    expect(result.current.streamError).toBeNull();
  });

  it("clearStream resets streamingContent", () => {
    const { result } = renderHook(() => useStreaming(makeArgs()));
    act(() => result.current.clearStream());
    expect(result.current.streamingContent).toBe("");
  });

  it("dismissError clears streamError", async () => {
    const { streamChat } = await import("@/lib/stream");
    vi.mocked(streamChat).mockImplementationOnce(async ({ callbacks }) => {
      callbacks.onError?.(new Error("network failed"));
    });

    const { result } = renderHook(() => useStreaming(makeArgs("conv-1")));
    await act(async () => {
      await result.current.handleSendMessage("hello");
    });
    expect(result.current.streamError).toBe("network failed");

    act(() => result.current.dismissError());
    expect(result.current.streamError).toBeNull();
  });

  it("streamChat is called when model and not streaming", async () => {
    const { streamChat } = await import("@/lib/stream");
    vi.mocked(streamChat).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useStreaming(makeArgs("conv-1")));
    await act(async () => {
      await result.current.handleSendMessage("hello");
    });

    expect(vi.mocked(streamChat)).toHaveBeenCalledTimes(1);
  });

  it("isStreaming resets to false after stream completes", async () => {
    const { streamChat } = await import("@/lib/stream");
    vi.mocked(streamChat).mockImplementationOnce(async ({ callbacks }) => {
      callbacks.onChunk?.("hi");
      await callbacks.onComplete?.(100);
    });

    const { result } = renderHook(() => useStreaming(makeArgs("conv-1")));
    await act(async () => {
      await result.current.handleSendMessage("hello");
    });

    expect(result.current.isStreaming).toBe(false);
    expect(result.current.streamingContent).toBe("");
  });

  it("onError callback sets streamError and stops streaming", async () => {
    const { streamChat } = await import("@/lib/stream");
    vi.mocked(streamChat).mockImplementationOnce(async ({ callbacks }) => {
      callbacks.onError?.(new Error("timeout"));
    });

    const { result } = renderHook(() => useStreaming(makeArgs("conv-1")));
    await act(async () => {
      await result.current.handleSendMessage("hello");
    });

    expect(result.current.isStreaming).toBe(false);
    expect(result.current.streamError).toBe("timeout");
    expect(result.current.streamingContent).toBe("");
  });

  it("onComplete saves assistant message with accumulated content", async () => {
    const { streamChat } = await import("@/lib/stream");
    const { saveMessage } = await import("@/lib/db");

    vi.mocked(streamChat).mockImplementationOnce(async ({ callbacks }) => {
      callbacks.onChunk?.("Hello");
      callbacks.onChunk?.(" world");
      await callbacks.onComplete?.(500);
    });

    const args = makeArgs("conv-1");
    const { result } = renderHook(() => useStreaming(args));
    await act(async () => {
      await result.current.handleSendMessage("test");
    });

    expect(result.current.isStreaming).toBe(false);
    expect(result.current.streamingContent).toBe("");
    expect(vi.mocked(saveMessage)).toHaveBeenCalledTimes(2); // user + assistant
    const assistantCall = vi.mocked(saveMessage).mock.calls[1][0];
    expect(assistantCall.role).toBe("assistant");
    expect(assistantCall.content).toBe("Hello world");
    expect(args.setSelectedMessageId).toHaveBeenCalledWith(assistantCall.id);
  });

  it("does nothing when model is empty", async () => {
    const { streamChat } = await import("@/lib/stream");
    const { result } = renderHook(() => useStreaming({ ...makeArgs(), model: "" }));
    await act(async () => {
      await result.current.handleSendMessage("hello");
    });
    expect(vi.mocked(streamChat)).not.toHaveBeenCalled();
  });

  it("does nothing when already streaming", async () => {
    const { streamChat } = await import("@/lib/stream");
    let resolveFirst!: () => void;
    vi.mocked(streamChat).mockReturnValueOnce(
      new Promise<void>((res) => {
        resolveFirst = res;
      }),
    );

    const { result } = renderHook(() => useStreaming(makeArgs("conv-1")));

    // Start the first send; flush all pending promises so setIsStreaming(true) commits
    let firstPromise!: Promise<void>;
    act(() => {
      firstPromise = result.current.handleSendMessage("first");
    });
    await act(async () => {
      await flushAll();
    });
    expect(result.current.isStreaming).toBe(true);

    // Second call should be a no-op
    await act(async () => {
      await result.current.handleSendMessage("second");
    });
    expect(vi.mocked(streamChat)).toHaveBeenCalledTimes(1);

    // Clean up — let first stream finish
    await act(async () => {
      resolveFirst();
      await firstPromise;
    });
  });
});
