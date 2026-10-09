---
id: ops-handoff-template
type: operations
title: "Handoff note template"
status: draft
updated: 2026-10-08
sources:
  - raw/01-scoping-decisions.md
related: [schema, adr-0003, ops-session-protocol, ops-resume-after-interruption]
approvable: false
audience: claude
trigger: "End of every session, when the owner asks, or early (status partial) when the context budget gets tight."
tags: [handoff, template]
---

# Handoff note template

A handoff is the letter one session writes to the next, which remembers nothing. It follows SCHEMA
§6.15 ([SCHEMA](../SCHEMA.md)). Write it **early rather than late**: a `partial` handoff written while
there is still budget is worth more than a perfect one that never gets written.

## Where and how

- File: `wiki/operations/handoffs/handoff-YYYY-MM-DD-sNN.md`. The basename starts with the id, as SCHEMA
  §5.1 and §6.15 require (SCHEMA amended 2026-10-08; Q-004 closes when the owner approves `schema`).
- One file per session. If the session continues after a `partial` handoff, update the same file and
  set `status: final` at the end.
- After writing it: set `STATUS.md` `last_handoff` to its id and append a `handoff` log entry.
- Handoffs are not approvable (`approvable: false`) and are never edited after the next session starts
  (corrections go in the next handoff).

## Checklist before writing

- [ ] Quick lint run; result known (clean, or list of errors left)
- [ ] `git status --short` captured for the `uncommitted` field
- [ ] Every claim of "tests pass" in the note refers to a run in this session with saved output
- [ ] `next_action` is a literal command or step a zero-memory session can execute
- [ ] Open questions exist as `## Q-NNN` sections in `ov-open-questions`

## Template (copy below the line)

````markdown
---
id: handoff-2026-10-08-s01
type: handoff
title: "Handoff s01 (2026-10-08): <one-line summary>"
status: final
updated: 2026-10-08
sources: []
related: [phase-p0-planning]
approvable: false
session: s01
phase: phase-p0-planning
next_action: "<literal next command or step, e.g. run the quick lint, then ask the owner Q-104>"
uncommitted: []
open_questions: []
---

# Handoff s01 — 2026-10-08

## Done

- <task id or work item> — <what changed> — verified by <command> (<observed result>) — commit <sha or "uncommitted">

## In progress

- <task id> — <state, e.g. half the tests written; tree dirty in crates/x/>; In-flight in STATUS.md is up to date: yes/no

## Next

1. <first step, literal>
2. <second step>

## Blockers

- <id or Q-NNN> — <what is blocked> — <who must act>

## Notes for next session

- Approval states observed at end of session: <e.g. schema PENDING; phase-p1-foundation PENDING>
- Lint result: <clean | N errors: codes>
- Surprises, dead ends, things not to retry: <...>
- Stashes or aside copies created: <none | names>
````

## Field guidance

| Field | Guidance |
|---|---|
| `session` | `sNN` from STATUS.md, two or more digits |
| `phase` | The phase id worked on (the current phase in STATUS) |
| `next_action` | Quoted string. Literal, e.g. `"cargo test -p ferrum-core, then start p2.4"` — not "continue" |
| `uncommitted` | Repo-relative paths from `git status --short`; `[]` if clean |
| `open_questions` | `Q-NNN` ids still open that matter for the next step |
| `status` | `partial` when written early as a checkpoint, `final` at session end |
