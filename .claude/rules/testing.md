---
paths:
  - "**/*.test.ts"
  - "**/*.test.tsx"
  - "**/__tests__/**"
---

# Testing Rules

## Vitest + Testing Library conventions

- Query by accessibility: `getByRole`, `getByLabelText`, `getByText` — in that order of preference. Never `getByTestId` unless there is genuinely no semantic alternative.
- Assert on what the user sees or can do, not on component internals or state values.
- Arrange / Act / Assert — one blank line between each phase, no comments needed.

## Structure

```ts
describe("ComponentName or module/fn name", () => {
  it("does X when Y", () => { ... });
  it("shows error when Z is missing", () => { ... });
});
```

- One `describe` per file, named after the module under test.
- `it` descriptions read as plain English: `"shows loading spinner while data is pending"` not `"test loading state"`.
- No `test()` alias — use `it()` for consistency.

## Mocking

- Mock at the boundary: network calls (`msw`), browser APIs, time (`vi.useFakeTimers`).
- Never mock internal modules or implementation details — if you feel the need to, the code needs to be refactored first.
- Reset mocks in `afterEach` — never rely on test order.

## Async

- Use `await screen.findBy*` for elements that appear after async work. Do not `waitFor(() => expect(...))` unless timing is genuinely unpredictable.
- Always `await userEvent.setup()` — don't use `fireEvent` for user interactions.

## Testing hooks

Declare `// @vitest-environment jsdom` at the top of any test file that touches the DOM or uses `renderHook`. Use `renderHook` + `act` for state mutations:

```typescript
// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vite-plus/test";
import { useMyHook } from "./useMyHook.hook";

describe("useMyHook", () => {
  it("updates state on set", () => {
    const { result } = renderHook(() => useMyHook({ initialValue: 0 }));

    act(() => {
      result.current.increment();
    });

    expect(result.current.value).toBe(1);
  });

  it("notifies listeners only when value changes", () => {
    const listener = vi.fn();
    const { result } = renderHook(() => useMyHook({ initialValue: 0 }));
    result.current.subscribe(listener);

    act(() => result.current.set(0)); // same value
    expect(listener).not.toHaveBeenCalled();

    act(() => result.current.set(1)); // changed
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
```

## Imports

Import test utilities from `vite-plus/test`, not directly from `vitest`. This avoids an OXC transform incompatibility with `erasableSyntaxOnly: true` in tsconfig.

```typescript
// ✅
import { describe, expect, it, vi } from "vite-plus/test";

// ❌
import { describe, expect, it, vi } from "vitest";
```

## Coverage

Target **80% unit test coverage** as a minimum. Focus coverage on business logic, hooks, and utilities — not on trivial render snapshots.

## Running tests

```bash
vp test                              # all tests in current package
vp test src/components/Button        # single file
vp test --filter "shows error"       # by name pattern
vp run -r test                       # all packages from monorepo root
```
