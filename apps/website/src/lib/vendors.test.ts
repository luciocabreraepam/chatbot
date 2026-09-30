// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { fetchModels, VENDOR_ENDPOINTS, VENDORS } from "@/lib/vendors";

// ---------------------------------------------------------------------------
// VENDORS / VENDOR_ENDPOINTS shape tests
// ---------------------------------------------------------------------------
describe("VENDORS", () => {
  it("contains exactly 6 vendors", () => {
    expect(VENDORS).toHaveLength(6);
  });

  it("marks openai and anthropic as requiring an api key", () => {
    const cloudVendors = VENDORS.filter((v) => v.requiresApiKey).map((v) => v.id);
    expect(cloudVendors).toEqual(expect.arrayContaining(["openai", "anthropic"]));
  });

  it("has endpoints for every vendor id", () => {
    for (const vendor of VENDORS) {
      expect(VENDOR_ENDPOINTS[vendor.id]).toBeDefined();
      expect(VENDOR_ENDPOINTS[vendor.id].length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// fetchModels
// ---------------------------------------------------------------------------
describe("fetchModels", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches ollama models from /api/tags", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ models: [{ name: "llama3" }, { name: "phi4" }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const result = await fetchModels("ollama", "http://localhost:11434");
    expect(result.status).toBe("success");
    if (result.status === "success") expect(result.models).toEqual(["llama3", "phi4"]);
  });

  it("fetches anthropic models from /v1/models", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [{ id: "claude-3-5-sonnet-20241022" }, { id: "claude-3-opus-20240229" }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", mockFetch);

    const result = await fetchModels("anthropic", "https://api.anthropic.com", "sk-ant-test");
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.models).toEqual(["claude-3-5-sonnet-20241022", "claude-3-opus-20240229"]);
    }
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.anthropic.com/v1/models",
      expect.objectContaining({
        headers: expect.objectContaining({ "x-api-key": "sk-ant-test" }),
      }),
    );
  });

  it("fetches openai models from /v1/models and sorts alphabetically", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: [{ id: "gpt-4o" }, { id: "gpt-3.5-turbo" }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const result = await fetchModels("openai", "https://api.openai.com", "sk-openai");
    expect(result.status).toBe("success");
    if (result.status === "success") expect(result.models).toEqual(["gpt-3.5-turbo", "gpt-4o"]);
  });

  it("returns error status when ollama endpoint returns non-ok status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 500 })));

    const result = await fetchModels("ollama", "http://localhost:11434");
    expect(result.status).toBe("error");
  });

  it("returns error status when fetch rejects (network error)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

    const result = await fetchModels("openai", "https://api.openai.com", "sk-test");
    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.message).toBe("Network error");
  });

  it("returns error status when anthropic endpoint returns non-ok status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("Unauthorized", { status: 401 })),
    );

    const result = await fetchModels("anthropic", "https://api.anthropic.com", "bad-key");
    expect(result.status).toBe("error");
  });

  it("fetches lmstudio models via the openai-compatible /v1/models path", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: [{ id: "lmstudio-model-1" }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const result = await fetchModels("lmstudio", "http://127.0.0.1:1234");
    expect(result.status).toBe("success");
    if (result.status === "success") expect(result.models).toEqual(["lmstudio-model-1"]);
  });

  it("returns error status when response has unexpected shape (Zod parse failure)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ unexpected: "shape" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const result = await fetchModels("openai", "https://api.openai.com", "sk-test");
    expect(result.status).toBe("error");
  });
});
