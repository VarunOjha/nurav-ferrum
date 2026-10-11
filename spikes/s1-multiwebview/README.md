# Spike S1: many web views in one window (P1, task p1.5)

Throw-away experiment, never shipped (adr-0018: spikes stay outside the Cargo workspace). It answers
risk-r02 (is Tauri's `unstable` multi-webview API usable for a shell plus N tabs on Windows?) and the
risk-r05 attribution question (do the WebView2 processes join a Job Object around the app?). The
report is `wiki/raw/evidence/phase-p1-foundation/spike-s1-multiwebview.md`.

## Layout (hand-written, no `create-tauri-app`)

| Path | What |
|---|---|
| `package.json`, `package-lock.json` | exact pins: @tauri-apps/cli 2.12.2, @tauri-apps/api 2.12.3, vite 8.3.4, typescript 7.0.2 (p1.17) |
| `index.html`, `src/main.ts` | the shell strip (64 px tab bar), vanilla TypeScript + Vite (adr-0006) |
| `public/tab.html` | local fixture page for each tab (solid colour, a text box, reports what it sees) |
| `src-tauri/Cargo.toml`, `Cargo.lock` | tauri =2.12.3 with the `unstable` feature, tauri-build =2.7.2, webview2-com 0.39, windows 0.62 |
| `src-tauri/src/main.rs` | window + shell + three child web views; modes `manual`, `auto`, `sync` |
| `src-tauri/src/capture.rs` | pixel sampling with `PrintWindow` (blank-render and z-order checks) |
| `src-tauri/src/com.rs` | raw COM: `GetProcessInfos`, `GetProcessExtendedInfos` |
| `src-tauri/src/bin/job_launch.rs` | starts the app suspended in a Job Object and lists the job's processes |
| `run-manual.ps1` | opens the app for the owner's hand checks |

## Build and run

```powershell
npm install; npm run build                    # shell bundle into dist/
cd src-tauri; cargo build --locked            # app + job_launch
$env:FERRUM_SPIKE_MODE='auto'; $env:FERRUM_SPIKE_OUT="$PWD\..\out\auto.json"; .\target\debug\ferrum-spike-s1.exe
.\target\debug\job_launch.exe "$PWD\target\debug\ferrum-spike-s1.exe" "$PWD\..\out\job.json"
```

Every automatic mode ends by itself (`auto`: after its checks, watchdog 120 s; `sync`: watchdog 25 s);
the Job Object is created without kill-on-close. Nothing is ever killed from outside.
