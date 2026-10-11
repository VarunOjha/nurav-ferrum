# Spike S2 report: one WebView2 profile per site (p1.6, risk-r01)

> Raw evidence. Session s02, 2026-10-11. Spike code: `spikes/s2-profiles` (tauri =2.12.3 with `unstable`,
> webview2-com 0.39.1, WebView2 runtime 154.0.4258.62). One automatic run (`spike-s2/s2-1.json`), ends by itself.
> Cookie isolation is measured at a loopback fixture server inside the spike: site A loads `/set?who=A`
> (answer: `Set-Cookie: who=A; Path=/; SameSite=Lax`), then the server records the `Cookie` header each site sends.
> PR state checked through the GitHub API at 2026-10-11 13:14 local time.

## Question

Owner decision Q7 (adr-0010): each site gets its own WebView2 profile, inside **one shared browser process**. A
profile can only be chosen when the controller is created (research note §6). Which route gets there?

## Route x criterion table

| Route | Executed | View creation | BrowserProcessId (site A / site B / shell) | Cookie isolation (A sets `who=A`) | Unsafe and maintenance cost |
|---|---|---|---|---|---|
| (a) released Tauri with PR 16054 (`data_store_identifier` → WebView2 profile name) | no: PR 16054 is still **open, not merged** (GitHub API 2026-10-11 13:14: state open, merged false, last update 2026-09-28); tauri 2.12.3 has no profile plumbing (no `profile_name`/`ProfileName` in tauri, tauri-runtime, tauri-runtime-wry sources) | not possible today | — | — | none of our own once released; but the timing is outside our control |
| (b) patched tauri-runtime-wry (`[patch.crates-io]` to the PR branch `jhasheng/tauri` @ d57b9fe84ef4) | no: would build Ferrum on an unreviewed third-party fork branch; not run in this spike (supply-chain decision for the owner) | expected to work (same WebView2 call as route c, through wry `with_profile_name`) | expected shared | expected isolated | a fork pin to maintain and re-audit on every Tauri update; no own unsafe |
| (c) own controllers via raw COM, reusing **Tauri's environment** (`ICoreWebView2Environment10::CreateCoreWebView2ControllerWithOptions` + `ICoreWebView2ControllerOptions::SetProfileName`), hosted in the Tauri window | yes | S_OK for `ferrum-site-a` and `ferrum-site-b` (SetProfileName, create, SetBounds, SetIsVisible all S_OK); profile name reads back; profile folders `EBWebView\WV2Profile_ferrum-site-a` / `_b` | **18860 / 18860 / 18860**: one shared browser process | **isolated**: A sends `who=A` on its next request; B sends no cookie | own unsafe COM for tab creation, navigation, bounds, close (invariants as in spike S3); tabs lose Tauri's per-webview hooks (navigation, new-window, download, page-load) unless re-implemented with raw COM events |
| (d) per-site `data_directory` (Tauri `WebviewBuilder::data_directory`) | yes | ok for both (two Tauri child web views, separate folders `route-d/site-a`, `route-d/site-b`) | **87472 / 14672 / 18860**: a separate browser process per site | **isolated**: A sends `who=A`; B sends no cookie (first load and later) | no own unsafe; but every site starts its own browser process group, which contradicts Q7's "shared browser process" and costs memory per site (Microsoft process-model docs, research note §6) |

## Observations

- Route (c) proves the mechanism Q7 needs works on this runtime: two profiles, one browser process, separate cookies.
  Reusing Tauri's environment matters: all web views sharing a user data folder must use identical environment
  options (research note §6), and taking Tauri's own environment guarantees that.
- Route (d) works with plain Tauri but gives one browser process per site.
- Routes (a) and (b) both reach the same WebView2 call through Tauri/wry; (a) is not available yet, (b) needs a fork.
- The cookie fixture is a local server inside the spike; nothing was sent to the internet in this spike.

## Decision needed (p1.9, owner)

Which profile route Ferrum uses for P3 (per-site profiles): (c) now, (d) now, or wait for (a). Claude's analysis goes
into a proposed ADR in p1.9; the owner chooses.
