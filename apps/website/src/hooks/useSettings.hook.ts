import { useCallback, useState } from "react";
import type { ConnectionSettings } from "@/lib/settings.cookie";
import { VENDOR_ENDPOINTS, VENDORS, fetchModels } from "@/lib/vendors";
import type { EndpointDef, VendorId } from "@/lib/vendors";

export type UseSettingsReturn = {
  readonly vendor: VendorId;
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly model: string;
  readonly availableModels: readonly string[];
  readonly isLoadingModels: boolean;
  readonly endpoint: EndpointDef;
  readonly onVendorChange: (v: VendorId) => void;
  readonly onBaseUrlChange: (url: string) => void;
  readonly onApiKeyChange: (key: string) => void;
  readonly onModelChange: (m: string) => void;
  readonly onEndpointChange: (endpointId: string) => void;
  readonly onApplySettings: (settings: ConnectionSettings) => void;
  readonly onFetchModels: () => Promise<void>;
};

export const useSettings = (initialSettings: ConnectionSettings): UseSettingsReturn => {
  const [vendor, setVendor] = useState<VendorId>(initialSettings.vendor);
  const [baseUrl, setBaseUrl] = useState(initialSettings.baseUrl);
  const [apiKey, setApiKey] = useState(initialSettings.apiKey);
  const [model, setModel] = useState(initialSettings.model);
  const [availableModels, setAvailableModels] = useState<readonly string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [endpoint, setEndpoint] = useState<EndpointDef>(() => {
    const endpoints = VENDOR_ENDPOINTS[initialSettings.vendor];
    return endpoints.find((e) => e.id === initialSettings.endpointId) ?? endpoints[0];
  });

  const onVendorChange = useCallback((nextVendor: VendorId) => {
    const vendorDef = VENDORS.find((v) => v.id === nextVendor);
    setVendor(nextVendor);
    setBaseUrl(vendorDef?.defaultUrl ?? "");
    setApiKey("");
    setModel("");
    setAvailableModels([]);
    setEndpoint(VENDOR_ENDPOINTS[nextVendor][0]);
  }, []);

  const onBaseUrlChange = useCallback((url: string) => setBaseUrl(url), []);
  const onApiKeyChange = useCallback((key: string) => setApiKey(key), []);
  const onModelChange = useCallback((m: string) => setModel(m), []);

  const onEndpointChange = useCallback(
    (endpointId: string) => {
      const def = VENDOR_ENDPOINTS[vendor].find((e) => e.id === endpointId);
      if (def) setEndpoint(def);
    },
    [vendor],
  );

  const onApplySettings = useCallback((settings: ConnectionSettings) => {
    const endpoints = VENDOR_ENDPOINTS[settings.vendor];
    const ep = endpoints.find((e) => e.id === settings.endpointId) ?? endpoints[0];
    setVendor(settings.vendor);
    setBaseUrl(settings.baseUrl);
    setApiKey(settings.apiKey);
    setModel(settings.model);
    setEndpoint(ep);
    setAvailableModels([]);
  }, []);

  const onFetchModels = useCallback(async () => {
    setIsLoadingModels(true);
    try {
      const result = await fetchModels(vendor, baseUrl, apiKey);
      if (result.status === "success") {
        setAvailableModels(result.models);
        if (result.models.length > 0) setModel(result.models[0] ?? "");
      }
    } finally {
      setIsLoadingModels(false);
    }
  }, [vendor, baseUrl, apiKey]);

  return {
    vendor,
    baseUrl,
    apiKey,
    model,
    availableModels,
    isLoadingModels,
    endpoint,
    onVendorChange,
    onBaseUrlChange,
    onApiKeyChange,
    onModelChange,
    onEndpointChange,
    onApplySettings,
    onFetchModels,
  };
};
