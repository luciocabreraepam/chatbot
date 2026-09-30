---
paths:
  - "apps/website/src/**"
---

# Middleware Rules (React Router v7.9+)

## Enabling middleware

Requires React Router v7.9.0+ and the `v8_middleware` future flag in `react-router.config.ts`:

```typescript
// react-router.config.ts
import type { Config } from "@react-router/dev/config";

export default {
  future: {
    v8_middleware: true,
  },
} satisfies Config;
```

## Typed context

Define typed context keys with `createContext<T>()`. Keep all context definitions in a single module:

```typescript
// app/middleware/context.ts
import { createContext } from "react-router";
import type { User } from "@/types/user.types";

export const userContext = createContext<User | null>();
export const requestIdContext = createContext<string>();
```

All context types must follow the project's TypeScript rules: `type` not `interface`, `readonly` on all properties.

## Authentication middleware

Centralise auth in a middleware so individual loaders never need to repeat the auth check:

```typescript
// app/middleware/auth.middleware.ts
import { redirect } from "react-router";
import type { unstable_MiddlewareFunctionArgs as MiddlewareFunctionArgs } from "react-router";
import { userContext } from "./context";
import { getSession } from "@/services/session.service";

export const authMiddleware = async (
  { context, request }: MiddlewareFunctionArgs,
  next: () => Promise<Response>,
): Promise<Response> => {
  const user = await getSession(request);

  if (!user) {
    const url = new URL(request.url);
    return redirect(`/login?redirectTo=${encodeURIComponent(url.pathname)}`);
  }

  context.set(userContext, user);
  return next();
};
```

## Using middleware in a route

Export a `middleware` array from the route module. Middleware runs in array order before the loader:

```typescript
// routes/dashboard.tsx
import { authMiddleware } from "@/middleware/auth.middleware";
import { userContext } from "@/middleware/context";
import type { Route } from "./+types/dashboard";

export const middleware = [authMiddleware];

export const loader = ({ context }: Route.LoaderArgs) => {
  const user = context.get(userContext);
  // user is guaranteed non-null here — authMiddleware redirected otherwise
  return { user };
};
```

## Execution order

Middleware forms a nested chain. For a route tree `root → dashboard → settings`:

1. `root` middleware (before) → `dashboard` middleware (before) → `settings` middleware (before)
2. Loader / Action runs
3. `settings` middleware (after) → `dashboard` middleware (after) → `root` middleware (after)

The "after" phase runs code after `await next()`:

```typescript
export const loggingMiddleware = async (
  { request }: MiddlewareFunctionArgs,
  next: () => Promise<Response>,
): Promise<Response> => {
  const start = Date.now();
  const response = await next(); // --- everything below runs AFTER the loader ---
  log.info(`${request.method} ${new URL(request.url).pathname} ${Date.now() - start}ms`);
  return response;
};
```

## Role-based access control (RBAC)

```typescript
// app/middleware/rbac.middleware.ts
import { data } from "react-router";
import type { unstable_MiddlewareFunctionArgs as MiddlewareFunctionArgs } from "react-router";
import { userContext } from "./context";

type Role = "admin" | "member" | "viewer";

export const requireRole =
  (role: Role) =>
  async ({ context }: MiddlewareFunctionArgs, next: () => Promise<Response>): Promise<Response> => {
    const user = context.get(userContext);
    if (!user || !hasRole(user, role)) {
      throw data({ message: "Forbidden" }, { status: 403 });
    }
    return next();
  };

// Usage in a route
export const middleware = [authMiddleware, requireRole("admin")];
```

## Error handling middleware

Catch and normalise errors at the middleware level to avoid duplicating error handling in every loader:

```typescript
// app/middleware/error.middleware.ts
import type { unstable_MiddlewareFunctionArgs as MiddlewareFunctionArgs } from "react-router";
import { ApiError } from "@/services/errors";

export const errorMiddleware = async (
  _args: MiddlewareFunctionArgs,
  next: () => Promise<Response>,
): Promise<Response> => {
  try {
    return await next();
  } catch (err) {
    if (err instanceof ApiError) {
      return new Response(err.message, { status: err.status });
    }
    throw err; // re-throw unknown errors for the ErrorBoundary
  }
};
```

## Rules summary

- Middleware requires `v8_middleware: true` in `react-router.config.ts` and RR v7.9+.
- Define context keys in a single `middleware/context.ts` module — never inline `createContext()` in middleware files.
- Auth middleware sets context via `context.set()` and redirects if unauthenticated — loaders read via `context.get()`.
- Keep middleware pure and focused — one concern per middleware function (auth, logging, error handling, RBAC are all separate).
- Export a `middleware` array from route modules — not a single function.
- Always `await next()` and return the response — never swallow it.
