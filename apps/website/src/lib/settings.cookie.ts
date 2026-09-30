import { VENDOR_ENDPOINTS, VENDORS } from "./vendors";
import type { VendorId } from "./vendors";

export type ConnectionSettings = {
  readonly vendor: VendorId;
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly model: string;
  readonly endpointId: string;
};

const COOKIE_NAME = "connection_settings";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

const VALID_VENDOR_IDS: readonly string[] = VENDORS.map((v) => v.id);

const isVendorId = (v: unknown): v is VendorId =>
  typeof v === "string" && VALID_VENDOR_IDS.includes(v);

export const defaultSettings = (): ConnectionSettings => ({
  vendor: "lemonade",
  baseUrl: VENDORS[0].defaultUrl,
  apiKey: "",
  model: "",
  endpointId: VENDOR_ENDPOINTS["lemonade"][0].id,
});

export const parseSettingsCookie = (
  cookieHeader: string | null | undefined,
): ConnectionSettings => {
  if (!cookieHeader) return defaultSettings();

  try {
    const match = cookieHeader
      .split(";")
      .map((c) => c.trim().split("="))
      .find(([k]) => k === COOKIE_NAME);

    if (!match) return defaultSettings();

    const raw = decodeURIComponent(match.slice(1).join("="));
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    if (!isVendorId(parsed.vendor)) return defaultSettings();

    const vendor = parsed.vendor;
    const vendorDef = VENDORS.find((v) => v.id === vendor)!;
    const endpoints = VENDOR_ENDPOINTS[vendor];
    const endpointId =
      typeof parsed.endpointId === "string" && endpoints.some((e) => e.id === parsed.endpointId)
        ? parsed.endpointId
        : endpoints[0].id;

    return {
      vendor,
      baseUrl: typeof parsed.baseUrl === "string" ? parsed.baseUrl : vendorDef.defaultUrl,
      apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : "",
      model: typeof parsed.model === "string" ? parsed.model : "",
      endpointId,
    };
  } catch {
    return defaultSettings();
  }
};

export const buildSettingsCookieHeader = (settings: ConnectionSettings): string => {
  const value = encodeURIComponent(JSON.stringify(settings));
  return `${COOKIE_NAME}=${value}; Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax`;
};
