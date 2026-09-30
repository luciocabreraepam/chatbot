import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vite-plus/test";
import { VENDOR_ENDPOINTS } from "@/lib/vendors";
import { useSettings } from "./useSettings.hook";

vi.mock("@/lib/vendors", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/vendors")>();
  return {
    ...actual,
    fetchModels: vi.fn().mockResolvedValue({ status: "success", models: ["gpt-4o", "gpt-4"] }),
  };
});

const defaultSettings = {
  vendor: "openai" as const,
  baseUrl: "https://api.openai.com",
  apiKey: "sk-test",
  model: "gpt-4o",
  endpointId: "chat-completions",
};

describe("useSettings", () => {
  it("initializes state from provided settings", () => {
    const { result } = renderHook(() => useSettings(defaultSettings));
    expect(result.current.vendor).toBe("openai");
    expect(result.current.baseUrl).toBe("https://api.openai.com");
    expect(result.current.apiKey).toBe("sk-test");
    expect(result.current.model).toBe("gpt-4o");
  });

  it("initializes endpoint from endpointId", () => {
    const { result } = renderHook(() => useSettings(defaultSettings));
    const expected = VENDOR_ENDPOINTS["openai"].find((e) => e.id === "chat-completions");
    expect(result.current.endpoint).toEqual(expected);
  });

  it("onVendorChange resets dependent fields", () => {
    const { result } = renderHook(() => useSettings(defaultSettings));
    act(() => result.current.onVendorChange("anthropic"));
    expect(result.current.vendor).toBe("anthropic");
    expect(result.current.model).toBe("");
    expect(result.current.apiKey).toBe("");
    expect(result.current.availableModels).toHaveLength(0);
  });

  it("onBaseUrlChange updates baseUrl", () => {
    const { result } = renderHook(() => useSettings(defaultSettings));
    act(() => result.current.onBaseUrlChange("http://localhost:1234"));
    expect(result.current.baseUrl).toBe("http://localhost:1234");
  });

  it("onApiKeyChange updates apiKey", () => {
    const { result } = renderHook(() => useSettings(defaultSettings));
    act(() => result.current.onApiKeyChange("new-key"));
    expect(result.current.apiKey).toBe("new-key");
  });

  it("onModelChange updates model", () => {
    const { result } = renderHook(() => useSettings(defaultSettings));
    act(() => result.current.onModelChange("gpt-3.5-turbo"));
    expect(result.current.model).toBe("gpt-3.5-turbo");
  });

  it("onApplySettings replaces all settings", () => {
    const { result } = renderHook(() => useSettings(defaultSettings));
    act(() =>
      result.current.onApplySettings({
        vendor: "anthropic",
        baseUrl: "https://api.anthropic.com",
        apiKey: "anthropic-key",
        model: "claude-opus-4-8",
        endpointId: "messages",
      }),
    );
    expect(result.current.vendor).toBe("anthropic");
    expect(result.current.model).toBe("claude-opus-4-8");
    expect(result.current.availableModels).toHaveLength(0);
  });

  it("onFetchModels populates availableModels and sets first as model", async () => {
    const { result } = renderHook(() => useSettings({ ...defaultSettings, model: "" }));
    await act(() => result.current.onFetchModels());
    expect(result.current.availableModels).toEqual(["gpt-4o", "gpt-4"]);
    expect(result.current.model).toBe("gpt-4o");
  });

  it("onFetchModels sets isLoadingModels during the request", async () => {
    let resolveModels!: () => void;
    const { fetchModels } = await import("@/lib/vendors");
    vi.mocked(fetchModels).mockImplementationOnce(
      () =>
        new Promise((res) => {
          resolveModels = () => res({ status: "success", models: [] });
        }),
    );

    const { result } = renderHook(() => useSettings(defaultSettings));
    let fetchPromise!: Promise<void>;
    act(() => {
      fetchPromise = result.current.onFetchModels();
    });
    expect(result.current.isLoadingModels).toBe(true);
    await act(async () => {
      resolveModels();
      await fetchPromise;
    });
    expect(result.current.isLoadingModels).toBe(false);
  });
});
