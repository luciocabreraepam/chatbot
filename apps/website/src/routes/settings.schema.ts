import { z } from "zod";

export const settingsSchema = z.object({
  vendor: z.enum(["lemonade", "litellm", "lmstudio", "ollama", "openai", "anthropic"]),
  baseUrl: z.string().min(1, "Base URL is required"),
  apiKey: z.string(),
  model: z.string(),
  endpointId: z.string(),
});

export type SettingsFormData = z.infer<typeof settingsSchema>;
