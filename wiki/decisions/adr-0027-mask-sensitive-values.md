---
id: adr-0027
type: decision
title: "Mask real IPs, host names, MAC addresses and the user-folder path; real values only in a gitignored local map"
status: accepted
updated: 2026-10-09
sources:
  - raw/owner/2026-10-09-s01-plan-app-feedback.md
  - raw/owner/2026-10-09-s01-portal-v2-decisions.md
related: [adr-0011, adr-0025, schema, ops-git-conventions, ops-wiki-maintenance, ov-open-questions, phase-p0-planning]
approvable: true
date: 2026-10-09
decided_by: owner
supersedes: []
options:
  - "Mask files now; rewrite git history before the first push"
  - "Mask files now; keep history as it is"
  - "Leave committed files; mask only new evidence"
phase: phase-p0-planning
tags: [privacy, masking, evidence, git]
---

# ADR-0027: Mask real machine values; keep the real ones only in a gitignored local map

## Context

Test logs saved as evidence contained this machine's real IP addresses (the bind probe lists every
network address) and the Windows user-folder path, which includes the owner's account name. The repo will
be published on GitHub later (ADR-0011), so committed files must not reveal them.

## Options considered

| Option | Good | Bad |
|---|---|---|
| A. **Mask files now; rewrite history before the first push** | Nothing real is ever published | History rewrite is a destructive git action, so it needs the owner's go-ahead at that time |
| B. Mask files now, keep history | No rewrite | Old commits still hold the real values |
| C. Only mask new evidence | Least work | Existing files leak |

## Decision

### Owner decision (verbatim)

From [raw/owner/2026-10-09-s01-plan-app-feedback.md](../raw/owner/2026-10-09-s01-plan-app-feedback.md):

> For IP address and other things, create a gitignored env map, and use mask for everything of such nature. Log it decisions of the logs

From [raw/owner/2026-10-09-s01-portal-v2-decisions.md](../raw/owner/2026-10-09-s01-portal-v2-decisions.md):

> Already-committed files containing real IPs — **"Mask files now, rewrite history before first push"** — mask existing evidence now (sanctioned edit of raw evidence, logged); real values go to a gitignored local map; before the first GitHub push Claude asks once to approve a history rewrite.

This quoted choice is what `decided_by: owner` and `status: accepted` cover (SCHEMA §10.4 rule 3(b)).

### Claude elaboration (binding only once the owner APPROVES this ADR)

1. **The map.** Real values live only in `.env.local-map` at the repo root (gitignored, never copied into
   the wiki). One line per value, `MASK=real`, e.g. `LAN_IPV4_1=...`. Names used: `USERPROFILE`,
   `USERPROFILE_SHORT`, `HOSTNAME`, `LAN_IPV4_n`, `WSL_IPV4_n`, `LAN_IPV6_n`, `LINK_LOCAL_IPV6_n`, `MAC_n`,
   and `..._PREFIX` for an address range (every address in it shows as one mask).
2. **The tool.** `tools/mask.ps1` (PowerShell 7, [ADR-0025](adr-0025-check-scripts-powershell-7.md)):
   `--scan` checks every git-tracked file (zip archives too, including the data packed inside a Playwright
   report) and exits 1 if a real value is found; `--file` masks files in place; `--stdin` masks piped text;
   `--refresh-map` adds this machine's current values (temporary IPv6 addresses change over time).
3. **Going forward.** Evidence output is piped through `pwsh tools/mask.ps1 --stdin` before it is saved;
   tests that print addresses print masked labels themselves (`interactive_plan/tests/e2e/mask-labels.ts`).
   `pwsh tools/mask.ps1 --scan` runs before every commit that adds evidence and at every gate.
4. **Already-committed files.** Masked on 2026-10-09. For raw evidence this is a **sanctioned edit** of an
   otherwise immutable file (SCHEMA §3.1): only real values are replaced; each file is named in a `correct`
   log entry; its `MANIFEST.sha256` line gets the new hash; the new hash is listed in
   `tools/raw-sanctioned-edits.tsv`, which is the only way `RAW-IMMUTABLE` accepts a raw-file change.
5. **Not masked:** the owner's name where it is authorship (the owner raw files and the scoping record).
   Those files are never edited.
6. **Before the first push:** git history still holds the original values. Claude asks the owner once to
   approve a history rewrite ([Q-221](../overview/ov-open-questions.md#q-221-rewrite-git-history-before-the-first-push-to-remove-real-machine-values));
   the push waits for that answer.

## Consequences

### Positive

- Committed files show `<LAN_IPV4_1>`, `<USERPROFILE>` and so on; the real values never leave the machine.
- The scan makes a leak visible before it is committed.

### Negative

- Raw evidence is no longer byte-for-byte what the tools printed (only the masked values differ). The
  sanction list records exactly which files and versions.
- Until the history rewrite, the old values remain in local git history (the repo is not pushed yet).

## Verification / evidence

- `pwsh tools/mask.ps1 --scan` reports 0 unmasked values on the tracked files (2026-10-09, p0.17 log entry).
- `npm run lint:wiki` reports no `RAW-IMMUTABLE` error for the sanctioned edits;
  `interactive_plan/tests/unit/lint-git-sanctioned.test.ts` shows that an unlisted change is still reported.
