import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { useConversations } from "./useConversations.hook";

vi.mock("@/lib/db", () => ({
  getNativeDB: vi.fn().mockResolvedValue({}),
  getAllConversations: vi.fn().mockResolvedValue([
    { id: "conv-1", title: "First", vendor: "openai", model: "gpt-4o", updatedAt: 1 },
    { id: "conv-2", title: "Second", vendor: "openai", model: "gpt-4o", updatedAt: 2 },
  ]),
  getMessages: vi
    .fn()
    .mockResolvedValue([
      { id: "msg-1", conversationId: "conv-1", role: "user", content: "Hello", timestamp: 1 },
    ]),
  deleteConversation: vi.fn().mockResolvedValue(undefined),
}));

describe("useConversations", () => {
  beforeEach(() => vi.clearAllMocks());

  it("initializes with empty state and isDbReady false", () => {
    const { result } = renderHook(() => useConversations());
    expect(result.current.conversations).toHaveLength(0);
    expect(result.current.activeConvId).toBeNull();
    expect(result.current.messages).toHaveLength(0);
    expect(result.current.isDbReady).toBe(false);
  });

  it("loads conversations and sets isDbReady after DB init", async () => {
    const { result } = renderHook(() => useConversations());
    await act(async () => {});
    expect(result.current.isDbReady).toBe(true);
    expect(result.current.conversations).toHaveLength(2);
  });

  it("handleNewConversation clears active conv and messages", async () => {
    const { result } = renderHook(() => useConversations());
    await act(async () => {});
    act(() => result.current.setActiveConvId("conv-1"));
    act(() => result.current.handleNewConversation());
    expect(result.current.activeConvId).toBeNull();
    expect(result.current.messages).toHaveLength(0);
  });

  it("handleSelectConversation sets activeConvId and loads messages", async () => {
    const { result } = renderHook(() => useConversations());
    await act(async () => {
      await result.current.handleSelectConversation("conv-1");
    });
    expect(result.current.activeConvId).toBe("conv-1");
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].content).toBe("Hello");
  });

  it("handleDeleteConversation removes conversation from list", async () => {
    const { result } = renderHook(() => useConversations());
    await act(async () => {});

    // Set up mock AFTER init so it applies to the post-delete call
    const db = await import("@/lib/db");
    vi.mocked(db.getAllConversations).mockResolvedValueOnce([
      { id: "conv-2", title: "Second", vendor: "openai" as const, model: "gpt-4o", updatedAt: 2 },
    ]);

    await act(async () => {
      await result.current.handleDeleteConversation("conv-1");
    });
    expect(result.current.conversations).toHaveLength(1);
    expect(result.current.conversations[0].id).toBe("conv-2");
  });

  it("handleDeleteConversation clears state when active conv is deleted", async () => {
    const { result } = renderHook(() => useConversations());
    await act(async () => {});
    act(() => result.current.setActiveConvId("conv-1"));

    const db = await import("@/lib/db");
    vi.mocked(db.getAllConversations).mockResolvedValueOnce([]);

    await act(async () => {
      await result.current.handleDeleteConversation("conv-1");
    });
    expect(result.current.activeConvId).toBeNull();
    expect(result.current.messages).toHaveLength(0);
  });

  it("activeConvIdRef stays in sync with activeConvId", () => {
    const { result } = renderHook(() => useConversations());
    act(() => result.current.setActiveConvId("conv-42"));
    expect(result.current.activeConvIdRef.current).toBe("conv-42");
  });
});
