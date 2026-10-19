---
id: risk-r05
type: risk
title: "Fair process-tree attribution between Chrome/Edge and Ferrum plus WebView2"
status: mitigating
updated: 2026-10-19
sources:
  - raw/evidence/phase-p5-telemetry/devtools-targets-p5.12-note.md
  - raw/evidence/phase-p5-telemetry/check-p5.3.txt
  - raw/evidence/phase-p1-foundation/spike-s1/job-4.job.json
  - raw/research/measurement-methodology.md
  - raw/research/related-work-seed.md
  - raw/research/tauri-webview2-capabilities.md
  - raw/00-master-prompt.md
related: [phase-p5-telemetry, phase-p6-benchmark-harness, comp-telemetry, comp-benchmark-harness, comp-webview2-runtime, exp-baseline-footprint, exp-isolation-overhead, exp-lifecycle-policies, adr-0010, risk-r01, risk-r14, qual-testing-strategy, adr-0031]
approvable: true
tags: [measurement, memory, attribution, fairness]
likelihood: 4
impact: 5
mitigation: "Headline memory metric is summed PrivateUsage over a job-scoped process set; launch every target suspended in a harness-owned Job Object with a fresh profile; cross-check membership with GetProcessExtendedInfos and an ETW process trace; fail the trial on any foreign PID; include Ferrum's host process; treat crashpad symmetrically; never sum working sets as a headline; never sum per-tab numbers; use the windows crate, not sysinfo, for counters."
spike: p5.2
owner_phase: phase-p5-telemetry
trigger: "Process lists from the job and from the browser disagree; an msedge.exe or msedgewebview2.exe not started by the harness appears in a trial; A/A tests on the same product show attribution-driven differences; per-tab totals exceed the tree total."
fallback: "Report only tree-level metrics with the attribution method stated, drop per-tab and per-profile memory claims, and list the gap as a threat to validity."
unverified:
  - claim: "Chrome and Edge child processes stay inside a harness-created Job Object (no breakaway)"
    verify_in: phase-p6-benchmark-harness
  - claim: "PeakJobMemoryUsed is commit-based and matches the sampled sum of PrivateUsage"
    verify_in: phase-p6-benchmark-harness
---

# risk-r05: Fair process-tree attribution between Chrome/Edge and Ferrum plus WebView2

| Likelihood | Impact | Score | Status | Owner phase |
|---|---|---|---|---|
| 4 | 5 | 20 | open | `phase-p5-telemetry` |

Score = likelihood × impact (SCHEMA §6.5). Scales are planning judgements, not measurements. Full register: [ov-risk-register](ov-risk-register.md).

## Description and evidence

Unfair or wrong attribution would invalidate the core comparison (master prompt §7 Memory: distinguish private from shared pages; avoid misleading aggregation of shared working sets). MM §1, §2 and §9 found:

- `WorkingSetSize` includes shared pages and **double counts when summed**; `PrivateUsage` (private commit) and `PrivateWorkingSetSize` (EX2) are additive. Summing per-process peaks is meaningless; use a sampled tree sum or the Job Object's `PeakJobMemoryUsed`.
- **Matching by executable name is unsafe**: other apps' `msedgewebview2.exe` processes and Edge Startup Boost would be mixed in.
- WebView2 renderer processes are **shared across WebViews on one user data folder**, so per-tab memory is not well-defined (label it "renderer(s) hosting this tab's frames", never sum it). With adr-0010, all profiles share one process group, so per-profile memory cannot be split by PID either.
- `GetProcessExtendedInfos` gives the environment's PID set but **excludes crashpad**.
- Chromium keeps a **spare renderer**, and its soft process limit depends on installed RAM; record RAM.
- Edge and the Evergreen WebView2 runtime use **hard-linked binaries** when versions match, so they may share mapped image pages.
- `sysinfo::memory()` is the double-counting working set and its `virtual_memory()` is actually private commit; use direct `windows` crate calls.

RW D5 (the only peer-reviewed Tauri-vs-Electron resource study found) could not be checked for whether it counted WebView2 child processes, which is exactly this risk.

Sources: [measurement-methodology](../raw/research/measurement-methodology.md), [related-work-seed](../raw/research/related-work-seed.md), [tauri-webview2-capabilities](../raw/research/tauri-webview2-capabilities.md), [master prompt](../raw/00-master-prompt.md). Abbreviations: TW = tauri-webview2-capabilities, MM = measurement-methodology, RW = related-work-seed, NX = nextjs-stack, LW = llm-wiki-pattern.

## Early-warning signs (trigger)

Process lists from the job and from the browser disagree; an msedge.exe or msedgewebview2.exe not started by the harness appears in a trial; A/A tests on the same product show attribution-driven differences; per-tab totals exceed the tree total.

## Mitigation

Headline memory metric is summed PrivateUsage over a job-scoped process set; launch every target suspended in a harness-owned Job Object with a fresh profile; cross-check membership with GetProcessExtendedInfos and an ETW process trace; fail the trial on any foreign PID; include Ferrum's host process; treat crashpad symmetrically; never sum working sets as a headline; never sum per-tab numbers; use the windows crate, not sysinfo, for counters.

## De-risking spike (proposed)

Phase: `phase-p5-telemetry` (attribution core), validated again in `phase-p6-benchmark-harness`.
1. Attribution fixture: a small test binary that spawns a known tree of children (including one that exits early) and commits a known amount of private memory per child. Pass = harness reports exactly that PID set and a private-commit sum within a tolerance fixed in the test.
2. Launch Ferrum suspended in a job; compare the job's PID set with `GetProcessExtendedInfos` plus crashpad.
3. Launch Chrome and Edge with fresh `--user-data-dir` in a job; check whether any child breaks away from the job.
4. Confirm `PROCESS_MEMORY_COUNTERS_EX2` is callable on this machine and compare `PeakJobMemoryUsed` with the sampled sum of `PrivateUsage`.

Assigned by the integration pass (2026-10-08): task `p5.2`, phase-p5-telemetry process-set attribution; an early Job Object check runs in P1 spike S1 (p1.5).

## Fallback if realised

Report only tree-level metrics with the attribution method stated, drop per-tab and per-profile memory claims, and list the gap as a threat to validity.

## Spike result (P1, p1.5, 2026-10-11)

Spike S1's launcher started the app suspended in a Job Object without kill-on-close
([job-4.job.json](../raw/evidence/phase-p1-foundation/spike-s1/job-4.job.json), repeated in job-5 and job-6): every process
WebView2 lists through `GetProcessInfos` was in the job, plus the app itself and a `crashpad-handler` that WebView2 does not
list; three seconds after the app exited by itself the job was empty. So job-scoped attribution works for Ferrum's model; the
crashpad handler must be counted and reported separately (adr-0031). Chrome and Edge job behaviour stays a P6 question.

## Unverified claims

- Chrome and Edge child processes stay inside a harness-created Job Object (no breakaway). UNVERIFIED[phase-p6-benchmark-harness]
- PROCESS_MEMORY_COUNTERS_EX2 is available on this machine: verified in p5.3 (Windows fills `PrivateWorkingSetSize`; [check-p5.3](../raw/evidence/phase-p5-telemetry/check-p5.3.txt)).
- PeakJobMemoryUsed is commit-based and matches the sampled sum of PrivateUsage. UNVERIFIED[phase-p6-benchmark-harness]
- msedgewebview2.exe processes are children of the Ferrum host process: verified in p5.12 for the browser processes (each one's parent is Ferrum, in both the per-site and per-site-udf modes); every renderer, GPU and utility process is a child of its browser process ([note](../raw/evidence/phase-p5-telemetry/devtools-targets-p5.12-note.md)). Crash reporters were not checked.

## Affects

`phase-p5-telemetry`, `phase-p6-benchmark-harness`, `comp-telemetry`, `comp-benchmark-harness`, `comp-webview2-runtime`, `exp-baseline-footprint`, `exp-isolation-overhead`, `exp-lifecycle-policies`, `adr-0010`, `risk-r01`, `risk-r14`, `qual-testing-strategy`
