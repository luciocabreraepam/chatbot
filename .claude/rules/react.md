# React 19 Rules

React 19 ships new primitives — use them instead of older patterns:

| Old pattern                              | React 19 replacement                                  |
| ---------------------------------------- | ----------------------------------------------------- |
| `useContext(Ctx)` inside render          | `use(Ctx)`                                            |
| Manual loading state + `useEffect` fetch | `use(promise)` with `<Suspense>`                      |
| `useState` + `onSubmit` handler          | `useActionState(action, initialState)`                |
| Optimistic UI via manual state sync      | `useOptimistic(value, updateFn)`                      |
| `forwardRef(...)` wrapper                | `ref` is a plain prop in React 19 — no wrapper needed |

## Component design

- One component = one concern. If you need a comment to separate two visual sections, split the component.
- Props type uses `type`, not `interface`. Keep it above the component:
  ```ts
  type ButtonProps = { label: string; onClick: () => void; disabled?: boolean };
  export function Button({ label, onClick, disabled = false }: ButtonProps) { ... }
  ```
- Avoid `useEffect` for: fetching data (use loaders), syncing to state (derive it), responding to events (use handlers).

## Extending native element props

Reusable components that wrap HTML elements should extend `ComponentPropsWithoutRef` (or `ComponentPropsWithRef` when forwarding refs), omitting any props the component redefines:

```typescript
import { type ComponentPropsWithoutRef } from "react";

type ButtonProps = Omit<ComponentPropsWithoutRef<"button">, "onClick"> & {
  readonly customStylex?: StyleXStyles;
  readonly isDisabled?: boolean;
  readonly onClick?: () => void;
};
```

This gives callers access to all native HTML attributes (e.g. `aria-*`, `data-*`, `type`) without manually re-declaring them.

## Composition over configuration

Prefer composing small components over a single component with many conditional branches. A component with more than 2-3 `if`/ternary render paths should be split.

## Props naming conventions

| Prop type              | Pattern                | Example                                    |
| ---------------------- | ---------------------- | ------------------------------------------ |
| Event handler (public) | `on[Event]`            | `onClick`, `onSave`                        |
| Internal handler       | `handle[Event]`        | `handleClick`, `handleSubmit`              |
| Boolean state          | `is/has/should[State]` | `isLoading`, `hasError`, `shouldAutoFocus` |
| Render prop / slot     | `render[Thing]`        | `renderHeader`, `renderEmpty`              |

## Custom hooks

- Hooks always return an **object with named properties**, never a tuple. Named returns are self-documenting and easier to extend.

```typescript
// ✅
const { startIndex, endIndex, offsetY } = useVirtualization({ ... });

// ❌
const [startIndex, endIndex, offsetY] = useVirtualization({ ... });
```

- Hook parameters follow the same object-with-`Args`-suffix rule as regular functions (see `typescript.md`).
- DOM-observing hooks (resize, scroll, click-outside) must always return a cleanup function from their `useEffect` to remove event listeners.

## Context pattern

Split context into three files, composed via a barrel:

```
contexts/ThemeContext/
├── ThemeContext.context.ts    # createContext(...) — no JSX
├── ThemeContext.provider.tsx  # <ThemeProvider> component
├── useThemeContext.hook.ts    # use(ThemeContext) with guard
└── index.ts                  # barrel: export { ThemeProvider, useTheme }
```

Providers that need SSR hydration accept both `defaultValue` (fallback) and `initialValue` (from the loader):

```typescript
export const ThemeProvider = ({
  children,
  defaultTheme = "light",
  initialTheme,
}: ThemeProviderProps) => {
  const [theme, setTheme] = useState(() => initialTheme ?? defaultTheme);
  // ...
};
```

Access context with `use()` and throw a meaningful error when used outside the provider:

```typescript
export const useTheme = () => {
  const ctx = use(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};
```

## Utility functions

All `*.util.ts` functions must be **pure** — same input → same output, no side effects.

- Use spread syntax, `.map()`, `.filter()`, `.reduce()` instead of mutation or imperative loops.
- Never mutate props or arguments. Use `[...array].sort()` or `useMemo` instead of `array.sort()`.
- Use `as const` for literal objects and arrays.

```typescript
// ✅
const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name));

// ❌
items.sort((a, b) => a.name.localeCompare(b.name));
```

## Error boundaries

Wrap async data boundaries (`use(promise)`) in both `<Suspense>` and an `<ErrorBoundary>`. Never let a loader rejection reach the root.

Show error details only in dev mode — never expose stack traces in production:

```typescript
export const ErrorBoundary = ({ error }: { error: unknown }) => {
  const details =
    import.meta.env.DEV && error instanceof Error
      ? error.message
      : 'An unexpected error occurred.';
  return <div role="alert">{details}</div>;
};
```
