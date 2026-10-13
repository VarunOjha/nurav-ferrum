# RAW SOURCE — Owner asks about the Task Manager name, the engine choice and the research claims (session s02, 2026-10-13)

> Immutable raw source. Transcribed by Claude on 2026-10-13. The owner's chat messages verbatim, in order (typing kept
> as typed). Context: P3 is in gate-review (the gate run of 2026-10-12 19:54 passed every Claude item, evidence
> [p3-gate.20261012-2022.txt](../evidence/phase-p3-tabs-sessions/p3-gate.20261012-2022.txt)); the owner is about to
> work through the P3 checklist. These messages are questions; they contain **no decision and no approval**.

## 1. Owner messages (verbatim)

1. "Start the browser"
2. "Why does it show as webview manager in the windows task manager, as opposed to ferrum"
3. "I am sure you can start the process in such a way, it bears the ferrum namespace"
4. "We are using the webview2 here and not chromium, which might be the other option"
5. "Okay, so you are saying that Webview2 is likely to offer the memory dividends that we are looking after in this project more than chrome"
6. "WebView2 uses chromium as well under neath you saying it just offers more granularity of control"
7. "So what granularity are we hoping benchmark shows Ferrum is better again, tabulate ?"
8. "And do we have reasons to believe that these bars will be met with Rust ?"
9. "Start the interactive plan"
10. "Okay, let's update the interactive plan data with the latest set of changes that have transpired"

## 2. What Claude did and answered (summary, not owner words)

- (1) Started the release build `target/release/ferrum-desktop.exe` built by the gate run of 2026-10-12.
- (2, 3) Ferrum's own process carries the name "Ferrum" (file description and product name, read from the exe on
  2026-10-13). The "WebView2 Manager" group is Microsoft's WebView2 runtime; Ferrum starts its main WebView2 process
  directly. Claude first said the WebView2 entries should sit inside the Ferrum group; after a search it corrected
  this: a known, unresolved Windows 11 / WebView2 issue shows them as a separate group, and no supported setting was
  found ([research note](../research/webview2-task-manager-grouping.md)). Renaming Microsoft's signed runtime is not an
  option (it would weaken WebView2 security, CLAUDE.md §6). Claude proposed a known-limitation line and an open
  question (Q-223); the owner did not decide either.
- (4) Bundling Chromium (CEF) could carry Ferrum's name on every process, but Ferrum would have to ship every Chromium
  security fix itself, grow much larger, lose Tauri's WebView2 integration and the WebView2 lifecycle controls the
  research studies, and rebuild most of P1 to P3. Claude recommended staying with WebView2.
- (5, 6) Claude corrected the reading: no memory result exists until P5/P6. WebView2 runs on the same Chromium-based
  engine; what it adds is control from Ferrum's own code (per-tab suspend and low-memory mode, measurement per tab).
- (7) Claude tabulated hyp-01 to hyp-09 (all `draft`, thresholds proposed, Q-201 open).
- (8) Rust mainly helps a small, quick host process (hyp-02, hyp-04) and makes the lifecycle rules practical; it does
  not make pages lighter, which run in Chromium either way. Whether any bar is met is unknown until measured.
- (9) Started the plan portal (`scripts/start-portal.ps1`, http://127.0.0.1:3417/).
