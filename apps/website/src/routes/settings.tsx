import * as stylex from "@stylexjs/stylex";
import { useState } from "react";
import {
  data,
  redirect,
  useLoaderData,
  useNavigate,
  useOutletContext,
  useSubmit,
} from "react-router";
import { SettingsPanel } from "@/components/SettingsPanel";
import type { SettingsFieldErrors } from "@/components/SettingsPanel";
import type { StudioContext } from "@/hooks/useStudio.hook";
import { buildSettingsCookieHeader, parseSettingsCookie } from "@/lib/settings.cookie";
import { VENDOR_ENDPOINTS, VENDORS, fetchModels } from "@/lib/vendors";
import type { VendorId } from "@/lib/vendors";
import { settingsSchema } from "@/routes/settings.schema";
import type { SettingsFormData } from "@/routes/settings.schema";
import { colors } from "@/styles/tokens.stylex";

export const loader = ({ request }: { request: Request }) =>
  parseSettingsCookie(request.headers.get("Cookie"));

export const action = async ({ request }: { request: Request }) => {
  const formData = await request.formData();
  const result = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) {
    return data({ fieldErrors: result.error.flatten().fieldErrors }, { status: 400 });
  }
  return redirect("/", {
    headers: { "Set-Cookie": buildSettingsCookieHeader(result.data) },
  });
};

type DraftSettings = SettingsFormData;

const validateDraft = (draft: DraftSettings): SettingsFieldErrors | null => {
  const vendorDef = VENDORS.find((v) => v.id === draft.vendor);
  const errors: { baseUrl?: string; apiKey?: string; model?: string } = {};

  if (!draft.baseUrl.trim()) {
    errors.baseUrl = "Base URL is required";
  }
  if (vendorDef?.requiresApiKey === true && !draft.apiKey.trim()) {
    errors.apiKey = `API Key is required for ${vendorDef.label}`;
  }
  if (!draft.model.trim()) {
    errors.model = "Please select a model — use ↻ to fetch available models first";
  }

  return Object.keys(errors).length > 0 ? errors : null;
};

const Settings = () => {
  const initialSettings = useLoaderData<typeof loader>();
  const studio = useOutletContext<StudioContext>();
  const navigate = useNavigate();
  const submit = useSubmit();

  const [draft, setDraft] = useState<DraftSettings>({ ...initialSettings });
  const [availableModels, setAvailableModels] = useState<readonly string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [errors, setErrors] = useState<SettingsFieldErrors | null>(null);
  const [showValidationModal, setShowValidationModal] = useState(false);

  const clearErrors = () => {
    if (errors !== null) setErrors(null);
  };

  const handleVendorChange = (vendor: VendorId) => {
    const vendorDef = VENDORS.find((v) => v.id === vendor)!;
    setDraft({
      vendor,
      baseUrl: vendorDef.defaultUrl,
      apiKey: "",
      model: "",
      endpointId: VENDOR_ENDPOINTS[vendor][0].id,
    });
    setAvailableModels([]);
    clearErrors();
    setIsLoadingModels(true);
    void fetchModels(vendor, vendorDef.defaultUrl, "").then((result) => {
      if (result.status === "success") {
        setAvailableModels(result.models);
        if (result.models.length > 0) {
          setDraft((prev) => ({ ...prev, model: result.models[0] ?? "" }));
        }
      }
      setIsLoadingModels(false);
    });
  };

  const handleFetchModels = () => {
    clearErrors();
    setIsLoadingModels(true);
    void fetchModels(draft.vendor, draft.baseUrl, draft.apiKey).then((result) => {
      if (result.status === "success") {
        setAvailableModels(result.models);
        if (result.models.length > 0) {
          setDraft((prev) => ({ ...prev, model: result.models[0] ?? "" }));
        }
      }
      setIsLoadingModels(false);
    });
  };

  const handleAccept = () => {
    const validationErrors = validateDraft(draft);
    if (validationErrors !== null) {
      setErrors(validationErrors);
      setShowValidationModal(true);
      return;
    }

    studio.onApplySettings(draft);

    const formData = new FormData();
    formData.set("vendor", draft.vendor);
    formData.set("baseUrl", draft.baseUrl);
    formData.set("apiKey", draft.apiKey);
    formData.set("model", draft.model);
    formData.set("endpointId", draft.endpointId);
    void submit(formData, { method: "post" });
  };

  const handleCancel = () => {
    void navigate("/");
  };

  return (
    <div {...stylex.props(styles.overlay)}>
      <button
        {...stylex.props(styles.backdrop)}
        type="button"
        aria-label="Close settings"
        onClick={handleCancel}
      />
      <SettingsPanel
        apiKey={draft.apiKey}
        availableModels={availableModels}
        baseUrl={draft.baseUrl}
        endpointId={draft.endpointId}
        errors={errors}
        isLoadingModels={isLoadingModels}
        model={draft.model}
        showValidationModal={showValidationModal}
        vendor={draft.vendor}
        onAccept={handleAccept}
        onApiKeyChange={(key) => {
          setDraft((prev) => ({ ...prev, apiKey: key }));
          clearErrors();
        }}
        onBaseUrlChange={(url) => {
          setDraft((prev) => ({ ...prev, baseUrl: url }));
          clearErrors();
        }}
        onCancel={handleCancel}
        onDismissModal={() => setShowValidationModal(false)}
        onEndpointChange={(endpointId) => setDraft((prev) => ({ ...prev, endpointId }))}
        onFetchModels={handleFetchModels}
        onModelChange={(model) => {
          setDraft((prev) => ({ ...prev, model }));
          clearErrors();
        }}
        onVendorChange={handleVendorChange}
      />
    </div>
  );
};

export default Settings;

const styles = stylex.create({
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 200,
    display: "flex",
    justifyContent: "flex-end",
  },
  backdrop: {
    position: "absolute",
    inset: 0,
    backgroundColor: `color-mix(in srgb, ${colors.bgDark} 60%, transparent)`,
    border: "none",
    cursor: "default",
  },
});
