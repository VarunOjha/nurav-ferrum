---
id: comp-baseline-app
type: component
title: "Minimal Tauri + WebView2 baseline app (benchmark configuration C)"
status: planned
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/research/tauri-webview2-capabilities.md
related: [ov-arch-crate-graph, ov-arch-configuration, comp-benchmark-harness, comp-webview2-runtime, phase-p6-benchmark-harness, exp-baseline-footprint, exp-startup, exp-navigation]
approvable: true
path: apps/baseline-tauri/
crate: ferrum-baseline
trust_level: trusted
phase_introduced: phase-p6-benchmark-harness
shipped: false
unsafe_code: false
responsibilities:
  - "Provide the unoptimized Tauri + WebView2 comparison point (master prompt 1, 8 C)"
  - "Load a URL given on the command line in a single default WebView using plain Tauri APIs only"
  - "Use the same tauri version and release profile as Ferrum (shared workspace lockfile)"
  - "Contain no Ferrum crates, no lifecycle management, no security engine, no telemetry"
interfaces:
  - "CLI: ferrum-baseline --url <https-url>"
connects:
  - to: comp-webview2-runtime
    label: "single default WebView via plain Tauri APIs (no Ferrum crates)"
    kind: webview2-com
    crosses_trust_boundary: true
unverified:
  - claim: "Remote page loaded directly in a Tauri main webview gets no IPC access under default capabilities"
    verify_in: phase-p6-benchmark-harness
---

# comp-baseline-app

**Fairness requirement.** It must stay "minimal Tauri". It isolates Ferrum's own overhead or savings from the cost of the Tauri + WebView2 stack. It shares Ferrum's workspace `Cargo.lock` and `[profile.release]`, so versions and optimisation match. It is always built alone (`cargo build -p ferrum-baseline --release`) to avoid feature unification with `tauri/unstable` ([crate graph rule 7](../ov-arch-crate-graph.md)).

**Open design point (PROPOSAL).** Ferrum renders tabs in **child** WebViews under a shell WebView. The baseline uses a single main WebView, so the baseline-vs-Ferrum comparison includes the cost of the shell WebView. An optional variant, `cfg-tauri-baseline-shell` (shell + one child, no Ferrum logic), could separate those effects. The experiment pages decide.

**Security note.** The baseline is a benchmark target, not a product. Remote content should still get no IPC. Whether default capabilities guarantee this is UNVERIFIED[phase-p6-benchmark-harness]. The baseline ships no capability with `remote`.
