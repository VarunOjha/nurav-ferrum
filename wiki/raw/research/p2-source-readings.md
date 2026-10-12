---
id: research-p2-source-readings
type: research-note
title: "P2 source readings: Tauri, wry and dirs behaviour read in the pinned crate sources; dependency versions locked in P2"
updated: 2026-10-11
sources:
  - Cargo.lock (repository, P2)
  - tauri 2.12.3 src/path/desktop.rs (local cargo registry)
  - dirs 7.0.0 src/win.rs, dirs-sys 0.5.0 src/lib.rs (local cargo registry)
  - tauri-runtime-wry 2.12.1 src/lib.rs, wry 0.57.0 src/lib.rs and src/webview2/mod.rs (local cargo registry)
---

# P2 source readings (task p2.18)

> Raw research note. Written by Claude in session s02 on 2026-10-11. Each item was read in the crate source
> files of the exact versions in this repository's `Cargo.lock` (local cargo registry), or in the repository itself.
> **VERIFIED** = read in that source in this session. Source code shows what the code does, not a documented promise;
> a later version may differ.

## S1. Where Tauri puts the app's folders on Windows (tauri 2.12.3, dirs 7.0.0, dirs-sys 0.5.0)

- **VERIFIED** `tauri/src/path/desktop.rs`: `app_config_dir` = `dirs::config_dir()` joined with the app identifier;
  `app_local_data_dir` = `dirs::data_local_dir()` joined with the identifier; `app_log_dir` (not macOS) =
  `dirs::data_local_dir()` / identifier / `logs`.
- **VERIFIED** `dirs/src/win.rs`: `config_dir()` = `known_folder_roaming_app_data()`; `data_local_dir()` =
  `known_folder_local_app_data()`; `dirs-sys/src/lib.rs` maps these to `FOLDERID_RoamingAppData` and
  `FOLDERID_LocalAppData`.
- So, with Ferrum's identifier `dev.ferrum.desktop` (`apps/desktop/src-tauri/tauri.conf.json`): the settings file is
  `%APPDATA%\dev.ferrum.desktop\config.toml` (roaming) and the log folder `%LOCALAPPDATA%\dev.ferrum.desktop\logs`.
- Observed on disk in P2 (task p2.11, owner's machine): WebView2 data in `%LOCALAPPDATA%\dev.ferrum.desktop\EBWebView`,
  with the content view's profile in `EBWebView\WV2Profile_ferrum-default`.

## S2. Developer tools default (tauri-runtime-wry 2.12.1, wry 0.57.0)

- **VERIFIED** `tauri-runtime-wry/src/lib.rs`: `with_devtools(...)` is called only under
  `#[cfg(any(debug_assertions, feature = "devtools"))]`. `wry/src/lib.rs`: the `devtools` attribute defaults to
  `true` with `debug_assertions` and `false` without. `wry/src/webview2/mod.rs`: `SetAreDevToolsEnabled(attributes.devtools)`.
- So Tauri-created views (Ferrum's shell) allow DevTools only in debug builds unless Tauri's `devtools` feature is on
  (it is not in `apps/desktop/src-tauri/Cargo.toml`). Confirmed at run time by the p2.12 check.

## S3. Dependency versions Ferrum added in P2 (Cargo.lock)

- **VERIFIED** (exact pins in the crates' `Cargo.toml`, resolved in `Cargo.lock`): `toml` 1.1.8, `url` 2.5.8,
  `sha2` 0.11.0, `serde` 1.0.229 (core); `tracing` 0.1.44, `tracing-subscriber` 0.3.23 (app); `axum` 0.8.9,
  `axum-server` 0.8.0, `rcgen` 0.14.10, `tokio` 1.53.2 (features `rt-multi-thread`, `macros`, `net`, `time`),
  `tokio-rustls` 0.26.6 (fixture server). `serde_json` is declared `"1"` in the app and resolves to 1.0.154.
- Not added in P2: `thiserror` (present only as a dependency of other crates; Ferrum's errors are hand-written enums)
  and a public-suffix-list crate (needed for per-site profiles, P3).
- `cargo deny check` (advisories, bans, licences, sources) passed with these versions (p2.14 and the P2 gate).
