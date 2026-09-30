---
description: Scaffold a new React Router 7 route module with loader, action, component, and StyleX styles. Use when asked to create a new page or route.
---

Scaffold a new route for: $ARGUMENTS

## Steps

1. **Determine the route path** from the argument (e.g. `profile` → `src/routes/profile.tsx`, `settings/account` → `src/routes/settings/account.tsx`).

2. **Create the route file** at `apps/website/src/routes/<path>.tsx` with this exact structure:

```tsx
import * as stylex from "@stylexjs/stylex";
import { redirect } from "react-router";
import { z } from "zod";
import type { Route } from "./+types/<name>";

// Validate path/search params with Zod — never trust raw params
const ParamsSchema = z.object({
  // TODO: define expected params
});

export async function loader({ params, request }: Route.LoaderArgs) {
  const parsed = ParamsSchema.safeParse(params);
  if (!parsed.success) throw new Response(null, { status: 404 });
  // TODO: fetch data using parsed.data
  return {};
}

// Define a Zod schema for every action's FormData
const ActionSchema = z.object({
  // TODO: define form fields
});

export async function action({ request }: Route.ActionArgs) {
  const raw = Object.fromEntries(await request.formData());
  const result = ActionSchema.safeParse(raw);
  if (!result.success) return { errors: result.error.flatten().fieldErrors };
  // TODO: mutate using result.data
  return redirect("/<path>");
}

export default function <PascalName>({ loaderData }: Route.ComponentProps) {
  return <main {...stylex.props(styles.root)}>{/* TODO */}</main>;
}

export function ErrorBoundary() {
  return <div>Something went wrong.</div>;
}

const styles = stylex.create({
  root: {
    padding: "1rem",
  },
});
```

Key rules:

- Loader throws `new Response(null, { status: 404 })` for not-found — never return `null` and handle it in the component.
- Actions always end with `redirect()` on success; return a plain object only for validation errors.
- Every route exports an `ErrorBoundary` — never let loader/action rejections reach the root.
- Parse `FormData` with Zod at the top of the action — never pass raw `FormData` to service functions.

3. **Create a sibling test file** at `apps/website/src/routes/__tests__/<name>.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, it } from 'vite-plus/test';
import <PascalName>, { loader } from '../<name>';

describe('<PascalName> route', () => {
  it('renders without crashing', async () => {
    const Stub = createRoutesStub([
      { path: '/<path>', Component: <PascalName>, loader },
    ]);
    render(<Stub initialEntries={['/<path>']} />);
    // TODO: add meaningful assertions — query by role/label/text
  });
});
```

4. **Register the route** in `apps/website/src/routes.ts` if not using filesystem routing.

5. Report the files created and any TODOs left for the user to fill in.
