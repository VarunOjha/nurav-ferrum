---
id: phase-p0-planning
type: phase
title: "P0 Planning: LLM wiki, interactive plan app, owner approval"
status: in-progress
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/01-scoping-decisions.md
  - raw/research/llm-wiki-pattern.md
  - raw/research/nextjs-stack.md
related: [schema, phase-p1-foundation, comp-interactive-plan, ip-build-plan, ops-approval-workflow, ops-wiki-maintenance, adr-0001, adr-0002, adr-0003, adr-0014, adr-0016]
approvable: true
phase: phase-p0-planning
tags: [planning, wiki, interactive-plan, approvals]
milestone: null
order: 0
depends_on: []
est_sessions: 4
entry_criteria:
  - "Bootstrap phase: no approval gate can exist before the plan app exists. Entry authority is the owner directive recorded in raw/01-scoping-decisions.md (directives 1, 2, 4, 9)."
  - "Raw sources raw/00-master-prompt.md and raw/01-scoping-decisions.md exist and are treated as immutable."
  - "No application code (Rust, Tauri) is written in this phase (owner directive 9)."
deliverables:
  - "wiki/SCHEMA.md, CLAUDE.md, STATUS.md (schema layer + live state)."
  - "Five verified research notes under wiki/raw/research/ (llm-wiki, tauri-webview2, measurement, nextjs, related-work seed)."
  - "Complete planning wiki: overview, architecture + component pages, ADRs adr-0001..adr-0019 (every registered ADR, 19 files), risk register, research questions/hypotheses/experiments/metrics/workloads, quality pages, operations pages (resume/handoff/toolchain), phase pages P0..P8, index.md, log.md."
  - "Root summaries: README.md, PLAN.md, ARCHITECTURE.md, RESEARCH_PLAN.md, AI_USAGE.md."
  - "interactive_plan/ Next.js app that reads wiki/ directly and visualises architecture, phases, decisions, risks and research traceability."
  - "Approvals workflow writing plan/approvals.json (content_hash + scope_hash, effective states per SCHEMA section 10)."
  - "Owner approval of Approval Waves 0-2 (ops-approval-workflow section 8): the ip-* pages, the P0 pages, the P1 dependency set and the exit key phase-p0-planning#exit."
tasks:
  - id: p0.1
    title: "Capture raw sources: master prompt (verbatim) and scoping decisions (owner answers Q1-Q14, directives, observed environment)"
    verify: "Both files exist under wiki/raw/; first lines state 'Immutable raw source'; their sha256 values are recorded in the p0.8 lint evidence file."
  - id: p0.2
    title: "Write verified research notes (llm-wiki, tauri-webview2 capabilities, measurement methodology, Next.js stack, related-work seed)"
    verify: "Five files in wiki/raw/research/ each with research-note frontmatter, access dates for every URL and VERIFIED/UNCERTAIN labels (grep -c 'VERIFIED' > 0 per file)."
  - id: p0.3
    title: "Write schema layer: wiki/SCHEMA.md, CLAUDE.md bootstrap, STATUS.md live state"
    verify: "Python reference hash script in SCHEMA section 10.2 runs on SCHEMA.md and prints two sha256 values; CLAUDE.md links to wiki/SCHEMA.md; STATUS.md has the status-live frontmatter fields of SCHEMA section 6.16."
  - id: p0.4
    title: "Write overview, architecture and component pages (registry components, trust levels, connects edges)"
    verify: "Every registry component id has exactly one page under wiki/architecture/components/; every connects edge with differing trust levels has crosses_trust_boundary true (manual TRUST-EDGE check)."
  - id: p0.5
    title: "Write ADR pages adr-0001..adr-0019 (every registered ADR) and the risk register (risk-r01..r06 plus newly found risks)"
    verify: "One file per registered ADR (adr-0001..adr-0019, 19 files matching decisions/adr-00NN-*.md) exists; each has the five required body sections; each risk page has likelihood, impact, mitigation, spike, owner_phase."
  - id: p0.6
    title: "Write research-track pages: research questions, hypotheses, experiment families, metrics, workloads"
    verify: "rq/hyp/exp reciprocal lists agree (manual REF-RECIPROCAL check); every experiment lists configurations from the cfg-* set; no page states a measured value (INT-NUMBER-NOSRC manual grep)."
  - id: p0.7
    title: "Write phase pages P0..P8, quality pages, operations pages, root summaries, index.md and log.md"
    verify: "index.md lists every non-raw page exactly once and every line matches the SCHEMA section 11 regex; log.md headings match the SCHEMA section 12 regex."
  - id: p0.8
    title: "Manual LINT pass over the whole wiki (all SCHEMA section 9.3 codes that can be checked by hand or by grep) and creation of wiki/raw/MANIFEST.sha256 (SCHEMA section 3.1 format)"
    verify: "raw/evidence/phase-p0-planning/wiki-lint-manual.md lists each lint code with result; zero errors; warnings have dispositions; wiki/raw/MANIFEST.sha256 has one line per raw file (sha256 over LF-normalised bytes) and its own sha256 is recorded in the lint evidence; a 'lint' log entry exists."
  - id: p0.9
    title: "Owner installs Node LTS via winget; Claude records exact node and npm versions"
    verify: "ip-build-plan step IP-0 gate passes: 'node -v', 'npm -v' and 'git --version' output saved to raw/evidence/phase-p0-planning/interactive-plan/IP-0-toolchain.txt; Node major version is 24 (any other major is a stop condition: ask the owner, Q-102; research note nextjs-stack section 2 warns Node 26 becomes LTS on 2026-10-28); Approval Wave 0 transcribed to raw/owner/."
  - id: p0.10
    title: "Scaffold interactive_plan/ with create-next-app 16.4.0 using the flag set from research-nextjs-stack section 3.1; pin exact versions (TypeScript 5.9.3, ESLint 9.39.x); set turbopack.root; add engines field"
    verify: "ip-build-plan step IP-1 gate passes: 'npm install' completes without ERESOLVE and 'npm run typecheck && npm run lint && npm run build' succeed (output in raw/evidence/phase-p0-planning/interactive-plan/IP-1-scaffold.txt); package.json has no '^' or '~' ranges for direct dependencies; spikes S1-S3 recorded in IP-1-spikes.txt."
  - id: p0.11
    title: "Wiki loader: pure TS module that reads ../wiki at runtime with fs, splits frontmatter, validates with zod per SCHEMA types"
    verify: "Vitest unit tests on fixture pages (valid, missing field, bad enum, BOM, missing final LF) pass; an integration test loading the real wiki/ reports zero FM-* errors."
  - id: p0.12
    title: "Hash module: content_hash and scope_hash in TypeScript identical to the Python reference (SCHEMA section 10.2)"
    verify: "Vitest test runs shared test vectors (CRLF, CR, no frontmatter, volatile keys present/absent) and matches hashes produced by the Python reference; vectors stored with the ip-* data-contract page."
  - id: p0.13
    title: "Wiki lint + gate report (IP-5) and views: dashboard (phase progress + gate states), phase DAG, architecture graph with trust boundaries, page detail with markdown + mermaid rendering, ADR list, risk matrix, research traceability graph"
    verify: "Playwright E2E visits each route on a production build and asserts key elements (phase nodes P0..P8, component nodes, ADR count, risk matrix cells) and zero console errors."
  - id: p0.14
    title: "Approvals API (route handler, nodejs runtime, zod-validated body, loopback-only, atomic temp-file + rename write to plan/approvals.json, data dir overridable for tests)"
    verify: "Vitest unit tests for state computation (PENDING, APPROVED, APPROVED_VOLATILE_DRIFT, STALE, CHANGES_REQUESTED, REJECTED, INVALID); E2E posts approve/changes-requested against a temp data dir and asserts file contents and history append; a non-loopback Host header is refused."
  - id: p0.15
    title: "Approval UI: approve / request changes / reject with comment on every approvable page; staleness badges; '#exit' review for phases"
    verify: "E2E: approve a temp-copy page, modify its body, reload, badge shows STALE; modify only 'status' line, badge shows APPROVED_VOLATILE_DRIFT."
  - id: p0.16
    title: "Run full plan-app test gate and save outputs as evidence"
    verify: "ip-build-plan steps IP-9 and IP-10 gates pass: 'npm run verify' (lint, typecheck, unit, e2e, build) output with exit code 0 saved as raw/evidence/phase-p0-planning/interactive-plan/IP-9-verify.txt, plus IP-9-perf.txt, playwright-report.zip and IP-10-final-lint.json ('npm run lint:wiki' 0 errors)."
  - id: p0.17
    title: "Owner walkthrough: owner reviews pages in the app, answers open questions, approves or requests changes; Claude revises until the P1 dependency set is APPROVED"
    verify: "plan/approvals.json (written by the app only) shows APPROVED or APPROVED_VOLATILE_DRIFT for schema, phase-p1-foundation, every ADR in its decisions list, its components and experiments; owner answers transcribed to raw/owner/."
  - id: p0.18
    title: "Exit: set status gate-review, owner approves phase-p0-planning#exit, first local commit if authorised (Claude never pushes)"
    verify: "approvals.json has key phase-p0-planning#exit with status approved; 'gate' log entry exists; 'git log -1' shows the commit or the handoff lists uncommitted paths."
test_gate:
  automated:
    - "cd interactive_plan && npm run lint"
    - "cd interactive_plan && npm run typecheck (tsc --noEmit)"
    - "cd interactive_plan && npm run test (vitest: loader, hash vectors, approval states, graph builders)"
    - "cd interactive_plan && npm run test:e2e (Playwright against next build + next start bound to 127.0.0.1, temp approvals data dir)"
    - "cd interactive_plan && npm run build"
    - "python reference hash (SCHEMA section 10.2) on every hash test vector; outputs equal the TS outputs"
  manual:
    - "Owner opens the app on 127.0.0.1, navigates every view and confirms it reflects the wiki."
    - "Owner performs one real approval and one change request and confirms plan/approvals.json changed as expected (git diff)."
    - "Owner answers or defers each open question in ov-open-questions."
    - "Owner confirms the manual lint report is acceptable."
  evidence:
    - raw/evidence/phase-p0-planning/wiki-lint-manual.md
    - raw/evidence/phase-p0-planning/interactive-plan/IP-0-toolchain.txt
    - raw/evidence/phase-p0-planning/interactive-plan/IP-1-scaffold.txt
    - raw/evidence/phase-p0-planning/interactive-plan/IP-1-spikes.txt
    - raw/evidence/phase-p0-planning/interactive-plan/IP-2-tests.txt
    - raw/evidence/phase-p0-planning/interactive-plan/IP-3-tests.txt
    - raw/evidence/phase-p0-planning/interactive-plan/IP-4-tests.txt
    - raw/evidence/phase-p0-planning/interactive-plan/IP-5-lint.json
    - raw/evidence/phase-p0-planning/interactive-plan/IP-5-gate.txt
    - raw/evidence/phase-p0-planning/interactive-plan/IP-6-tests.txt
    - raw/evidence/phase-p0-planning/interactive-plan/IP-7-tests.txt
    - raw/evidence/phase-p0-planning/interactive-plan/IP-8-tests.txt
    - raw/evidence/phase-p0-planning/interactive-plan/IP-9-verify.txt
    - raw/evidence/phase-p0-planning/interactive-plan/IP-9-perf.txt
    - raw/evidence/phase-p0-planning/interactive-plan/playwright-report.zip
    - raw/evidence/phase-p0-planning/interactive-plan/IP-10-final-lint.json
exit_criteria:
  - "Every automated test_gate item passed on the exit commit and its output is saved as evidence."
  - "Manual lint report shows zero errors."
  - "Effective approval APPROVED (or APPROVED_VOLATILE_DRIFT) for Approval Waves 1 and 2 as tabulated in ops-approval-workflow section 8 (schema, the P0 pages and the full P1 dependency set, SCHEMA section 9.7)."
  - "No open Q-NNN blocks any id in the P1 dependency set."
  - "Owner approved key phase-p0-planning#exit in the plan app."
risks: [risk-r16, risk-r22, risk-r24]
decisions: [adr-0001, adr-0002, adr-0003, adr-0004, adr-0014, adr-0016]
experiments: []
components: [comp-interactive-plan]
unverified:
  - claim: "create-next-app 16.4.0 with the recommended flag set produces the expected files on Windows in a path containing a space"
    verify_in: phase-p0-planning
  - claim: "Runtime fs reads of ../wiki and writes of ../plan/approvals.json work under Turbopack dev and next start"
    verify_in: phase-p0-planning
  - claim: "npm install resolves without ERESOLVE using TypeScript 5.9.3 and ESLint 9.39.x with eslint-config-next 16.4.0"
    verify_in: phase-p0-planning
  - claim: "Mermaid 12 renders inside a React 19.3 client component under Next 16.4"
    verify_in: phase-p0-planning
---

# P0 Planning: LLM wiki, interactive plan app, owner approval

P0 creates the project's memory and its approval mechanism before any Ferrum code exists. It answers owner directives 1, 2, 4, 6, 7 and 9 in [raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md): plan first, visualise it in a Next.js app under `interactive_plan/`, record everything in markdown so the work survives interrupted sessions, use the LLM-wiki pattern ([raw/research/llm-wiki-pattern.md](../raw/research/llm-wiki-pattern.md)), and get owner approval before implementation.

## Scope

1. **Wiki (p0.1 to p0.8).** Raw sources, research notes, schema, every planning page, index, log, root summaries, manual lint.
2. **Plan app (p0.9 to p0.16).** A local-only Next.js app (`comp-interactive-plan`, adr-0016) that reads `wiki/` at runtime and writes approvals to `plan/approvals.json`. Stack recommendation and its open checks come from [raw/research/nextjs-stack.md](../raw/research/nextjs-stack.md) sections 5 and 6. That note labels its open checks "P1 (plan-app build phase)"; in this plan the plan app is built in P0, so those checks are verified here (see `unverified` above).
3. **Owner approval (p0.17, p0.18).** Owner reviews in the app; Claude revises; P0 exits when the P1 dependency set is approved.

## Out of scope

- Any Rust, Tauri, Cargo workspace or shell UI code. These start in [P1](phase-p1-foundation.md) (scaffold and spikes) and [P2](phase-p2-minimal-container.md).
- Installing Rust or MSVC Build Tools (P1, adr-0005). Only Node is installed now, per Q13.
- Deploying the plan app anywhere. It runs on `127.0.0.1` only.
- Any performance claim. No measurements exist.

## Step order

```mermaid
flowchart LR
  p0_1["p0.1 raw sources"] --> p0_2["p0.2 research notes"]
  p0_2 --> p0_3["p0.3 schema layer"]
  p0_3 --> p0_4["p0.4 architecture"]
  p0_3 --> p0_5["p0.5 ADRs + risks"]
  p0_3 --> p0_6["p0.6 research track"]
  p0_4 --> p0_7["p0.7 phases, quality, ops, index, log"]
  p0_5 --> p0_7
  p0_6 --> p0_7
  p0_7 --> p0_8["p0.8 manual lint"]
  p0_9["p0.9 Node install"] --> p0_10["p0.10 scaffold app"]
  p0_10 --> p0_11["p0.11 wiki loader"]
  p0_10 --> p0_12["p0.12 hash module"]
  p0_11 --> p0_13["p0.13 views"]
  p0_12 --> p0_14["p0.14 approvals API"]
  p0_14 --> p0_15["p0.15 approval UI"]
  p0_13 --> p0_16["p0.16 test gate"]
  p0_15 --> p0_16
  p0_8 --> p0_17["p0.17 owner walkthrough"]
  p0_16 --> p0_17
  p0_17 --> p0_18["p0.18 exit review"]
```

The wiki track (p0.1 to p0.8) and the app track (p0.9 to p0.16) can interleave. The app track needs Node first (p0.9). The owner walkthrough needs both.

## Plan-app task to build-step mapping

The plan-app track (p0.9 to p0.16) is executed by following [ip-build-plan](../interactive-plan/ip-build-plan.md), whose steps are IP-0 to IP-10. The two numbering schemes map as follows. They are one scheme, not two.

| Phase task | ip-build-plan step(s) | Evidence under `raw/evidence/phase-p0-planning/interactive-plan/` |
|---|---|---|
| p0.9 Node install | IP-0 | `IP-0-toolchain.txt` |
| p0.10 scaffold | IP-1 | `IP-1-scaffold.txt`, `IP-1-spikes.txt` |
| p0.11 wiki loader | IP-2 | `IP-2-tests.txt` |
| p0.12 hash module | IP-3 | `IP-3-tests.txt` (includes the Python cross-check) |
| p0.14 approvals API | IP-4 | `IP-4-tests.txt` |
| p0.13 wiki lint + views | IP-5, IP-6, IP-8 | `IP-5-lint.json`, `IP-5-gate.txt`, `IP-6-tests.txt`, `IP-8-tests.txt` |
| p0.15 approval UI | IP-7 | `IP-7-tests.txt` |
| p0.16 full gate | IP-9, IP-10 | `IP-9-verify.txt`, `IP-9-perf.txt`, `playwright-report.zip`, `IP-10-final-lint.json` |

Rules for a resuming session:

- **Which step is current:** use the ip-build-plan resume rule. The first IP step whose evidence file is missing is the current step; the table gives its p0.N task.
- **What to record:** `STATUS.md` `current_task` (the In-flight entry) and commit tags always use the p0.N id, for example `[p0.13]`. The IP step goes in the intent or commit message text, for example "p0.13 (IP-6: wiki browser)".
- **Evidence names:** the IP-* files above are the canonical evidence for this phase's `test_gate.evidence`. No separate `plan-app-*.txt` files are written.
- IP steps run in IP order (IP-4 before IP-5), so p0.14 is done before p0.13 even though its number is higher.

## Checkpoints and interruption recovery

- Each task is one commit boundary (once the owner authorises local commits, adr-0011). After each task: update `STATUS.md` (`current_task`, `next_action`) and append a `plan` or `code` log entry. A session cut off mid-task loses at most that task.
- App tasks p0.11, p0.12 and p0.14 are pure modules with their own unit tests. A fresh session can confirm what exists by listing the IP-* evidence files (mapping table above) and running `npm run test` in `interactive_plan/` before continuing.
- If the owner requests changes during p0.17, each revision is a separate `plan` log entry listing the pages whose approval it stales.

## Test gate rationale

The plan app is tooling, but it becomes the gatekeeper of every later phase. A wrong hash or a wrong effective state would let unapproved work proceed. That is why p0.12 tests the TypeScript hashes against the Python reference, p0.14 tests every effective state, and the E2E suite always writes to a temporary data directory so tests never touch the real `plan/approvals.json`. The loader integration test (p0.11) doubles as an automated part of the wiki lint.

Evidence files under `wiki/raw/evidence/` are raw and immutable. A failed run is saved under a dated name (`<name>.<YYYYMMDD-HHMM>.txt`); the canonical file name listed in `test_gate.evidence` is created once, from the passing run on the exit commit.

## Research track in P0

Only the seed list exists ([raw/research/related-work-seed.md](../raw/research/related-work-seed.md)). The literature review protocol starts in P1 (p1.14). No novelty is claimed anywhere.

## Owner review checkpoint (adr-0014)

At the end of P0 the owner reviews the plan in the app. The exact keys are listed wave by wave in [ops-approval-workflow §8](../operations/ops-approval-workflow.md#8-approval-waves): Wave 0 (chat, before the app is built), Wave 1 (`schema`, the P0 pages, `phase-p0-planning#exit`) and Wave 2 (the P1 dependency set: `phase-p1-foundation`, every ADR in its `decisions`, every component it introduces or lists). Pages outside every dependency set do not need approval now.

Claude never writes `plan/approvals.json`. If the owner approves in chat, Claude transcribes it to `raw/owner/` and asks the owner to click Approve in the app.
