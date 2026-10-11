---
id: ov-open-questions
type: overview
title: "Open questions for the owner (canonical register)"
status: draft
updated: 2026-10-10
sources:
  - raw/00-master-prompt.md
  - raw/01-scoping-decisions.md
  - raw/research/measurement-methodology.md
  - raw/research/tauri-webview2-capabilities.md
  - raw/research/nextjs-stack.md
  - raw/research/related-work-seed.md
  - raw/owner/2026-10-08-s01-wave0.md
  - raw/owner/2026-10-08-s01-wave0b.md
  - raw/owner/2026-10-09-s01-wave0c.md
  - raw/owner/2026-10-09-s01-portal-v2-decisions.md
  - raw/owner/2026-10-10-s01-q008-and-pause.md
related: [ov-project, schema, ov-arch-data-flows, ov-arch-isolation-model, ov-arch-webview2-integration, qual-security-testing-plan, ov-research-threats-to-validity, ip-build-plan, ip-testing, ov-arch-configuration, ov-arch-repo-layout, ov-research-configurations, comp-baseline-app, ip-spec, ops-approval-workflow, ops-session-protocol, ops-wiki-maintenance, ov-research-plan, ov-research-objective-function, ov-research-statistical-analysis-plan, ov-research-workload-catalog, ov-research-traceability, ov-research-paper-plan, ov-research-fairness-protocol, wl-public-supplementary, adr-0001, adr-0003, adr-0005, adr-0008, adr-0009, adr-0010, adr-0011, adr-0012, adr-0013, adr-0014, adr-0015, adr-0016, adr-0017, adr-0018, adr-0019, adr-0020, adr-0021, adr-0027, risk-r01, risk-r04, comp-interactive-plan, phase-p0-planning, phase-p1-foundation, phase-p2-minimal-container, phase-p3-tabs-sessions, phase-p4-security, phase-p5-telemetry, phase-p6-benchmark-harness, phase-p7-lifecycle, phase-p8-research-paper, exp-startup, exp-energy, exp-reliability, adr-0028]
approvable: false
audience: owner
tags: [questions, owner]
unverified:
  - claim: "A custom title bar resizes reliably under Tauri on Windows 11 (issue #12207), Q-125"
    verify_in: phase-p1-foundation
  - claim: "@vitest/coverage-v8 exact version matching the pinned vitest is available from the registry at install time"
    verify_in: phase-p0-planning
---

# Open questions for the owner

**This page is the single, canonical register of owner questions.** The plan app and the entry-gate
checker ([ops-approval-workflow §4](../operations/ops-approval-workflow.md#4-checking-approval-state-as-claude))
read only this page (SCHEMA §6.1, §9.7). Other pages that discuss questions are explanatory views: each
ADR's body holds its options and recommended default, and [ov-research-plan](../research/ov-research-plan.md)
holds the R-Q table. They link here and do not restate `blocking:` lists. Where any other page states a
different blocking set, **this page wins**. The difference is a lint finding, and the fix belongs on the
other page.

Each question has its own section (SCHEMA §6.1) with these fields:

- `asked`: the date it was raised in the wiki.
- `blocking`: the ids whose entry gate the question holds up. An open question that blocks an id in a
  phase's dependency set blocks that phase (SCHEMA §9.7).
- `status`: open, answered or withdrawn.
- `answer`: once answered, a link to the owner's words in `wiki/raw/owner/`.

A question that matters only for a phase's **exit** review has `blocking: []`, and its text says so.

**How to answer:** reply in Claude Code (the portal is read-only, adr-0023). Claude copies your answer word for word
into `wiki/raw/owner/YYYY-MM-DD-<slug>.md`, sets the status to `answered`, and updates the affected pages
(INGEST). Accepting a recommended default counts as an answer. Silence does not.

**Numbering.**

- `Q-001`… were raised by the operations/overview area.
- `Q-101`… were raised in the ADRs (decisions area). Each ADR gives the options and the recommended
  default.
- `Q-201`… were raised by the research plan (local labels R-Q7…R-Q15,
  [ov-research-plan](../research/ov-research-plan.md)) and, from Q-209 on, by the integration pass of
  2026-10-08, which collected the remaining questions from every area.

R-Q1…R-Q6 and R-Q9 duplicate ADR questions and map to them: R-Q1 = Q-117, R-Q2 = Q-118, R-Q3 = Q-119,
R-Q4 = Q-122, R-Q5 = Q-123, R-Q6 = Q-116, R-Q9 = Q-120. R-Q15 = Q-208.

**Only gate-able ids are listed in `blocking`** (SCHEMA §9.7 step 3): phase ids, and ADR, component or
experiment ids that sit in some phase's dependency set. A question about a risk names the phase it must
hold. Approval waves, which tell you which questions to answer first, are in
[ops-approval-workflow §8](../operations/ops-approval-workflow.md#8-approval-waves).

## Summary by gate

| Gate held | Open questions |
|---|---|
| Building `interactive_plan/` in P0 (comp-interactive-plan) | none (Q-006, Q-007, Q-103, Q-210 answered 2026-10-08) |
| `schema` approval (part of every phase entry) | Q-207 |
| P1 entry | Q-106, Q-110 (via adr-0019), Q-211 (via adr-0019) |
| P2 entry | Q-109, Q-110 (via adr-0019), Q-202, Q-211 (via adr-0019), Q-214 |
| P3 entry | Q-107, Q-111, Q-209 |
| P4 entry | Q-112, Q-113, Q-202, Q-212 |
| P5 entry | Q-114, Q-115, Q-203 |
| P6 entry (incl. exp-energy, exp-reliability) | Q-116, Q-117, Q-118, Q-119, Q-120, Q-121, Q-122, Q-123, Q-201, Q-204, Q-205, Q-213 |
| P7 entry | Q-201, Q-208, Q-212 |
| P8 entry | Q-124, Q-206 |
| Exit reviews only, or not blocking | Q-004, Q-005, Q-105, Q-108, Q-215, Q-217 |
| The first push to GitHub (not a phase gate) | Q-221 |
| Answered | Q-006, Q-007, Q-008, Q-101, Q-102, Q-103, Q-104, Q-210, Q-216, Q-218, Q-219, Q-220 |
| Withdrawn (duplicates) | Q-001, Q-002, Q-003 |

The table is a convenience view; the `blocking` lines below are what the gate checker reads.

## Q-001 Benchmark settings: vendor defaults, matched settings, or both?

- asked: 2026-10-08
- blocking: []
- status: withdrawn
- answer: none. This duplicates [Q-117](#q-117-fairness-framing-as-shipped-defaults-matched-configuration-or-both); please answer that one.

## Q-002 Chrome build for benchmarks: branded Chrome with updates blocked, or Chrome for Testing?

- asked: 2026-10-08
- blocking: []
- status: withdrawn
- answer: none. This duplicates [Q-118](#q-118-branded-chrome-or-chrome-for-testing); please answer that one.

## Q-003 WebView2 runtime for benchmarks: Evergreen, Fixed Version, or both?

- asked: 2026-10-08
- blocking: []
- status: withdrawn
- answer: none. This duplicates [Q-119](#q-119-webview2-runtime-evergreen-fixed-version-or-both); please answer that one.

## Q-004 Handoff file naming (schema clarification)

- asked: 2026-10-08
- blocking: []
- status: open
- answer: none yet

SCHEMA §4.1, §6.15 and §9.5 used to name handoff files `operations/handoffs/YYYY-MM-DD-sNN.md`, while
their id is `handoff-YYYY-MM-DD-sNN` and SCHEMA §5.1 requires the file name to start with the id. The
integration pass of 2026-10-08 applied the proposed fix to SCHEMA (file name `handoff-YYYY-MM-DD-sNN.md`;
see the `schema` entry in `wiki/log.md`). CLAUDE.md and the operations pages already used that name.
Remaining step: the owner approves `schema` (Approval Wave 1), which closes this question.

## Q-005 Confirm the proposed non-goals

- asked: 2026-10-08
- blocking: []
- status: open
- answer: none yet

[ov-project](ov-project-overview.md) lists non-goals taken from the master prompt, plus a few proposed
ones that the master prompt does not mention:

- browser extensions;
- sync and accounts;
- platforms other than Windows 11 x64;
- replacing a full general-purpose browser.

It also lists one **deferral** of a master-prompt feature: split view (master prompt §4 "Split-view
support in a later phase") is proposed to move to after P8
([phase-p3-tabs-sessions](../phases/phase-p3-tabs-sessions.md), Out of scope).

Please confirm or strike each one.

## Q-006 May the plan app append `approval` entries to `wiki/log.md`?

- asked: 2026-10-08
- blocking: [comp-interactive-plan]
- status: answered
- answer: [raw/owner/2026-10-08-s01-wave0.md](../raw/owner/2026-10-08-s01-wave0.md), owner answer: "**Yes** (recommended default accepted)". The plan app appends `approval` entries (`PLAN_APPEND_LOG=1`).

Raised in [ip-spec](../interactive-plan/ip-spec.md) §9 item 2. SCHEMA §10.1 allows the plan app to write
these entries. Recommended default: yes (`PLAN_APPEND_LOG=1`). The alternative is that Claude adds them at
the next RESUME.

## Q-007 Should the plan app offer "reset to pending"?

- asked: 2026-10-08
- blocking: [comp-interactive-plan]
- status: answered
- answer: [raw/owner/2026-10-08-s01-wave0.md](../raw/owner/2026-10-08-s01-wave0.md), owner answer: "**No** (recommended default accepted; history append-only)". No reset action; SCHEMA §10.1 is unchanged.

Raised in [ip-spec](../interactive-plan/ip-spec.md) §9 item 3. SCHEMA §10.1 allows only
`approved | changes-requested | rejected`, and `history` is append-only. Recommended default: no reset
action. Adding one would need a SCHEMA change.

## Q-008 Optional accessibility test dependency for the plan app

- asked: 2026-10-08
- blocking: []
- status: answered
- answer: [raw/owner/2026-10-10-s01-q008-and-pause.md](../raw/owner/2026-10-10-s01-q008-and-pause.md), owner answer on 2026-10-10, after asking what the checker does and why: "**Okay, lets add.**" — KEEP the accessibility checker (`@axe-core/playwright`, installed as its engine `axe-core` 4.14.0), a test-only dev dependency of `interactive_plan/`.

Raised in [ip-spec](../interactive-plan/ip-spec.md) §9 item 5. Should the plan app's tests use
`@axe-core/playwright`? Its version was not captured in the research note. It would be added only with
your consent, pinned from the registry at build time. Not blocking: the app can be built without it.
(ip-spec §9 items 1 and 4 are Q-103 and Q-101.)

**Correction (2026-10-09, review of portal v2):** before this question was answered, Claude added the
accessibility checker anyway: `axe-core` 4.14.0 (the engine behind `@axe-core/playwright`, already in the
lockfile through eslint) became an exact devDependency of `interactive_plan/` in the p0.17 "portal-views"
step (commit `dfe164f`), and the browser tests now check every portal tab with it. Claude treated it as a
tooling choice under the delegation policy ([raw/owner/2026-10-09-s01-wave0c.md](../raw/owner/2026-10-09-s01-wave0c.md)),
but this question had promised to ask first, so the register said something untrue until this correction.
The question stays open in a new form: **keep the checker, or remove it?** If the owner says remove,
Claude uninstalls it and drops the accessibility browser tests; nothing else depends on it.

**Answered (2026-10-10):** the owner first asked for the rationale. Claude explained that the checker tests
every portal tab for colour contrast, popup behaviour (focus moves in, Esc closes, focus returns), labels and
page structure; that it is test-only and small; and that it cannot judge the wording, which stays a human
review. The owner then said "Okay, lets add." The checker stays as it is; nothing changes in the code.

## Q-101 When is the plan app built?

- asked: 2026-10-08
- blocking: []
- status: answered
- answer: [raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md), owner directives 2 ("Create folder called `interactive_plan`. In this folder set up a Next.js application …") and 4 ("First the interactive plan comes together. I then approve everything else.")

Raised in adr-0016 (and adr-0001). The owner's directives already answer it: the plan app is built in
P0, before anything else is approved. (The nextjs-stack research note calls P1 the "plan-app build
phase"; that label predates this answer, see [phase-p0-planning](../phases/phase-p0-planning.md) Scope.)
What remains before the build starts is **Approval Wave 0**
([ops-approval-workflow §8](../operations/ops-approval-workflow.md#8-approval-waves)): the owner's chat
approval of the `ip-*` pages and adr-0016, transcribed to `wiki/raw/owner/` (ip-build-plan IP-0). Those
pages are re-approved in the app after IP-10.

## Q-102 Which Node.js version is installed, and should it stay on the 24 line?

- asked: 2026-10-08
- blocking: []
- status: answered
- answer: [raw/owner/2026-10-08-s01-wave0.md](../raw/owner/2026-10-08-s01-wave0.md), owner answer: "**Stay on Node 24 LTS for now**; reconsider 26 later via its own ADR". The same file records the install (`winget install -e --id OpenJS.NodeJS.LTS`, v24.20.0) and that Node is not on the default PATH of the s01 shell.

Raised in adr-0005 and adr-0016. It held only the P0 exit review.

Evidence: the owner-answer file above records `"/c/Program Files/nodejs/node.exe" --version` giving `v24.20.0`;
the IP-0 evidence file `raw/evidence/phase-p0-planning/interactive-plan/IP-0-toolchain.txt` (task p0.9)
records `node -v`, `npm -v` and `git --version`. Node 26 becomes LTS on 2026-10-28
([raw/research/nextjs-stack.md](../raw/research/nextjs-stack.md) §2).

Answered: keep Node 24 for now. Moving to 26 needs its own ADR; avoid winget upgrades that move the major.

## Q-103 Mermaid 12.x or 11.17.2 for the plan app?

- asked: 2026-10-08
- blocking: [comp-interactive-plan]
- status: answered
- answer: [raw/owner/2026-10-08-s01-wave0.md](../raw/owner/2026-10-08-s01-wave0.md), owner answer: "**12.x pinned exact**, fall back to 11.17.2 on rendering problems (default accepted)".

Raised in adr-0016. Mermaid 12.0.0 (2026-09-10) is a breaking release, and 11.17.2 is the mature line
([raw/research/nextjs-stack.md](../raw/research/nextjs-stack.md) §4). The answer is needed before the
plan app installs its dependencies. Recommended default: 12.x pinned to an exact version, falling back to
11.17.2 if rendering problems appear.

## Q-104 May Claude make local git commits, starting in P0?

- asked: 2026-10-08
- blocking: [phase-p1-foundation]
- status: answered
- answer: [raw/owner/2026-10-08-s01-wave0.md](../raw/owner/2026-10-08-s01-wave0.md), owner answer: "**Yes, starting now in P0** — one local commit per verified task; never push".

Raised in adr-0011 and adr-0003. When it was raised the repository had no commits. The proposed default is yes: one
local commit per verified task, and never a push ([ops-git-conventions](../operations/ops-git-conventions.md)).
Without commits, interruption recovery cannot rely on git history. The question blocks P1 entry. An
earlier answer would also let P0 checkpoints be commits.

## Q-105 GitHub remote: name, visibility, timing

- asked: 2026-10-08
- blocking: []
- status: open
- answer: none yet

Raised in adr-0011. It holds only the P1 exit review, because CI cannot run until the owner creates a
remote and pushes to it.

## Q-106 Approve the repository layout (repo root = project root, Cargo workspace per master prompt §12)?

- asked: 2026-10-08
- blocking: [adr-0018, phase-p1-foundation]
- status: open
- answer: none yet

Raised in adr-0018. It blocks the P1 scaffold. Approving it also approves these additions beyond the
master prompt §12 layout, which other areas proposed
([ov-arch-repo-layout](../architecture/ov-arch-repo-layout.md)):

- `crates/network-logger/` as its own crate (comp-network-logger; the p1.4 scaffold creates it);
- `apps/baseline-tauri/` (comp-baseline-app), `benchmarks/runners/{orchestrator,playwright,energy-sampler}/`
  and `tests/security-fixtures/`;
- `spikes/` for the P1 throwaway spikes, outside the Cargo workspace members and kept for evidence
  reproducibility (the alternative is to delete them once their reports are saved);
- `tools/` for planning-tooling scripts (the Python quick lint fallback), and `plan/snapshots/` (approval
  snapshots, tracked in git).

## Q-107 How to implement per-site WebView2 profiles?

- asked: 2026-10-08
- blocking: [phase-p3-tabs-sessions]
- status: open
- answer: none yet

Raised in adr-0010 (risk-r01; the risk id is informational and is not listed in `blocking`, because risks
are in no dependency set). Tauri 2.12.1 does not pass a profile name through to wry when it creates a WebView.
The possible routes are in [raw/research/tauri-webview2-capabilities.md](../raw/research/tauri-webview2-capabilities.md):

- wait for the upstream Tauri change;
- patch tauri-runtime-wry;
- create tab WebViews via raw COM;
- use a separate data folder per site, which breaks the shared browser process.

Recommended default: start P2 on the shared-profile child-WebView host, run spike S2 (p1.6), then
(a) a Tauri release with the profile option if one exists by P3, else (b) patch tauri-runtime-wry pinned
to a commit; (c) raw COM only if both fail; (d) per-site data folders only through a superseding ADR.
A P1 spike informs the answer, and the question gates P3 entry. It does not list adr-0010, because
adr-0010 is in P1's dependency set and the spike must be able to run first.

## Q-108 Owner review checkpoint for P0 and P1 too?

- asked: 2026-10-08
- blocking: []
- status: open
- answer: none yet

Raised in adr-0014. Should the milestone-exit review apply to every phase, including P0 and P1, which
have no milestone? It holds only the P0 exit review.

**Note (2026-10-10):** the owner's standing directive "Make sure to pause when completing the planning phase
and before building the next phase" ([raw/owner/2026-10-10-s01-q008-and-pause.md](../raw/owner/2026-10-10-s01-q008-and-pause.md))
already makes Claude stop after P0 and before every next phase ([adr-0014](../decisions/adr-0014-milestone-review-checkpoints.md),
SCHEMA §9.7). It does not by itself say whether P0 and P1 get the same formal exit review as the milestone
phases, so this question stays open and is still asked in the first wave.

## Q-109 Google sign-in hand-off UX

- asked: 2026-10-08
- blocking: [phase-p2-minimal-container]
- status: open
- answer: none yet

Raised in adr-0015. It gates P2 entry because task p2.13 builds the sign-in detection. Google's policy forbids sign-in from embedded webviews, so Ferrum should detect the
sign-in flow and offer to open it in the system browser
([raw/research/tauri-webview2-capabilities.md](../raw/research/tauri-webview2-capabilities.md)).

## Q-110 Approve a deliberate raw WebView2 COM boundary?

- asked: 2026-10-08
- blocking: [adr-0019]
- status: open
- answer: none yet

Raised in adr-0019. Several required features can be reached only through raw WebView2 COM, which means
unsafe Rust. adr-0019 is now in the `decisions` of phase-p1-foundation (spike S3) and
phase-p2-minimal-container, so blocking the ADR holds both entry gates.

## Q-111 Profile granularity: registrable domain, origin, or user-defined containers?

- asked: 2026-10-08
- blocking: [phase-p3-tabs-sessions]
- status: open
- answer: none yet

Raised in adr-0010.

## Q-112 Exact behaviour for `http:` URLs

- asked: 2026-10-08
- blocking: [phase-p4-security]
- status: open
- answer: none yet

Raised in adr-0015. Should Ferrum upgrade to HTTPS, and what should it show if the upgrade fails? P2
ships a minimal interim behaviour.

## Q-113 Blocklist default contents and source

- asked: 2026-10-08
- blocking: [phase-p4-security]
- status: open
- answer: none yet

Raised in adr-0015.

## Q-114 Network log location, retention and URL redaction

- asked: 2026-10-08
- blocking: [phase-p5-telemetry]
- status: open
- answer: none yet

Raised in adr-0008 (and risk-r08). Sub-questions:

- Full URLs can contain tokens in their query strings. Keep them (Q5 says "URL") in the local, git-ignored
  log, or strip query strings by default (recommended)?
- Should the log be on by default or opt-in, and how many days should logs be kept?
- Capture route (for information; not an owner choice unless the default fails): adr-0008 and
  [ov-arch-data-flows](../architecture/ov-arch-data-flows.md) use WebView2 `WebResourceResponseReceived`
  through the raw-COM boundary as the default, with in-process CDP `Network.*` as the alternative if a P5
  check finds fields missing. A switch needs a superseding decision (DECIDE).

## Q-115 Replace "time to interactive" in the startup metrics

- asked: 2026-10-08
- blocking: [phase-p5-telemetry, exp-startup]
- status: open
- answer: none yet

Raised from [raw/research/measurement-methodology.md](../raw/research/measurement-methodology.md) §4.2
and §9.6. Master prompt §7 asks for "time to interactive state". The research note records that TTI was
removed from Lighthouse 10 and is considered unreliable.

Recommended default: replace it with the chain process start → first window visible → FCP → LCP, plus
LoAF for responsiveness. The paper states that TTI was not measured, and why.

## Q-116 Benchmark machine: exact CPU model and RAM

- asked: 2026-10-08
- blocking: [exp-energy]
- status: open
- answer: none yet

Raised in adr-0009 (research label R-Q6). The AMD generation determines what the energy counters can
support ([raw/research/measurement-methodology.md](../raw/research/measurement-methodology.md)).

## Q-117 Fairness framing: as-shipped defaults, matched configuration, or both

- asked: 2026-10-08
- blocking: [phase-p6-benchmark-harness]
- status: open
- answer: none yet

Raised in adr-0012 and adr-0009 (research label R-Q1; replaces Q-001). Chrome and Edge ship
resource-saving features that are on by default
([raw/research/measurement-methodology.md](../raw/research/measurement-methodology.md) §6.1):

- Edge sleeping tabs;
- Chrome background-tab freezing;
- Edge Startup Boost, which may pre-launch processes;
- Chrome Memory Saver, though whether it is on by default is unclear in the sources.

The master prompt forbids disabling these merely to help Ferrum.

Recommended default: run both framings.

- The as-shipped defaults are the headline comparison.
- Startup Boost is disabled for cold-start trials.
- The matched configuration is a labelled secondary comparison.
- Every feature's state is recorded for each trial.

The framing must be pre-registered before any data is collected.

## Q-118 Branded Chrome or Chrome for Testing

- asked: 2026-10-08
- blocking: [phase-p6-benchmark-harness]
- status: open
- answer: none yet

Raised from [raw/research/measurement-methodology.md](../raw/research/measurement-methodology.md) §6.2
and §10 (research label R-Q2; replaces Q-002). Chrome for Testing is versioned and does not auto-update.
Branded Chrome is what users actually run. Whether the two differ in performance was not established.

Recommended default: use branded Chrome and branded Edge in the same way, with auto-update paused for
the length of a campaign and versions recorded for each trial. Chrome for Testing becomes an optional
reproducibility arm.

## Q-119 WebView2 runtime: Evergreen, Fixed Version, or both

- asked: 2026-10-08
- blocking: [phase-p6-benchmark-harness]
- status: open
- answer: none yet

Raised from [raw/research/measurement-methodology.md](../raw/research/measurement-methodology.md) §6.2
and §10 (research label R-Q3; replaces Q-003). The Evergreen runtime updates itself; this machine has
154.0.4258.62, per [raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md). When its version
matches Edge's, it shares hard-linked binaries with Edge. The Fixed Version runtime is pinned.

Recommended default: Evergreen for the headline results, with the version recorded for each trial, plus
Fixed Version as a separately labelled configuration.

## Q-120 Representative public websites for supplementary workloads

- asked: 2026-10-08
- blocking: [phase-p6-benchmark-harness]
- status: open
- answer: none yet

Raised from master prompt §9 ([raw/00-master-prompt.md](../raw/00-master-prompt.md)); research label
R-Q9 ([wl-public-supplementary](../research/workloads/wl-public-supplementary.md)).

Recommended default: in P6, Claude proposes a shortlist of stable public pages that need no login, and
the owner picks 5–8 of them.

- No logins of any kind.
- Low request rates.
- Content drift is recorded.
- Results from public sites are always reported separately from the local fixtures.

## Q-121 Python environment tool for analysis

- asked: 2026-10-08
- blocking: [phase-p6-benchmark-harness]
- status: open
- answer: none yet

Raised in adr-0013, which proposes a venv with exact pins.

## Q-122 Is a wall-power meter available?

- asked: 2026-10-08
- blocking: [exp-energy]
- status: open
- answer: none yet

Raised in adr-0009 (research label R-Q4). Without a meter, energy is either reported only as modelled
CPU-package energy or marked unsupported
([raw/research/related-work-seed.md](../raw/research/related-work-seed.md),
[raw/research/measurement-methodology.md](../raw/research/measurement-methodology.md)).

## Q-123 Approve the PawnIO driver and an elevated energy sampler?

- asked: 2026-10-08
- blocking: [phase-p6-benchmark-harness, exp-energy]
- status: open
- answer: none yet

Raised in adr-0009 (risk-r04 is the related risk; it is informational and not listed in `blocking`) (research label R-Q5, which also covers an elevated PresentMon sampler). No kernel
driver is installed until the owner approves.

## Q-124 Publication venue

- asked: 2026-10-08
- blocking: [phase-p8-research-paper, adr-0017]
- status: open
- answer: none yet

Raised in adr-0017. It is not needed until results exist, and it gates P8 entry.

## Q-125 Tabs in the window's top bar: custom title bar, or the normal Windows title bar first?

- asked: 2026-10-10
- blocking: [phase-p3-tabs-sessions]
- status: open
- answer: none yet

Raised in [adr-0028](../decisions/adr-0028-browser-look-tabs-top-ferrum-panel.md) (review of 2026-10-10). The
browser look the owner chose (option A) puts the tabs in the window's top bar, next to the Windows 11 minimise,
maximise and close buttons. That needs a **custom title bar**. The shell's design notes
([comp-app-shell](../architecture/components/comp-app-shell.md), "Design notes") advise against a custom title bar
at first, because of a known resize problem with one in Tauri (issue #12207; whether it is workable is
UNVERIFIED[phase-p1-foundation]).

Options:

- (a) **Normal Windows title bar first** (recommended default): the early shell shows the standard Windows title
  bar, with the tab strip just under it. Tabs move into the top bar once P1 has shown that a custom title bar
  resizes reliably.
- (b) **Custom title bar from the start**, as drawn, accepting the resize risk until it is checked.

P2 has a single tab, so the answer is first needed when tabs are built; the question gates P3 entry.

## Q-201 Practical-significance thresholds and the J weight vector

- asked: 2026-10-08
- blocking: [phase-p6-benchmark-harness, phase-p7-lifecycle]
- status: open
- answer: none yet

Research label R-Q7. Please approve or change two things:

- the proposed practical-significance thresholds, which are on each hypothesis page;
- the primary J weight vector ([ov-research-objective-function](../research/ov-research-objective-function.md),
  [ov-research-statistical-analysis-plan](../research/ov-research-statistical-analysis-plan.md)).

Both must be fixed before the pre-registration freeze in P6 and the lifecycle freeze in P7
([ov-research-plan](../research/ov-research-plan.md)).

## Q-202 Local fixture scheme: loopback HTTP exemption or a locally trusted development CA

- asked: 2026-10-08
- blocking: [phase-p2-minimal-container, phase-p4-security]
- status: open
- answer: none yet

Research label R-Q8 ([ov-research-workload-catalog](../research/ov-research-workload-catalog.md)); also
raised by the P2 page (fixture server p2.1) and
[qual-security-testing-plan](../quality/qual-security-testing-plan.md) §3. All options are
security-relevant:

1. install a local development certificate authority into your user certificate store, so test and
   benchmark fixtures run over HTTPS on loopback;
2. serve fixtures over `http://127.0.0.1` under a test/benchmark-only exemption from Ferrum's HTTP
   upgrade/warn posture (adr-0015);
3. use public HTTPS sites only for the HTTPS checks.

Recommended default: option 1, plus a few public HTTPS sites in the manual checklist. The question gates
P2 entry because the P2 fixture server and its tests need the answer, and P4 entry because P4 finalises
the navigation posture into which any exemption would have to be designed.

## Q-203 Raw benchmark data location and size policy

- asked: 2026-10-08
- blocking: [phase-p5-telemetry]
- status: open
- answer: none yet

Research label R-Q10 ([ov-research-traceability](../research/ov-research-traceability.md)). Should runs
be stored in `wiki/raw/bench/<run-id>/` (SCHEMA §3.1) or in `benchmarks/results/` (master prompt §12)?
Large PresentMon or ETW files may need to live outside git, with a hash manifest kept in git. The
question gates P5 entry because P5 is the first phase whose experiments can produce run data.

## Q-204 One confirmatory campaign or one per phase

- asked: 2026-10-08
- blocking: [phase-p6-benchmark-harness]
- status: open
- answer: none yet

Research label R-Q11 ([ov-research-plan](../research/ov-research-plan.md)). Should every confirmatory
experiment run in a single campaign with pinned versions (for example at the start of P8), or should each
family run in the phase that builds it?

## Q-205 Fewer trials for the reliability soak

- asked: 2026-10-08
- blocking: [exp-reliability]
- status: open
- answer: none yet

Research label R-Q12 ([exp-reliability](../research/experiments/exp-reliability.md)). Each reliability
soak run is planned to take about 2 h; this is a planning estimate, not a measurement. Will you accept 10
trials per configuration instead of the master prompt §10 target of 30? That would be a documented
deviation from the master prompt, so the decision is yours.

## Q-206 Paper outline: merge the two related-work sections?

- asked: 2026-10-08
- blocking: [phase-p8-research-paper]
- status: open
- answer: none yet

Research label R-Q13 ([ov-research-paper-plan](../research/ov-research-paper-plan.md)). Master prompt §13
lists both "Background and Related Work" and, later, "Related Work". Should they be merged into one
section?

## Q-207 Schema gap: `overview` pages under `wiki/research/` and `wiki/risks/`

- asked: 2026-10-08
- blocking: [schema]
- status: open
- answer: none yet

Research label R-Q14 ([ov-research-plan](../research/ov-research-plan.md)). SCHEMA §4.1 does not allow
type `overview` under `wiki/research/` or `wiki/risks/`. Yet the research narrative pages
(`ov-research-*`) and `ov-risk-register` live there. There are two fixes:

- allow it, with an amendment to SCHEMA §4.1 (the smaller change);
- move the pages.

This must be settled before the owner approves `schema`, which is in every phase's dependency set.
The integration pass of 2026-10-08 applied the smaller fix (allow `overview` directly under `research/`
and `risks/`) to SCHEMA §4.1, as the recommended default. Approving `schema` (Approval Wave 1) accepts it
and closes this question; rejecting it means the pages move instead.

## Q-208 Configuration E outside the lifecycle experiment: P7 campaign C2b or documented deviation

- asked: 2026-10-08
- blocking: [phase-p7-lifecycle]
- status: open
- answer: none yet

Research label R-Q15 ([ov-research-plan](../research/ov-research-plan.md),
[ov-research-configurations](../research/ov-research-configurations.md)). Master prompt §8 compares
configuration E (Ferrum with adaptive lifecycle) against A–D. Options: (a) run campaign C2b in P7 (task
p7.14): rerun the footprint, navigation, rendering, energy (if supported) and reliability families with
`cfg-ferrum-adaptive` under the frozen C1 protocol; (b) report E only in exp-lifecycle-policies and record
the exclusion as a deviation in
[ov-research-threats-to-validity](../research/ov-research-threats-to-validity.md). Recommended default:
(a), if the P6 campaign duration leaves room; the owner decides.

## Q-209 Cross-site top-level navigation in per-site-profile mode

- asked: 2026-10-08
- blocking: [phase-p3-tabs-sessions]
- status: open
- answer: none yet

Raised by the architecture area ([ov-arch-isolation-model](../architecture/ov-arch-isolation-model.md)).
When a tab bound to site A's profile navigates top-level to site B, Ferrum can (a) re-host the tab in
site B's profile, which loses in-tab back/forward history; (b) keep the original profile, which breaks
per-site isolation; or (c) block the navigation. Recommended default: (a), with the history loss shown to
the user. Only relevant if per-site profiles are adopted (Q-107).

## Q-210 Plan-app test dependencies: coverage provider and Playwright browser download

- asked: 2026-10-08
- blocking: [comp-interactive-plan]
- status: answered
- answer: [raw/owner/2026-10-08-s01-wave0.md](../raw/owner/2026-10-08-s01-wave0.md), owner answer: "**Yes**: `@vitest/coverage-v8` (exact pin) and `npx playwright install chromium` (default accepted)".

Raised by the review of [ip-build-plan](../interactive-plan/ip-build-plan.md) and
[ip-testing](../interactive-plan/ip-testing.md). The IP-9 coverage gate needs a Vitest coverage provider
(`@vitest/coverage-v8`, exact version pinned from the registry at install time,
UNVERIFIED[phase-p0-planning]), and the E2E tests need `npx playwright install chromium`, which downloads
a Chromium build into the user profile. Recommended default: yes to both (Approval Wave 0).

## Q-211 Scope of unsafe code beyond the WebView2 COM module

- asked: 2026-10-08
- blocking: [adr-0019]
- status: open
- answer: none yet

adr-0019 confines all `unsafe` to the WebView2 COM module. The architecture also needs `unsafe` for Win32
process and Job Object APIs in `telemetry::win` (comp-telemetry) and `bench::win`
(comp-benchmark-harness). Options: (a) approve these two extra modules, each with its own
`## Unsafe invariants` section; (b) amend adr-0019 to one Windows-platform module that holds all unsafe
code. Recommended default: (a).

## Q-212 Runtime flags versus build features for policies, isolation and lifecycle strategies

- asked: 2026-10-08
- blocking: [phase-p4-security, phase-p7-lifecycle]
- status: open
- answer: none yet

Master prompt §8 asks for "feature flags". Claude proposes runtime flags on one identical binary for the
security policies, the isolation modes and all four lifecycle strategies, with two exceptions: a
`bench-nosecurity` Cargo-feature build used only by exp-security-overhead, and an optional compile-time
feature for the experimental adaptive lifecycle code
([ov-arch-configuration](../architecture/ov-arch-configuration.md)). Is that interpretation acceptable?

## Q-213 Optional "shell + one child WebView" Tauri baseline variant

- asked: 2026-10-08
- blocking: [phase-p6-benchmark-harness]
- status: open
- answer: none yet

Raised by the architecture area ([comp-baseline-app](../architecture/components/comp-baseline-app.md)).
Adding a second baseline variant with a shell WebView plus one child WebView would separate the cost of
Ferrum's shell WebView from the cost of Ferrum's own logic. It adds one configuration (`cfg-tauri-baseline-shell`) and
its trials. Recommended default: yes, as a labelled secondary configuration.

## Q-214 Configuration file format: TOML or JSON

- asked: 2026-10-08
- blocking: [phase-p2-minimal-container]
- status: open
- answer: none yet

Raised in [ov-arch-configuration](../architecture/ov-arch-configuration.md). Recommended default: TOML.

## Q-215 Is a second machine available for a replication run?

- asked: 2026-10-08
- blocking: []
- status: open
- answer: none yet

Raised in risk-r21 (single-machine external validity). Not blocking: without a second machine the paper
states the limitation.

## Q-216 Wiki lint implementation and where the fallback scripts live

- asked: 2026-10-08
- blocking: []
- status: answered
- answer: [raw/owner/2026-10-08-s01-wave0b.md](../raw/owner/2026-10-08-s01-wave0b.md), owner answer: "**Yes, commit under tools/**" — `tools/quick_lint.py` and `tools/approvals_check.py`, versioned and tested; the plan app's TS lint remains primary, the Python scripts are Node-free fallbacks.

Applied 2026-10-08: both scripts are committed under `tools/` with stdlib tests (`python -m unittest discover -s tools -p "test_*.py"`);
their text stays embedded in [ops-wiki-maintenance §5](../operations/ops-wiki-maintenance.md#5-lint) and
[ops-approval-workflow §4](../operations/ops-approval-workflow.md#4-checking-approval-state-as-claude), and the tests fail if file and page differ.

Proposed (SCHEMA §9.3 as amended, [ops-wiki-maintenance §5](../operations/ops-wiki-maintenance.md#5-lint)):
the TypeScript `npm run lint:wiki` inside `interactive_plan/` is normative once IP-5 passes, sharing the
plan app's single frontmatter parser; the stdlib Python quick lint and approval checker are a bootstrap
fallback stored as repo files `tools/quick_lint.py` and `tools/approvals_check.py`, with a parity test
(ip-testing). The alternative is a standalone Python linter. Not blocking: the default applies unless
you object.

## Q-217 Approve two deliberate departures from the master prompt's research vocabulary

- asked: 2026-10-08
- blocking: []
- status: open
- answer: none yet

Raised in [ov-research-plan](../research/ov-research-plan.md). (1) "Time to interactive" is replaced by
FCP/LCP plus LoAF, because TTI is retired upstream (this is Q-115, which gates P5). (2) The master
prompt's `h-*` and `m-*` id prefixes are written `hyp-*` and `metric-*` to follow SCHEMA §8. Please
confirm (2); it holds only the P8 exit review.

## Q-218 Who runs toolchain installs after the standing install directive?

- asked: 2026-10-08
- blocking: [phase-p1-foundation]
- status: answered
- answer: [raw/owner/2026-10-08-s01-wave0b.md](../raw/owner/2026-10-08-s01-wave0b.md), owner answer: "**Claude runs all toolchain installs**" — Claude runs winget/npm/rustup/pip installs, including MSVC Build Tools (owner clicks through UAC prompts). Kernel drivers (e.g. energy-measurement driver) still require separate owner approval. adr-0005 is superseded.

Applied 2026-10-08 by DECIDE: [adr-0021](../decisions/adr-0021-claude-runs-toolchain-installs.md) (accepted, case (b)) supersedes
[adr-0005](../decisions/adr-0005-owner-installs-toolchain-winget.md), whose CONTRADICTION blockquote is resolved.

Raised by the ingest of [raw/owner/2026-10-08-s01-wave0.md](../raw/owner/2026-10-08-s01-wave0.md) (session s01). adr-0005 (accepted, case (b)) quotes
the owner's scoping answer Q2: "Owner installs via winget (Claude supplies exact commands)". The later
standing directive says "Feel free to run install." and Claude installed Node LTS with winget on that
authorisation. A `> **CONTRADICTION:**` blockquote on
[adr-0005](../decisions/adr-0005-owner-installs-toolchain-winget.md) records this (SCHEMA §9.1.1).
Options: (a) Claude may run non-elevated installs (npm packages, winget user-scope installs) and the
owner keeps elevated installers (MSVC Build Tools) and any driver; (b) Claude may run all toolchain
installs, including elevated ones, with driver installs still needing separate approval; (c) keep
adr-0005 as written (owner runs every winget install). Recommended default: (a), recorded by a new ADR
that supersedes adr-0005 (DECIDE). It holds P1 entry, because P1 installs Rust and MSVC.

## Q-219 Index ids for upper-case evidence file names (SCHEMA §11 vs the P0 evidence names)

- asked: 2026-10-08
- blocking: []
- status: answered
- answer: [raw/owner/2026-10-08-s01-wave0b.md](../raw/owner/2026-10-08-s01-wave0b.md), owner answer: "**List folders, not files**" — wiki/index.md lists each evidence folder (e.g. `raw/evidence/phase-p0-planning/`) instead of every file; scales to benchmark result files later. Requires a small SCHEMA §11 change + lint update, recorded as an ADR.

Applied 2026-10-08: option (b), recorded in [adr-0020](../decisions/adr-0020-index-lists-evidence-folders.md);
SCHEMA §11, the quick lint and [ip-wiki-lint](../interactive-plan/ip-wiki-lint.md) `INDEX-MISSING` updated.

Found at p0.9 / IP-0 (session s01). SCHEMA §11 makes a raw file's index id its basename without the
extension, and the index-line regex allows only `[a-z0-9.-]` in ids. The P0 evidence names fixed on
[phase-p0-planning](../phases/phase-p0-planning.md) (`IP-0-toolchain.txt`, `IP-1-scaffold.txt`, …,
`IP-10-final-lint.json`) contain upper-case letters, so no index line can list them, and the quick lint
of [ops-wiki-maintenance §5](../operations/ops-wiki-maintenance.md#5-lint) reports `INDEX-MISSING` for
each one (ip-wiki-lint §2 speaks only of pages, so the TS lint may differ). Options: (a) lower-case the
index label and compare case-insensitively (SCHEMA §11 and quick-lint change); (b) exempt
`raw/evidence/` and `raw/bench/` files from the per-file index requirement and list their folders
instead; (c) rename future evidence files to lower case (`ip-1-scaffold.txt`, …) in the phase page and
ip-build-plan; `IP-0-toolchain.txt` stays as written, since raw files are never renamed. Each changes
lint semantics, so Claude does not choose. It holds no phase entry, but a clean lint is required by IP-9,
IP-10 and the P0 exit; until it is answered the quick lint reports one `INDEX-MISSING` error per
upper-case evidence file.

## Q-220 Format of `sources` entries on the real wiki (found by the IP-2 loader)

- asked: 2026-10-08
- blocking: []
- status: answered
- answer: [raw/owner/2026-10-09-s01-wave0c.md](../raw/owner/2026-10-09-s01-wave0c.md), owner answer: "**Accept all; Claude decides these**" — a page's `sources` entry may be any wiki-relative path (e.g. `SCHEMA.md`) or an `https://` URL, non-existent targets are caught by REF-DANGLING; raw research notes are exempt from the strict format rule (only a list of strings); the real-wiki loader test moves from `npm test` to `lint:wiki`.

Applied 2026-10-09: SCHEMA §5.1, §6.13 and the §9.3 `REF-DANGLING` row, [ip-data-contract](../interactive-plan/ip-data-contract.md) §4,
[ip-wiki-lint](../interactive-plan/ip-wiki-lint.md) §2, [ip-testing](../interactive-plan/ip-testing.md) §0 and the
loader (`interactive_plan/lib/wiki/schemas.ts`). Registered after the fact for traceability; the question was
first raised on 2026-10-08 in the STATUS Blockers table, when the IP-2 loader reported 4 `FM-MISSING`
findings on the real wiki (risk-r15, risk-r22 and risk-r24 list `SCHEMA.md`; the immutable research note
raw/research/tauri-webview2-capabilities.md has a free-text entry). Those pages were not changed.

## Q-221 Rewrite git history before the first push, to remove real machine values

- asked: 2026-10-09
- blocking: []
- status: open
- answer: none yet. Ask when the owner wants the first push to GitHub; the push waits for this answer.

**Where we are:** on 2026-10-09 the committed test logs were masked (real IP addresses and the user-folder path
replaced by names like `<LAN_IPV4_1>`), per the owner's choice "Mask files now, rewrite history before first push"
([raw/owner/2026-10-09-s01-portal-v2-decisions.md](../raw/owner/2026-10-09-s01-portal-v2-decisions.md),
[adr-0027](../decisions/adr-0027-mask-sensitive-values.md)). The older commits still contain the real values.

**Question:** may Claude rewrite the local git history (for example with `git filter-repo --replace-text`, using
the local map) so no commit contains them, before the first push? This changes every commit id, so it must
happen before anything is pushed. It holds no phase gate (`blocking: []`); it holds the first push only.
