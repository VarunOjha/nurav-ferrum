---
id: risk-r19
type: risk
title: "Security regressions that expose native commands or weaken isolation for remote content"
status: open
updated: 2026-10-18
sources:
  - raw/research/tauri-webview2-capabilities.md
  - raw/00-master-prompt.md
  - raw/01-scoping-decisions.md
related: [phase-p4-security, phase-p2-minimal-container, phase-p3-tabs-sessions, comp-security-engine, comp-app-shell, comp-webview-manager, adr-0015, adr-0007, exp-security-overhead, risk-r07, risk-r06, qual-security-testing-plan, qual-ci-plan]
approvable: true
tags: [security, ipc, tauri, regression]
likelihood: 3
impact: 5
mitigation: "Apply the guarantee recipe (no capability with a remote section, shell capability targeted by webview label, app ACL manifest, tabs blocked from the app's local origin); run the security fixture suite in CI from P2 onward and fully from P4; add a static test that fails if any capability file contains a remote section or any weakening browser flag; re-run the suite on every Tauri or WebView2 upgrade."
spike: null
owner_phase: phase-p4-security
trigger: "Any security test fails or is skipped; a new capability file or permission appears in a diff; a Tauri release note mentions ACL, IPC or the fetch-channel command; the debug port is enabled in a non-benchmark build."
fallback: "Block the release or phase exit until fixed; if a hole cannot be closed, remove the affected feature and document the limitation in the threat model."
unverified: []
---

# risk-r19: Security regressions that expose native commands or weaken isolation for remote content

| Likelihood | Impact | Score | Status | Owner phase |
|---|---|---|---|---|
| 3 | 5 | 15 | open | `phase-p4-security` |

Score = likelihood × impact (SCHEMA §6.5). Scales are planning judgements, not measurements. Full register: [ov-risk-register](ov-risk-register.md).

## Description and evidence

The master prompt (§5, §11) forbids exposing privileged Rust functionality to untrusted content, bypassing certificate validation, weakening Chromium sandboxing or weakening WebView2 security to improve benchmarks. Verified in TW §3:

- The IPC bridge is attached to **every** webview, tabs included; protection is authorization in Rust.
- A command is allowed only if a capability matches the execution context (local or remote URL pattern) **and** the webview label or the window label. A window-label match also covers the tab webviews in that window.
- Remote origins reach no command unless a capability declares a `remote` section.
- The internal `FETCH_CHANNEL_DATA_COMMAND` is **exempt** from the check.
- The invoke key is injected into the page and is not a security boundary.
- A tab navigated to the app's local origin would count as local.

Also (TW §7): an open remote-debugging port exposes every webview, including the trusted shell, to local processes, so it is for benchmark builds only.

Sources: [tauri-webview2-capabilities](../raw/research/tauri-webview2-capabilities.md), [master prompt](../raw/00-master-prompt.md), [scoping decisions](../raw/01-scoping-decisions.md). Abbreviations: TW = tauri-webview2-capabilities, MM = measurement-methodology, RW = related-work-seed, NX = nextjs-stack, LW = llm-wiki-pattern.

## Early-warning signs (trigger)

Any security test fails or is skipped; a new capability file or permission appears in a diff; a Tauri release note mentions ACL, IPC or the fetch-channel command; the debug port is enabled in a non-benchmark build.

## Mitigation

Apply the guarantee recipe (no capability with a remote section, shell capability targeted by webview label, app ACL manifest, tabs blocked from the app's local origin); run the security fixture suite in CI from P2 onward and fully from P4; add a static test that fails if any capability file contains a remote section or any weakening browser flag; re-run the suite on every Tauri or WebView2 upgrade.

## De-risking spike (proposed)

Phase: `phase-p2-minimal-container` (minimal) and `phase-p4-security` (full). Minimal: a remote fixture page attempts `invoke` on an app command and a core plugin command, and the test asserts both are rejected. Full: the suite in qual-security-testing-plan.

The `spike` frontmatter field stays `null` until the owning phase page assigns a task id (`pN.M`); the integrator or phase owner then sets it here.

## Fallback if realised

Block the release or phase exit until fixed; if a hole cannot be closed, remove the affected feature and document the limitation in the threat model.

## Unverified claims

- Whether the WebMessageReceived Source origin can be spoofed by page script was not tested and no longer matters (removed in P4): websites load only in tab views, which have no bridge, so they cannot send Ferrum a message at all ([check-p4.8](../raw/evidence/phase-p4-security/check-p4.8.20261013-2009.txt)).
- FETCH_CHANNEL_DATA_COMMAND leaks no data to a remote page: verified in P4. Called from a website it is reached but returns nothing, because Ferrum creates no channels ([check-p4.8](../raw/evidence/phase-p4-security/check-p4.8.20261013-2009.txt), [self-test record](../raw/evidence/phase-p4-security/p4.8-ipc-selftest.20261013-2009.json)).
- A remote page cannot navigate a tab top-level to the app's local origin (http://tauri.localhost): verified in P4. Links, a pop-up and a typed address to Ferrum's own pages are refused and logged ([check-p4.8](../raw/evidence/phase-p4-security/check-p4.8.20261013-2009.txt)).

## Affects

`phase-p4-security`, `phase-p2-minimal-container`, `phase-p3-tabs-sessions`, `comp-security-engine`, `comp-app-shell`, `comp-webview-manager`, `adr-0015`, `adr-0007`, `exp-security-overhead`, `risk-r07`, `risk-r06`, `qual-security-testing-plan`, `qual-ci-plan`
