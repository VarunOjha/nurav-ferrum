# AI usage

This file describes how AI assistance is used in Ferrum, as required by section 14 of the
[master prompt](wiki/raw/00-master-prompt.md). It will be updated whenever the way AI is used changes,
and it will be adapted to the AI-disclosure policy of the venue the paper is submitted to (venue not
yet chosen).

## Tools

- **Claude Code** (Anthropic), running Claude models, in the owner's local repository on Windows 11.
  The model version is whatever the harness reports for a session; commits made with AI assistance
  carry a `Co-Authored-By:` trailer naming it.
- **Multi-agent orchestration** ("ultracode"), authorised by the owner on 2026-10-08
  ([raw/01-scoping-decisions.md](wiki/raw/01-scoping-decisions.md), directive 3): several Claude
  subagents draft separate areas in parallel and one integrator merges them.

No other AI tools are used so far. Any new one is added here before use.

## Categories of assistance

The master prompt permits these categories. The table records where each is used.

| Category | Used for | Phase(s) |
|---|---|---|
| Architecture exploration | Researching Tauri/wry/WebView2 capabilities, drafting component designs and ADRs | P0 onwards |
| Technical writing | Drafting the wiki, these root documents, and later the manuscript | P0 onwards |
| Code generation | Rust crates, the shell UI, the plan app, benchmark scripts | P0 (plan app only), P1 onwards |
| Test generation | Unit, integration, security and end-to-end tests | P0 (plan app), P1 onwards |
| Experiment orchestration | Writing the harness that schedules and runs benchmark trials | P6, P7 |
| Data analysis assistance | Python statistics and plotting scripts | P6 to P8 |

## What AI does not do

- **It does not produce measurements.** Every reported number must come from an actual run, stored
  unedited under `wiki/raw/bench/` or `wiki/raw/evidence/`. No benchmark has been run yet, so no
  results exist.
- **It does not invent citations, authors, DOIs, venues, statistical significance or novelty.** Each
  reference must be traced to a fetched source recorded in a research note under `wiki/raw/research/`.
- **It does not approve anything.** Only the owner approves pages, in Claude Code. Claude saves the
  owner's words under `wiki/raw/owner/` and records the decision in `plan/approvals.json` with
  `tools/approvals_record.py` (adr-0023); it never records a decision the owner did not give.
- **It does not push code or publish.** Claude makes local commits only; the owner controls the remote
  and any release or submission.

## How AI-generated content is reviewed

1. **Sources and tags.** Every wiki page lists its sources. Any technical claim without a verified
   source is tagged `UNVERIFIED[<phase>]` with the phase that will check it ([wiki/SCHEMA.md](wiki/SCHEMA.md) §7).
   A lint pass flags tags whose phase has passed.
2. **Owner approval with content hashes.** The owner reviews each approvable page (in the read-only portal) and approves it in Claude Code.
   The approval stores a hash of the page; any later edit to its content makes the approval stale, so
   the owner must look again before dependent work continues
   ([approval workflow](wiki/operations/ops-approval-workflow.md)).
3. **Executed tests, not claimed tests.** A phase exits only when its tests were actually run in that
   repository state, their output was saved as evidence, and the owner reviewed it (adr-0014).
4. **Visible history.** AI-assisted commits carry an attribution trailer; `wiki/log.md` records every
   significant operation by session.

## Honest note on the planning documents

The planning documents written in phase P0 (the wiki pages, `CLAUDE.md`, `STATUS.md`, this file and
the other root documents) were **drafted by Claude**, from the owner's requirements and answers and
from research notes Claude wrote after fetching primary sources. They become binding only when the
owner approves them in Claude Code; the approval record is `plan/approvals.json` (adr-0023). Until then they are
proposals. At the time of writing (2026-10-08) nothing has been approved.

## Human responsibility

The human authors remain responsible for the research: its questions, design, the correctness of its
claims and citations, the statistical analysis, and the final text. AI output is treated as a draft
that must be checked.
