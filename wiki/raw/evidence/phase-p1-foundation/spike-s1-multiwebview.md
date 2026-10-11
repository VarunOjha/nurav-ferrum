# Spike S1 report: many web views in one window (p1.5, risk-r02, risk-r05)

> Raw evidence. Session s02, 2026-10-11. Spike code: `spikes/s1-multiwebview` (tauri =2.12.3 with `unstable`,
> @tauri-apps/cli 2.12.2, vite 8.3.4, typescript 7.0.2; WebView2 runtime 154.0.4258.62). Automatic results:
> `spike-s1/auto-1.json`, `spike-s1/sync-1.json`, `spike-s1/job-4|5|6.json` and `.job.json`. Hand checks: the owner, in
> `raw/owner/2026-10-11-s02-s1-hand-checks.md`. Every automatic mode ended by itself; nothing was killed.

## Setup

One Tauri window (created in `setup`), a shell web view (64 px strip, Tauri child) and three tab web views (Tauri children,
`tab.html?n=1..3`, solid colours) created with `Window::add_child`. Tabs are switched with `hide()`/`show()`; on
`WindowEvent::Resized` the app lays the shell and tabs out again.

## Results

| # | Check | How | Result | Verdict |
|---|---|---|---|---|
| 1 | Creation without deadlock (async command) | shell calls the async command `create_tabs` | 3 child views in 542 ms; all pages loaded (`auto-1.json`, `async-create`) | PASS |
| 2 | Creation from a synchronous command (documented deadlock) | mode `sync`, command `create_tabs_sync`, 25 s self-exit watchdog | did not return; watchdog ended the app (`sync-1.json`): deadlock reproduced, so tabs are created only from async code | PASS (deadlock documented and avoided) |
| 3 | Tab switching by hide/show | show 2, 3, 1 in turn; each page reports `visibilityState` | shown tab `visible`, others `hidden`, every time (`tab-switch`) | PASS |
| 4 | Blank or white rendering (issues 10011, 11376) | `PrintWindow` pixel in the shell strip and in the tab area, for each tab | shell #21303f vs #203040, tabs #be3d31 / #32ad67 / #2f7fb5 vs expected colours: all within tolerance (`render-no-blank`) | PASS |
| 5 | Resize keeps children laid out | window set to 1000x700 then 1300x850; tab bounds and the page's own size | bounds and page size follow the window minus the 64 px strip, both sizes (`resize-relayout`); owner: resize, maximise, minimise work | PASS |
| 6 | Z-order / overlap (issue 15682) | shell enlarged over the tab area, pixel sampled there | the tab colour shows: the child view is drawn on top of the shell (`zorder-overlap`). Ferrum's layout keeps shell and tabs apart, so the shell never needs to overlap tab bounds | PASS (design rule: no overlap) |
| 7 | Alt+Tab keyboard focus (issue 13466) | owner: type in a tab, Alt+Tab away and back without clicking, type again | typing did not reach the tab after returning; it works after clicking the window. Known issue, to fix later (owner's decision) | FAIL (known issue) |
| 8 | Text-editing shortcuts (issue 9257) | owner: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+Z in a tab's text box | all work | PASS |
| 9 | Process list from WebView2 | `GetProcessInfos` and `GetProcessExtendedInfos` through `with_webview` | 8 processes: browser, GPU, 2 utility, one renderer per tab and one for the shell (frames listed per renderer) | PASS |
| 10 | Job Object attribution (risk-r05) | `job_launch`: app started suspended in a new Job Object (no kill-on-close), job listed once the app wrote its process list; 3 runs | all 8 WebView2-listed processes are in the job, plus the app and a `crashpad-handler` that WebView2 does not list; job empty 3 s after the app exited by itself (`job-4/5/6`). One earlier run reused a stale output file and is discarded | PASS |

## Conclusions

- Tauri 2.12.3's multi-webview API is usable for a shell plus several tab views on this machine, with two rules: create views
  only from async code, and never let the shell overlap tab bounds.
- Known issue: keyboard focus after Alt+Tab (issue 13466). Expected fix later: when the window becomes active again, Ferrum
  moves keyboard focus into the visible tab itself (for example `ICoreWebView2Controller::MoveFocus`); not tried in P1.
- Process attribution with a Job Object works for Ferrum's model; the crashpad handler is counted separately.
- Design consequence (owner-approved, adr-0029): tab views will be WebView2 controllers Ferrum creates itself; this spike's
  findings on layout, async creation and overlap still apply to the shell and the window.
