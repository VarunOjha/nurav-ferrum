# RAW SOURCE — Owner request for separate columns in the phase popup's tasks table (session s01, 2026-10-10)

> Immutable raw source. Transcribed by Claude on 2026-10-10. The owner's words are reproduced verbatim
> (typos preserved); the rest is Claude's note.

---

## 1. The request

Context: the owner was reviewing portal v2 with the new Ref mode switched on. "PH-3" is the Ref-mode name of
the phase popup's tasks table.

Owner's words (verbatim, Claude Code chat):

> In the task table, PH-3, we need seperate columns for id, title, what, why, how, logic (thought chain notation), check script, state

## 2. How Claude reads it (Claude's interpretation, not the owner's words)

- **id**: the task id (for example p1.3). **title**: the short task name.
- **what**: what the task does or produces. **why**: why it matters. **how**: how it is done (the approach).
- **logic**: the existing thought chain, cause → action → why it matters.
- **check script**: the PowerShell 7 verify script; the plain "how we know it is done" line stays with it.
- **state**: the task status in words (Done, In progress, Waiting for you, Not started).

This replaces the earlier column set (id, title, description as a thought chain, check, check script) from
`2026-10-09-s01-plan-app-feedback.md`. It is a planning-tool change of the read-only portal (task p0.17) and
is not Ferrum application code. what/why/how are translated from each phase page, adding no new facts.
