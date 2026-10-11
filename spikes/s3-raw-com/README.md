# Spike S3: raw WebView2 COM through `with_webview` (P1, task p1.7)

Throw-away experiment, never shipped. It answers risk-r03: can Ferrum reach TrySuspend/Resume,
MemoryUsageTargetLevel, ProcessFailed, WebResourceResponseReceived and GetProcessInfos through Tauri's
`Webview::with_webview`? Report: `wiki/raw/evidence/phase-p1-foundation/spike-s3-raw-com.md`.

- `public/`: static shell strip and a local tab page with two sub-resources (no bundler needed).
- `src-tauri/src/main.rs`: window + shell + one child tab; runs every call once, logs each HRESULT to
  the JSON file named by `FERRUM_SPIKE_OUT`, removes its event handlers and exits by itself (watchdog 120 s).

```powershell
cd src-tauri; cargo build --locked
$env:FERRUM_SPIKE_OUT="$PWD\..\out\s3.json"; .\target\debug\ferrum-spike-s3.exe
cargo tree -i webview2-com --locked; cargo tree -i windows --locked
```

The renderer-crash check navigates the tab to the browser's own `edge://kill` page; it ends only that
tab's renderer inside this app. No external kill command is used.
