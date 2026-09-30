# TypeScript Rules

## Type declarations

- **Always `type`, never `interface`** — prevents declaration merging, supports unions and intersections naturally.
- **All type properties must be `readonly`** — enforces immutability at the type level.
- **Use `readonly T[]` for array properties** — never `ReadonlyArray<T>` (shorthand is preferred).
- **Never `any`** — use `unknown` with type guards, or model the type correctly.
- **Never `React.FC`** — declare components as typed arrow functions with an explicit props type.

```typescript
// ✅
type ButtonProps = {
  readonly disabled?: boolean;
  readonly label: string;
  readonly onClick: () => void;
};
export const Button = ({ disabled = false, label, onClick }: ButtonProps) => { ... };

// ❌
const Button: React.FC<ButtonProps> = ({ label }) => { ... };
```

## Function parameters

- **2+ params, or any function likely to grow** → use an object parameter with an `Args` suffix type.
- **Single primitive or clearly stable param** → direct typing is fine.
- **Hook parameter types** use `readonly` on all properties.

```typescript
// ✅ Object params
type FormatCurrencyArgs = {
  readonly amount: number;
  readonly currency: string;
};
export const formatCurrency = ({ amount, currency }: FormatCurrencyArgs): string => { ... };

// ✅ Single param
export const formatDate = (date: Date): string => { ... };
```

## Type naming suffixes

| Context                | Suffix               | Example                                 |
| ---------------------- | -------------------- | --------------------------------------- |
| Component props        | `Props`              | `ButtonProps`                           |
| Function / hook params | `Args`               | `FormatCurrencyArgs`, `UseUserDataArgs` |
| Return types           | `Result` or `Return` | `FetchUserResult`                       |

## Discriminated unions for multi-state types

Model async or multi-phase state as a discriminated union — never a bag of optional fields.

```typescript
type FetchState<T> =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | { readonly status: "success"; readonly data: T }
  | { readonly status: "error"; readonly error: Error };
```

## Branded types for domain IDs

Prevent ID values from being mixed up at the type level.

```typescript
type UserId = string & { readonly __brand: "UserId" };
type OrderId = string & { readonly __brand: "OrderId" };
```

## Safe number utilities

Always use the static methods `Number.parseInt` and `Number.isNaN` — never the global `parseInt` / `isNaN`, which have coercion edge cases.

```typescript
// ✅
const id = Number.parseInt(params.id ?? '', 10);
if (Number.isNaN(id)) throw new Response('Invalid ID', { status: 400 });

// ❌
const id = parseInt(params.id, 10);
if (isNaN(id)) throw ...;
```

## Inline type guard predicates

When filtering arrays to narrow their element type, use an inline predicate with an `is` return type rather than casting after the fact:

```typescript
// ✅ — result is { columnKey: keyof MyData; direction: 'asc' | 'desc' }[]
const validSorting = sorting.filter(
  (s): s is { columnKey: keyof MyData; direction: 'asc' | 'desc' } =>
    s.direction !== undefined,
);

// ❌ — cast after filtering loses the type guarantee
const validSorting = sorting
  .filter((s) => s.direction !== undefined) as ...[];
```

## Nested ternary violations

For `no-nested-ternary` lint errors, rewrite with `if/else` or early returns — do not fix by adding parentheses, as the formatter may strip them and re-trigger the error.
