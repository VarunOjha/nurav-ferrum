# RAW EVIDENCE NOTE — DevTools targets, renderers per tab and process parents (p5.12, session s08, 2026-10-19)

> Immutable raw source. Written by Claude on 2026-10-19 from the saved run below; it is Claude's reading of that run,
> not a new measurement. Data: [devtools-targets-p5.12.json](devtools-targets-p5.12.json); run:
> [check-p5.12.txt](check-p5.12.txt) (scripts/verify/p5.12-tabs-to-processes.ps1, smoke spec
> apps/desktop/tests/smoke/devtools-targets.spec.ts). A development run of the same spec just before (not saved) gave
> the same picture.

## Setup

Debug build of Ferrum, WebView2 runtime of this PC, the benchmark debugging port set through
`WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9339` (as every smoke test does). Four tabs: two pages of
site-a (`/landing?t=a1`, `?t=a2`), one of site-b (`?t=b1`), and a localhost page holding an iframe of site-b
(`?t=frame`). Run once with `[isolation] mode = "per-site"` (one WebView2 environment, a profile per site) and once
with `"per-site-udf"` (an environment with its own browser process per site). Sources per finding: the port's
`/json/list`; Ferrum's `test_processes` hook (WebView2 `GetProcessExtendedInfos` with the frames each renderer hosts);
`Win32_Process.ParentProcessId`.

## Findings

1. **Targets on the port, per-site mode.** Every tab is a `page` target with its address; the other-site iframe is a
   separate `iframe` target; the shell (`http://tauri.localhost/`) is listed as a `page`; one more `page` target with
   `about:blank` is listed, whose owner this run did not identify. 6 pages and 1 frame in total.
2. **Targets on the port, per-site-udf mode.** Only the shell's environment is listed (`http://tauri.localhost/` and
   `about:blank`): none of the four tabs, which live in the site environments. Reading: the port belongs to the first
   browser process (the shell's); the site environments' browser processes are not reachable on it. Not tested: whether
   they open a port elsewhere, or log a failure to bind.
3. **Renderer per tab.** In both modes each of the four tabs had exactly one renderer of its own, and no renderer
   hosted two tabs, also for the two site-a tabs in the same profile. The other-site iframe ran in a renderer of its
   own, separate from its page's renderer (per-site: 58448 against the page's; per-site-udf: in the localhost
   environment). Renderers in total: 7 in each mode (four tabs, the frame, and two more that the run did not match to a
   page; the shell's own page is drawn by one of the renderers, but the saved data does not say which). Only four tabs were open: whether WebView2 starts sharing renderers with many tabs (as
   Chromium does under its process limit) was not tested.
4. **Process parents.** Each browser process (one in per-site, four in per-site-udf) has Ferrum's process as its
   parent; every renderer, GPU and utility process has its environment's browser process as its parent. No process of
   the set had another parent. Crash reporters are not in WebView2's lists (p5.2) and were not checked here.

## What it means for later phases (Claude's reading)

- P6 harness: in the per-site mode (the shared mode was not run; it uses the same single environment), `connectOverCDP` sees every tab (and the shell) as a page target, so
  multi-tab workloads can be driven over CDP. In per-site-udf it sees no tab: workloads in that mode need another way in
  (a debug-only Ferrum command, or the mode left out of CDP-driven workloads).
- P6/P7 per-tab numbers: a tab's own renderer, plus the renderers of its other-site frames, is identifiable from the
  frame addresses WebView2 reports; browser, GPU and utility processes serve all tabs and cannot be split per tab.
- The process tree under Ferrum covers its WebView2 processes (finding 4), which supports the harness's tree-based
  attribution for Ferrum (risk-r05).
