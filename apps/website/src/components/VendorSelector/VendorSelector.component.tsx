import * as stylex from "@stylexjs/stylex";
import { VENDORS } from "@/lib/vendors";
import type { VendorId } from "@/lib/vendors";
import type { VendorSelectorProps } from "./VendorSelector.types";
import { styles } from "./VendorSelector.stylex";

export const VendorSelector = ({
  vendor,
  baseUrl,
  apiKey,
  model,
  availableModels,
  isLoadingModels,
  onVendorChange,
  onBaseUrlChange,
  onApiKeyChange,
  onModelChange,
  onFetchModels,
}: VendorSelectorProps) => {
  const currentVendor = VENDORS.find((v) => v.id === vendor);

  const handleVendorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onVendorChange(e.target.value as VendorId);
  };

  const handleBaseUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onBaseUrlChange(e.target.value);
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onApiKeyChange(e.target.value);
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onModelChange(e.target.value);
  };

  return (
    <header {...stylex.props(styles.root)}>
      <div {...stylex.props(styles.brand)}>
        <span {...stylex.props(styles.logo)}>◆</span>
        <span {...stylex.props(styles.title)}>LocalOmni Studio</span>
      </div>

      <div {...stylex.props(styles.controls)}>
        <div {...stylex.props(styles.field)}>
          <label htmlFor="vendor-select" {...stylex.props(styles.label)}>
            Vendor
          </label>
          <select
            {...stylex.props(styles.select)}
            value={vendor}
            onChange={handleVendorChange}
            id="vendor-select"
          >
            {VENDORS.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </div>

        <div {...stylex.props(styles.field, styles.fieldWide)}>
          <label htmlFor="base-url-input" {...stylex.props(styles.label)}>
            Base URL
          </label>
          <input
            {...stylex.props(styles.input)}
            type="url"
            value={baseUrl}
            onChange={handleBaseUrlChange}
            placeholder="http://localhost:8000"
            spellCheck={false}
            id="base-url-input"
          />
        </div>

        {currentVendor?.requiresApiKey && (
          <div {...stylex.props(styles.field, styles.fieldWide)}>
            <label htmlFor="api-key-input" {...stylex.props(styles.label)}>
              API Key
            </label>
            <input
              {...stylex.props(styles.input)}
              type="password"
              value={apiKey}
              onChange={handleApiKeyChange}
              placeholder="sk-..."
              id="api-key-input"
            />
          </div>
        )}

        <div {...stylex.props(styles.field, styles.fieldModel)}>
          <label htmlFor="model-select" {...stylex.props(styles.label)}>
            Model
          </label>
          <div {...stylex.props(styles.modelRow)}>
            <select
              {...stylex.props(styles.select, styles.modelSelect)}
              value={model}
              onChange={handleModelChange}
              disabled={availableModels.length === 0}
              id="model-select"
            >
              {availableModels.length === 0 && <option value="">-- fetch models --</option>}
              {availableModels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <button
              {...stylex.props(styles.fetchBtn)}
              type="button"
              onClick={onFetchModels}
              disabled={isLoadingModels}
            >
              {isLoadingModels ? "..." : "↻"}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
