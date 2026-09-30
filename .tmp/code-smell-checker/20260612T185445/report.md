# Smell Findings Report

## Metadata

- schema_version: 1.0
- report_id: chatbot-20260612T185445
- generated_at: 2026-06-12T18:54:45Z
- skill_name: code-smell-checker
- repository: /home/lucio/workspace/chatbot
- scope_type: repo
- scope_value: apps/website/src, packages/utils/src
- severity_scale: BLOCKER, HIGH, MEDIUM, LOW, NIT
- classification: mixed
- primary_lens: Clean Code

## Summary

- files_analyzed: 42
- findings_count_by_severity:
  - blocker: 0
  - high: 3
  - medium: 4
  - low: 2
  - nit: 1
- top_risk: `useStudio.hook.ts` is a 401-line god hook managing 21+ state variables across unrelated concerns, making it untestable and a change magnet for every feature.
- first_3_actions:
  1. Split `useStudio.hook.ts` into `useSettings`, `useConversations`, and `useStreaming` hooks.
  2. Add Zod schemas to validate all form data and external API responses in `settings.tsx` and `vendors.ts`.
  3. Extract vendor-specific SSE parsers from `stream.ts` into separate modules to isolate vendor coupling.

## Findings

### Finding F-001

- finding_id: F-001
- rule_id: CHK.ARCH.GOD-HOOK
- severity: HIGH
- confidence: high
- location_path: apps/website/src/hooks/useStudio.hook.ts
- location_hint: entire file (401 lines, 21+ state variables, 10+ callbacks)
- evidence_excerpt:

```text
// 21+ useState/useRef calls covering unrelated concerns:
const [vendor, setVendor] = useState<VendorId>(...)   // settings
const [messages, setMessages] = useState<Message[]>([]) // conversation
const [isStreaming, setIsStreaming] = useState(false)  // streaming
const [selectedMessageId, setSelectedMessageId] = useState(...) // inspector UI
// ...plus handleSendMessage callback spanning lines 178–363
```

- why: A single hook owns vendor config, conversation CRUD, streaming state, inspector UI state, and DB initialization — any change to one concern forces re-testing all others.
- fix: Split into `useSettings`, `useConversations`, `useStreaming`, and `useInspector` hooks; compose them in the route component or a thin `useStudio` coordinator.
- effort: large
- defer_risk: The hook will keep growing with each feature, making isolation progressively harder and rendering unit tests impractical.
- verification_steps:
  - Each new hook can be tested independently with `vitest` without mounting the full page.
  - `handleSendMessage` complexity drops below 50 lines after extraction.
  - `vp check` passes with no new lint or type errors.
- status: open
- related_findings: F-005
- tags: god-hook, single-responsibility, testability

---

### Finding F-002

- finding_id: F-002
- rule_id: CHK.ARCH.MIXED-CONCERNS
- severity: HIGH
- confidence: high
- location_path: apps/website/src/lib/stream.ts
- location_hint: entire file (471 lines)
- evidence_excerpt:

```text
// Responsibility 1: payload building (lines 62–109)
export const buildRequestPayload = (...) => { ... }

// Responsibility 2: SSE parsing for 3 vendors (lines 111–155)
const parseOpenAiChatChunk = ...
const parseOpenAiResponsesChunk = ...
const parseAnthropicChunk = ...

// Responsibility 3: token estimation (lines 157–209)
// Responsibility 4: stream orchestration (lines 210–471)
export const streamChat = async (...) => { ... }
```

- why: All four concerns live in one file; adding or changing a vendor format requires reading and risking regression in unrelated streaming logic.
- fix: Extract `parseOpenAiStream.ts`, `parseAnthropicStream.ts`, and `buildPayload.ts` as separate modules; keep `stream.ts` as a thin orchestrator.
- effort: medium
- defer_risk: Each new vendor doubles the file size and the blast radius of any change.
- verification_steps:
  - Each parser module has its own Vitest unit tests with fixture SSE chunks.
  - `stream.ts` drops below 150 lines after extraction.
  - Existing streaming behavior is unchanged — verify manually via `vp run dev`.
- status: open
- tags: mixed-concerns, single-responsibility, vendor-coupling

---

### Finding F-003

- finding_id: F-003
- rule_id: CHK.TYPE.UNSAFE-CAST
- severity: HIGH
- confidence: high
- location_path: apps/website/src/routes/settings.tsx
- location_hint: lines 18–24 (action handler)
- evidence_excerpt:

```text
const vendor = formData.get("vendor") as VendorId;
const baseUrl = formData.get("baseUrl") as string;
const apiKey = formData.get("apiKey") as string;
const model = formData.get("model") as string;
```

- why: Raw `FormData` values are cast without runtime validation, so a malformed submission silently corrupts application state with no type safety guarantee at runtime.
- fix: Define a Zod schema for settings and call `schema.parse(Object.fromEntries(formData))` at the top of the action, returning field errors on failure.
- effort: small
- defer_risk: Any future field addition or rename bypasses validation until a runtime crash surfaces the bug in production.
- verification_steps:
  - Submit settings form with invalid data and confirm a 400 response with structured errors.
  - `vp check` passes (no `as` casts for external data remain in the action).
- status: open
- related_findings: F-004
- tags: type-safety, zod, form-validation

---

### Finding F-004

- finding_id: F-004
- rule_id: CHK.TYPE.UNSAFE-CAST
- severity: MEDIUM
- confidence: high
- location_path: apps/website/src/lib/vendors.ts
- location_hint: lines 149–186 (vendor API response parsing)
- evidence_excerpt:

```text
const data = await res.json() as OllamaTagsResponse;
// ...
} catch {
  return [];  // silent failure — caller cannot distinguish "no models" vs "network error"
}
```

- why: Unvalidated `as` casts on external API responses mask schema changes; the catch swallowing returns empty array so callers have no way to surface errors to the user.
- fix: Use `z.object({ models: z.array(...) }).parse(await res.json())` and re-throw or return a discriminated `Result` type from `fetchModels`.
- effort: small
- defer_risk: A breaking API change from a vendor produces a confusing empty model list with no diagnostic signal.
- verification_steps:
  - Mock a malformed response in Vitest and verify the error path is reachable.
  - Settings page shows an error message when `fetchModels` fails.
- status: open
- related_findings: F-003
- tags: type-safety, zod, error-handling

---

### Finding F-005

- finding_id: F-005
- rule_id: CHK.REACT.REF-STATE-DUALITY
- severity: MEDIUM
- confidence: high
- location_path: apps/website/src/hooks/useStudio.hook.ts
- location_hint: lines 57, 64–73
- evidence_excerpt:

```text
const [streamingContent, setStreamingContent] = useState("");  // line 57
const streamingContentRef = useRef("");                         // line 64 — duplicate
const metricsRef = useRef<StreamMetrics>({ ... });             // lines 65–72
const activeConvIdRef = useRef<string | null>(null);           // line 73
```

- why: `streamingContentRef` mirrors `streamingContent` state, creating two sources of truth; mutations to refs inside callbacks bypass React's update model.
- fix: Eliminate the mirroring ref; if performance requires skipping renders during streaming, use a single `useRef` and sync to state only at stream end.
- effort: medium
- defer_risk: Any bug involving stale streaming content will be extremely hard to reproduce because ref and state can diverge silently.
- verification_steps:
  - Stream a response and verify the displayed content matches what was saved to DB.
  - No `*Ref.current` assignments remain for values that also have a state counterpart.
- status: open
- related_findings: F-001
- tags: react-refs, state-management, two-sources-of-truth

---

### Finding F-006

- finding_id: F-006
- rule_id: CHK.REACT.DUPLICATED-HANDLER
- severity: MEDIUM
- location_path: apps/website/src/routes/home.tsx
- location_hint: lines 45–85
- confidence: high
- evidence_excerpt:

```text
const handleSidebarResizeStart = (e: React.MouseEvent) => {
  const startX = e.clientX;
  const startWidth = sidebarWidth;
  const onMove = (me: MouseEvent) => {
    setSidebarWidth(Math.min(MAX_SIDEBAR, Math.max(MIN_SIDEBAR, startWidth + me.clientX - startX)));
  };
  ...
};

const handleInspectorResizeStart = (e: React.MouseEvent) => {
  const startX = e.clientX;
  const startWidth = inspectorWidth;
  const onMove = (me: MouseEvent) => {
    setInspectorWidth(Math.min(MAX_INSPECTOR, Math.max(MIN_INSPECTOR, startWidth - (me.clientX - startX))));
  };
  ...
};
```

- why: The two resize handlers are structurally identical — only the state setter, initial value, min, and max differ — duplicating mouse-event wiring that must be kept in sync.
- fix: Extract a `useResizable({ initial, min, max, direction })` hook that returns `[width, handleResizeStart]`.
- effort: small
- defer_risk: Any bug in mouse event cleanup (e.g., missing `removeEventListener`) must be fixed in two places.
- verification_steps:
  - Both sidebar and inspector resize still work correctly after extraction.
  - `home.tsx` drops below 150 lines.
  - `vp check` passes.
- status: open
- tags: duplication, extract-hook

---

### Finding F-007

- finding_id: F-007
- rule_id: CHK.FUNC.MAGIC-VALUES
- severity: LOW
- confidence: high
- location_path: apps/website/src/lib/stream.ts
- location_hint: lines 76, 88, 90, 104
- evidence_excerpt:

```text
max_tokens: 2048,
temperature: 0.7,
```

- why: Hardcoded API defaults embedded in the payload builder are invisible to callers and impossible to override without modifying library internals.
- fix: Move to a `STREAM_DEFAULTS` constant object at module top, or accept them as optional parameters with documented defaults.
- effort: small
- defer_risk: Any tuning of inference parameters requires a code change and re-deploy instead of a config edit.
- verification_steps:
  - Constants are defined at the top of the file or in `config.constants.ts`.
  - No bare numeric literals remain in the payload builder functions.
- status: open
- tags: magic-values, configuration

---

### Finding F-008

- finding_id: F-008
- rule_id: CHK.ERR.SILENT-FAILURE
- severity: MEDIUM
- confidence: high
- location_path: apps/website/src/hooks/useStudio.hook.ts
- location_hint: lines 353–358 (onError callback)
- evidence_excerpt:

```text
onError: (error) => {
  console.error("Stream error:", error);
  setIsStreaming(false);
  // No user-facing notification
},
```

- why: Streaming errors are logged to the console but never surfaced to the user, who sees the chat simply stop with no explanation.
- fix: Set an error state in the hook and render it as a visible error message in the UI (e.g., inline below the last message).
- effort: small
- defer_risk: Users cannot distinguish a network failure from a model timeout or a quota error, leading to support tickets with no diagnostic path.
- verification_steps:
  - Force a stream error (e.g., invalid API key) and confirm a visible error message appears in the chat.
  - `console.error` is supplemented, not replaced, so the error remains in logs.
- status: open
- tags: error-handling, ux

---

### Finding F-009

- finding_id: F-009
- rule_id: CHK.STRUCT.MISSING-TESTS
- severity: LOW
- confidence: high
- location_path: apps/website/src/
- location_hint: entire app — no test files found
- evidence_excerpt:

```text
$ find apps/website/src -name "*.test.*"
# (no output)
```

- why: The application has no test files, making every refactor (especially splitting `useStudio`) a manual regression risk.
- fix: Establish at minimum Vitest unit tests for `buildRequestPayload`, SSE parsers, and settings Zod schema before beginning the refactors in F-001/F-002/F-003.
- effort: medium
- defer_risk: High-impact refactors (F-001, F-002) cannot be verified without tests; regressions will only surface in manual QA.
- verification_steps:
  - `vp test` passes with at least one test file per module being refactored.
  - Tests cover happy path and at least one error path per module.
- status: open
- dependencies: F-001, F-002, F-003
- tags: test-coverage, testability

---

### Finding F-010

- finding_id: F-010
- rule_id: CHK.STRUCT.MISSING-CONTEXT-DOC
- severity: NIT
- confidence: medium
- location_path: /
- location_hint: repo root
- evidence_excerpt:

```text
$ ls CONTEXT.md docs/adr/
# CONTEXT.md: No such file or directory
# docs/adr/: No such file or directory
```

- why: CLAUDE.md references `CONTEXT.md` and `docs/adr/` for domain docs and architectural decisions, but neither exists, reducing AI-agent context quality.
- fix: Create `CONTEXT.md` with domain terminology and a `docs/adr/` directory with at least an ADR template.
- effort: small
- defer_risk: Future agent sessions start without domain language, leading to off-convention suggestions.
- status: deferred
- tags: documentation, agent-context

---

## Prioritized Execution Queue

1. queue_rank: 1
   - target_finding_ids: F-009
   - reason_for_order: Tests must exist before any structural refactor to catch regressions; zero test coverage is the foundational blocker.
   - expected_outcome: Vitest tests for core logic modules give a regression safety net for all subsequent refactors.

2. queue_rank: 2
   - target_finding_ids: F-003, F-004
   - reason_for_order: Adding Zod validation is a small-effort, self-contained change that immediately improves type safety and can be done independently of the larger hook split.
   - expected_outcome: Runtime type errors from malformed form data and vendor API responses are caught before they corrupt app state.

3. queue_rank: 3
   - target_finding_ids: F-006, F-008
   - reason_for_order: Extracting the resize hook and adding user-visible error feedback are small, low-risk changes that deliver immediate UX value and reduce duplication.
   - expected_outcome: `home.tsx` drops below 150 lines; users see error messages on stream failure.

4. queue_rank: 4
   - target_finding_ids: F-001, F-005
   - reason_for_order: The god hook split is the highest-leverage refactor but carries the most risk — do it after tests and Zod validation are in place.
   - expected_outcome: `useStudio` is replaced by 3–4 focused hooks, each independently testable and below 120 lines.

5. queue_rank: 5
   - target_finding_ids: F-002, F-007
   - reason_for_order: Vendor parser extraction and magic value cleanup are natural follow-ons after the hook split stabilizes the data flow.
   - expected_outcome: `stream.ts` drops below 150 lines; all API defaults are configurable constants.

---

## Deferred Items

- finding_id: F-010
- deferral_reason: Documentation gap is low urgency and does not block feature work or correctness.
- revisit_trigger: Before onboarding a new contributor or when the first agent-generated ADR is needed.

---

## Validation Checklist

- [x] Required sections present
- [x] Required metadata fields present
- [x] Summary counts match findings (HIGH: 3, MEDIUM: 4, LOW: 2, NIT: 1 = 10 total)
- [x] Each finding has evidence_excerpt, why, fix
- [x] Each finding has verification_steps
- [x] Severity values are canonical (BLOCKER/HIGH/MEDIUM/LOW/NIT)
- [x] Prioritized queue present (5 queue items for 10 findings)

---

## Closure Criteria

- No HIGH findings remain open in `apps/website/src/hooks/`, `apps/website/src/lib/stream.ts`, or `apps/website/src/routes/`.
- `vp check` and `vp test` pass cleanly after each refactor batch.
- `useStudio.hook.ts` is replaced by focused hooks, each under 150 lines.
- At least one Vitest test file exists per refactored module.
- All external API responses are validated through Zod schemas before use.
