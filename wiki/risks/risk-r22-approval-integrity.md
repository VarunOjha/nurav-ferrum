---
id: risk-r22
type: risk
title: "Approval records could be wrong (hash divergence, stale view, file corruption) and mis-gate phases"
status: open
updated: 2026-10-09
sources:
  - SCHEMA.md
  - raw/research/nextjs-stack.md
  - raw/01-scoping-decisions.md
related: [phase-p0-planning, adr-0023, adr-0016, adr-0001, adr-0014, comp-interactive-plan, ip-data-contract, ip-approvals-api, ip-testing, risk-r15, risk-r24, qual-phase-gate-checklist]
approvable: true
tags: [governance, approvals, interactive-plan, hashing]
likelihood: 2
impact: 4
mitigation: "Claude records an approval only after saving the owner's words to wiki/raw/owner/, and only through tools/approvals_record.py, which stores the page hashes and writes approvals.json atomically (adr-0023); test the hash code against the shared hash test vectors; keep wiki files LF-only with no BOM and check this in lint; log every approval and keep the file in git."
spike: null
owner_phase: phase-p0-planning
trigger: "The hash code disagrees with a shared hash test vector; an approval shows APPROVED for a page the owner has not seen in its current form; approvals.json fails to parse; git line-ending conversion changes hashes after checkout."
fallback: "Treat all affected approvals as PENDING and ask the owner to re-approve after the fix."
unverified:
  - claim: "A .gitattributes eol=lf rule for wiki files prevents CRLF checkout on this machine's Git configuration"
    verify_in: phase-p0-planning
---

# risk-r22: Approval records could be wrong (hash divergence, stale view, file corruption) and mis-gate phases

| Likelihood | Impact | Score | Status | Owner phase |
|---|---|---|---|---|
| 2 | 4 | 8 | open | `phase-p0-planning` |

Score = likelihood × impact (SCHEMA §6.5). Scales are planning judgements, not measurements. Full register: [ov-risk-register](ov-risk-register.md).

## Description and evidence

SCHEMA §10 makes `plan/approvals.json` the gate for every phase: the entry gate checks content and scope hashes of the dependency set. Since adr-0023 (which replaced adr-0016's approve-in-the-app rule) the owner approves in Claude Code and Claude records the approval with `tools/approvals_record.py`; the plan portal is read-only. Every tool that computes hashes must match the Python reference in SCHEMA §10.2. Failure modes:

- **Hash divergence** between a hashing tool and the SCHEMA reference (CRLF handling, BOM, frontmatter line deletion).
- **Stale view**: the owner approves a page that changed after it was rendered.
- **Corruption** from a crash mid-write or concurrent writes.
- **Process violation**: an approval recorded that the owner did not give, or without his words saved first.

The Next.js research (NX §3.4) recommends zod validation, atomic temp-file-then-rename writes, loopback binding and a temporary data folder for E2E tests.

Sources: [nextjs-stack](../raw/research/nextjs-stack.md), [scoping decisions](../raw/01-scoping-decisions.md), [SCHEMA](../SCHEMA.md). Abbreviations: TW = tauri-webview2-capabilities, MM = measurement-methodology, RW = related-work-seed, NX = nextjs-stack, LW = llm-wiki-pattern.

## Early-warning signs (trigger)

The hash code disagrees with a shared hash test vector; an approval shows APPROVED for a page the owner has not seen in its current form; approvals.json fails to parse; git line-ending conversion changes hashes after checkout.

## Mitigation

Claude records an approval only after saving the owner's words to wiki/raw/owner/, and only through tools/approvals_record.py, which stores the page hashes and writes approvals.json atomically (adr-0023); test the hash code against the shared hash test vectors; keep wiki files LF-only with no BOM and check this in lint; log every approval and keep the file in git.

## De-risking spike (proposed)

Phase: `phase-p0-planning`. Covered by the tests of `tools/approvals_record.py` and `tools/approvals_check.py`: the hash test vectors of ip-data-contract §7, an edit-after-approval case (becomes STALE), a volatile-only edit case and refusal cases. No interrupted-write test exists yet.

The `spike` frontmatter field stays `null` until the owning phase page assigns a task id (`pN.M`); the integrator or phase owner then sets it here.

## Fallback if realised

Treat all affected approvals as PENDING and ask the owner to re-approve after the fix.

## Unverified claims

- A .gitattributes eol=lf rule for wiki files prevents CRLF checkout on this machine's Git configuration. UNVERIFIED[phase-p0-planning]

## Affects

`phase-p0-planning`, `adr-0023`, `adr-0016`, `adr-0001`, `adr-0014`, `comp-interactive-plan`, `ip-data-contract`, `ip-approvals-api`, `ip-testing`, `risk-r15`, `risk-r24`, `qual-phase-gate-checklist`
