---
paths:
  - "apps/website/src/services/**"
  - "apps/website/src/utils/**"
---

# Services & Utilities Rules

## API services — plain objects, not classes

Export API services as plain objects with named method properties. No classes, no constructors.

```typescript
// ✅
export const userApi = {
  fetchUser: async ({ id, requestUrl }: FetchUserArgs): Promise<UserResponse> => { ... },
  updateUser: async ({ id, patch }: UpdateUserArgs): Promise<UserResponse> => { ... },
};

// ❌
export class UserApi {
  async fetchUser(...) { ... }
}
```

## Response types

Export an explicit type for each service response. Use a `data` property for the primary payload and `total` for paginated lists. Add `hasMore` for infinite scroll patterns:

```typescript
export type UserResponse = {
  readonly data: User;
};

export type UsersResponse = {
  readonly data: readonly User[];
  readonly hasMore: boolean;
  readonly total: number;
};
```

## Service method parameters

Follow the same object-params-with-`Args`-suffix rule from `typescript.md`. All properties `readonly`:

```typescript
type FetchUsersArgs = {
  readonly limit: number;
  readonly requestUrl?: string;
  readonly skip: number;
};

export const userApi = {
  fetchUsers: async ({ limit, requestUrl, skip }: FetchUsersArgs): Promise<UsersResponse> => { ... },
};
```

## Logger

Create a module-scoped logger with a `[module]` prefix. Use `createLogger` from `@/utils/logger`:

```typescript
import { createLogger } from "@/utils/logger";

const log = createLogger({ prefix: "[users]" });

export const userApi = {
  fetchUsers: async (args: FetchUsersArgs) => {
    log.debug("fetchUsers called", args);
    // ...
  },
};
```

`log.debug` and `log.info` are no-ops in production — use them freely during development. `log.warn` and `log.error` survive in production.

## Error handling

Service methods must throw on failure — never swallow errors or return `null`. Use a typed error class so callers can distinguish API errors from network failures:

```typescript
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const userApi = {
  fetchUser: async ({ id, requestUrl }: FetchUserArgs): Promise<UserResponse> => {
    const res = await fetch(buildUrl(`/api/users/${id}`, requestUrl));
    if (!res.ok) throw new ApiError(res.status, await res.text());
    return res.json() as Promise<UserResponse>;
  },
};
```

Loaders should catch `ApiError` and convert to an appropriate `Response` (e.g. 404, 500) rather than letting it surface as an unhandled rejection.

## SSR-safe URL construction

React Router loaders run on the server where relative URLs (`/api/...`) are invalid. Accept an optional `requestUrl` param and derive the origin from it when present:

```typescript
const buildUrl = (path: string, requestUrl?: string): string => {
  if (!requestUrl) return path;
  const { origin } = new URL(requestUrl);
  return `${origin}${path}`;
};
```

Pass `request.url` from the loader:

```typescript
export const loader = async ({ request, params }: Route.LoaderArgs) => {
  return userApi.fetchUser({ id: params.id, requestUrl: request.url });
};
```

## Abort signal

Pass `signal` through to `fetch` so React Router can cancel in-flight requests on navigation:

```typescript
type FetchUserArgs = {
  readonly id: string;
  readonly requestUrl?: string;
  readonly signal?: AbortSignal;
};

export const userApi = {
  fetchUser: async ({ id, requestUrl, signal }: FetchUserArgs): Promise<UserResponse> => {
    const res = await fetch(buildUrl(`/api/users/${id}`, requestUrl), { signal });
    if (!res.ok) throw new ApiError(res.status, await res.text());
    return res.json() as Promise<UserResponse>;
  },
};
```

## Middleware context integration

When middleware sets a user context (see `middleware.md`), services should accept it as an optional parameter so they can attach auth headers without re-fetching the session:

```typescript
import type { User } from "@/types/user.types";

type AuthenticatedArgs = {
  readonly requestUrl?: string;
  readonly signal?: AbortSignal;
  readonly user?: User; // injected by middleware via context
};

type FetchUserArgs = AuthenticatedArgs & {
  readonly id: string;
};

export const userApi = {
  fetchUser: async ({ id, requestUrl, signal, user }: FetchUserArgs): Promise<UserResponse> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (user?.token) {
      headers["Authorization"] = `Bearer ${user.token}`;
    }

    const res = await fetch(buildUrl(`/api/users/${id}`, requestUrl), { headers, signal });
    if (!res.ok) throw new ApiError(res.status, await res.text());
    return res.json() as Promise<UserResponse>;
  },
};
```

Pass the user from the loader, which reads it from middleware context:

```typescript
// routes/profile.tsx
export const middleware = [authMiddleware];

export const loader = ({ context, request }: Route.LoaderArgs) => {
  const user = context.get(userContext);
  return userApi.fetchUser({ id: user.id, requestUrl: request.url, user });
};
```

## Test-only API delay

Support configurable fake delays via `VITE_API_DELAY_MS` for testing loading states in development. Wrap in `import.meta.env.DEV` so the branch is tree-shaken in production builds:

```typescript
// ✅ — dead code in production
const FAKE_API_DELAY_MS = import.meta.env.DEV ? Number(import.meta.env.VITE_API_DELAY_MS) || 0 : 0;
```
