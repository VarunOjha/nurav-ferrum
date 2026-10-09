---
id: risk-r09
type: risk
title: "All WebViews sharing a user data folder must use identical environment options"
status: open
updated: 2026-10-08
sources:
  - raw/research/tauri-webview2-capabilities.md
related: [phase-p3-tabs-sessions, phase-p6-benchmark-harness, comp-webview-manager, comp-app-shell, adr-0010, adr-0007, risk-r01, risk-r06]
approvable: true
tags: [webview2, configuration, udf]
likelihood: 3
impact: 3
mitigation: "Build one EnvironmentConfig per user data folder once at startup in comp-webview-manager and reuse it for the shell and every tab; apply benchmark-only flags (debug port) to the whole app at launch; never call the profile-wide clear-browsing-data API while the shell shares the tabs' profile; test that a mismatched configuration is rejected before reaching WebView2."
spike: null
owner_phase: phase-p3-tabs-sessions
trigger: "Webview creation fails with ERROR_INVALID_STATE; a tab needs a proxy, extension or language setting that differs from the shell; clearing a site's data logs the shell out or resets shell settings."
fallback: "Give the shell its own user data folder (a second browser process) and document the extra cost, recorded in an ADR."
---

# risk-r09: All WebViews sharing a user data folder must use identical environment options

| Likelihood | Impact | Score | Status | Owner phase |
|---|---|---|---|---|
| 3 | 3 | 9 | open | `phase-p3-tabs-sessions` |

Score = likelihood × impact (SCHEMA §6.5). Scales are planning judgements, not measurements. Full register: [ov-risk-register](ov-risk-register.md).

## Description and evidence

Verified (TW §6):

- All WebViews that share one user data folder must use **identical environment options**, or creation fails with `HRESULT_FROM_WIN32(ERROR_INVALID_STATE)`.
- In Tauri, `additional_browser_args`, `browser_extensions_enabled`, proxy, scroll bar style and language all live in the environment, so they must match for the shell and every tab sharing the folder.
- wry's doc: webview instances with different browser arguments must also have different data directories.
- `clear_all_browsing_data` is **profile-wide**, so while the shell and tabs share the default profile, clearing a tab's data also clears the shell's.

This interacts with risk-r01 (profiles) and risk-r06 (a benchmark-only debug port applies to everything).

Sources: [tauri-webview2-capabilities](../raw/research/tauri-webview2-capabilities.md). Abbreviations: TW = tauri-webview2-capabilities, MM = measurement-methodology, RW = related-work-seed, NX = nextjs-stack, LW = llm-wiki-pattern.

## Early-warning signs (trigger)

Webview creation fails with ERROR_INVALID_STATE; a tab needs a proxy, extension or language setting that differs from the shell; clearing a site's data logs the shell out or resets shell settings.

## Mitigation

Build one EnvironmentConfig per user data folder once at startup in comp-webview-manager and reuse it for the shell and every tab; apply benchmark-only flags (debug port) to the whole app at launch; never call the profile-wide clear-browsing-data API while the shell shares the tabs' profile; test that a mismatched configuration is rejected before reaching WebView2.

## De-risking spike (proposed)

No separate spike: covered by the risk-r01 and risk-r02 spikes in `phase-p1-foundation`, which create several webviews on one folder. Add one negative case there: create a tab with a different `additional_browser_args` and record the error.

The `spike` frontmatter field stays `null` until the owning phase page assigns a task id (`pN.M`); the integrator or phase owner then sets it here.

## Fallback if realised

Give the shell its own user data folder (a second browser process) and document the extra cost, recorded in an ADR.

## Unverified claims

None beyond the sources cited above.

## Affects

`phase-p3-tabs-sessions`, `phase-p6-benchmark-harness`, `comp-webview-manager`, `comp-app-shell`, `adr-0010`, `adr-0007`, `risk-r01`, `risk-r06`
