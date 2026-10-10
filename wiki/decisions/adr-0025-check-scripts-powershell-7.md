---
id: adr-0025
type: decision
title: "Check scripts are PowerShell 7: one per task and one gate script per phase, kept in the repo"
status: accepted
updated: 2026-10-09
sources:
  - raw/owner/2026-10-09-s01-plan-app-feedback.md
  - raw/owner/2026-10-09-s01-portal-v2-decisions.md
related: [adr-0014, adr-0021, adr-0024, schema, qual-phase-gate-checklist, ops-environment-setup, phase-p0-planning]
approvable: true
date: 2026-10-09
decided_by: owner
supersedes: []
options:
  - "PowerShell 7 scripts: one per task, one gate script per phase, committed"
  - "Windows PowerShell 5.1 scripts"
  - "Commands written only in the phase page's verify field (no scripts)"
phase: phase-p0-planning
tags: [verification, scripts, powershell, gates]
---

# ADR-0025: Check scripts are PowerShell 7, one per task and one gate script per phase

## Context

Each task has a `verify` field and each phase a test gate, but they were written as prose or loose
commands. The owner asked for scripts he can read and re-run
([raw/owner/2026-10-09-s01-plan-app-feedback.md](../raw/owner/2026-10-09-s01-plan-app-feedback.md)).
PowerShell 7.6.6 was installed on 2026-10-09 (`pwsh.exe`), as recorded in
[raw/owner/2026-10-09-s01-portal-v2-decisions.md](../raw/owner/2026-10-09-s01-portal-v2-decisions.md).

## Options considered

| Option | Good | Bad |
|---|---|---|
| A. **PowerShell 7 (`pwsh`) scripts, one per task + one gate script per phase, committed** | Owner can read and re-run them; same shell he uses; modern language | One more file per task |
| B. Windows PowerShell 5.1 | Preinstalled | Old; UTF-8 and cross-version quirks |
| C. Commands only in the `verify` field | Nothing new | Owner asked for scripts; prose drifts |

## Decision

### Owner decision (verbatim)

From [raw/owner/2026-10-09-s01-plan-app-feedback.md](../raw/owner/2026-10-09-s01-plan-app-feedback.md):

> Tasks (17)
> Should have columns
> Id, title (shorter crisp line), desc (slightly bigger use -> though chain notation to express yourself), verify_desc, verify_script
>
> Maintain the verify scripts for each task for future run

> Once again explain test gate in NL or thought chain and have a script that does that, I will review the script, PS script

From [raw/owner/2026-10-09-s01-portal-v2-decisions.md](../raw/owner/2026-10-09-s01-portal-v2-decisions.md):

> PowerShell for check scripts — **PowerShell 7** (installed 2026-10-09 via winget: 7.6.6, `pwsh.exe` app alias in `%LOCALAPPDATA%\Microsoft\WindowsApps`).

This quoted choice is what `decided_by: owner` and `status: accepted` cover (SCHEMA §10.4 rule 3(b)).

### Claude elaboration (binding only once the owner APPROVES this ADR)

- Every task → one check script that proves the task is done → the owner can re-run it any time.
- Every phase → one gate script that runs the phase's automated test-gate checks in order and saves the
  output as evidence → the exit review rests on a re-runnable script, not on a claim.
- Scripts start with `#Requires -Version 7.0`, explain each part in plain comments (why → what), print a
  short PASS/FAIL summary, and exit 0 only on success.
- Output saved as evidence goes through the masking tool first ([ADR-0027](adr-0027-mask-sensitive-values.md)).
- The folder layout and naming are set when the first scripts are written (task p0.17); the phase pages'
  `verify` fields then point at them.

## Consequences

### Positive

- Checks are reproducible and reviewable by the owner.

### Negative

- More files to maintain; a script can drift from its task. Mitigation: the gate script calls the task
  scripts, so a broken one shows up at the gate.

## Verification / evidence

- Owner's words: the two raw files above. First script in the repo: `tools/mask.ps1` (2026-10-09).
