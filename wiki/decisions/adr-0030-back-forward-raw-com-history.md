---
id: adr-0030
type: decision
title: "Back and forward use the tab controller's own history calls (CanGoBack, GoBack, HistoryChanged)"
status: proposed
updated: 2026-10-11
sources:
  - raw/evidence/phase-p1-foundation/spike-s3/s3-2.json
  - raw/evidence/phase-p1-foundation/spike-s3-raw-com.md
  - raw/evidence/phase-p1-foundation/spike-s4-playwright-cdp.md
  - raw/research/tauri-webview2-capabilities.md
related: [adr-0029, adr-0019, adr-0007, phase-p1-foundation, phase-p2-minimal-container, phase-p3-tabs-sessions, comp-webview-manager, comp-app-shell]
approvable: true
date: 2026-10-11
decided_by: claude-proposed
supersedes: []
options:
  - "Raw COM ICoreWebView2 CanGoBack/GoBack/CanGoForward/GoForward plus the HistoryChanged event"
  - "Script in the page: eval(\"history.back()\") / eval(\"history.forward()\")"
phase: phase-p1-foundation
tags: [navigation, webview2, history]
---

# ADR-0030: Back and forward use the tab controller's own history calls

## Context

Tauri 2.12.x has no back/forward API on `Webview` (research note §2). The phase plan asked P1 to choose between page
script (`history.back()`) and the raw WebView2 calls. Spike S3 was extended on 2026-10-11 with a history step
([s3-2.json](../raw/evidence/phase-p1-foundation/spike-s3/s3-2.json), key `history`): the tab visited two local pages, then

- raw COM: `CanGoBack` TRUE (S_OK), `GoBack` S_OK and the first page loaded; `CanGoForward` TRUE, `GoForward` S_OK and the
  second page loaded; the `HistoryChanged` event fired (5 events over the step); handler removed (S_OK);
- script: `history.back()` through Tauri `eval` also returned to the first page.

Spike S4 also drove `goBack` over CDP for the test robot ([spike S4 report](../raw/evidence/phase-p1-foundation/spike-s4-playwright-cdp.md)).

## Options considered

| Option | For | Against |
|---|---|---|
| **Raw COM history calls + `HistoryChanged`** | asks the browser, not the page; `CanGoBack`/`CanGoForward` and the event let the shell enable or grey out its buttons correctly; works on the controllers Ferrum creates anyway (adr-0029); no script injected into untrusted pages | unsafe COM (inside the adr-0019 module, invariants from S3) |
| Page script `history.back()` | no unsafe code | the page can intercept or block it; no "can go back" answer and no change event, so button state must be guessed; injects script into untrusted content |

## Decision

**Proposed:** tabs use `ICoreWebView2::CanGoBack`, `GoBack`, `CanGoForward`, `GoForward` and the `HistoryChanged` event,
through the raw-COM module of adr-0019. The shell's back/forward buttons follow `HistoryChanged`. Page script is not used
for navigation.

## Consequences

- Correct button state from the browser itself; no script in untrusted pages for navigation.
- One more event handler per tab, registered and removed with its token (S3 invariant 4).
- A navigation wakes a suspended tab (WebView2 reference, see [literature batch 1](../raw/research/literature-batch-1.md) L4);
  the lifecycle state machine must treat back/forward as a navigation (P7).
- Cross-site navigation in per-site-profile mode can lose history if the tab is re-hosted (Q-209); that question stays open
  for P3.

## Verification / evidence

- [s3-2.json](../raw/evidence/phase-p1-foundation/spike-s3/s3-2.json) (`history` block): every call S_OK, pages reached as expected.
- To verify in P2: back/forward on a Ferrum-created tab with the shell buttons wired to `HistoryChanged`.
