---
paths:
  - "apps/website/src/routes/**"
  - "apps/website/src/components/**"
---

# Forms, Mutations & Optimistic UI Rules

## Server-side validation with actions

Validate `FormData` with Zod at the top of the action. Return a typed error object with status 400 — never throw for validation failures.

```typescript
import { data, redirect } from "react-router";
import { z } from "zod";
import type { Route } from "./+types/<name>";
import { userApi } from "@/services/userApi.service";

const UpdateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

export const action = async ({ request }: Route.ActionArgs) => {
  const raw = Object.fromEntries(await request.formData());
  const result = UpdateUserSchema.safeParse(raw);

  if (!result.success) {
    return data({ errors: result.error.flatten().fieldErrors }, { status: 400 });
  }

  await userApi.updateUser({ patch: result.data, requestUrl: request.url });
  return redirect("/profile");
};
```

## Displaying validation errors

Access action errors via the `actionData` prop on `Route.ComponentProps`:

```tsx
export default function EditProfile({ actionData, loaderData }: Route.ComponentProps) {
  return (
    <form method="post">
      <input defaultValue={loaderData.user.name} name="name" />
      {actionData?.errors?.name && <p role="alert">{actionData.errors.name[0]}</p>}

      <input defaultValue={loaderData.user.email} name="email" type="email" />
      {actionData?.errors?.email && <p role="alert">{actionData.errors.email[0]}</p>}

      <button type="submit">Save</button>
    </form>
  );
}
```

Use `role="alert"` on error messages so screen readers announce them immediately.

## Pending UI with useNavigation

Use `useNavigation().state` for form submission state — never maintain a separate `isLoading` state:

```tsx
import { useNavigation } from "react-router";

export default function EditProfile({ actionData, loaderData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <form method="post">
      {/* fields */}
      <button disabled={isSubmitting} type="submit">
        {isSubmitting ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
```

`navigation.state` values:

- `'idle'` — no pending navigation
- `'submitting'` — form POST in flight, action running
- `'loading'` — action complete, loaders revalidating

## useFetcher — partial mutations without navigation

Use `useFetcher` when you need to submit to an action without navigating away (inline edits, toggles, deletes):

```tsx
import { useFetcher } from "react-router";

type Task = {
  readonly completed: boolean;
  readonly id: string;
  readonly title: string;
};

export const TaskRow = ({ task }: { readonly task: Task }) => {
  const fetcher = useFetcher();

  return (
    <li>
      <fetcher.Form action={`/tasks/${task.id}/toggle`} method="post">
        <button aria-label={task.completed ? "Mark incomplete" : "Mark complete"} type="submit">
          {task.completed ? "✓" : "○"}
        </button>
      </fetcher.Form>
      <span>{task.title}</span>
    </li>
  );
};
```

`fetcher.state` values mirror `navigation.state`: `'idle'`, `'submitting'`, `'loading'`.

## Optimistic UI with useFetcher

Read `fetcher.formData` to compute the optimistic state before the server responds:

```tsx
export const TaskRow = ({ task }: { readonly task: Task }) => {
  const fetcher = useFetcher();

  // Compute optimistic state from in-flight form data
  const optimisticCompleted =
    fetcher.formData != null ? fetcher.formData.get("completed") === "true" : task.completed;

  return (
    <li>
      <fetcher.Form action={`/tasks/${task.id}/toggle`} method="post">
        <input name="completed" type="hidden" value={String(!optimisticCompleted)} />
        <button type="submit">{optimisticCompleted ? "✓" : "○"}</button>
      </fetcher.Form>
      <span style={{ opacity: fetcher.state !== "idle" ? 0.5 : 1 }}>{task.title}</span>
    </li>
  );
};
```

`fetcher.formData` is `null` when idle and populated while submitting — use this as the signal.

## useOptimistic (React 19)

For list-level optimistic updates where multiple items can change independently, prefer `useOptimistic`:

```tsx
import { useOptimistic } from "react";
import { useFetcher } from "react-router";

type Props = { readonly tasks: readonly Task[] };

export const TaskList = ({ tasks }: Props) => {
  const [optimisticTasks, addOptimistic] = useOptimistic(
    tasks,
    (state, update: { id: string; completed: boolean }) =>
      state.map((t) => (t.id === update.id ? { ...t, ...update } : t)),
  );

  return (
    <ul>
      {optimisticTasks.map((task) => (
        <TaskRow key={task.id} onToggle={addOptimistic} task={task} />
      ))}
    </ul>
  );
};
```

## Fetcher error handling

Check `fetcher.data` for server-returned errors after submission:

```tsx
export const TaskRow = ({ task }: { readonly task: Task }) => {
  const fetcher = useFetcher<{ error?: string }>();

  return (
    <>
      <fetcher.Form action={`/tasks/${task.id}`} method="delete">
        <button type="submit">Delete</button>
      </fetcher.Form>
      {fetcher.data?.error && <p role="alert">{fetcher.data.error}</p>}
    </>
  );
};
```

## Complete example: editable task list

```tsx
import { useFetcher } from "react-router";

type Task = {
  readonly completed: boolean;
  readonly id: string;
  readonly title: string;
};

export const TaskItem = ({ task }: { readonly task: Task }) => {
  const toggleFetcher = useFetcher();
  const deleteFetcher = useFetcher();

  const isToggling = toggleFetcher.state !== "idle";
  const isDeleting = deleteFetcher.state !== "idle";

  const optimisticCompleted =
    toggleFetcher.formData != null
      ? toggleFetcher.formData.get("completed") === "true"
      : task.completed;

  if (isDeleting) return null; // optimistic removal

  return (
    <li>
      <toggleFetcher.Form action={`/tasks/${task.id}/toggle`} method="post">
        <input name="completed" type="hidden" value={String(!optimisticCompleted)} />
        <button disabled={isToggling} type="submit">
          {optimisticCompleted ? "✓" : "○"}
        </button>
      </toggleFetcher.Form>

      <span>{task.title}</span>

      <deleteFetcher.Form action={`/tasks/${task.id}`} method="delete">
        <button type="submit">Delete</button>
      </deleteFetcher.Form>
    </li>
  );
};
```

## Rules summary

- Validate `FormData` with Zod in the action — never pass raw data to services.
- Return `data({ errors }, { status: 400 })` for validation failures; `redirect()` on success.
- Use `useNavigation().state` for route-level pending UI — not `useState`.
- Use `useFetcher` for partial mutations that don't navigate.
- Use `fetcher.formData` for optimistic state in individual items.
- Use `useOptimistic` (React 19) for list-level optimistic updates.
- Always add `role="alert"` to validation error messages.
