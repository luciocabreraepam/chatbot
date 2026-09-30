# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->

## Commands

```bash
# Install dependencies
vp install

# Full validation (check + test + build all packages)
vp run ready

# Format, lint, and typecheck
vp check
vp check --fix     # auto-fix formatting and lint issues

# Run tests
vp run -r test     # all packages recursively
vp test            # current package only

# Development server (website app)
vp run dev

# Build all packages recursively
vp run -r build

# Build a single library package (run inside packages/*)
vp pack
vp pack --watch

# Diagnose environment issues
vp env doctor
```

## Stack

- **Frontend**: React 19, React Router 7, StyleX, TypeScript
- **Toolchain**: Vite+ (`vp`), Vitest, Oxlint, Oxfmt
- **Package manager**: pnpm with a shared version catalog

## Architecture

This is a **pnpm monorepo** managed by Vite+, with workspaces defined in [pnpm-workspace.yaml](pnpm-workspace.yaml) under `apps/*`, `packages/*`, and `tools/*`.

**`apps/website`** — A vanilla TypeScript frontend app (no framework). Built with `vp build` (Vite/Rolldown under the hood), served with `vp dev`. Entry is [apps/website/src/main.ts](apps/website/src/main.ts).

**`packages/utils`** — A TypeScript library package. Built with `vp pack` (tsdown), which produces ESM output in `dist/` with `.d.ts` declarations generated via `tsgo`. Exported as the `utils` package name to other workspace members.

**Root [vite.config.ts](vite.config.ts)** — Configures monorepo-wide behavior:

- Staged pre-commit hook: runs `vp check --fix` on all staged files.
- Oxlint with the `vite-plus/prefer-vite-plus-imports` rule (enforces using `vp`-style imports).
- Task caching enabled for `vp run`.

**Package-level `vite.config.ts`** — Each package can override lint/fmt/pack settings. For example, `packages/utils` enables type-aware linting and uses `tsgo` for declaration generation.

**Dependency catalog** — Shared dependency versions (TypeScript, Vite, Vitest, etc.) are pinned in the `catalog:` section of [pnpm-workspace.yaml](pnpm-workspace.yaml). Use `catalog:` as the version specifier when adding dependencies that are already catalogued.

## Agent skills

### Issue tracker

Issues and PRDs live as markdown files under `.scratch/` in this repo. See `docs/agents/issue-tracker.md`.

### Triage labels

Default label vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repo — one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
