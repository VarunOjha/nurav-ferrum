---
id: adr-0010
type: decision
title: "Default site isolation via WebView2 profiles in a shared browser process"
status: accepted
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/01-scoping-decisions.md
  - raw/research/tauri-webview2-capabilities.md
  - raw/research/measurement-methodology.md
  - raw/research/related-work-seed.md
related: [hyp-13, adr-0007, adr-0019, adr-0015, risk-r01, risk-r03, risk-r05, phase-p1-foundation, phase-p3-tabs-sessions, phase-p4-security, phase-p6-benchmark-harness, exp-isolation-overhead, comp-webview-manager, comp-security-engine, comp-webview2-runtime]
approvable: true
date: 2026-10-08
decided_by: owner
supersedes: []
options:
  - "(a) Wait for Tauri PR #16054 to ship in a 2.x release"
  - "(b) Patch tauri-runtime-wry to the PR #16054 branch via [patch.crates-io]"
  - "(c) Create tab WebView2 controllers ourselves via raw COM with ProfileName"
  - "(d) Per-site data_directory (separate browser process per site)"
  - "(e) No per-site isolation; all tabs share one profile"
phase: phase-p0-planning
tags: [isolation, security, webview2, profiles]
unverified:
  - claim: "Patching tauri-runtime-wry to the PR #16054 branch compiles and yields per-tab WebView2 profiles with Tauri 2.12.x"
    verify_in: phase-p1-foundation
  - claim: "Chromium site isolation applies to WebView2 renderers in the shared process group as it does in Chrome"
    verify_in: phase-p4-security
  - claim: "Exactly which resources remain shared between WebView2 profiles in one user data folder (beyond cookies, preferences, cache being per-profile)"
    verify_in: phase-p4-security
---

# ADR-0010: Default site isolation via WebView2 profiles in a shared browser process

## Context

The master prompt asks Ferrum to:

- "Support website isolation where technically feasible" ([raw/00-master-prompt.md](../raw/00-master-prompt.md) §2);
- "Investigate the feasibility of independent WebView2 user-data directories and profile isolation. Document precisely which resources remain shared. Do not claim complete process or security isolation without validating it" (§5 Phase 3).

Scoping question Q7 asked for the default isolation model. The owner chose **"WebView2 profiles in a shared browser process (per-site profiles; risk: Tauri/wry may not expose profile at creation)"** ([raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md)).

> **CONTRADICTION:** the owner's choice is **not reachable through Tauri 2.12.1's public API today**. The decision stands, but how it gets implemented needs an owner choice before `phase-p3-tabs-sessions`. All points are VERIFIED in [raw/research/tauri-webview2-capabilities.md](../raw/research/tauri-webview2-capabilities.md) §6 and §10.1.
>
> - **Creation-time only.** A WebView2 profile is set by `ICoreWebView2ControllerOptions::put_ProfileName` **at controller creation**. No API was found to change a live controller's profile.
> - **wry supports it.** wry 0.57.0 has `with_profile_name` (wry PR #1738, merged).
> - **Tauri does not.** Tauri 2.12.1 does not pass it through: there are no `profile_name` references in tauri, tauri-runtime, tauri-runtime-wry or tauri-utils, and `data_store_identifier` is ignored on Windows.
> - **The fix is not merged.** Tauri **PR #16054**, which maps `data_store_identifier` to the WebView2 profile name, was still open on 2026-10-08.
> - **The workaround breaks Q7.** Per-site `data_directory` works today, but it creates a **separate browser process per site**. That contradicts the "shared browser process" half of Q7, and Microsoft docs say it costs memory.
>
> Owner choice needed: Q-107 in [ov-open-questions](../overview/ov-open-questions.md).

More research facts (VERIFIED unless marked):

- **What profiles share.** Profiles share one user-data folder (UDF) and **one browser process group**. Each profile has its own folder for cookies, preferences and cache (§6).
- **Identical options.** All webviews on one UDF must use **identical environment options**, or creation fails with `ERROR_INVALID_STATE` (§6).
- **Profile-wide clearing.** `clear_all_browsing_data` is profile-wide. While shell and tabs share the default profile, clearing a tab also clears the shell (§6).
- **Measurement consequence.** Renderer processes can serve frames of multiple `CoreWebView2` instances on the same UDF. **Per-profile or per-tab memory cannot be attributed by PID alone** ([raw/research/measurement-methodology.md](../raw/research/measurement-methodology.md) §2.2, §9.3).
- **Docs to reconcile.** The WebView2 performance doc says both "Each WebView2 control creates its own set of processes" and that a shared environment saves memory. This must be checked empirically ([raw/research/related-work-seed.md](../raw/research/related-work-seed.md) C1).

## Options considered

All options aim to deliver Q7. They differ in how. The pros and cons below are from research §6.

| Option | Pros | Cons |
|---|---|---|
| (a) **Wait** for PR #16054 to ship in a Tauri 2.x release | No custom code. Stays on supported Tauri | Release timing unknown, possibly not before P3. The PR could change or be rejected |
| (b) **Patch** `tauri-runtime-wry` to the PR branch via `[patch.crates-io]` | Gets the feature now. Small code delta. Keeps Tauri hooks for tabs | Supply-chain and maintenance cost (pinned fork commit, manual rebase on each Tauri update). Builds are less reproducible for outside users. That it compiles and works is UNVERIFIED[phase-p1-foundation] |
| (c) **Raw-COM tab controllers** (`CreateCoreWebView2ControllerWithOptions` + `ProfileName`) in child HWNDs; Tauri only for the shell | Full control: profiles, suspend, `ProcessFailed`, network events. Independent of the Tauri release cadence | Loses Tauri hooks for tabs (`on_navigation`, `on_download`, …). All tab plumbing becomes Ferrum-owned `unsafe` COM. Largest effort. Overlaps option D of [ADR-0007](adr-0007-child-webviews.md) |
| (d) **Per-site `data_directory`** | Works today with public Tauri API | One browser process group per site, which contradicts Q7's shared browser process and costs more memory. Environment options can differ per UDF |
| (e) No per-site isolation | Simplest | Fails the master prompt's "isolation where technically feasible". Not the owner's choice |

## Decision

### Owner decision (verbatim)

As recorded in [raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md), scoping answer Q7 (that file records the owner's words verbatim-in-substance):

> Q7 Default site isolation: **WebView2 profiles in a shared browser process** (per-site profiles; risk: Tauri/wry may not expose profile at creation)

This quoted choice is what `decided_by: owner` and `status: accepted` cover (SCHEMA §10.4 rule 3(b)).

### Claude elaboration (binding only once this ADR is APPROVED in the plan app)

Everything below in this section is Claude's elaboration of the owner's choice. Under SCHEMA §10.4 it binds implementation only after the owner approves this ADR in the plan app; until then it is a proposal.

**The owner's decision stands: per-site WebView2 profiles in one shared browser process (one UDF).** Which route implements it is **not decided by this ADR**. It is open question Q-107, which must be answered before the `phase-p3-tabs-sessions` entry gate.

Claude's recommended default for Q-107:

1. **Spike first.** A time-boxed spike in P1 applies option (b) on a throwaway branch and confirms that two tabs get distinct profiles (distinct cookie jars) on one browser process.
2. **Prefer the release.** At P3 entry, if a Tauri 2.x release containing #16054 exists, use (a).
3. **Otherwise patch.** If no release exists, use (b), pinned to an exact commit with owner approval.
4. **Raw COM only on failure.** Use (c) only if (a) and (b) both fail.
5. **Per-site directories only as a recorded deviation.** Use (d) only through a superseding ADR approved by the owner.

Binding constraints, whichever route is chosen:

- **The shell never shares a profile with tabs.** Tabs never use the default profile. This keeps tab data clearing from wiping shell state.
- **Granularity.** The profile key (per registrable domain, per origin, or user-defined containers) is open question Q-111 ([ov-open-questions](../overview/ov-open-questions.md)). Recommended default: the registrable domain, with users able to merge sites into a named container (for SSO across related domains); garbage collection of unused profiles is a P3 sub-task.
- **Claims follow evidence.** Ferrum claims **storage partitioning** (cookies, cache, preferences per profile) only after P4 tests show it. It **never claims process isolation** beyond what Chromium site isolation provides inside the shared process group. Whether that site isolation behaves as in Chrome is UNVERIFIED[phase-p4-security].
- **What stays shared** is documented as a P4 deliverable. At minimum: the browser process, the GPU process, possibly renderers, the network service and environment options. The full list is UNVERIFIED[phase-p4-security].

## Consequences

### Positive

- Expected (per Microsoft docs, [related-work C1](../raw/research/related-work-seed.md)) to cost less memory than per-site UDFs. That was the owner's goal. It is untested: this is [hyp-13](../research/hypotheses/hyp-13-profiles-cheaper-than-udfs.md), tested by `exp-isolation-overhead`.
- Intended to separate per-site storage (cookies and sessions). Any privacy or session-leakage benefit is claimed only after the P4 isolation tests pass.

### Negative

- **Dependency risk.** P3 depends on an unmerged upstream PR, a fork patch, or a raw-COM rewrite. `risk-r01` is realised in part.
- **Attribution limits.** Per-profile resource attribution is impossible by PID. Isolation-overhead experiments must compare whole-product totals across configurations (for example `cfg-ferrum-shared-profile`, `cfg-ferrum-profile-per-site` and `cfg-ferrum-udf-per-site`, defined in [ov-research-configurations](../research/ov-research-configurations.md) and used by `exp-isolation-overhead`), not per-profile numbers.
- **Uniform options.** Identical environment options are needed across all profiles, so per-site browser flags are impossible.

### Follow-ups

- P1 spike as described above (task id on `phase-p1-foundation`, risk spike field of `risk-r01`).
- P4: a security test "session data isolation" (master prompt §11). A cookie set by site A in profile A is not visible to site B in profile B, plus a written "what remains shared" table.
- P6/P7: `exp-isolation-overhead` compares the shared-profile model against per-site UDFs (option d), as an explicitly labelled configuration.

### Related risks and phases

- Risks: `risk-r01` (primary), `risk-r03` (raw COM if option c), `risk-r05` (attribution).
- Phases: `phase-p1-foundation` (spike), `phase-p3-tabs-sessions` (implementation), `phase-p4-security` (validation + shared-resources doc), `phase-p6-benchmark-harness`. Experiment: `exp-isolation-overhead`.

## Verification / evidence

- Owner answer Q7: [raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md).
- Reachability research: [raw/research/tauri-webview2-capabilities.md](../raw/research/tauri-webview2-capabilities.md) §6, §9 (capability matrix row "WebView2 profile name"), §10.1.
- Required evidence:
  - P1 spike report (profiles reachable or not, by route);
  - P4 isolation test output and shared-resources table under `wiki/raw/evidence/phase-p4-security/`.
