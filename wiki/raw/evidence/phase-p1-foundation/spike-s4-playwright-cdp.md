# Spike S4 report: Playwright over CDP against Ferrum's model, Chrome and Edge (p1.8, risk-r06)

> Raw evidence. Session s02, 2026-10-11 (run 18:06-18:07 UTC). Script: `spikes/s4-playwright-cdp/run.ts`
> (Node v24.20.0 type stripping, playwright 1.64.0, @puppeteer/browsers 3.2.4). Full output:
> `spike-s4/results.json`; Ferrum target list: `spike-s4/targets.json` (same as `spikes/s4-playwright-cdp/targets.json`).
> Claude Code's shell was **not elevated** (IsInRole(Administrator) = False), so the WebView2 environment-variable flag
> applies (research note §7). Nothing was killed: spike S1 exited by its own timer (`FERRUM_SPIKE_EXIT_AFTER=75`),
> Chrome for Testing and Edge were closed with the CDP command `Browser.close` (their own shutdown; both exit code 0).
> No performance numbers are reported here: paint entries were only checked to exist.

## Setup

| Product | How it was started | CDP endpoint | Version string from `/json/version` |
|---|---|---|---|
| Spike S1 (Tauri 2.12.3, shell + 3 child web views) | `ferrum-spike-s1.exe`, `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222`, manual mode | 127.0.0.1:9222 | Edg/154.0.4258.62 (the WebView2 runtime) |
| Chrome for Testing (`npx browsers install chrome@stable`, ignored `.browsers/` folder) | `--remote-debugging-port=9223 --user-data-dir=<fresh folder> --no-first-run --no-default-browser-check` | 127.0.0.1:9223 | Chrome/155.0.8059.39 |
| Microsoft Edge (installed) | same flags, port 9224, fresh user-data-dir | 127.0.0.1:9224 | Edg/155.0.4283.45 |

All three were driven by the **same** code path: `chromium.connectOverCDP('http://127.0.0.1:<port>')`, then a local
loopback fixture page (`http://127.0.0.1:<random port>/fixture.html` with an image and a fetch).

## Results

| Check | Spike S1 (WebView2) | Chrome for Testing | Edge | Verdict |
|---|---|---|---|---|
| `connectOverCDP` attaches | yes | yes | yes | PASS |
| Every CDP target listed (`/json/list`) and attributable | 4 `page` targets: shell (`http://tauri.localhost/`), tab-1..3 (`tab.html?n=k`) — each child web view is its own target, shell and tabs identifiable by URL | 1 page + browser-UI and extension targets | 1 page + extension background targets | PASS |
| Playwright sees the pages | 4 pages in `contexts()[0]` (all web views share one context) | 1 | 1 | PASS |
| Navigate one child/page to the local fixture | yes (tab 1, the visible one) | yes | yes | PASS |
| Paint timing (`performance.getEntriesByType('paint')`) | first-paint and first-contentful-paint present | present | present | PASS |
| `evaluate`, `click`, keyboard `type`, `screenshot` | all work | all work | all work | PASS |
| Network events (`page.on('response')`) | fixture, image, fetch seen | same | same | PASS |
| Request interception (`page.route` + `fulfill`) | works | works | works | PASS |
| Raw CDP session (`Performance.getMetrics`) | 36 metrics | 36 | 36 | PASS |
| History back (`goBack`) | works (back to `tab.html?n=1`) | works | works | PASS |
| `newPage()` in the default context | opened `about:blank` and closed it | works | works | PASS (see note) |
| `newContext()` | created and closed | works | works | PASS |
| Same harness code for all three | yes, no product-specific branch except the start command and which page to pick | | | PASS |

`npm run check` (the script) exited 0 on the final run.

## What did not work, or only partly

- **Hidden tabs (spike S1).** On a tab hidden with Tauri `hide()` the robot can navigate and run script, but
  **no paint entries are recorded** and **`page.screenshot` times out** (15 s in the first run, 5 s in the dedicated
  check). Curiously the page reports `document.visibilityState = "visible"` after navigating while hidden (in spike S1
  the same tabs reported `hidden` after hide/show switching without navigation). Consequence for the benchmarks:
  the harness must measure paint and take screenshots only on the **shown** tab; P5/P7 must not trust
  `visibilityState` alone to know whether a tab is hidden.
- **First run.** The first version of the script drove tab 2 (hidden), so paint was empty and the screenshot timed
  out; that run is superseded by the run above (same machine, minutes later). Recorded here for honesty.
- **`newPage()` on WebView2** "worked", but where the new target lives in the app was not inspected; Ferrum's
  harness should not rely on creating pages over CDP (Ferrum creates tabs itself).
- `connectOverCDP` is documented as lower fidelity than Playwright's own protocol (research note §7). Nothing in this
  feature list failed because of that.

## Consequences (for p1.9 and P5/P6)

- risk-r06: one Node/TypeScript Playwright harness can drive Ferrum (all child web views as CDP targets) and Chrome
  / Edge the same way. Fairness: the debug-port flag must be applied to all products alike (it was here).
- Security: the debug port exposes **all** web views, including the trusted shell, to local processes → debug and
  benchmark builds only (SECURITY.md, p1.13).
