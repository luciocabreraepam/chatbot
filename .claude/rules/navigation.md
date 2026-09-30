---
paths:
  - "apps/website/src/routes/**"
  - "apps/website/src/components/**"
---

# Navigation Rules

## Redirects in loaders and actions

Use `redirect()` from `react-router` to guard routes and redirect after mutations:

```typescript
import { redirect } from "react-router";
import type { Route } from "./+types/<name>";

// Auth guard in loader
export const loader = async ({ request }: Route.LoaderArgs) => {
  const user = await getUser(request);
  if (!user) return redirect("/login");
  return { user };
};

// Post-action redirect
export const action = async ({ request }: Route.ActionArgs) => {
  await processForm(request);
  return redirect("/dashboard");
};
```

Always `return redirect(...)` — never `throw redirect(...)` unless inside a utility function called from a loader.

## Preserving redirect destination

When redirecting to login, preserve the intended destination so the user lands there after auth:

```typescript
export const loader = async ({ request }: Route.LoaderArgs) => {
  const user = await getUser(request);
  if (!user) {
    const url = new URL(request.url);
    return redirect(`/login?redirectTo=${encodeURIComponent(url.pathname)}`);
  }
  return { user };
};
```

After login, read `redirectTo` from search params and redirect there (validate it's a relative path first).

## Programmatic navigation

Use `useNavigate` for navigation triggered by non-form events (e.g. timer, modal close, keyboard shortcut):

```typescript
import { useNavigate } from "react-router";

const navigate = useNavigate();

// Basic push
navigate("/dashboard");

// Replace (no back entry)
navigate("/dashboard", { replace: true });

// Pass state (accessible via useLocation().state)
navigate("/profile", { state: { from: "onboarding" } });

// With query params
navigate(`/search?q=${encodeURIComponent(query)}`);

// Browser history
navigate(-1); // back
navigate(1); // forward
```

Prefer `<Link>` or `<Form>` over `useNavigate` for user-initiated navigation — they work without JS and are more accessible.

## When to use each navigation method

| Method                 | When to use                                           |
| ---------------------- | ----------------------------------------------------- |
| `<Link to="...">`      | Standard page links — always prefer this              |
| `<NavLink to="...">`   | Navigation links that need active styling             |
| `return redirect(...)` | After mutations in actions, or auth guards in loaders |
| `useNavigate()`        | Programmatic navigation from non-link events          |

## Reading location state

```typescript
import { useLocation } from "react-router";

const location = useLocation();
const from = (location.state as { from?: string })?.from ?? "/";
```

Always cast `location.state` with a type — it is typed as `unknown`.

## Outlet — rendering child routes

Parent layout routes render `<Outlet />` where child routes should appear:

```tsx
import { Outlet } from "react-router";

export default function AppLayout() {
  return (
    <div>
      <nav>{/* shared nav */}</nav>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
```

## Outlet with context

Pass data to child routes via `<Outlet context={...}>` when the child doesn't need its own loader for that data:

```tsx
// Parent route
import { Outlet } from "react-router";

export default function DashboardLayout({ loaderData }: Route.ComponentProps) {
  return <Outlet context={{ user: loaderData.user }} />;
}

// Child route
import { useOutletContext } from "react-router";

type DashboardContext = { readonly user: User };

export default function DashboardPage() {
  const { user } = useOutletContext<DashboardContext>();
  return <h1>Welcome, {user.name}</h1>;
}
```

Prefer `useRouteLoaderData` over Outlet context when the data shape is non-trivial — it's type-safe via the generated loader type.

## Scroll restoration

Add `<ScrollRestoration />` once in the root layout to restore scroll position on back/forward navigation:

```tsx
import { ScrollRestoration } from "react-router";

export default function Root() {
  return (
    <html>
      <body>
        <Outlet />
        <ScrollRestoration />
      </body>
    </html>
  );
}
```

For custom scroll keys (e.g. restore scroll per-tab, not per-URL):

```tsx
<ScrollRestoration
  getKey={(location) => {
    // Use pathname without search params as the key
    return location.pathname;
  }}
/>
```

## NavLink active styles

Use `NavLink` for navigation items that need active state. The `className` prop receives an `isActive` boolean:

```tsx
import { NavLink } from "react-router";
import * as stylex from "@stylexjs/stylex";

export const NavItem = ({ label, to }: { readonly label: string; readonly to: string }) => (
  <NavLink to={to}>
    {({ isActive }) => (
      <span {...stylex.props(styles.link, isActive && styles.active)}>{label}</span>
    )}
  </NavLink>
);
```

Never rely on NavLink's default `className="active"` — use the render prop and StyleX instead.
