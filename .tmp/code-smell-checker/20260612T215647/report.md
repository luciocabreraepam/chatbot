# Smell Findings Report

## Metadata

- schema_version: 1.0
- report_id: CSC-20260612T215647
- generated_at: 2026-06-12T21:56:47Z
- skill_name: code-smell-checker
- repository: chatbot
- scope_type: repo
- scope_value: apps/website/src, packages/utils/src
- severity_scale: BLOCKER, HIGH, MEDIUM, LOW, NIT
- classification: mixed
- primary_lens: Clean Code

## Summary

- files_analyzed: 42
- findings_count_by_severity:
  - blocker: 0
  - high: 5
  - medium: 6
  - low: 2
  - nit: 2
- top_risk: Two real runtime bugs are present — global event listener leak in `useResizable` (unmount while dragging leaves orphaned listeners) and unconditional `window.debugDB` + `console.log` injected into production bundles.
- first_3_actions:
  1. Fix the global event-listener leak in `useResizable.hook.ts` — add a ref-based cleanup path for the case where the component unmounts mid-drag.
  2. Gate `dbDebug.ts` behind `import.meta.env.DEV` in both the side-effect import in `useStudio.hook.ts` and in the auto-expose block inside `dbDebug.ts` itself.
  3. Break `handleSendMessage` in `useStreaming.hook.ts` into focused helpers to reduce its 150-line body and 11-item dependency array.

## Findings

### Finding F-001

- finding_id: F-001
- rule_id: CHK.LEAK.GLOBAL-LISTENER
- severity: HIGH
- confidence: high
- location_path: apps/website/src/hooks/useResizable.hook.ts
- location_hint: lines 31–44
- evidence_excerpt:

```text
const onMove = (event: MouseEvent): void => { ... };
const onUp = (): void => {
  setIsDragging(false);
  globalThis.removeEventListener("mousemove", onMove);
  globalThis.removeEventListener("mouseup", onUp);
};
globalThis.addEventListener("mousemove", onMove);
globalThis.addEventListener("mouseup", onUp);
```

- why: Cleanup only fires when `mouseup` triggers `onUp`; if the component unmounts while the user is still dragging (e.g., a route transition), the listeners remain attached, leaking memory and potentially calling `setWidth` on an unmounted component.
- fix: Track the listener pair in a ref and add a `useEffect` cleanup (or abort with an `AbortController`) so the listeners are removed on unmount regardless of drag state.
- effort: small
- defer_risk: Deferred, the leak accumulates on every drag-cancel navigation and can eventually degrade performance or cause "cannot update state on an unmounted component" warnings.
- verification_steps:
  - Start a drag on the sidebar/inspector resize handle and immediately navigate away; confirm no "setState on unmounted component" warnings in the console.
  - Confirm `globalThis._getEventListeners` (or a browser devtools snapshot) shows no orphaned `mousemove`/`mouseup` handlers after navigation.
- status: open

---

### Finding F-002

- finding_id: F-002
- rule_id: CHK.HYGIENE.DEBUG-PROD
- severity: HIGH
- confidence: high
- location_path: apps/website/src/lib/dbDebug.ts
- location_hint: lines 119–127
- evidence_excerpt:

```text
// Auto-expose on window for easy console access
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).debugDB = { ... };
  console.log("✅ Debug DB utilities available at window.debugDB");
}
```

- why: The file is imported unconditionally in `useStudio.hook.ts` (`import "@/lib/dbDebug"`) with no `DEV` guard, so the `console.log` fires and `window.debugDB` is mutated on every production page load.
- fix: Wrap the auto-expose block in `if (import.meta.env.DEV)` inside `dbDebug.ts` and add the same guard around the import in `useStudio.hook.ts` (use a dynamic `import()` or a compile-time constant check).
- effort: small
- defer_risk: Every production user sees a stray console message; `window.debugDB` exposes internal IndexedDB utilities publicly, which is an information-disclosure risk.
- verification_steps:
  - Build with `vp build` and open the production bundle; confirm `debugDB` and the console message are tree-shaken out.
  - In `vp dev`, confirm `window.debugDB` is still available and the console message still fires.
- status: open

---

### Finding F-003

- finding_id: F-003
- rule_id: CHK.FUNC.LONG
- severity: HIGH
- confidence: high
- location_path: apps/website/src/hooks/useStreaming.hook.ts
- location_hint: lines 85–261 (handleSendMessage useCallback body)
- evidence_excerpt:

```text
const handleSendMessage = useCallback(
  async (content: string) => {
    // 1. guard
    // 2. generate or reuse conv ID
    // 3. create/update conversation record
    // 4. build and persist user message
    // 5. build request payload
    // 6. initialise metricsRef
    // 7. call streamChat with 7 inline callbacks (onChunk, onFirstToken,
    //    onRawEvent, onRequestMetadata, onHttpMetadata, onTokenCount,
    //    onUsage, onComplete [async, saves assistant msg], onError)
  },
  [ /* 11 deps */ ],
);
```

- why: A 175-line callback that mixes conversation lifecycle, message persistence, streaming-state management, and metrics collection has six distinct reasons to change; any modification requires understanding the entire function.
- fix: Extract at minimum three helpers: `createOrUpdateConversation(...)`, `buildUserMessage(...)`, and `persistAssistantMessage(...)`, each living in `lib/` as pure async functions that the hook orchestrates.
- effort: medium
- defer_risk: Deferred, the function will continue to accumulate ad-hoc edge-case branches, making each future change riskier.
- verification_steps:
  - After refactor, confirm `handleSendMessage` is ≤ 50 lines and its `useCallback` dependency array has ≤ 6 items.
  - Run `vp test` and confirm `useStreaming.test.ts` still passes.
- status: open
- related_findings: F-005

---

### Finding F-004

- finding_id: F-004
- rule_id: CHK.ARCH.IO-IN-LOGIC
- severity: HIGH
- confidence: high
- location_path: apps/website/src/lib/stream.ts
- location_hint: lines 156–163
- evidence_excerpt:

```text
} else if (vendor === "litellm") {
  const liteLlmKey = import.meta.env.VITE_LITE_LLM_API_KEY;
  if (liteLlmKey) headers["Authorization"] = `Bearer ${liteLlmKey}`;
}
```

- why: `streamChat` reads an environment variable directly instead of receiving the key as a parameter, coupling a pure networking function to the build-time environment; the function cannot be unit-tested without mocking `import.meta.env`.
- fix: Remove the `import.meta.env` read from `streamChat`; read `VITE_LITE_LLM_API_KEY` once at the call-site (e.g., in the `useStreaming` hook or the vendor config) and pass it as the `apiKey` argument.
- effort: small
- defer_risk: Every new vendor that requires env-based keys will add another `import.meta.env` call inside the function, deepening the I/O coupling.
- verification_steps:
  - `streamChat` must have no references to `import.meta.env` after the fix.
  - Write a unit test for `streamChat` with a mock fetch; confirm it can run without patching `import.meta.env`.
- status: open

---

### Finding F-005

- finding_id: F-005
- rule_id: CHK.ARCH.LEAKY-ABSTRACTION
- severity: HIGH
- confidence: high
- location_path: apps/website/src/hooks/useConversations.hook.ts
- location_hint: lines 5–17 (UseConversationsReturn type)
- evidence_excerpt:

```text
export type UseConversationsReturn = {
  ...
  readonly setMessages: React.Dispatch<React.SetStateAction<readonly Message[]>>;
  readonly setConversations: React.Dispatch<React.SetStateAction<readonly Conversation[]>>;
  readonly setActiveConvId: React.Dispatch<React.SetStateAction<string | null>>;
  ...
};
```

- why: Exposing raw React `Dispatch` setters as the public API of `useConversations` allows `useStreaming` (and any future consumer) to mutate the hook's internal state without going through the hook's own validation and side-effects, breaking the encapsulation contract.
- fix: Replace the three raw setters with higher-level action methods — e.g., `addMessage(msg)`, `prependConversation(conv)`, `refreshConversations()` — that encapsulate the state transitions inside the hook.
- effort: medium
- defer_risk: Deferred, direct setter access will cause subtle state inconsistencies whenever `useConversations` tries to add invariant-preserving logic (e.g., deduplication, sorting) since `useStreaming` bypasses it.
- verification_steps:
  - After refactor, no `React.Dispatch` types appear in `UseConversationsReturn`.
  - `useStreaming` no longer accepts `setMessages`, `setConversations`, or `setActiveConvId` as parameters.
  - `vp test` passes.
- status: open
- related_findings: F-003

---

### Finding F-006

- finding_id: F-006
- rule_id: CHK.FUNC.DUPLICATE
- severity: MEDIUM
- confidence: high
- location_path: apps/website/src/routes/settings.tsx
- location_hint: lines 70–105 (handleVendorChange and handleFetchModels)
- evidence_excerpt:

```text
// handleVendorChange (lines 82–90):
void fetchModels(vendor, vendorDef.defaultUrl, "").then((result) => {
  if (result.status === "success") {
    setAvailableModels(result.models);
    if (result.models.length > 0)
      setDraft((prev) => ({ ...prev, model: result.models[0] ?? "" }));
  }
  setIsLoadingModels(false);
});

// handleFetchModels (lines 96–105): near-identical body
void fetchModels(draft.vendor, draft.baseUrl, draft.apiKey).then((result) => {
  if (result.status === "success") {
    setAvailableModels(result.models);
    if (result.models.length > 0)
      setDraft((prev) => ({ ...prev, model: result.models[0] ?? "" }));
  }
  setIsLoadingModels(false);
});
```

- why: The model-fetching and state-update sequence is copy-pasted; a bug fix in one branch will not automatically fix the other.
- fix: Extract a single `fetchAndApplyModels(vendor, baseUrl, apiKey)` async helper that both handlers call, removing the duplication.
- effort: small
- defer_risk: The two paths will silently diverge as feature requirements evolve.
- verification_steps:
  - After refactor, the pattern `result.status === "success"` appears exactly once in `settings.tsx`.
  - Manual test: changing vendor auto-fetches models; clicking ↻ also fetches correctly.
- status: open

---

### Finding F-007

- finding_id: F-007
- rule_id: CHK.FUNC.LONG
- severity: MEDIUM
- confidence: high
- location_path: apps/website/src/components/Inspector/Inspector.component.tsx
- location_hint: lines 97–181 (renderTabContent function)
- evidence_excerpt:

```text
const renderTabContent = () => {
  if (!selectedMessage) return null;
  if (activeTab === "request") { /* ~30 lines */ }
  if (activeTab === "response") { /* ~30 lines */ }
  if (activeTab === "http") { return <HttpMetadataTab ... />; }
  if (activeTab === "metrics") { /* ~10 lines */ }
  return null;
};
```

- why: An 85-line inline render function with four sequential `if` branches creates a new function reference on every render and makes each tab's rendering logic difficult to read or test in isolation.
- fix: Extract each tab body into a named sub-component (`RequestTab`, `ResponseTab`, `HttpTab`, `MetricsTab`) and drive rendering via a lookup map keyed on `InspectorTab`, eliminating the function entirely.
- effort: medium
- defer_risk: Every new inspector tab adds another branch to this function, linearly increasing cognitive load.
- verification_steps:
  - After refactor, `Inspector.component.tsx` has no `renderTabContent` function; each tab is a standalone component.
  - All four tabs still render correctly when a message is selected.
- status: open

---

### Finding F-008

- finding_id: F-008
- rule_id: CHK.HYGIENE.DUPLICATE-VALIDATION
- severity: MEDIUM
- confidence: high
- location_path: apps/website/src/routes/settings.tsx
- location_hint: lines 37–52 (validateDraft)
- evidence_excerpt:

```text
const validateDraft = (draft: DraftSettings): SettingsFieldErrors | null => {
  if (!draft.baseUrl.trim()) errors.baseUrl = "Base URL is required";
  if (vendorDef?.requiresApiKey === true && !draft.apiKey.trim()) errors.apiKey = ...;
  if (!draft.model.trim()) errors.model = ...;
  return Object.keys(errors).length > 0 ? errors : null;
};
```

- why: The Zod `settingsSchema` (in `settings.schema.ts`) already encodes the same constraints; `validateDraft` duplicates them in imperative code and will silently diverge if the schema evolves.
- fix: Replace `validateDraft` with a call to `settingsSchema.safeParse(draft)`; map `result.error.flatten().fieldErrors` to `SettingsFieldErrors` directly, removing the hand-written validator.
- effort: small
- defer_risk: Schema and manual validator will diverge, producing inconsistent error messages depending on which path fires.
- verification_steps:
  - After refactor, `validateDraft` is deleted; error display is driven entirely by Zod output.
  - Submit with missing fields; confirm all three error messages still display correctly.
- status: open

---

### Finding F-009

- finding_id: F-009
- rule_id: CHK.ARCH.MISSING-STRATEGY
- severity: MEDIUM
- confidence: medium
- location_path: apps/website/src/lib/stream.ts
- location_hint: lines 150–163 (auth header construction)
- evidence_excerpt:

```text
if (vendor === "openai" && apiKey) {
  headers["Authorization"] = `Bearer ${apiKey}`;
} else if (vendor === "litellm") {
  const liteLlmKey = import.meta.env.VITE_LITE_LLM_API_KEY;
  if (liteLlmKey) headers["Authorization"] = `Bearer ${liteLlmKey}`;
} else if (isAnthropicVendor && apiKey) {
  headers["x-api-key"] = apiKey;
  headers["anthropic-version"] = STREAM_DEFAULTS.anthropicApiVersion;
}
```

- why: Adding a new vendor requires editing `streamChat`'s internals (shotgun surgery); the vendor config in `vendors.ts` already has `requiresApiKey` but isn't used here, creating a second source of truth.
- fix: Move auth-header construction into the `VENDOR_ENDPOINTS` / `VENDORS` data structure as a `buildAuthHeaders(apiKey: string) => Record<string, string>` field, so `streamChat` simply calls `vendor.buildAuthHeaders(apiKey)`.
- effort: medium
- defer_risk: Each new vendor (or auth scheme change) requires touching `streamChat` rather than just the vendor definition.
- verification_steps:
  - After refactor, `streamChat` has no `if (vendor === ...)` branches for auth.
  - All existing vendors still authenticate correctly in `vp dev` manual testing.
- status: open
- related_findings: F-004

---

### Finding F-010

- finding_id: F-010
- rule_id: CHK.HYGIENE.SILENT-ERROR
- severity: MEDIUM
- confidence: high
- location_path: apps/website/src/hooks/useStreaming.hook.ts
- location_hint: lines 231–234 (onComplete callback)
- evidence_excerpt:

```text
try {
  await saveMessage(assistantMsg);
} catch (e) {
  console.error(e);
}
```

- why: If IndexedDB write fails (quota exceeded, browser restriction, storage error), the assistant message is displayed in the UI but silently lost; the user believes the conversation was saved but it wasn't.
- fix: Surface persistence failures to the user — either re-use `setStreamError` or add a dedicated `setPersistError` state; at minimum, display a dismissible toast indicating "Message could not be saved."
- effort: small
- defer_risk: Users may lose conversation history without any indication, eroding trust in the application.
- verification_steps:
  - Simulate an IndexedDB write failure (e.g., mock `saveMessage` to reject); confirm the UI shows an error message to the user.
- status: open

---

### Finding F-011

- finding_id: F-011
- rule_id: CHK.SECURITY.COOKIE-FLAGS
- severity: MEDIUM
- confidence: high
- location_path: apps/website/src/lib/settings.cookie.ts
- location_hint: line 68 (buildSettingsCookieHeader)
- evidence_excerpt:

```text
return `${COOKIE_NAME}=${value}; Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax`;
```

- why: The API key is stored in the cookie without `HttpOnly`, making it readable by any JavaScript running on the page; an XSS vulnerability anywhere in the app would expose the user's API key to the attacker.
- fix: Add `; HttpOnly` to the cookie header; the value is already read server-side via the loader so the JS runtime never needs direct cookie access.
- effort: small
- defer_risk: Any future XSS (third-party script, prototype pollution, etc.) will exfiltrate the API key silently.
- verification_steps:
  - After the fix, open browser DevTools → Application → Cookies and confirm `connection_settings` has the HttpOnly flag.
  - Confirm `document.cookie` in the console does not contain `connection_settings`.
  - Confirm settings still load correctly from the loader (server-side cookie read is unaffected).
- status: open

---

### Finding F-012

- finding_id: F-012
- rule_id: CHK.FUNC.DUPLICATE
- severity: LOW
- confidence: high
- location_path: apps/website/src/hooks/useStreaming.hook.ts and apps/website/src/lib/stream.ts
- location_hint: useStreaming line 26; stream.ts lines 88–91
- evidence_excerpt:

```text
// useStreaming.hook.ts
const estimateTokens = (text: string): number => Math.ceil(text.split(/\s+/).length * 1.3);

// stream.ts
const estimateTokensFromChunk = (chunk: string): number => {
  const wordCount = chunk.split(/\s+/).filter((word) => word.length > 0).length;
  return Math.ceil(wordCount * 1.3);
};
```

- why: Two implementations of the same heuristic exist; the `stream.ts` version correctly filters empty strings (giving a slightly different result for inputs with leading/trailing whitespace) while the hook version does not.
- fix: Extract a single `estimateTokenCount(text: string): number` utility into `lib/` and import it in both places.
- effort: small
- defer_risk: The inconsistency will produce different token counts depending on which branch handles an event, making metrics slightly inaccurate and confusing to debug.
- verification_steps:
  - After fix, only one `estimateToken*` function exists in the codebase.
  - `vp test` passes.
- status: open

---

### Finding F-013

- finding_id: F-013
- rule_id: CHK.PERF.INLINE-CONSTANT
- severity: LOW
- confidence: high
- location_path: apps/website/src/components/Inspector/Inspector.component.tsx
- location_hint: lines 90–95
- evidence_excerpt:

```text
const tabs: readonly { readonly id: InspectorTab; readonly label: string }[] = [
  { id: "request", label: "Request" },
  { id: "response", label: "Response" },
  { id: "http", label: "HTTP" },
  { id: "metrics", label: "Metrics" },
];
```

- why: The `tabs` array is constant but is re-created on every render because it is defined inside the component body; the pattern in `MarkdownRenderer.component.tsx` (module-scope constant `MARKDOWN_COMPONENTS`) is the correct precedent for this project.
- fix: Move the `tabs` definition to module scope as `const INSPECTOR_TABS = [...]`.
- effort: small
- defer_risk: Minor — only affects reference stability and slight GC pressure; no user-visible bug.
- verification_steps:
  - After fix, `tabs` does not appear inside the `Inspector` function body.
- status: open

---

### Finding F-014

- finding_id: F-014
- rule_id: CHK.REACT.INLINE-LAMBDA
- severity: NIT
- confidence: high
- location_path: apps/website/src/components/Sidebar/Sidebar.component.tsx and Inspector.component.tsx
- location_hint: Sidebar line 71; Inspector line 218
- evidence_excerpt:

```text
// Sidebar.component.tsx
onClick={() => onSelectConversation(conv.id)}

// Inspector.component.tsx
onClick={() => onTabChange(tab.id)}
```

- why: The StyleX rule file (`.claude/rules/stylex.md`) explicitly forbids anonymous inline functions in JSX event handlers because they create a new reference every render and break memoization; both occurrences are inside `.map()` callbacks where a stable handler is easy to produce.
- fix: In Sidebar, pass `conv.id` via a `data-id` attribute and read it from `e.currentTarget.dataset.id` in a stable `handleSelect` handler; in Inspector, use the same approach for `tab.id`.
- effort: small
- defer_risk: Technically low impact for these small lists; primarily violates the project convention.
- verification_steps:
  - After fix, no inline arrow functions appear in JSX `onClick` handlers in these two files.
- status: open

---

### Finding F-015

- finding_id: F-015
- rule_id: CHK.TS.ROUTE-TYPES
- severity: NIT
- confidence: high
- location_path: apps/website/src/routes/home.tsx and apps/website/src/routes/settings.tsx
- location_hint: home.tsx line 17; settings.tsx lines 21, 24
- evidence_excerpt:

```text
// home.tsx
export const loader = ({ request }: { request: Request }) => ({ ... });

// settings.tsx
export const loader = ({ request }: { request: Request }) => ...;
export const action = async ({ request }: { request: Request }) => { ... };
```

- why: The project rules (`routes.md`) require using generated `Route.LoaderArgs` / `Route.ActionArgs` types; raw `{ request: Request }` loses type safety on params and prevents TypeScript from catching signature mismatches if the route schema changes.
- fix: Import and use `Route.LoaderArgs` / `Route.ActionArgs` from `./+types/<route-name>` in both route files.
- effort: small
- defer_risk: Low for simple routes with no path params; becomes a real bug risk if params are added later.
- verification_steps:
  - After fix, `vp check` reports no `Route.LoaderArgs` violations.
- status: open

---

## Prioritized Execution Queue

1. queue_rank: 1

- target_finding_ids: F-001, F-002
- reason_for_order: These are runtime bugs with direct user impact — a memory/listener leak on every drag-cancel navigation and a production console message that exposes internal utilities.
- expected_outcome: No orphaned global listeners after navigation; production bundle is clean of debug artifacts and `window.debugDB`.

2. queue_rank: 2

- target_finding_ids: F-011
- reason_for_order: Security defect that can be fixed in one line; adding `HttpOnly` to the settings cookie closes the API-key XSS exfiltration vector before other work shifts focus.
- expected_outcome: API key cookie is HttpOnly; `document.cookie` no longer exposes it to JavaScript.

3. queue_rank: 3

- target_finding_ids: F-003, F-005
- reason_for_order: These two are structurally linked — extracting helpers from `handleSendMessage` (F-003) requires replacing the raw-setter API in `useConversations` (F-005) first to avoid passing setters deeper.
- expected_outcome: `handleSendMessage` is ≤ 50 lines; `UseConversationsReturn` exposes no `React.Dispatch` types.

4. queue_rank: 4

- target_finding_ids: F-004, F-009
- reason_for_order: Both touch `stream.ts` auth logic; fixing env-var read (F-004) and refactoring the if/else auth chain (F-009) together avoids two separate passes over the same file.
- expected_outcome: `streamChat` contains no `import.meta.env` reads and no vendor-specific `if` branches.

5. queue_rank: 5

- target_finding_ids: F-006, F-008
- reason_for_order: Both are in `settings.tsx` and can be addressed in a single PR; deduplicating the model-fetch logic and removing the parallel validator reduces the file from ~190 to ~140 lines.
- expected_outcome: Single model-fetch helper; `validateDraft` deleted; Zod is the only validation path.

6. queue_rank: 6

- target_finding_ids: F-007
- reason_for_order: Inspector refactor is isolated to its own component directory and unblocks future tab additions without accumulating branches.
- expected_outcome: `renderTabContent` is gone; each inspector tab is a standalone component.

7. queue_rank: 7

- target_finding_ids: F-010, F-012, F-013, F-014, F-015
- reason_for_order: Remaining low/nit findings; batch in a single cleanup PR after higher-priority work stabilises.
- expected_outcome: Silent persistence error surfaced to user; duplicated token estimator consolidated; inline constants and lambdas conform to project rules; route types use generated `Route.*` args.

## Deferred Items

None.

## Validation Checklist

- [x] Required sections present
- [x] Required metadata fields present
- [x] Summary counts match findings (0 BLOCKER, 5 HIGH, 6 MEDIUM, 2 LOW, 2 NIT = 15 total)
- [x] Each finding has evidence_excerpt, why, fix
- [x] Each finding has verification_steps
- [x] Severity values are canonical
- [x] Prioritized queue present when findings exist

## Closure Criteria

- No open HIGH findings remain unaddressed (fixed or formally deferred with owner and rationale).
- `useResizable.hook.ts` has a verified cleanup path for mid-drag unmount.
- Production bundle (`vp build`) contains no references to `window.debugDB` or the debug console message.
- `useConversations` public API exposes no `React.Dispatch` types.
- `streamChat` has no `import.meta.env` reads and no vendor-string `if` branches.
- `vp check` and `vp test` both pass green after all changes.
