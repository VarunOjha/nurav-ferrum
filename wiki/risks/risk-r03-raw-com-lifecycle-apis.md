---
id: risk-r03
type: risk
title: "TrySuspend and MemoryUsageTargetLevel are only reachable through raw COM (unsafe) via with_webview"
status: mitigating
updated: 2026-10-11
sources:
  - raw/evidence/phase-p1-foundation/spike-s3-raw-com.md
  - raw/research/tauri-webview2-capabilities.md
  - raw/research/related-work-seed.md
  - raw/00-master-prompt.md
related: [phase-p1-foundation, phase-p7-lifecycle, comp-resource-manager, comp-webview-manager, comp-webview2-runtime, exp-lifecycle-policies, risk-r18, risk-r23, risk-r20, adr-0030]
approvable: true
tags: [webview2, com, unsafe, lifecycle]
likelihood: 5
impact: 3
mitigation: "Wrap the COM calls in one small unsafe module with documented invariants and a safe API; pin webview2-com 0.39 and windows 0.62 to match tauri; treat isSuccessful=false as a normal outcome; model sleep (TrySuspend) and discard (destroy webview) as separate states and never set MemoryUsageTargetLevel while suspended."
spike: p1.7
owner_phase: phase-p7-lifecycle
trigger: "Type-mismatch compile errors between Ferrum's COM types and the ones with_webview hands out; TrySuspend always reports failure; a crash or hang inside a COM completion handler."
fallback: "Discard-only lifecycle (destroy and recreate the webview) for policies 2 to 4, dropping the sleep arm; report the gap in the paper."
unverified:
  - claim: "WebView2 fires Page Lifecycle freeze/resume events to the page on TrySuspend/Resume"
    verify_in: phase-p7-lifecycle
  - claim: "Suspending a hidden webview measurably reduces CPU or memory on this machine"
    verify_in: phase-p7-lifecycle
---

# risk-r03: TrySuspend and MemoryUsageTargetLevel are only reachable through raw COM (unsafe) via with_webview

| Likelihood | Impact | Score | Status | Owner phase |
|---|---|---|---|---|
| 5 | 3 | 15 | open | `phase-p7-lifecycle` |

Score = likelihood × impact (SCHEMA §6.5). Scales are planning judgements, not measurements. Full register: [ov-risk-register](ov-risk-register.md).

## Description and evidence

Neither Tauri 2.12.1 nor wry 0.57.0 exposes `TrySuspend`/`Resume` (`ICoreWebView2_3`). `MemoryUsageTargetLevel` (`ICoreWebView2_19`) is in wry (`set_memory_usage_level`) but not in Tauri's `Webview` API. Both are reachable from Tauri only through `Webview::with_webview`, which runs on the main thread and hands out the `ICoreWebView2Controller`; every `webview2-com` call is `unsafe` (TW §5, §6).

Verified constraints (TW §6, Microsoft reference):
- `TrySuspend` needs `IsVisible == false`, otherwise it fails with `ERROR_INVALID_STATE`. Tauri's `Webview::hide()` sets `IsVisible(false)`.
- Both operations are **best effort**; `TrySuspend` may complete with `isSuccessful=false`.
- Do **not** mix `TrySuspend`/`Resume` with `MemoryUsageTargetLevel`: suspend sets Low, resume sets Normal, and setting the level while suspended is ignored.
- Ferrum's own `webview2-com`/`windows` dependencies must use the same majors as tauri (0.39 / 0.62), or the COM types will not unify.

RW (C1, B2) adds that sleep (resume without reload) and discard (full reload) are distinct, and the state machine and benchmarks should treat them separately. The master prompt (§5 Phase 4) requires the lifecycle states ACTIVE, BACKGROUND, IDLE, DISCARD_CANDIDATE, DISCARDED, RESTORING.

Sources: [tauri-webview2-capabilities](../raw/research/tauri-webview2-capabilities.md), [related-work-seed](../raw/research/related-work-seed.md), [master prompt](../raw/00-master-prompt.md). Abbreviations: TW = tauri-webview2-capabilities, MM = measurement-methodology, RW = related-work-seed, NX = nextjs-stack, LW = llm-wiki-pattern.

## Early-warning signs (trigger)

Type-mismatch compile errors between Ferrum's COM types and the ones with_webview hands out; TrySuspend always reports failure; a crash or hang inside a COM completion handler.

## Mitigation

Wrap the COM calls in one small unsafe module with documented invariants and a safe API; pin webview2-com 0.39 and windows 0.62 to match tauri; treat isSuccessful=false as a normal outcome; model sleep (TrySuspend) and discard (destroy webview) as separate states and never set MemoryUsageTargetLevel while suspended.

## De-risking spike (proposed)

Phase: `phase-p1-foundation` (feasibility only; the full work is P7).
1. Hide a child webview, call `TrySuspend` via `with_webview` and `cast::<ICoreWebView2_3>()`, log the completion result; show it again and confirm it resumes.
2. On another hidden webview, `cast::<ICoreWebView2_19>()` and set `MemoryUsageTargetLevel` Low then Normal.
3. Compile with `webview2-com = "0.39"` and `windows = "0.62"` as direct dependencies to confirm type unification.
4. No resource numbers are recorded in this spike; effects are measured only in P7 experiments.

Assigned by the integration pass (2026-10-08): task `p1.7`, phase-p1-foundation spike S3 (raw COM).

## Fallback if realised

Discard-only lifecycle (destroy and recreate the webview) for policies 2 to 4, dropping the sleep arm; report the gap in the paper.

## Spike result (P1, p1.7, 2026-10-11)

Spike S3 ([report](../raw/evidence/phase-p1-foundation/spike-s3-raw-com.md)) reached every planned call through
`with_webview` on tauri 2.12.3: TrySuspend (only while hidden; result true), IsSuspended, Resume, MemoryUsageTargetLevel
Low/Normal, ProcessFailed (renderer ended on purpose, then recovered), WebResourceResponseReceived, GetProcessInfos, and (added
for p1.9, [s3-2.json](../raw/evidence/phase-p1-foundation/spike-s3/s3-2.json)) CanGoBack/GoBack/GoForward with HistoryChanged.
`cargo tree` shows one webview2-com (0.39.1) and one windows (0.62.2), and the COM types from `with_webview` were used directly,
so the version-unification question is settled. Draft unsafe invariants are in the report. The remaining risk is correctness of
the unsafe code (risk-r18) and best-effort suspend.

## Unverified claims

- WebView2 fires Page Lifecycle freeze/resume events to the page on TrySuspend/Resume. UNVERIFIED[phase-p7-lifecycle]
- Suspending a hidden webview measurably reduces CPU or memory on this machine. UNVERIFIED[phase-p7-lifecycle]

## Affects

`phase-p1-foundation`, `phase-p7-lifecycle`, `comp-resource-manager`, `comp-webview-manager`, `comp-webview2-runtime`, `exp-lifecycle-policies`, `risk-r18`, `risk-r23`, `risk-r20`
