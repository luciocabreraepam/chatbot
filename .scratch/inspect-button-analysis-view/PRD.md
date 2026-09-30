Status: ready-for-agent

# PRD: Message Inspect Button & Cross-Conversation Analysis View

## Problem Statement

Developers using LocalOmni Studio can inspect a single message at a time through the Inspector panel, but only by clicking anywhere on a message bubble — an implicit, hard-to-discover interaction. There is no way to compare how different messages in a conversation — or across multiple conversations — differ in their request payloads, response content, HTTP metadata, or performance metrics. When testing different models, vendors, endpoints, or prompt strategies, developers are forced to switch between messages one at a time, losing the previous message's data as soon as they switch. This makes comparative analysis slow and error-prone.

## Solution

1. **Explicit inspect button on each message**: Replace the implicit click-to-select behavior on `MessageItem` with a dedicated "Inspect" button. This makes the inspector trigger visible, intentional, and accessible.

2. **New `/analysis` route**: A full-page view showing all messages from all conversations in tabular format. The view mirrors the four existing Inspector tabs (Request, Response, HTTP, Metrics), each rendered as a data table where every row is one message. Developers can scroll and scan the full history of interactions at a glance.

## User Stories

1. As a developer, I want to see an "Inspect" button on each message bubble, so that I know exactly how to open the inspector for a specific message.
2. As a developer, I want the "Inspect" button to be visually distinct from the message content, so that I can trigger it without accidentally selecting text or triggering other actions.
3. As a developer, I want clicking the "Inspect" button to open the Inspector panel focused on that message, so that I can examine its request, response, HTTP metadata, and metrics immediately.
4. As a developer, I want the Inspector panel to remain showing the last inspected message until I explicitly inspect another one, so that I do not lose my place while reading.
5. As a developer, I want to navigate to a dedicated Analysis page, so that I can see all messages from all conversations in one view.
6. As a developer, I want the Analysis page to have the same tab structure as the single-message Inspector (Request, Response, HTTP, Metrics), so that the layout is familiar and consistent.
7. As a developer, I want the Request tab on the Analysis page to show a table of all request payloads, so that I can compare what was sent to the model across every interaction.
8. As a developer, I want the Response tab on the Analysis page to show a table of all responses, so that I can compare what each model returned.
9. As a developer, I want the HTTP tab on the Analysis page to show a table of HTTP metadata (status code, response time, headers) per message, so that I can identify failed requests or latency outliers.
10. As a developer, I want the Metrics tab on the Analysis page to show a table of performance data (TTFT, tokens/sec, input tokens, output tokens, total latency) per message, so that I can compare performance across vendors and models at a glance.
11. As a developer, I want each row in the Analysis tables to show which conversation and which message it belongs to, so that I can trace a row back to its context.
12. As a developer, I want each row in the Analysis tables to show the vendor and model used, so that I can quickly identify which configuration produced which result.
13. As a developer, I want all messages from all conversations to be included in the Analysis tables by default, so that I have complete visibility without manual selection.
14. As a developer, I want the Analysis page to load data directly from IndexedDB, so that the view reflects the full persisted history — not just the currently loaded conversation.
15. As a developer, I want the Analysis page to be accessible from the main navigation (header or sidebar), so that I can reach it in one click from anywhere in the app.
16. As a developer, I want the Analysis tables to show a timestamp for each message, so that I can understand the chronological order of interactions.
17. As a developer, I want empty or missing metric fields to render gracefully (e.g. a dash), so that incomplete rows do not break the table layout.
18. As a developer, I want the Analysis page to handle the case where no messages exist yet, so that I see a clear empty state rather than a broken table.

## Implementation Decisions

- **`MessageItem` — explicit inspect button**: The implicit click-on-message behavior that drives the inspector is replaced with an `onInspect` callback prop. A small icon button (e.g. magnifying glass or panel icon) is rendered on each message — always visible or on hover per design. The `onInspect` callback receives the message ID and is wired up in `ChatPanel`.

- **`useStudio` hook**: The `selectMessage` function remains unchanged in signature. It is now called exclusively from the `onInspect` button handler, not from a general click handler on the message row.

- **`db.ts` — `getAllMessages()` query**: A new exported function `getAllMessages()` reads all conversations from IndexedDB and returns their messages flattened into a single array, each annotated with `conversationId` and `conversationTitle`. This is the single data source for the Analysis route.

- **New `/analysis` route**: Added to `routes.ts` as a sibling of the settings route. The route module contains a loader that calls `getAllMessages()` and returns the full message list. The component renders a tabbed interface (matching the existing `Inspector` tab IDs: `request`, `response`, `http`, `metrics`) with a data table per tab.

- **Analysis tables — column contracts** (per tab):

  | Tab      | Columns                                                                                                        |
  | -------- | -------------------------------------------------------------------------------------------------------------- |
  | Request  | Conversation, Timestamp, Vendor, Model, Endpoint, Payload (collapsed JSON)                                     |
  | Response | Conversation, Timestamp, Vendor, Model, Response (collapsed text/JSON), Raw SSE event count                    |
  | HTTP     | Conversation, Timestamp, Status, Status Text, Response Time (ms), Key headers                                  |
  | Metrics  | Conversation, Timestamp, Vendor, Model, TTFT (ms), Tokens/sec, Input tokens, Output tokens, Total latency (ms) |

- **Navigation entry point**: A link to `/analysis` is added to the top header alongside the existing Settings link.

- **No new shared component layer needed**: The Analysis route's tables are self-contained within the route module. If table sub-components grow complex they may be extracted to `src/components/AnalysisTable/`, but this is deferred until complexity warrants it.

- **`db.ts` IndexedDB schema**: No schema migration is required — `getAllMessages()` reads from the existing `messages` and `conversations` object stores. It performs a cursor over all conversations and for each fetches its messages via the existing `getMessages(conversationId)` path.

## Testing Decisions

**What makes a good test**: Test external behavior — what the user sees and what state changes — not internal implementation details. Query by role, label, or visible text. Do not assert on class names, StyleX tokens, or internal hook state directly.

**Modules to test and what to cover:**

- **`MessageItem` component**: Render a message; assert that an inspect button is visible (or appears on hover); simulate a click; assert that `onInspect` was called with the correct message ID. Assert that clicking the message body itself no longer calls `onInspect`.

- **`useStudio` hook**: Assert that calling `selectMessage(id)` sets the inspected message correctly and that the inspector reflects that message's data. Existing tests for this hook cover the streaming/metrics path; add a focused test for the selection flow.

- **`db.ts` — `getAllMessages()`**: Using a real (in-memory) IndexedDB instance (via `fake-indexeddb` or equivalent), seed conversations and messages, then assert that `getAllMessages()` returns every message annotated with `conversationId` and `conversationTitle`, in chronological order.

- **`/analysis` route**: Render the route with a seeded loader result; assert that each tab renders a table; assert that the correct number of rows appears; assert that key column values (vendor, model, TTFT) are visible; assert that the empty state renders when the loader returns no messages.

**Prior art in the codebase**: The existing `Inspector` component and `useStudio` hook tests (if any) are the closest prior art for testing tab switching and message-driven panel content. The `db.ts` tests are the prior art for IndexedDB interaction tests.

## Out of Scope

- Sorting or filtering the Analysis tables by any column.
- Selecting a subset of conversations to include in the Analysis view.
- Exporting table data to CSV or JSON.
- Pagination or virtualization for very large message histories.
- Diffing two specific messages side-by-side.
- Real-time updates to the Analysis page while a new message is streaming.

## Further Notes

- The Analysis page loads a full snapshot from IndexedDB on mount. It does not need to stay in sync with the live conversation — a manual refresh (navigating away and back) is sufficient for v1.
- The collapsed JSON/text cells in the Request and Response tables should reuse or mirror the existing `JsonViewer` component to keep the visual language consistent with the single-message Inspector.
- The tab IDs on the Analysis page should match the existing `Inspector` tab IDs (`request`, `response`, `http`, `metrics`) to allow future unification if the two views are ever merged.
