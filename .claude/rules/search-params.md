---
paths:
  - "apps/website/src/routes/**"
  - "apps/website/src/**/*.hook.ts"
---

# Search Params Rules

## When to use search params

Use URL search params for state that should be:

- **Shareable** — filters, search queries, pagination
- **Bookmarkable** — the page should load in the same state on reload
- **Linkable** — another page or email can deep-link to this exact view

Do NOT use search params for:

- Sensitive data (tokens, passwords, PII)
- Large serialized objects — use loader state or context instead
- Temporary UI state (open/closed modals, hover) — use `useState`

## Reading search params in loaders

Extract and validate with Zod inside the loader. Always provide defaults.

```typescript
import { z } from "zod";
import type { Route } from "./+types/<name>";

const SearchSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  q: z.string().default(""),
  sort: z.enum(["asc", "desc"]).default("asc"),
});

export const loader = ({ request }: Route.LoaderArgs) => {
  const url = new URL(request.url);
  const params = SearchSchema.parse(Object.fromEntries(url.searchParams));
  return api.fetchItems(params);
};
```

Never read `url.searchParams.get(...)` directly and trust the raw string — always parse through a Zod schema.

## Reading search params on the client

Use `useSearchParams` from `react-router` for client-side reading and updating:

```typescript
import { useSearchParams } from "react-router";

const [searchParams, setSearchParams] = useSearchParams();
const page = Number(searchParams.get("page") ?? "1");
const query = searchParams.get("q") ?? "";
```

Always provide a fallback — `searchParams.get()` returns `null` when absent.

## Updating search params

Prefer the functional update form to avoid race conditions when multiple params change:

```typescript
// ✅ Functional — merges with current params
setSearchParams((prev) => {
  const next = new URLSearchParams(prev);
  next.set('page', String(newPage));
  return next;
});

// ✅ Replace (when resetting to a known state)
setSearchParams({ q: newQuery, page: '1' });

// ✅ With navigation options — replace history entry on filter change
setSearchParams((prev) => { ... }, { replace: true });
```

## Pagination pattern

```typescript
const [searchParams, setSearchParams] = useSearchParams();
const page = Number(searchParams.get('page') ?? '1');

const goTo = (n: number) =>
  setSearchParams((prev) => {
    const next = new URLSearchParams(prev);
    next.set('page', String(n));
    return next;
  }, { replace: true });

return (
  <>
    <button disabled={page <= 1} onClick={() => goTo(page - 1)}>Previous</button>
    <button onClick={() => goTo(page + 1)}>Next</button>
  </>
);
```

## Filter form pattern

Use `<Form method="get">` to sync filter inputs with the URL without JavaScript:

```tsx
import { Form } from "react-router";

export default function ListRoute({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <Form method="get">
        <input defaultValue={loaderData.q} name="q" placeholder="Search..." type="search" />
        <select defaultValue={loaderData.sort} name="sort">
          <option value="asc">A → Z</option>
          <option value="desc">Z → A</option>
        </select>
        <button type="submit">Filter</button>
      </Form>
      {/* results */}
    </>
  );
}
```

`<Form method="get">` submits as a URL navigation — the loader re-runs automatically. No JS required.

## Debounced search input

When you want to update search params on every keystroke without a submit button:

```tsx
import { useSearchParams } from "react-router";

export const SearchInput = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") ?? "");

  useEffect(() => {
    const id = setTimeout(() => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value) {
            next.set("q", value);
          } else {
            next.delete("q");
          }
          next.set("page", "1"); // reset pagination on new search
          return next;
        },
        { replace: true },
      );
    }, 300);

    return () => clearTimeout(id);
  }, [value, setSearchParams]);

  return <input onChange={(e) => setValue(e.target.value)} type="search" value={value} />;
};
```

This is one of the few acceptable `useEffect` uses — it's a side effect on a timer, not derived state.

## Clear all filters

```typescript
const clearFilters = () => setSearchParams({});
```

## Preserve other params when updating one

Always use the functional form when you only intend to change a subset of params:

```typescript
// ✅ Preserves all other params
const setSort = (sort: string) =>
  setSearchParams((prev) => {
    const next = new URLSearchParams(prev);
    next.set("sort", sort);
    next.set("page", "1");
    return next;
  });

// ❌ Wipes every param not explicitly set
setSearchParams({ sort: newSort });
```

## Best practices

- URL is the source of truth — derive all filter/pagination state from search params, not `useState`.
- Return parsed params from the loader so the component never re-parses them.
- Reset `page` to `1` whenever a filter changes.
- Validate with Zod in the loader — never trust raw strings from the URL in business logic.
- Prefer `{ replace: true }` for filter changes to keep the browser history clean.
- Use `<Form method="get">` for filter forms — progressive enhancement works without JS.
