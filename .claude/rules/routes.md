---
paths:
  - "apps/website/src/routes/**"
---

# React Router 7 Route Rules

## Route directory split (preferred for non-trivial routes)

When a route has a loader, action, or meaningful error handling, split it into a directory instead of a single file. Each concern gets its own file, composed via a `root.ts` barrel:

```
routes/my-route/
├── my-route.loader.ts          # export const loader = ...
├── my-route.action.ts          # export const action = ...
├── my-route.errorBoundary.tsx  # export const ErrorBoundary = ...
├── my-route.meta.ts            # export const meta = ...
├── MyRoute.component.tsx       # export const MyRoute = ... (default from root.ts)
└── root.ts                     # re-export everything
```

`root.ts` barrel:

```typescript
export { ErrorBoundary } from "./my-route.errorBoundary";
export { action } from "./my-route.action";
export { loader } from "./my-route.loader";
export { meta } from "./my-route.meta";
export { MyRoute as default } from "./MyRoute.component";
```

For trivial routes (no loader, no action, minimal markup), a single file is acceptable.

## Single-file module contract

When keeping a route in one file, follow this export order:

```ts
// 1. Types (generated)
import type { Route } from "./+types/<route-name>";

// 2. Loader — data fetching only, no side effects
export async function loader({ params, request }: Route.LoaderArgs) { ... }

// 3. Action — mutations only, returns redirect or validation errors
export async function action({ request }: Route.ActionArgs) { ... }

// 4. Component — reads loaderData, dispatches actions via forms
export default function RouteName({ loaderData }: Route.ComponentProps) { ... }

// 5. ErrorBoundary — always present
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) { ... }

// 6. Styles (StyleX) — at module scope, below everything
const styles = stylex.create({ ... });
```

## Loader rules

- Loaders are the **only** place to fetch data for a route. No `useEffect` fetching in route components.
- Always consume loader data with `useLoaderData<typeof loader>()` — let TypeScript propagate the return type.
- Throw `new Response(null, { status: 404 })` for not-found resources — do not return `null` and handle it in the component.
- For numeric path params, always parse with `Number.parseInt` and guard with `Number.isNaN`:

```typescript
const id = Number.parseInt(params.id ?? "", 10);
if (Number.isNaN(id)) throw new Response("Invalid ID", { status: 400 });
```

## Suspense streaming

Return promises **unwrapped** from the loader (do not `await` them) to enable React Router streaming with `<Suspense>`. The component accesses the resolved value via `use(promise)` wrapped in a Suspense boundary.

```typescript
// ✅ Streaming — component renders immediately, data arrives via Suspense
export const loader = ({ request }: LoaderFunctionArgs) => {
  const dataPromise = api.fetchData(request.url);
  return { dataPromise };
};

// In the component:
const { dataPromise } = useLoaderData<typeof loader>();
const data = use(dataPromise); // inside <Suspense>

// ❌ Blocks rendering until data is fetched
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const data = await api.fetchData(request.url);
  return { data };
};
```

Use sorting/filter type guard predicates before passing state to API calls:

```typescript
sorting.filter(
  (s): s is { columnKey: keyof MyData; direction: "asc" | "desc" } => s.direction !== undefined,
);
```

## Action rules

- Actions always end with `redirect()` on success. Return a plain object only for validation errors.
- Parse and validate `FormData` with Zod at the top of the action — never pass raw `FormData` to service functions.
- Use `useNavigation().state` to show pending UI; do not maintain a separate loading state in component state.

## Validation with Zod

Parse and validate all untrusted data at the boundary.

```typescript
import { z } from "zod";

const CreatePostSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
});

export async function action({ request }: Route.ActionArgs) {
  const raw = Object.fromEntries(await request.formData());
  const result = CreatePostSchema.safeParse(raw);
  if (!result.success) return { errors: result.error.flatten().fieldErrors };
  await api.createPost(result.data);
  return redirect("/posts");
}
```

Use Zod for path params and search params in loaders too. Validate environment variables with a Zod schema at startup — never read `import.meta.env` directly in components or services.

## Type guards

Use `is` return types for runtime narrowing of `unknown` data:

```typescript
const isApiError = (value: unknown): value is ApiError =>
  typeof value === "object" && value !== null && "code" in value;
```

## Route meta

Export a `meta` function for page title and description:

```typescript
export const meta = () => [
  { title: "Page Title" },
  { content: "Short description", name: "description" },
];
```

For routes that need the parent's loader data in meta:

```typescript
export const meta = ({ data }: Route.MetaArgs) => [{ title: data?.user.name ?? "Profile" }];
```

## links and headers

Export `links` for route-level `<link>` tags (e.g. preloads, canonical URLs):

```typescript
export const links = (): Route.LinkDescriptors => [
  { as: "fetch", href: "/api/data", rel: "preload" },
];
```

Export `headers` to control HTTP caching for the route:

```typescript
export const headers = (): Headers => {
  return new Headers({ "Cache-Control": "max-age=300, stale-while-revalidate=3600" });
};
```

## shouldRevalidate

Prevent unnecessary loader re-runs with `shouldRevalidate`. Use when the route's data doesn't change based on search params or sibling route changes:

```typescript
export const shouldRevalidate = ({ currentUrl, nextUrl }: Route.ShouldRevalidateFunctionArgs) => {
  // Only revalidate when the path actually changes, not on search param updates
  return currentUrl.pathname !== nextUrl.pathname;
};
```

Default behaviour is to revalidate after every action — only override when you have profiled and confirmed it's unnecessary.

## Route handle and useMatches

Export a `handle` object from a route module to attach arbitrary metadata. Access it up the tree with `useMatches`:

```typescript
// routes/dashboard.tsx
export const handle = {
  breadcrumb: 'Dashboard',
};

// routes/dashboard.settings.tsx
export const handle = {
  breadcrumb: 'Settings',
};

// components/Breadcrumbs.component.tsx
import { useMatches } from 'react-router';

type RouteHandle = {
  readonly breadcrumb?: string;
};

export const Breadcrumbs = () => {
  const matches = useMatches();
  const crumbs = matches
    .filter((m): m is typeof m & { handle: RouteHandle } =>
      typeof (m.handle as RouteHandle | undefined)?.breadcrumb === 'string',
    )
    .map((m) => ({ label: (m.handle as RouteHandle).breadcrumb!, path: m.pathname }));

  return (
    <nav aria-label="Breadcrumb">
      {crumbs.map((crumb) => (
        <a href={crumb.path} key={crumb.path}>{crumb.label}</a>
      ))}
    </nav>
  );
};
```

## Streaming with the Await component

React Router's `<Await>` component is an alternative to `use(promise)` that works without React 19. Prefer `use()` + `<Suspense>` in this project (React 19), but understand both:

```tsx
// ✅ Preferred — React 19
import { use, Suspense } from "react";
import { useLoaderData } from "react-router";

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  return (
    <Suspense fallback={<Skeleton />}>
      <ActivityFeed promise={loaderData.activityPromise} />
    </Suspense>
  );
}

const ActivityFeed = ({ promise }: { readonly promise: Promise<Activity[]> }) => {
  const activity = use(promise);
  return <ul>{activity.map(/* ... */)}</ul>;
};

// ✅ Also valid — Await component (React Router built-in)
import { Await } from "react-router";
import { Suspense } from "react";

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  return (
    <Suspense fallback={<Skeleton />}>
      <Await resolve={loaderData.activityPromise}>
        {(activity) => <ul>{activity.map(/* ... */)}</ul>}
      </Await>
    </Suspense>
  );
}
```

Always wrap both in `<Suspense>` and an `<ErrorBoundary>`. Never await in the loader when the data is non-critical.

## Version and future flags

This project targets React Router 7. Enable future flags in `react-router.config.ts` to opt into v8 behaviour ahead of the migration:

```typescript
// react-router.config.ts
import type { Config } from "@react-router/dev/config";

export default {
  future: {
    v8_middleware: true, // middleware system — requires RR v7.9+
    v8_splitRouteModules: true, // route module code-splitting
  },
} satisfies Config;
```

Middleware requires `v8_middleware: true` — see `middleware.md` for the full pattern.

## Nested routes

- Shared layout (nav, sidebar) lives in a parent route with an `<Outlet />`.
- Data shared across children belongs in the parent loader — children re-use it via `useRouteLoaderData`.
- Avoid prop-drilling loader data through `<Outlet context>` unless the shape is trivial.

## Error handling

- Every non-trivial route must export an `ErrorBoundary`. Specialized routes handle their own errors; the root ErrorBoundary is the last resort.
- Show stack trace and error message only in dev mode:

```typescript
export const ErrorBoundary = ({ error }: Route.ErrorBoundaryProps) => {
  const details = import.meta.env.DEV && error instanceof Error
    ? error.message
    : 'An unexpected error occurred.';
  const stack = import.meta.env.DEV && error instanceof Error ? error.stack : undefined;

  return (
    <main>
      <h1>Oops!</h1>
      <p>{details}</p>
      {stack && <pre><code>{stack}</code></pre>}
    </main>
  );
};
```
