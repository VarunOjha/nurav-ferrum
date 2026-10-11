# Spike S2: one WebView2 profile per site (P1, task p1.6)

Throw-away experiment, never shipped. It answers risk-r01: can each site get its own WebView2 profile while
all sites share one browser process (owner decision Q7, adr-0010)? Report:
`wiki/raw/evidence/phase-p1-foundation/spike-s2-profiles.md`.

- Route (c): tab controllers created with raw COM from Tauri's own environment
  (`CreateCoreWebView2ControllerWithOptions` + `SetProfileName`), hosted in the Tauri window.
- Route (d): two Tauri child web views with different `data_directory` values.
- A loopback fixture server inside the app sets a cookie for site A and records the `Cookie` header each
  site sends. Routes (a) (Tauri PR 16054, unreleased) and (b) (fork patch) are documented, not run.

```powershell
cd src-tauri; cargo build --locked
$env:FERRUM_SPIKE_OUT="$PWD\..\out\s2.json"; .\target\debug\ferrum-spike-s2.exe   # ends by itself
```

The run creates WebView2 profile folders under `%LOCALAPPDATA%\dev.ferrum.spike.s2\` (outside the repo).
