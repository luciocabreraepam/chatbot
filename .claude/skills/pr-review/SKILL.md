---
description: Run all checks, summarize the current diff, and flag risks before opening a PR. Use when asked to review, prepare, or check changes before submitting a pull request.
---

Run a full pre-PR review of the current branch.

## Step 1 — Validation

Run these in order and report the result of each:

```bash
vp check
```

```bash
vp run -r test
```

```bash
vp run -r build
```

Stop and report any failures immediately. Do not continue to the next step if a command fails.

## Step 2 — Diff summary

!`git diff main...HEAD`

Summarise the changes in 3–5 bullet points covering:

- What changed and why (based on the diff, not assumptions)
- Which packages / routes / components are affected

## Step 3 — Risk flags

Review the diff and call out any of the following if present:

- **Missing error boundaries** around new `use(promise)` calls
- **Loader data used without null checks** in components
- **StyleX token bypasses** — hardcoded colors, spacing, or font values instead of tokens
- **`useEffect` used for data fetching or derived state** — should be a loader or `useMemo`
- **Untested new components or routes** — files added with no corresponding `.test.tsx`
- **TypeScript `any`** introduced
- **SOLID violations** — a component or function doing more than one thing

## Step 4 — PR description draft

Draft a PR title (≤70 chars) and body using this format:

```
## Summary
- <bullet>

## Test plan
- [ ] <what to verify manually>
- [ ] Tests pass: `vp run -r test`

🤖 Generated with Claude Code
```
