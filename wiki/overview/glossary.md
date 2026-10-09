---
id: glossary
type: glossary
title: "Glossary"
status: draft
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/01-scoping-decisions.md
  - raw/research/llm-wiki-pattern.md
  - raw/research/tauri-webview2-capabilities.md
  - raw/research/measurement-methodology.md
  - raw/research/related-work-seed.md
  - raw/research/nextjs-stack.md
related: [ov-project, schema, ops-session-protocol, ops-approval-workflow, ops-wiki-maintenance]
approvable: false
tags: [glossary]
---

# Glossary

Terms used across the Ferrum wiki. Definitions are short; the linked source holds the detail. Technical
claims about external tools come from the research notes, which carry their own VERIFIED / UNCERTAIN labels.

## Project process

### ADR (architecture decision record)
A page in `wiki/decisions/` recording one decision: context, options, decision, consequences, evidence.
Status `proposed → accepted` (or `rejected`, `superseded`). Source: [SCHEMA](../SCHEMA.md) §6.4.

### Approval / effective approval state
The owner's decision on an approvable page, stored by the plan app in `plan/approvals.json`. Its effective
state is computed: PENDING, APPROVED, APPROVED_VOLATILE_DRIFT, STALE, CHANGES_REQUESTED, REJECTED or INVALID.
Only APPROVED and APPROVED_VOLATILE_DRIFT count for gates. Source: [SCHEMA](../SCHEMA.md) §10;
[ops-approval-workflow](../operations/ops-approval-workflow.md).

### content_hash / scope_hash
SHA-256 hashes of a page stored with its approval. `content_hash` covers the whole file (line endings
normalised to LF); `scope_hash` excludes the `status`, `updated` and `last_verified_commit` frontmatter
lines, so bookkeeping edits do not stale an approval. Source: [SCHEMA](../SCHEMA.md) §10.2.

### Dependency set
The pages that must be approved before phase P may start: P's page, its ADRs, components introduced in or
listed by P, its experiments, and `schema`. Source: [SCHEMA](../SCHEMA.md) §9.7.

### Entry gate / exit gate
Checks before starting a phase (dependencies done, dependency set approved, no blocking open question) and
before closing it (tests run with saved evidence, clean lint, owner approval of `<phase-id>#exit`).
Source: [SCHEMA](../SCHEMA.md) §9.7.

### Handoff
The note a session writes for the next one: done, in progress, next action, blockers.
Source: [ops-handoff-template](../operations/ops-handoff-template.md).

### In-flight section
The write-ahead record in `STATUS.md` naming the task being worked on, its intended changes and how to roll
back. Non-empty at session start means the previous session was interrupted.
Source: [ops-session-protocol](../operations/ops-session-protocol.md).

### Ingest / query / lint
The three operations of Karpathy's LLM-wiki pattern: absorb a new source into the wiki; answer from the
wiki with citations (filing good answers back); health-check the wiki. Ferrum adds decide, handoff, resume,
gate and code. Source: [raw/research/llm-wiki-pattern.md](../raw/research/llm-wiki-pattern.md).

### Integrator
In a multi-agent run, the agent that merges the area agents' output, writes `index.md` and `log.md`, and
runs lint. Source: [ops-multi-agent-workflow](../operations/ops-multi-agent-workflow.md).

### LLM wiki
Karpathy's pattern ("idea file", GitHub gist) in which an LLM incrementally builds and maintains a
persistent markdown wiki between the human and the raw sources, in three layers: raw sources, wiki, schema.
Source: [raw/research/llm-wiki-pattern.md](../raw/research/llm-wiki-pattern.md).

### Milestone (M1–M7)
A deliverable bundle from master prompt §16, each mapped to one phase (P2–P8). P0 and P1 have no milestone.
Source: [raw/00-master-prompt.md](../raw/00-master-prompt.md).

### Phase (P0–P8)
A gated stage of work with its own page in `wiki/phases/`, task list, test gate and exit criteria.

### Plan app
The Next.js application in `interactive_plan/` that visualises the wiki and records owner approvals. Not
shipped with Ferrum. Source: owner directive 2 and Q14 in
[raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md).

### Q-NNN
An open question for the owner, kept as a section of [ov-open-questions](ov-open-questions.md).

### Raw source
An immutable file in `wiki/raw/`: requirements, owner answers, research notes, benchmark output, evidence.
Never edited. Source: [SCHEMA](../SCHEMA.md) §3.1.

### Session id (sNN)
Sequential number of a Claude Code working session, recorded in `STATUS.md`, handoffs and log entries.

### Ultracode
The owner's term for multi-agent orchestration by Claude, authorised in session 1 (directive 3 in
[raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md)).

### Unverified tag (`UNVERIFIED[...]`)
Inline marker `UNVERIFIED[phase-pN-slug]` on a technical claim not yet backed by a raw source, naming the
phase that will verify it. Source: [SCHEMA](../SCHEMA.md) §7.

## Platform and architecture

### Tauri
A Rust framework for desktop apps that render their UI in the operating system's webview (WebView2 on
Windows). Version facts: [raw/research/tauri-webview2-capabilities.md](../raw/research/tauri-webview2-capabilities.md).

### wry
The cross-platform webview library underneath Tauri; on Windows it wraps WebView2. Some WebView2 features
exist in wry but are not exposed by Tauri. Source: [raw/research/tauri-webview2-capabilities.md](../raw/research/tauri-webview2-capabilities.md).

### Multi-webview / child WebView
Several WebViews inside one Tauri window: Ferrum's trusted shell plus one untrusted WebView per tab. In
Tauri 2 this needs the `unstable` cargo feature. Source: Q4 in
[raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md); [raw/research/tauri-webview2-capabilities.md](../raw/research/tauri-webview2-capabilities.md).

### WebView2
Microsoft's Chromium-based embeddable web control for Windows. The installed runtime version is recorded in
[raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md).

### Evergreen runtime / Fixed Version runtime
The two ways to deploy WebView2: a shared, self-updating runtime, or a specific version shipped with the app.
Source: [raw/research/measurement-methodology.md](../raw/research/measurement-methodology.md).

### User data folder (UDF)
The directory where a WebView2 environment keeps its profiles and browser data. WebViews sharing a UDF
share one browser process and must use identical startup options.
Source: [raw/research/tauri-webview2-capabilities.md](../raw/research/tauri-webview2-capabilities.md).

### WebView2 profile
A named profile within one user data folder, selectable only when a WebView is created; Ferrum's planned
unit of per-site isolation (Q7, adr-0010). Source: [raw/research/tauri-webview2-capabilities.md](../raw/research/tauri-webview2-capabilities.md).

### Browser process / renderer process
Chromium's process roles: one browser process coordinates; renderer processes run page content. WebView2
renderers can be shared across WebViews on the same UDF, so per-tab memory is not well defined.
Source: [raw/research/measurement-methodology.md](../raw/research/measurement-methodology.md).

### Raw COM (WebView2)
Calling WebView2's COM interfaces directly from Rust (unsafe code via the `webview2-com` and `windows`
crates), for features Tauri does not expose, such as TrySuspend or response events.
Source: [raw/research/tauri-webview2-capabilities.md](../raw/research/tauri-webview2-capabilities.md).

### TrySuspend / MemoryUsageTargetLevel
WebView2 APIs to suspend a hidden WebView or ask it to use less memory; both are best-effort and Microsoft
advises against mixing them. Sources: [raw/research/tauri-webview2-capabilities.md](../raw/research/tauri-webview2-capabilities.md),
[raw/research/related-work-seed.md](../raw/research/related-work-seed.md).

### Lifecycle states
ACTIVE, BACKGROUND, IDLE, DISCARD_CANDIDATE, DISCARDED, RESTORING: the states of Ferrum's planned lifecycle
state machine (master prompt §5 Phase 4).

### Sleep vs discard
Sleeping (suspending) keeps a page in memory and resumes it without a reload; discarding frees it and
requires a reload to restore. Source: [raw/research/related-work-seed.md](../raw/research/related-work-seed.md).

### Trust boundary
The line between Ferrum's privileged code (trusted) and remote web content (untrusted). Edges that cross
it are marked in component pages. Source: [SCHEMA](../SCHEMA.md) §6.2.

## Measurement and statistics

### Configuration (cfg-*)
A benchmarked product setup: `cfg-chrome`, `cfg-edge`, `cfg-tauri-baseline`, `cfg-ferrum-nolifecycle`,
`cfg-ferrum-adaptive` (master prompt §8 A–E). Source: [SCHEMA](../SCHEMA.md) §6.8.

### Private commit (PrivateUsage, private bytes)
Memory committed privately by a process. It can be summed across processes, so it is the main memory
metric. Source: [raw/research/measurement-methodology.md](../raw/research/measurement-methodology.md).

### Working set
Physical memory currently mapped by a process, including shared pages; summing it across processes
double-counts shared pages, so it is secondary. Source: [raw/research/measurement-methodology.md](../raw/research/measurement-methodology.md).

### Job Object
A Windows kernel object grouping processes; the harness launches targets inside one so accounting covers
the processes that join the job (descendants join by default unless they break away), including exited
processes. Whether this captures the complete process tree of Chrome, Edge and WebView2 is
UNVERIFIED[phase-p6-benchmark-harness] (breakaway behaviour and the WebView2 parent/child relationship are
not yet established). Source: [raw/research/measurement-methodology.md](../raw/research/measurement-methodology.md).

### ETW
Event Tracing for Windows, used for process traces and by PresentMon. Source: [raw/research/measurement-methodology.md](../raw/research/measurement-methodology.md).

### PresentMon
An ETW-based tool for frame-presentation timing; needs elevation. Source: [raw/research/measurement-methodology.md](../raw/research/measurement-methodology.md).

### FCP / LCP / LoAF / TTI
First Contentful Paint, Largest Contentful Paint, Long Animation Frames API (responsiveness). TTI (Time to
Interactive) was removed in Lighthouse 10 and is not used. Source: [raw/research/measurement-methodology.md](../raw/research/measurement-methodology.md).

### CDP / connectOverCDP
Chrome DevTools Protocol; Playwright's `connectOverCDP` attaches to an existing Chromium-based browser,
including WebView2, with officially lower fidelity than its own launch mode.
Source: [raw/research/tauri-webview2-capabilities.md](../raw/research/tauri-webview2-capabilities.md).

### Chrome for Testing
A versioned Chrome build without auto-update, intended for automation. Source: [raw/research/measurement-methodology.md](../raw/research/measurement-methodology.md).

### Startup Boost / sleeping tabs / Memory Saver / tab freezing
Vendor resource-saving features of Edge and Chrome that affect fairness and must be recorded per trial.
Source: [raw/research/measurement-methodology.md](../raw/research/measurement-methodology.md).

### EcoQoS
A Windows efficiency mode that throttles processes; window state and OS heuristics can change idle CPU and
energy. Source: [raw/research/measurement-methodology.md](../raw/research/measurement-methodology.md).

### AMD energy counters (RAPL-equivalent)
CPU-package energy readings on AMD processors; a Zen 2 study found them modelled rather than measured and
excluding DRAM. Reading them on Windows is expected to need admin rights (UNVERIFIED[phase-p6-benchmark-harness]) and a
kernel driver such as PawnIO.
Sources: [raw/research/related-work-seed.md](../raw/research/related-work-seed.md),
[raw/research/measurement-methodology.md](../raw/research/measurement-methodology.md).

### LibreHardwareMonitor / PawnIO
An open-source hardware monitor and the signed kernel driver it uses since v0.9.5 (replacing WinRing0).
Source: [raw/research/measurement-methodology.md](../raw/research/measurement-methodology.md).

### A/A test
Running the same configuration against itself to measure the harness's noise floor.
Source: [raw/research/measurement-methodology.md](../raw/research/measurement-methodology.md).

### Bootstrap CI (BCa)
Confidence interval from resampling the data; bias-corrected and accelerated (BCa) is SciPy's default.
Source: [raw/research/measurement-methodology.md](../raw/research/measurement-methodology.md).

### Hedges' g / Cliff's delta
Effect sizes: a standardised mean difference with small-sample correction, and a non-parametric dominance
measure. Source: [raw/research/measurement-methodology.md](../raw/research/measurement-methodology.md).

### Holm / Benjamini–Hochberg
Corrections for multiple comparisons (family-wise error rate and false discovery rate, respectively).
Source: [raw/research/measurement-methodology.md](../raw/research/measurement-methodology.md).

### Objective function J
J = αM + βE + γL: normalised memory, energy and restoration latency with experimentally chosen weights,
investigated for the adaptive policy (master prompt §6). Not assumed to be novel.
