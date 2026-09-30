import * as stylex from "@stylexjs/stylex";
import { VENDOR_ENDPOINTS, VENDORS } from "@/lib/vendors";
import type { VendorId } from "@/lib/vendors";
import type { SettingsPanelProps } from "./SettingsPanel.types";
import { styles } from "./SettingsPanel.stylex";

export const SettingsPanel = ({
  apiKey,
  availableModels,
  baseUrl,
  endpointId,
  errors,
  isLoadingModels,
  model,
  showValidationModal,
  vendor,
  onAccept,
  onApiKeyChange,
  onBaseUrlChange,
  onCancel,
  onDismissModal,
  onEndpointChange,
  onFetchModels,
  onModelChange,
  onVendorChange,
}: SettingsPanelProps) => {
  const currentVendor = VENDORS.find((v) => v.id === vendor);
  const vendorEndpoints = VENDOR_ENDPOINTS[vendor];
  const missingFields = errors
    ? Object.values(errors).filter((v): v is string => v !== undefined)
    : [];

  const handleVendorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onVendorChange(e.target.value as VendorId);
  };

  return (
    <aside {...stylex.props(styles.panel)}>
      {showValidationModal && (
        <div
          {...stylex.props(styles.modalOverlay)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="validation-modal-title"
        >
          <div {...stylex.props(styles.modal)}>
            <h2 {...stylex.props(styles.modalTitle)} id="validation-modal-title">
              Required fields missing
            </h2>
            <ul {...stylex.props(styles.modalList)}>
              {missingFields.map((msg) => (
                <li key={msg} {...stylex.props(styles.modalListItem)}>
                  {msg}
                </li>
              ))}
            </ul>
            <button {...stylex.props(styles.modalBtn)} type="button" onClick={onDismissModal}>
              Got it
            </button>
          </div>
        </div>
      )}

      <div {...stylex.props(styles.header)}>
        <span {...stylex.props(styles.headerTitle)}>Connection Settings</span>
        <button
          {...stylex.props(styles.closeBtn)}
          type="button"
          aria-label="Close settings"
          onClick={onCancel}
        >
          ✕
        </button>
      </div>

      <div {...stylex.props(styles.body)}>
        <div {...stylex.props(styles.section)}>
          <span {...stylex.props(styles.sectionLabel)}>Provider</span>

          <div {...stylex.props(styles.field)}>
            <label {...stylex.props(styles.label)}>Vendor</label>
            <select {...stylex.props(styles.select)} value={vendor} onChange={handleVendorChange}>
              {VENDORS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>

          <div {...stylex.props(styles.field)}>
            <label {...stylex.props(styles.label)}>Base URL</label>
            <input
              {...stylex.props(styles.input, errors?.baseUrl !== undefined && styles.inputError)}
              type="url"
              value={baseUrl}
              placeholder="http://localhost:8000"
              spellCheck={false}
              onChange={(e) => onBaseUrlChange(e.target.value)}
            />
            {errors?.baseUrl !== undefined && (
              <span {...stylex.props(styles.fieldError)} role="alert">
                {errors.baseUrl}
              </span>
            )}
          </div>

          {currentVendor?.requiresApiKey === true && (
            <div {...stylex.props(styles.field)}>
              <label {...stylex.props(styles.label)}>API Key</label>
              <input
                {...stylex.props(styles.input, errors?.apiKey !== undefined && styles.inputError)}
                type="password"
                value={apiKey}
                placeholder="sk-..."
                onChange={(e) => onApiKeyChange(e.target.value)}
              />
              {errors?.apiKey !== undefined && (
                <span {...stylex.props(styles.fieldError)} role="alert">
                  {errors.apiKey}
                </span>
              )}
            </div>
          )}
        </div>

        <div {...stylex.props(styles.section)}>
          <span {...stylex.props(styles.sectionLabel)}>Endpoint</span>

          <div {...stylex.props(styles.field)}>
            <label {...stylex.props(styles.label)}>API Endpoint</label>
            <select
              {...stylex.props(styles.select)}
              value={endpointId}
              onChange={(e) => onEndpointChange(e.target.value)}
            >
              {vendorEndpoints.map((ep) => (
                <option key={ep.id} value={ep.id}>
                  {ep.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div {...stylex.props(styles.section)}>
          <span {...stylex.props(styles.sectionLabel)}>Model</span>

          <div {...stylex.props(styles.field)}>
            <label {...stylex.props(styles.label)}>Model</label>
            <div {...stylex.props(styles.modelRow)}>
              <select
                {...stylex.props(
                  styles.select,
                  styles.modelSelect,
                  errors?.model !== undefined && styles.inputError,
                )}
                value={model}
                disabled={availableModels.length === 0 && model === ""}
                onChange={(e) => onModelChange(e.target.value)}
              >
                {availableModels.length === 0 && model === "" && (
                  <option value="">— fetch models —</option>
                )}
                {availableModels.length === 0 && model !== "" && (
                  <option value={model}>{model}</option>
                )}
                {availableModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <button
                {...stylex.props(styles.fetchBtn)}
                type="button"
                disabled={isLoadingModels}
                onClick={onFetchModels}
              >
                {isLoadingModels ? "..." : "↻"}
              </button>
            </div>
            {errors?.model !== undefined && (
              <span {...stylex.props(styles.fieldError)} role="alert">
                {errors.model}
              </span>
            )}
          </div>
        </div>
      </div>

      <div {...stylex.props(styles.footer)}>
        <button {...stylex.props(styles.cancelBtn)} type="button" onClick={onCancel}>
          Cancel
        </button>
        <button {...stylex.props(styles.acceptBtn)} type="button" onClick={onAccept}>
          Accept
        </button>
      </div>
    </aside>
  );
};
