---
id: comp-network-logger
type: component
title: "Network logger (metadata-only JSONL)"
status: planned
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/01-scoping-decisions.md
  - raw/research/tauri-webview2-capabilities.md
related: [ov-arch-data-flows, ov-arch-trust-boundaries, ov-arch-configuration, comp-webview-manager, comp-benchmark-harness, comp-core, comp-app-shell, adr-0008, phase-p5-telemetry, risk-r08, adr-0019]
approvable: true
path: crates/network-logger/
crate: ferrum-network-logger
trust_level: trusted
phase_introduced: phase-p5-telemetry
shipped: true
unsafe_code: false
responsibilities:
  - "Dump network call metadata of every tab to a folder for review (master prompt 2, item 11)"
  - "Enforce the metadata-only record schema: ts, tab, site, url, method, status, resource_type, timing, sizes, policy_decision (scoping Q5, adr-0008)"
  - "Never record headers, cookies, request or response bodies"
  - "Append JSONL per session with size-based rotation; optional url_mode strip-query"
  - "Provide per-trial request logs for benchmark workload-equivalence checks"
interfaces:
  - "NetLogger::record(NetRecord)"
  - "NetLogger::rotate(), NetLogger::folder()"
  - "NetRecord schema (in ferrum-core), versioned"
connects:
  - to: comp-benchmark-harness
    label: "per-trial request logs for workload-equivalence checks"
    kind: data-export
    crosses_trust_boundary: false
  - to: comp-core
    label: "network record type and config"
    kind: rust-api
    crosses_trust_boundary: false
unverified:
  - claim: "Logging every tab's network events adds acceptable CPU and memory overhead"
    verify_in: phase-p5-telemetry
---

# comp-network-logger

**Safe-Rust sink only** (`#![forbid(unsafe_code)]`). The capture happens in `comp-webview-manager::webview2::netlog`. That module subscribes to `WebResourceResponseReceived` (the implementation route of accepted adr-0008), with in-process DevTools Protocol `Network.*` events as the alternative if a P5 spike finds fields missing (a switch needs a superseding decision). It reduces each event to the allow-listed fields before handing a `NetRecord` over ([data flows §4](../ov-arch-data-flows.md)). Tauri offers no response hook for https tabs (`on_web_resource_request` only covers Tauri's custom protocol, VERIFIED in the [Tauri note §4](../../raw/research/tauri-webview2-capabilities.md)). That is why the capture lives in the COM layer.

**Privacy.** Log folders sit outside the repo by default (app data dir) and are gitignored if pointed inside it. The schema test asserts that no header, cookie or body field exists. The overhead of logging is UNVERIFIED[phase-p5-telemetry]. It is measured with the logger on and off.
