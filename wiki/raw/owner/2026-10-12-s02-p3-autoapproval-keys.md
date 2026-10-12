# RAW SOURCE — Pages covered by the owner's phase-3 auto-approval (annex, session s02, 2026-10-12)

> Immutable raw source. Written by Claude on 2026-10-12. It adds no new owner decision: it repeats the owner's words
> from [2026-10-12-s02-p2-checklist-and-p3-autoapproval.md](2026-10-12-s02-p2-checklist-and-p3-autoapproval.md)
> verbatim and lists, by id, the pages Claude reads them as covering, because `tools/approvals_record.py` accepts only a
> source that names the key. The owner can narrow or withdraw this reading at any time.

## 1. The owner's words (verbatim, from the source above)

> Fix both yes, but then consider auto approved for next phase and do that. Stop after the next phase is done. I will provide more feedback on the browser before we move towards benchmarking and stuff

## 2. Keys covered (Claude's reading)

The P3 dependency set of `phase-p3-tabs-sessions` (its `decisions`, `components` and the profile-route decision), whenever
an edit made while building P3 stales their approval: `schema` is **not** included (not edited in P3).

- phase-p3-tabs-sessions
- adr-0006
- adr-0007
- adr-0010
- adr-0014
- adr-0029
- comp-app-shell
- comp-webview-manager
- comp-core

Not covered: `phase-p3-tabs-sessions#exit` (the owner keeps the P3 sign-off: "Stop after the next phase is done"), any
page of P4 or later, and any question to the owner.
