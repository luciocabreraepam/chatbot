import type { VendorId } from "@/lib/vendors";

export type SettingsFieldErrors = {
  readonly baseUrl?: string;
  readonly apiKey?: string;
  readonly model?: string;
};

export type SettingsPanelProps = {
  readonly apiKey: string;
  readonly availableModels: readonly string[];
  readonly baseUrl: string;
  readonly endpointId: string;
  readonly errors: SettingsFieldErrors | null;
  readonly isLoadingModels: boolean;
  readonly model: string;
  readonly showValidationModal: boolean;
  readonly vendor: VendorId;
  readonly onAccept: () => void;
  readonly onApiKeyChange: (key: string) => void;
  readonly onBaseUrlChange: (url: string) => void;
  readonly onCancel: () => void;
  readonly onDismissModal: () => void;
  readonly onEndpointChange: (endpointId: string) => void;
  readonly onFetchModels: () => void;
  readonly onModelChange: (model: string) => void;
  readonly onVendorChange: (vendor: VendorId) => void;
};
