# Website App — Claude Guidance

This is the React 19 frontend application. It uses **React Router 7** for routing, **StyleX** for styling, and **TypeScript** throughout.

## File Conventions

```
src/
  routes/          # Route modules — each file exports loader, action, and default component
  components/      # Shared, reusable UI components (no route-specific logic)
  hooks/           # Custom React hooks
  lib/             # Pure utilities and domain logic (no React imports)
  styles/          # Global StyleX tokens and theme definitions
```

## Route Module Shape

Each file in `src/routes/` should follow this pattern:

```ts
import * as stylex from "@stylexjs/stylex";
import type { Route } from "./+types/<route-name>";

export async function loader({ params }: Route.LoaderArgs) { ... }
export async function action({ request }: Route.ActionArgs) { ... }

export default function MyPage({ loaderData }: Route.ComponentProps) { ... }

const styles = stylex.create({ ... });
```

## StyleX Token System

Global design tokens are defined in `src/styles/tokens.stylex.ts`. Import from there for colors, spacing, and typography — do not hardcode values.

## Component Checklist

When creating a new component:

- [ ] Single responsibility — does one thing
- [ ] Props interface defined with `type` (not `interface`) for consistency
- [ ] StyleX styles defined at module scope, below the component
- [ ] No direct data fetching — receives data via props or `use()`
- [ ] Exported as a named export

## Testing

Tests live alongside source in `__tests__/` directories or as `*.test.ts(x)` siblings.

Run tests for this app only:

```bash
cd apps/website && vp test
# or from root:
vp test --filter apps/website
```
