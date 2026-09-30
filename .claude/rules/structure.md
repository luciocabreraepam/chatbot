# File & Directory Structure Rules

## Component bundle pattern

Every non-trivial component gets its own directory. All files are siblings:

```
ComponentName/
├── ComponentName.component.tsx   # Implementation
├── ComponentName.types.ts        # Type definitions
├── ComponentName.stylex.ts       # StyleX styles
├── ComponentName.test.tsx        # Tests (colocated)
└── index.ts                      # Barrel export (public API)
```

For simple, single-concern components with fewer than ~40 lines of styles, the types and styles may live inside `ComponentName.component.tsx` and the directory may be omitted in favour of a single file. Default to the bundle pattern when in doubt.

## File naming suffixes

| Type             | Pattern                      | Example                     |
| ---------------- | ---------------------------- | --------------------------- |
| Component        | `*.component.tsx`            | `LoginButton.component.tsx` |
| Hook             | `*.hook.ts`                  | `useAuthStatus.hook.ts`     |
| Utility          | `*.util.ts`                  | `dateFormatter.util.ts`     |
| Service / API    | `*.service.ts` or `*.api.ts` | `userApi.service.ts`        |
| StyleX styles    | `*.stylex.ts`                | `Card.stylex.ts`            |
| Type definitions | `*.types.ts`                 | `Card.types.ts`             |
| Test             | `*.test.tsx`                 | `Card.test.tsx`             |
| Constants        | `*.constants.ts`             | `api.constants.ts`          |
| Zod schemas      | `*.schema.ts`                | `user.schema.ts`            |

## Barrel files

Each component directory exposes a controlled public API via `index.ts`. Use explicit named exports — never `export *`.

```typescript
// ✅
export { Button } from "./Button.component";
export type { ButtonProps } from "./Button.types";

// ❌
export * from "./Button.component";
```

## Path aliases and import depth

- Use `@/` as the alias for `src/`. Never use deep relative paths (`../../../../`).
- Relative imports (`./`, `../`) are only acceptable within the same directory or one level up.

```typescript
// ✅
import { Button } from "@/components/Button";
import { styles } from "./Card.stylex";

// ❌
import { Button } from "../../../components/Button";
```

## Import order

Enforce this 5-group order (Oxlint / ESLint handles it automatically):

1. React and framework core (`react`, `react-router`)
2. External dependencies (`@stylexjs/stylex`, `zod`)
3. Internal absolute imports (`@/components/...`, `@/hooks/...`)
4. Relative imports (`./styles`, `../hooks`)
5. Type-only imports (`import type ...`) — always last

## Alphabetical sorting

Sort alphabetically within each group:

- Destructured props and import specifiers
- JSX attribute lists
- Type / object property keys (`id` may lead as an exception)

This is enforced by `eslint-plugin-perfectionist` — let the linter fix it rather than sorting by hand.
