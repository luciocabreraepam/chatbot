---
paths:
  - "apps/website/src/routes/**"
---

# Resource Routes Rules

## What is a resource route

A resource route exports `loader` and/or `action` but **no default component**. React Router serves the raw `Response` directly — useful for APIs, file downloads, webhooks, and SSE streams.

```typescript
// routes/api.users.$id.ts — no default export
import type { Route } from "./+types/api.users.$id";
import { userApi, ApiError } from "@/services/userApi.service";

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const id = params.id;
  try {
    const user = await userApi.fetchUser({ id, requestUrl: request.url });
    return Response.json(user);
  } catch (err) {
    if (err instanceof ApiError) {
      return new Response(err.message, { status: err.status });
    }
    return new Response("Internal server error", { status: 500 });
  }
};
```

## HTTP method routing in actions

`loader` handles GET; `action` handles all other methods. Use a switch on `request.method` to route:

```typescript
export const action = async ({ params, request }: Route.ActionArgs) => {
  switch (request.method) {
    case "POST":
      return handleCreate(request);
    case "PUT":
    case "PATCH":
      return handleUpdate(params.id, request);
    case "DELETE":
      return handleDelete(params.id);
    default:
      return new Response("Method Not Allowed", { status: 405 });
  }
};
```

## JSON API pattern

```typescript
// routes/api.users.ts
import type { Route } from "./+types/api.users";
import { userApi, ApiError } from "@/services/userApi.service";
import { z } from "zod";

export const loader = async ({ request }: Route.LoaderArgs) => {
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "20");
  const skip = Number(url.searchParams.get("skip") ?? "0");

  const result = await userApi.fetchUsers({
    limit,
    requestUrl: request.url,
    signal: request.signal,
    skip,
  });

  return Response.json(result);
};

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

export const action = async ({ request }: Route.ActionArgs) => {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const body = await request.json().catch(() => null);
  const result = CreateUserSchema.safeParse(body);
  if (!result.success) {
    return Response.json({ errors: result.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    const user = await userApi.createUser({ data: result.data, requestUrl: request.url });
    return Response.json(user, { status: 201 });
  } catch (err) {
    if (err instanceof ApiError) {
      return new Response(err.message, { status: err.status });
    }
    return new Response("Internal server error", { status: 500 });
  }
};
```

## File download / serving

Set `Content-Type` and `Content-Disposition` headers to serve files:

```typescript
// routes/reports.$id.pdf.ts
export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const pdf = await generateReport({ id: params.id, requestUrl: request.url });

  return new Response(pdf, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="report-${params.id}.pdf"`,
      "Content-Type": "application/pdf",
    },
  });
};
```

For images with caching:

```typescript
// routes/avatars.$userId.ts
export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const image = await fetchAvatar({ requestUrl: request.url, userId: params.userId });

  return new Response(image, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "image/webp",
    },
  });
};
```

## Webhooks

Verify the signature before processing. Always return a `200` quickly to acknowledge receipt:

```typescript
// routes/webhooks.stripe.ts
export const action = async ({ request }: Route.ActionArgs) => {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const signature = request.headers.get("stripe-signature");
  const body = await request.text();

  const event = verifyStripeSignature(body, signature);
  if (!event) {
    return new Response("Invalid signature", { status: 400 });
  }

  // Process asynchronously — don't await slow work here
  void processStripeEvent(event);

  return new Response(null, { status: 200 });
};
```

## Fetching from a resource route (autocomplete pattern)

Use `useFetcher.load()` to fetch from a resource route without navigation:

```tsx
import { useFetcher } from "react-router";

type SearchResult = { readonly id: string; readonly label: string };

export const Autocomplete = () => {
  const fetcher = useFetcher<{ readonly results: readonly SearchResult[] }>();

  const search = (q: string) => {
    if (q.length < 2) return;
    fetcher.load(`/api/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <>
      <input onChange={(e) => search(e.target.value)} type="search" />
      {fetcher.state === "loading" && <span>Searching…</span>}
      {fetcher.data?.results.map((r) => (
        <div key={r.id}>{r.label}</div>
      ))}
    </>
  );
};
```

## Linking to resource routes

Use `<a>` tags or `<Link reloadDocument>` — regular `<Link>` will try to do a client-side navigation:

```tsx
// ✅ Browser handles the download/response
<a href={`/reports/${id}.pdf`}>Download PDF</a>
<Link reloadDocument to={`/reports/${id}.pdf`}>Download PDF</Link>

// ❌ Tries to render it as a route component
<Link to={`/reports/${id}.pdf`}>Download PDF</Link>
```

## Rules summary

- No default export — resource routes have no component.
- Always handle errors with typed `ApiError` — never let unhandled rejections produce a 500 with no body.
- Use `request.signal` when calling services to support request cancellation.
- Parse and validate all input (query params, JSON body, `FormData`) with Zod.
- For webhooks, verify signatures before processing and return 200 immediately.
- For file routes, always set `Content-Type` and `Content-Disposition`.
