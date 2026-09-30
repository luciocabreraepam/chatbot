import { z } from "zod";

export type VendorId = "lemonade" | "litellm" | "lmstudio" | "ollama" | "openai" | "anthropic";

export type PayloadFormat = "openai-chat" | "openai-responses" | "anthropic";

export type Vendor = {
  readonly id: VendorId;
  readonly label: string;
  readonly defaultUrl: string;
  readonly requiresApiKey: boolean;
};

export type EndpointDef = {
  readonly id: string;
  readonly label: string;
  readonly path: string;
  readonly payloadFormat: PayloadFormat;
};

export const VENDORS: readonly Vendor[] = [
  {
    id: "lemonade",
    label: "Lemonade (Local)",
    defaultUrl: "http://localhost:8000",
    requiresApiKey: false,
  },
  {
    id: "litellm",
    label: "LiteLLM (Local)",
    defaultUrl: "http://192.168.2.20:4000",
    requiresApiKey: false,
  },
  {
    id: "lmstudio",
    label: "LM Studio (Local)",
    defaultUrl: "http://127.0.0.1:1234",
    requiresApiKey: false,
  },
  {
    id: "ollama",
    label: "Ollama (Local)",
    defaultUrl: "http://localhost:11434",
    requiresApiKey: false,
  },
  {
    id: "openai",
    label: "OpenAI",
    defaultUrl: "https://api.openai.com",
    requiresApiKey: true,
  },
  {
    id: "anthropic",
    label: "Anthropic",
    defaultUrl: "https://api.anthropic.com",
    requiresApiKey: true,
  },
] as const;

// Local OpenAI-compatible servers expose all three API formats
const LOCAL_ENDPOINTS: readonly EndpointDef[] = [
  {
    id: "chat-completions",
    label: "Chat Completions  /v1/chat/completions",
    path: "/v1/chat/completions",
    payloadFormat: "openai-chat",
  },
  {
    id: "responses",
    label: "Responses  /v1/responses",
    path: "/v1/responses",
    payloadFormat: "openai-responses",
  },
  {
    id: "messages",
    label: "Messages  /v1/messages",
    path: "/v1/messages",
    payloadFormat: "anthropic",
  },
];

// LiteLLM requires ?alt=sse on the Responses endpoint to force SSE streaming
const LITELLM_ENDPOINTS: readonly EndpointDef[] = [
  {
    id: "chat-completions",
    label: "Chat Completions  /v1/chat/completions",
    path: "/v1/chat/completions",
    payloadFormat: "openai-chat",
  },
  {
    id: "responses",
    label: "Responses  /v1/responses",
    path: "/v1/responses?alt=sse",
    payloadFormat: "openai-responses",
  },
  {
    id: "messages",
    label: "Messages  /v1/messages",
    path: "/v1/messages",
    payloadFormat: "anthropic",
  },
];

export const VENDOR_ENDPOINTS: Readonly<Record<VendorId, readonly EndpointDef[]>> = {
  lemonade: LOCAL_ENDPOINTS,
  litellm: LITELLM_ENDPOINTS,
  lmstudio: LOCAL_ENDPOINTS,
  ollama: LOCAL_ENDPOINTS,
  openai: [
    {
      id: "chat-completions",
      label: "Chat Completions  /v1/chat/completions",
      path: "/v1/chat/completions",
      payloadFormat: "openai-chat",
    },
    {
      id: "responses",
      label: "Responses  /v1/responses",
      path: "/v1/responses",
      payloadFormat: "openai-responses",
    },
  ],
  anthropic: [
    {
      id: "messages",
      label: "Messages  /v1/messages",
      path: "/v1/messages",
      payloadFormat: "anthropic",
    },
  ],
};

const ANTHROPIC_API_VERSION = "2023-06-01" as const;

const ollamaTagsSchema = z.object({ models: z.array(z.object({ name: z.string() })) });
const openAIModelsSchema = z.object({ data: z.array(z.object({ id: z.string() })) });
const anthropicModelsSchema = z.object({ data: z.array(z.object({ id: z.string() })) });

export type FetchModelsResult =
  | { readonly status: "success"; readonly models: readonly string[] }
  | { readonly status: "error"; readonly message: string };

export const fetchModels = async (
  vendor: VendorId,
  baseUrl: string,
  apiKey?: string,
): Promise<FetchModelsResult> => {
  try {
    if (vendor === "ollama") {
      const res = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return { status: "error", message: `HTTP ${res.status}` };
      const parsed = ollamaTagsSchema.parse(await res.json());
      return { status: "success", models: parsed.models.map((m) => m.name) };
    }

    if (vendor === "anthropic") {
      const res = await fetch(`${baseUrl}/v1/models`, {
        signal: AbortSignal.timeout(5000),
        headers: { "x-api-key": apiKey ?? "", "anthropic-version": ANTHROPIC_API_VERSION },
      });
      if (!res.ok) return { status: "error", message: `HTTP ${res.status}` };
      const parsed = anthropicModelsSchema.parse(await res.json());
      return { status: "success", models: parsed.data.map((m) => m.id) };
    }

    const headers: Record<string, string> = {};
    if (vendor === "openai" && apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    } else if (vendor === "litellm") {
      const liteLlmKey = import.meta.env.VITE_LITE_LLM_API_KEY;
      if (liteLlmKey) headers["Authorization"] = `Bearer ${liteLlmKey}`;
    }

    const res = await fetch(`${baseUrl}/v1/models`, { signal: AbortSignal.timeout(5000), headers });
    if (!res.ok) return { status: "error", message: `HTTP ${res.status}` };
    const parsed = openAIModelsSchema.parse(await res.json());
    return {
      status: "success",
      models: parsed.data.map((m) => m.id).sort((a, b) => a.localeCompare(b)),
    };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : String(err) };
  }
};
