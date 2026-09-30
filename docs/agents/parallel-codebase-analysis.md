# Parallel-subagent codebase analysis: approach comparison

Status: discovery — no implementation yet, decision pending.

## Problem

Evaluate a huge codebase by fanning out parallel subagents to explore/analyze
different areas, then have an orchestrator synthesize their findings into one
final report. Two raw prototypes exist outside this repo and were compared to
decide the production path: `.claude/agents/*.md` definitions, Skills, or
something else.

- `/home/lucio/workspace/claude/files`
- `/home/lucio/workspace/claude/multi-with-skills`

## What each prototype does

### `claude/files` — bare `CLAUDE.md`-driven orchestrator

No `.claude/agents/` or `.claude/skills/` involved. `orchestrate.sh` just runs
`ls -d src/*/` for module discovery; everything else is prose in `CLAUDE.md`
telling the main thread: spawn one Explore-type subagent per module via the
**native Agent tool**, all in one message so they run in parallel; each
subagent returns structured text directly — no file handoff needed; then
write `scratchpad.json` (persisted record) and `report-final.md` yourself.

The file explicitly documents an earlier, abandoned design — nested
`claude --print` CLI subprocesses coordinating over a shared
`scratchpad.json` — replaced because it "depends on a separately
authenticated CLI session" and "forces a file-based handoff just to get
results back." The sample run in `audit-run/` completed successfully
end-to-end.

### `claude/multi-with-skills` — Skill + bash subprocess fan-out

A real Skill (`.claude/skills/audit-api-docs/SKILL.md`,
`allowed-tools: Read, Write, Bash`) with bundled `references/subagent-prompt.md`,
`references/report-template.md`, and `scripts/orchestrate-audit.sh`. The
script discovers module subdirectories, then for each one pipes a composed
prompt into `claude --print --allowedTools "Read,Write" &` — spawning real OS
subprocesses in parallel, tracked by PID, polled with a `sleep 1` loop,
`wait`ed, then merged via a `python3` glob-and-merge step into
`audit-output/scratchpad.json`. The orchestrator only reads the merged
scratchpad and writes `report.md` from a template — it never touches source
itself.

**This is exactly the design `claude/files` tried and abandoned, and it shows
why.** The sample run is broken: `audit-output/` has only 2 of 3 modules
merged. The `notifications` subagent never wrote its JSON because a
non-interactive `claude --print` subprocess can't answer the write-permission
prompt SKILL.md itself warns about ("first run will prompt you to approve...
approve once and they'll be cached") — there's no human present to click
approve, so it hangs/dies silently. Verified directly: `audit-output/report.md`
does not exist on disk, despite an IDE tab showing that path open.

### Local precedent already in this environment

Two skills already implement "parallel fresh-context subagents to avoid one
agent's context degrading across many modules": `codebase-explorer` (prose
only — phases + scratchpad + capped synthesis before the next phase) and
`audit-api-docs` itself. Both are **Skills**, not agents. Existing
`.claude/agents/*.md` definitions elsewhere (`architecture-guard`,
`fallow-scan`, `quality-gate`) are thin, single-purpose specialist personas
invoked by something else — never themselves a fan-out mechanism.

Established local convention: **Skill = owns the orchestration procedure (+
optional bundled script). Agent = a reusable specialist persona invoked by
the orchestrator, one per unit of work.**

One caveat on `codebase-explorer`: its frontmatter is
`allowed-tools: Read, Grep, Glob, Bash` (no `Agent`/`Task` listed), even
though its steps say to "spawn subagents." It never states its invocation
mechanism explicitly. Treat it as validated evidence for the
phasing/manifest/synthesis pattern only, not for how to actually invoke a
subagent — that's plausibly why `multi-with-skills` reached for the bash +
`claude --print` workaround in the first place.

## Comparison

| | `claude/files` (CLAUDE.md-only) | `claude/multi-with-skills` (Skill + bash) | Pure `.claude/agents/*.md` (untested) |
|---|---|---|---|
| Packaging / discoverability | None — only works if this exact folder is the project root | Reusable: installable Skill with `description`-based auto-invocation | Reusable per-agent, no built-in fan-out primitive |
| Parallel mechanism | Native Agent tool, N calls in one message — in-process, no subprocess/auth issues | Bash-spawned `claude --print` subprocesses — needs a second authenticated CLI session, hits a permission-prompt deadlock non-interactively | Would need a skill/main thread to invoke N agent instances via the Agent tool anyway |
| Reporting back | Structured text returned directly in the tool result | File-based JSON per module, merged by a python step — rigid schema, more moving parts that can partially fail | Ad hoc, no built-in convention |
| Robustness (as built) | Works — sample run completed | Broken — 1 of 3 subagents silently never completed, no report ever generated | N/A, unbuilt |
| Output rigor | Text-based reports, works fine at this scale | Schema-enforced JSON + explicit "never paraphrase" contract — better at suppressing hallucinated signatures at scale | Depends entirely on the invoking prompt |
| Fits existing conventions here | Partial — no Skill packaging, but its Agent-tool fan-out matches what precedent recommends | Partial — right packaging, wrong orchestration primitive | Right primitive for "one specialist," wrong level for orchestration |

## Recommendation

Neither prototype wins outright — combine the parts each got right, discard
the parts each got wrong:

1. **Package as a Skill** (from `multi-with-skills`) — discoverability via
   `description` matching, progressive disclosure (`references/`), reusable
   across projects. Matches the established local convention.
2. **Fan out via the native Agent tool, not `claude --print` subprocesses**
   (from `claude/files`) — this is the part `multi-with-skills` got wrong and
   is the direct cause of its broken sample run. The Agent tool runs
   in-process, inherits permissions, and returns results synchronously — no
   subprocess/permission-prompt deadlock possible.
3. **Keep a lightweight structured-text contract per subagent** (exact names,
   no paraphrasing) without the file-based JSON + python merge machinery — the
   Agent tool already returns each subagent's output directly, so the
   orchestrator compiles the report from in-context results. Still write a
   scratchpad file, but only as a persisted *record* after the fact, never as
   the coordination mechanism.
4. **For real huge codebases, phased batching is not optional — it's the core
   scaling mechanism.**

### Why huge codebases need phasing

The bottleneck isn't how many subagents can run in parallel — each Agent-tool
subagent gets its own fresh, isolated context regardless of concurrency. The
bottleneck is the **orchestrator's own context**: every subagent's returned
text lands directly in the orchestrator's conversation. Spawn enough
subagents with large enough reports and the orchestrator's own synthesis
degrades — the same "vague references" failure mode `audit-api-docs`
describes for a single over-exploring agent, recurring one level up.

The mechanism, concretely (adapted from `codebase-explorer`'s
phasing/manifest pattern, combined with `claude/files`' verified invocation
mechanism):

1. **Durable state outside the conversation, from turn one** — a
   `manifest.json` (`explored_paths`, `key_findings`, `next_steps`/
   `pending_modules`) plus a `findings.md` append-log, under a scratch dir,
   written to disk immediately and updated after every phase.
2. **Partition into bounded batches, not one giant fan-out** — enumerate the
   full set of units to analyze, split into batches of a fixed, tunable size
   (start around 5–8 concurrent subagents per phase). One phase = one batch,
   spawned in a single message.
3. **Compress before moving on** — append every subagent's full findings to
   `findings.md` (unbounded, off-context). Write a capped synthesis of just
   that phase (e.g. ≤300 words) into `manifest.json`. Only that synthesis —
   never raw output — gets prepended to the next phase's subagent prompts
   ("prior findings — do not re-explore unless verification is needed"). Raw
   detail accumulates in the file; only a bounded digest accumulates in
   context.
4. **Crash/resume by construction** — check `manifest.json` at the start of
   every invocation; resume from `next_steps` instead of re-exploring
   `explored_paths`. For a codebase large enough to need dozens of phases,
   the run may not complete in one sitting.
5. **Final report reads the file, not live context** — by the last phase,
   early raw findings will likely have scrolled out of context. Compile the
   final report from `findings.md`, the complete durable record.

Batch size/partitioning: default to natural module/directory boundaries, but
recurse into sub-batches when a single directory is itself huge. Treat
"subagent reports came back vague" or "the orchestrator's own synthesis got
vague" as the signal to shrink the batch size.

## Open items before scaffolding

- Verify empirically that a Skill's orchestrator can rely on the Agent tool
  being available even when not listed in `allowed-tools` (untested by either
  prototype).
- Decide on scratch-directory location/naming for the production skill.
- Once confirmed, scaffold via the `write-a-skill` skill.
