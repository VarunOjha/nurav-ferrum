# Spike S3 report: raw WebView2 COM through `with_webview` (p1.7, risk-r03)

> Raw evidence. Session s02, 2026-10-11. Spike code: `spikes/s3-raw-com` (tauri =2.12.3 with `unstable`,
> webview2-com 0.39.1, windows 0.62.2). One window, a shell strip and one child "tab" web view (the
> adr-0007 hosting model). The run is automatic, logs every HRESULT to `spike-s3/s3-1.json` and ends by itself.
> Nothing was killed from outside; the renderer crash below is the tab's own renderer, ended through the
> browser's `edge://kill` page inside this app (the planned ProcessFailed trigger).

## Question

Can Ferrum reach TrySuspend/Resume, MemoryUsageTargetLevel, ProcessFailed, WebResourceResponseReceived and
GetProcessInfos through `Webview::with_webview` (risk-r03)?

## Result: yes, every call succeeded

| # | Call (interface) | How it was reached | HRESULT | Outcome | Verdict |
|---|---|---|---|---|---|
| 1 | `ICoreWebView2Controller::CoreWebView2` + `cast::<ICoreWebView2_2/_3/_19>()` | `PlatformWebview::controller()` inside `with_webview` (UI thread) | S_OK | all three casts succeed on runtime 154.0.4258.62 | PASS |
| 2 | `add_ProcessFailed` (ICoreWebView2) | event handler, token kept | S_OK | registered | PASS |
| 3 | `add_WebResourceResponseReceived` (ICoreWebView2_2) | event handler, token kept | S_OK | registered | PASS |
| 4 | WebResourceResponseReceived events | reload of the local page, then navigate to `https://example.com/` | — | local: tab.html 200, tab.css 200, dot.svg 200, favicon.ico 200 (Tauri's custom protocol responses are reported too); https: `https://example.com/` 200 and one sub-resource 200 | PASS |
| 5 | `MemoryUsageTargetLevel` get / set Low / get / set Normal / get (ICoreWebView2_19) | while visible and not suspended | S_OK ×5 | value 0 (Normal) → 1 (Low) → 0 (Normal) | PASS |
| 6 | `ICoreWebView2Controller::IsVisible` after Tauri `Webview::hide()` | — | S_OK | FALSE (Tauri hide sets the controller invisible, as the research note said) | PASS |
| 7 | `TrySuspend` (ICoreWebView2_3), only while hidden | completion handler | S_OK (call and completion) | result TRUE; `IsSuspended` then TRUE | PASS |
| 8 | `Resume` (ICoreWebView2_3) | explicit | S_OK | `IsSuspended` FALSE afterwards | PASS |
| 9 | Second `TrySuspend`, then Tauri `Webview::show()` without `Resume` | — | S_OK | after show: `IsSuspended` FALSE, `IsVisible` TRUE (showing wakes it) | PASS |
| 10 | `GetProcessInfos` (ICoreWebView2Environment8) | `PlatformWebview::environment()` | S_OK | 6 processes (browser, GPU, utility, renderers for shell and tab) | PASS |
| 11 | ProcessFailed fires | tab navigated to `edge://kill` | event S_OK | kind 1 = RENDER_PROCESS_EXITED, reason 2 = TERMINATED (ICoreWebView2ProcessFailedEventArgs2), exit code 1 | PASS |
| 12 | Recovery after the renderer ended | Tauri `navigate` back to the local page | — | page loaded again (`recovered_by_navigate: true`) | PASS |
| 13 | `remove_ProcessFailed`, `remove_WebResourceResponseReceived` | tokens from 2 and 3 | S_OK ×2 | handlers removed before exit | PASS |
| 14 | One `webview2-com` and one `windows` version in the tree | `cargo tree -i webview2-com`, `cargo tree -i windows` (`spike-s3/cargo-tree.txt`) | — | webview2-com 0.39.1 only; windows 0.62.2 only (Tauri's own versions; `windows-sys` appears as 0.61.2 and another version, which does not matter for COM types) | PASS |

MemoryUsageTargetLevel and TrySuspend were never mixed: Low/Normal ran while the tab was visible and running;
suspend ran only while hidden, and the level was Normal again before it.

## Notes for the design (p1.9)

- `with_webview` hands over the live controller and environment on the UI thread; casting to newer
  interfaces works. A raw-COM module behind `with_webview` is a workable route (adr-0019).
- Tauri's `hide()` is enough to satisfy TrySuspend's "must be invisible" rule; `show()` wakes a suspended view.
- WebResourceResponseReceived also reports Tauri custom-protocol responses (`http://tauri.localhost/…`): a network
  logger must filter by scheme/host.
- A crashed renderer is reported with kind and reason; navigating again recovers the tab.
- Event handlers must be removed with their tokens (WebView2 docs: handler references can keep a web view alive).

## Draft unsafe invariants (for the comp-webview-manager raw COM module, adr-0019)

Every `unsafe` block in the spike follows these rules; the production module should state them on its component page:

1. **Thread.** Every COM call runs on the UI thread, inside `with_webview` (or inside a WebView2 callback, which
   WebView2 also delivers on the UI thread). No COM pointer is sent to or used from another thread.
2. **Liveness.** The controller/environment come from `PlatformWebview` for a web view that exists at that moment;
   they are not stored beyond the closure (only plain values such as tokens leave it).
3. **Out-pointers.** Every out-parameter points to a local that outlives the call; returned `PWSTR`s are freed
   with `take_pwstr` (CoTaskMemFree).
4. **Handlers.** Callbacks never block, never call back into the same web view synchronously, and only move plain
   data out (channel or `Arc<Mutex<..>>`). Every `add_*` has a matching `remove_*` with its token before the web
   view is closed.
5. **Preconditions.** `TrySuspend` only when `IsVisible` is FALSE; never set MemoryUsageTargetLevel on a suspended
   view; check every HRESULT and treat failure as "feature unavailable", not as a crash.
6. **Versions.** The interface casts depend on the installed WebView2 runtime; a failed cast is reported, not unwrapped.
