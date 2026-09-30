---
description: Read a GitHub issue and implement the fix following project conventions. Use when asked to fix or resolve a specific issue by number or URL.
---

Fix GitHub issue: $ARGUMENTS

## Step 1 — Read the issue

Fetch the issue using the GitHub CLI:

```bash
gh issue view $ARGUMENTS
```

Read the full description, comments, and any linked issues before writing any code.

## Step 2 — Understand before acting

Before touching code:

- Identify the exact file(s) involved
- State what the bug or missing behaviour is in one sentence
- State what the correct behaviour should be
- Confirm there is no existing test that should have caught this

## Step 3 — Implement

Apply the fix following all project conventions:

- SOLID: fix only what the issue describes — do not refactor surrounding code
- TypeScript: no `any`, no type assertions unless unavoidable
- StyleX: no inline styles or className overrides
- React 19: no `useEffect` for anything that can be a loader, action, or derived value

## Step 4 — Test

- If a test existed and was wrong: fix the test first, then the code
- If no test existed: write the test that would have caught this issue, then make it pass
- Run: `vp test` to confirm

## Step 5 — Verify end-to-end

Run the full check suite:

```bash
vp check && vp run -r test
```

## Step 6 — Commit

Create a commit with:

- Subject: `fix: <short description of what was broken>` (≤72 chars)
- Body: reference the issue number `Closes #$ARGUMENTS`
