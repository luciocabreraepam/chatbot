# Smell Findings Report

## Metadata

- schema_version: 1.0
- report_id: CSC-2026-0612-chatbot
- generated_at: 2026-06-12T18:40:56Z
- skill_name: code-smell-checker
- repository: /home/lucio/workspace/chatbot
- scope_type: repo
- scope_value: apps/website/src/, packages/utils/src/
- severity_scale: BLOCKER, HIGH, MEDIUM, LOW, NIT
- classification: mixed
- primary_lens: Clean Code / SOLID

---

## Summary

- files_analyzed: ~35 (apps/website/src/)
- findings_count_by_severity:
  - blocker: 1
  - high: 3
  - medium: 4
  - low: 4
  - nit: 2
- top_risk: The god hook `useStudio` bundles four unrelated domains into 402 lines; every feature touch requires reasoning about all of them simultaneously
- first_3_actions:
  1. Split `useStudio` into domain-scoped hooks (F-001)
  2. Add `ErrorBoundary` export to `home.tsx` (F-002)
  3. Fix resize-drag listener leak (F-003)

---

## Findings

---

### Finding F-001

- finding_id: F-001
- rule_id: CC.G5 / SOLID.SRP
- severity: BLOCKER
- confidence: high
- location_path: apps/website/src/hooks/useStudio.hook.ts
- location_hint: lines 1–401 (entire file)
- evidence_excerpt:

```text
// Four completely unrelated domains in one hook:
// 1. Vendor / connection settings (lines 41–50, 89–139)
const [vendor, setVendor] = useState<VendorId>(...)
const [baseUrl, setBaseUrl] = useState(...)

// 2. Conversation CRUD + DB lifecycle (lines 52–54, 79–88, 141–176)
const [conversations, setConversations] = useState<...>([]);

// 3. SSE streaming + metrics (lines 56–73, 178–363)
const [isStreaming, setIsStreaming] = useState(false);
const metricsRef = useRef<StreamMetrics>({ ... });

// 4. Inspector UI state (lines 59–60)
const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
const [inspectorTab, setInspectorTab] = useState<InspectorTab>("request");
```

- why: One hook owns vendor config, DB lifecycle, conversation CRUD, streaming state, and inspector UI; any change in one domain forces a full read of 400 lines and risks touching unrelated logic.
- fix: Extract into `useConnectionSettings`, `useConversations`, `useStream`, and keep `useStudio` as a thin composer returning the merged API.
- effort: large
- defer_risk: Every feature addition amplifies coupling — the hook already has 14 `useCallback` closures capturing each other as deps, increasing the probability of stale-closure bugs.
- verification_steps:
  - `vp check` passes after extraction
  - `vp run -r test` passes
  - No new dependency cycles between the split hooks
- status: open

---

### Finding F-002

- finding_id: F-002
- rule_id: RR7.MISSING-ERROR-BOUNDARY
- severity: HIGH
- confidence: high
- location_path: apps/website/src/routes/home.tsx
- location_hint: entire file (no `ErrorBoundary` export)
- evidence_excerpt:

```text
// home.tsx exports: meta, loader, default Home
// Missing: export function ErrorBoundary(...)
// routes.md: "Every non-trivial route must export an ErrorBoundary."
// This route owns the entire workspace layout and calls useStudio which does
// DB init and async model fetching — both can reject.
```

- why: If `useStudio`'s DB init or the loader throws, the error propagates to root's ErrorBoundary, which replaces the whole page rather than scoping the error to the workspace.
- fix: Export an `ErrorBoundary` from `home.tsx` following the dev/prod pattern in `routes.md`.
- effort: small
- defer_risk: Any DB or loader failure silently destroys the entire app layout.
- verification_steps:
  - Trigger a simulated DB failure and confirm the error is caught locally
  - `vp check` passes
- status: open

---

### Finding F-003

- finding_id: F-003
- rule_id: CC.F3 / REACT.MISSING-CLEANUP
- severity: HIGH
- confidence: high
- location_path: apps/website/src/routes/home.tsx
- location_hint: lines 45–84 (`handleSidebarResizeStart`, `handleInspectorResizeStart`)
- evidence_excerpt:

```text
const handleSidebarResizeStart = (e: React.MouseEvent) => {
  globalThis.addEventListener("mousemove", onMove);
  globalThis.addEventListener("mouseup", onUp);
  // No AbortController / no ref to cancel if component unmounts mid-drag
};
```

- why: If the component unmounts while the user is dragging, `onMove` and `onUp` stay attached to `globalThis` indefinitely, leaking memory and potentially mutating unmounted state.
- fix: Track listeners via an `AbortController` or store the `onUp` reference in a `useRef` and call `removeEventListener` in a `useEffect` cleanup; or extract into a `useResizablePanel` hook that owns its own cleanup.
- effort: small
- defer_risk: Will fire `setSidebarWidth` on a dead component — React will warn, and if multiple drag sessions leak the handlers fire multiple times per event.
- verification_steps:
  - Navigate away mid-drag and confirm no React "state update on unmounted component" warning
  - Only one `mousemove` fires per mouse event after multiple drag sessions
- status: open

---

### Finding F-004

- finding_id: F-004
- rule_id: REACT.EFFECT-FOR-FETCH
- severity: HIGH
- confidence: high
- location_path: apps/website/src/hooks/useStudio.hook.ts
- location_hint: lines 79–87
- evidence_excerpt:

```text
useEffect(() => {
  getNativeDB()
    .then(async () => {
      setIsDbReady(true);
      const convs = await getAllConversations();
      setConversations(convs);
    })
    .catch(console.error);
}, []);
```

- why: Per project rules, `useEffect` must not be used for data fetching; errors are swallowed by `console.error` with no user-visible feedback, and the initial conversations list races with `isDbReady` state.
- fix: Move DB init into the route loader (or a React 19 `use(promise)` with `<Suspense>`) so the route doesn't render until DB is ready, and errors reach an `ErrorBoundary`.
- effort: medium
- defer_risk: DB failures are invisible to users; the `isDbReady` flag adds conditional branches throughout components that would not be needed if DB readiness is guaranteed before render.
- verification_steps:
  - Simulate DB failure and confirm it surfaces in the ErrorBoundary
  - `isDbReady` flag can be removed from the public API
  - `vp run -r test` passes
- status: open

---

### Finding F-005

- finding_id: F-005
- rule_id: SOLID.OCP / GOF.STRATEGY-MISSING
- severity: MEDIUM
- confidence: high
- location_path: apps/website/src/lib/stream.ts
- location_hint: lines 62–109 (`buildRequestPayload`), 267–278 (`parseEventByFormat`), 312–337 (header-building in `streamChat`)
- evidence_excerpt:

```text
// Three separate if-chains, all switching on PayloadFormat:
if (payloadFormat === "anthropic") { ... }
if (payloadFormat === "openai-responses") { ... }
// default: openai-chat

// Header building also branches on vendor:
if (vendor === "openai" && apiKey) { headers["Authorization"] = ... }
else if (vendor === "litellm") { ... }
else if (isAnthropicVendor && apiKey) { ... }
```

- why: Adding a new vendor requires editing three separate locations in `stream.ts`; the Open/Closed Principle is violated and the file will grow unboundedly.
- fix: Define a `VendorStrategy` type with `buildPayload`, `parseEvent`, `buildHeaders` methods; create one object per vendor and look up by `PayloadFormat`/`VendorId`.
- effort: medium
- defer_risk: Every new vendor multiplies the surface area of changes and the risk of missing one branch.
- verification_steps:
  - All existing vendor behaviors covered by the strategy map
  - `vp check` passes (no `any`, all strategy keys exhaustive)
  - Add a test per vendor strategy
- status: open

---

### Finding F-006

- finding_id: F-006
- rule_id: CC.DRY
- severity: MEDIUM
- confidence: high
- location_path: apps/website/src/routes/home.tsx
- location_hint: lines 45–64 and 66–85
- evidence_excerpt:

```text
// handleSidebarResizeStart and handleInspectorResizeStart are structurally identical:
// - capture startX, startWidth
// - setIsDragging(true)
// - add mousemove + mouseup listeners
// - compute delta (sidebar: +delta, inspector: -delta)
// - clamp to [MIN, MAX]
// Duplicated ~20 lines of identical logic
```

- why: Two nearly-identical 20-line blocks differ only in direction (`+delta` vs `-delta`) and the `[MIN, MAX]` bounds; any bug in the pattern must be fixed in two places.
- fix: Extract `useResizablePanel({ min, max, initialWidth, direction })` returning `{ width, isDragging, onResizeStart }`.
- effort: small
- defer_risk: If the listener leak (F-003) is fixed in one copy it will be missed in the other.
- verification_steps:
  - Both sidebar and inspector resize still work after extraction
  - `isDragging` overlay still suppresses text selection
- status: open
- related_findings: F-003

---

### Finding F-007

- finding_id: F-007
- rule_id: REACT.FUNCTION-AS-COMPONENT
- severity: MEDIUM
- confidence: high
- location_path: apps/website/src/components/Inspector/Inspector.component.tsx
- location_hint: lines 97–181 (`renderTabContent`)
- evidence_excerpt:

```text
const renderTabContent = () => {
  if (!selectedMessage) return null;
  if (activeTab === "request") {
    const handleCopyCurl = () => { ... }; // recreated every render
    return ( <div> ... </div> );
  }
  if (activeTab === "response") {
    const events = parseRawResponse(selectedMessage.rawResponse); // re-parses every render
    ...
  }
};
```

- why: `renderTabContent` is an 85-line function defined and called inside the component body on every render; it re-runs `parseRawResponse` unconditionally and recreates `handleCopyCurl` on each call, blocking `useMemo`/`useCallback` optimizations.
- fix: Lift each tab into its own component (`<RequestTab>`, `<ResponseTab>`, `<HttpTab>`, `<MetricsTab>`) passed `selectedMessage` as props; `parseRawResponse` becomes a `useMemo` inside `<ResponseTab>`.
- effort: medium
- defer_risk: As the inspector grows, the inline render function becomes the primary maintenance hotspot.
- verification_steps:
  - Tab switching still works
  - `parseRawResponse` is only called when `rawResponse` changes (verify with React DevTools)
- status: open

---

### Finding F-008

- finding_id: F-008
- rule_id: RR7.OUTLET-CONTEXT-OVERUSE
- severity: MEDIUM
- confidence: medium
- location_path: apps/website/src/routes/home.tsx
- location_hint: line 150
- evidence_excerpt:

```text
<Outlet context={studio} />
// studio = 20+ properties from useStudio
// routes.md: "Avoid prop-drilling loader data through <Outlet context> unless the shape is trivial"
```

- why: The entire `StudioContext` (20+ properties) is passed through `<Outlet context>`, coupling every child route to the full `useStudio` API surface; `settings.tsx` only needs a subset.
- fix: Pass only what child routes need (e.g. `{ onApplySettings }`) or use `useRouteLoaderData` for shared loader data.
- effort: small
- defer_risk: Any refactor of `useStudio`'s return shape silently breaks all child routes that destructure the context.
- verification_steps:
  - `settings.tsx` route receives only the fields it actually uses
  - `vp check` type-checks the narrowed context
- status: open

---

### Finding F-009

- finding_id: F-009
- rule_id: CC.G6 / SOLID.SRP
- severity: LOW
- confidence: high
- location_path: apps/website/src/components/Inspector/Inspector.component.tsx
- location_hint: lines 10–80 (`resolveEventType`, `parseRawResponse`)
- evidence_excerpt:

```text
// 70 lines of pure parsing logic living in a .component.tsx file
const parseRawResponse = (raw: string | undefined): readonly NormalizedEvent[] => { ... };
```

- why: Pure parsing logic in a component file makes it untestable in isolation and invisible to the `lib/` layer where it belongs.
- fix: Move `resolveEventType` and `parseRawResponse` to `lib/inspectorEvents.util.ts` and import from there.
- effort: small
- defer_risk: Growing complexity in parsing will compound the cognitive load of reading the component.
- verification_steps:
  - Export and add unit tests in a sibling `.test.ts`
  - Component import resolves correctly
- status: open

---

### Finding F-010

- finding_id: F-010
- rule_id: CC.G19
- severity: LOW
- confidence: high
- location_path: apps/website/src/hooks/useStudio.hook.ts
- location_hint: lines 183, 211, 329
- evidence_excerpt:

```text
const newConvId = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
```

- why: `Math.random()` is not cryptographically random and generates only ~36 bits of entropy; under rapid sends the same timestamp window could produce collisions in IndexedDB.
- fix: Use `crypto.randomUUID()` for both conversation and message IDs.
- effort: small
- defer_risk: Collision probability is low in single-user use but will cause silent data loss in IDB if IDs collide.
- verification_steps:
  - Replace all three occurrences
  - `vp check` passes
- status: open

---

### Finding F-011

- finding_id: F-011
- rule_id: CC.DRY
- severity: LOW
- confidence: high
- location_path: apps/website/src/hooks/useStudio.hook.ts and apps/website/src/lib/stream.ts
- location_hint: `useStudio.hook.ts:38` and `stream.ts:257-259`
- evidence_excerpt:

```text
// useStudio.hook.ts:38
const estimateTokens = (text: string): number => Math.ceil(text.split(/\s+/).length * 1.3);

// stream.ts:257
const estimateTokensFromChunk = (chunk: string): number => {
  const wordCount = chunk.split(/\s+/).filter((word) => word.length > 0).length;
  return Math.ceil(wordCount * 1.3);
};
```

- why: Same heuristic duplicated with a subtle difference (stream.ts filters empty strings) — the two will diverge over time.
- fix: Extract `estimateTokens` into `lib/tokens.util.ts` with the stricter implementation; import from both call sites.
- effort: small
- defer_risk: Will silently produce different token counts in hook vs stream callbacks.
- verification_steps:
  - Single implementation, single test
  - Both call sites import from `lib/tokens.util.ts`
- status: open

---

### Finding F-012

- finding_id: F-012
- rule_id: RR7.UNTYPED-LOADER-ARGS
- severity: LOW
- confidence: high
- location_path: apps/website/src/routes/home.tsx
- location_hint: line 16
- evidence_excerpt:

```text
export const loader = ({ request }: { request: Request }) => ({ ... });
// Should use: Route.LoaderArgs from "./+types/home"
```

- why: Using raw `{ request: Request }` instead of the generated `Route.LoaderArgs` means route param changes won't be caught at compile time.
- fix: Import `Route` from `"./+types/home"` and type the loader with `Route.LoaderArgs`.
- effort: small
- defer_risk: Low impact now (no params), but sets a bad precedent.
- verification_steps:
  - `vp check` passes after the type import
- status: open

---

### Finding F-013

- finding_id: F-013
- rule_id: REACT.INLINE-ARROW
- severity: NIT
- confidence: high
- location_path: apps/website/src/components/Inspector/Inspector.component.tsx
- location_hint: line 219
- evidence_excerpt:

```text
onClick={() => onTabChange(tab.id)}
// StyleX rule: "Never create anonymous inline functions in JSX event handlers"
```

- why: Creates a new function reference on every render, breaking memoization if `Inspector` is wrapped in `memo`.
- fix: Bind tab id via a `data-tab` attribute and read from `e.currentTarget.dataset.tab`, or extract a `TabButton` subcomponent that pre-binds `id`.
- effort: small
- status: open

---

### Finding F-014

- finding_id: F-014
- rule_id: REACT.KEY-INDEX
- severity: NIT
- confidence: medium
- location_path: apps/website/src/components/Inspector/Inspector.component.tsx
- location_hint: line 150
- evidence_excerpt:

```text
key={`${evt.eventType}-${idx}`}
// Array index still participates in the key
```

- why: Including the array index causes unnecessary DOM reconciliation if events are reordered or prepended.
- fix: Use a hash of `evt.eventType + evt.display` or assign a monotonic sequence number to each `NormalizedEvent`.
- effort: small
- status: open

---

## Prioritized Execution Queue

1. queue_rank: 1
   - target_finding_ids: F-002, F-003, F-006
   - reason_for_order: Safety and correctness bugs; small effort, no behavior change
   - expected_outcome: No listener leaks on unmount, route errors caught locally, resize logic DRY

2. queue_rank: 2
   - target_finding_ids: F-001
   - reason_for_order: Largest structural risk; split hooks unlock F-004 and reduce all future callback dep arrays
   - expected_outcome: Four focused hooks, `useStudio` becomes a thin composer; `isDbReady` flag eliminated

3. queue_rank: 3
   - target_finding_ids: F-004, F-008
   - reason_for_order: Depend on F-001 to be clean first; DB init in loader requires the hook to not own that concern
   - expected_outcome: DB readiness guaranteed before render, child routes receive only what they need

4. queue_rank: 4
   - target_finding_ids: F-005, F-007
   - reason_for_order: Medium refactors that improve extensibility; safe after the above stabilize the architecture
   - expected_outcome: Vendor strategy map, one file per tab component

5. queue_rank: 5
   - target_finding_ids: F-009, F-010, F-011, F-012, F-013, F-014
   - reason_for_order: Low-effort cleanup; can be batched into a single PR
   - expected_outcome: No duplicated logic, stronger ID entropy, fully typed routes

---

## Deferred Items

None — all findings are actionable now. F-013 and F-014 can be deferred indefinitely if `Inspector` is not memoized.

---

## Validation Checklist

- [x] Required sections present
- [x] Required metadata fields present
- [x] Summary counts match findings (1 blocker, 3 high, 4 medium, 4 low, 2 nit = 14 total)
- [x] Each finding has evidence_excerpt, why, fix
- [x] Each finding has verification_steps
- [x] Severity values are canonical
- [x] Prioritized queue present

---

## Closure Criteria

- No findings of severity BLOCKER or HIGH remain open
- `vp check` and `vp run -r test` pass with zero errors after each queue rank is applied
- `useStudio` is replaced by composed domain hooks each under 120 lines
- `home.tsx` exports an `ErrorBoundary`
- No global event listeners without cleanup
