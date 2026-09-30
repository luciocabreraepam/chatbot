import type { VendorId } from "@/lib/vendors";

export type VendorSelectorProps = {
  readonly vendor: VendorId;
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly model: string;
  readonly availableModels: readonly string[];
  readonly isLoadingModels: boolean;
  readonly onApiKeyChange: (key: string) => void;
  readonly onBaseUrlChange: (url: string) => void;
  readonly onFetchModels: () => void;
  readonly onModelChange: (model: string) => void;
  readonly onVendorChange: (vendor: VendorId) => void;
};
