---
id: ov-arch-configuration
type: overview
title: "Architecture: configuration model and lifecycle policy flags"
status: review
updated: 2026-10-11
sources:
  - raw/00-master-prompt.md
  - raw/01-scoping-decisions.md
  - raw/research/tauri-webview2-capabilities.md
  - raw/research/measurement-methodology.md
related: [ov-arch-lifecycle-state-machine, ov-arch-isolation-model, ov-arch-trust-boundaries, ov-arch-crate-graph, comp-core, comp-app-shell, comp-resource-manager, comp-security-engine, comp-network-logger, comp-telemetry, comp-benchmark-harness, adr-0004, adr-0008, adr-0010, adr-0015, exp-lifecycle-policies, exp-isolation-overhead, exp-security-overhead, ov-research-configurations, phase-p7-lifecycle]
approvable: true
audience: both
phase: phase-p0-planning
tags: [configuration, feature-flags]
unverified:
  - claim: "Tauri's default app data / WebView2 user data folder location on Windows"
    verify_in: phase-p2-minimal-container
  - claim: "The toml crate is the right choice for config parsing (version and maintenance)"
    verify_in: phase-p2-minimal-container
  - claim: "Source of the OS memory-pressure signal used by the memory-pressure policy"
    verify_in: phase-p7-lifecycle
---

# Configuration model

Master prompt §6: *"Implement policies behind feature flags so identical workloads can be evaluated under different configurations."*

## 1. Principle: runtime flags, one binary

**PROPOSAL.** Lifecycle policies, isolation modes, the network logger and telemetry are **runtime** flags, not Cargo features. As a result:

- configurations cfg-ferrum-nolifecycle (D) and cfg-ferrum-adaptive (E) run the **byte-identical release binary**, which removes compile differences as a confound;
- the benchmarked binary is the shipped binary.

Cargo features are reserved for build-level concerns only:

| Cargo feature | Crate | Purpose |
|---|---|---|
| `tauri/unstable` | ferrum-desktop, ferrum-webview-manager | Multi-webview (`add_child`), always on (adr-0007) |
| `devtools` | ferrum-desktop | DevTools in release builds. **Off** in release by default (Tauri note §4: release needs the feature) |
| `bench-nosecurity` | ferrum-security | Ablation build for exp-security-overhead only; never in release artefacts (see §4) |

Benchmark-only behaviour, such as the remote debugging port, comes from **environment variables set by the harness** (`WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS`, `WEBVIEW2_USER_DATA_FOLDER`; both VERIFIED in Tauri note §7). No benchmark code path exists in the product, with one exception: the `bench-nosecurity` ablation build (§4).

## 2. Layers and precedence (low → high)

1. **Built-in defaults.** These live in `ferrum-core::config`, with conservative values.
2. **User config file.** `config.toml` in the app config dir. The exact Windows location is UNVERIFIED[phase-p2-minimal-container]. The shell's settings UI edits this layer, through the host. The shell never writes the file directly.
3. **Experiment override.** `--config <path>` on the command line, used by the harness. It is used for a whole run and is never written back.

The **effective config** is serialised in canonical form and hashed (`config_sha256`). It is written into every telemetry export and every harness trial record. Config changes at runtime (from settings) emit a `ConfigChanged` event with the new hash.

## 3. Schema sketch (TOML; key names are PROPOSALs, values are placeholders, not tuned)

TOML is proposed because experiment configs are human-edited. Which parsing crate and version to use is UNVERIFIED[phase-p2-minimal-container] (re-targeted in P1: the format itself is still open, Q-214, and the crate is chosen when p2.4 adds it). JSON via `serde_json` is the fallback.

```toml
[session]
restore_on_startup = true
startup_urls = ["https://example.org/"]

[security]                      # adr-0015 open browsing + blocklist
blocklist_files = ["blocklist.txt"]
http_policy = "upgrade"         # upgrade | warn
external_schemes = "confirm"    # confirm | deny
permissions_default = "deny"    # deny | prompt
downloads = "prompt"            # prompt | deny
google_oauth = "system-browser" # never spoof UA

[isolation]                     # adr-0010; see ov-arch-isolation-model
mode = "shared"                 # shared | per-site-profile | per-site-udf | private
cross_site_navigation = "rehost" # rehost | keep (PROPOSAL)

[lifecycle]                     # see ov-arch-lifecycle-state-machine
policy = "none"                 # none | fixed-idle | memory-pressure | adaptive
reclaim_mode = "suspend"        # suspend | memory-low | none   (never mixed, COM-6)
tick_ms = 1000
idle_after_s = 300              # placeholder
discard_after_s = 1800          # placeholder
min_interaction_age_s = 60      # guard G7
exclusions = []                 # site keys never suspended/discarded (guard G1)
max_discards_per_tick = 1

[lifecycle.memory_pressure]
signal = "os"                   # source: UNVERIFIED[phase-p7-lifecycle]
high_watermark_pct = 85         # placeholder

[lifecycle.adaptive]
alpha = 1.0                     # weights are experiment parameters
beta = 0.0
gamma = 1.0
budget_per_tick = 1

[telemetry]
enabled = true
sample_interval_ms = 1000
export_dir = "telemetry"        # relative to app data dir

[network_log]                   # adr-0008 metadata only
enabled = true
dir = "netlog"
url_mode = "full"               # full | strip-query (PROPOSAL: privacy option)
rotate_mb = 50
route = "web-resource-response" # web-resource-response | cdp. Default per adr-0008; P5 spike may change it via a superseding decision
```

The Rust side defines these as `serde` structs with `#[serde(deny_unknown_fields)]`, so a typo in an experiment config fails loudly instead of silently using defaults. Validation rules: `reclaim_mode` must be one of three values, the weights must be ≥ 0, and `idle_after_s < discard_after_s`.

## 4. Mapping to benchmark configurations

The canonical list of `cfg-*` ids lives in [ov-research-configurations](../research/ov-research-configurations.md). This table shows only how each Ferrum-side id maps onto the binary and the runtime config.

| cfg id | Binary | Config override |
|---|---|---|
| cfg-chrome, cfg-edge (and the labelled `-matched` variants) | Chrome / Edge | n/a: browser policies recorded per trial |
| cfg-tauri-baseline | ferrum-baseline | none |
| cfg-ferrum-nolifecycle | ferrum-desktop release | `lifecycle.policy = "none"` |
| cfg-ferrum-fixed-idle | ferrum-desktop release | `lifecycle.policy = "fixed-idle"` |
| cfg-ferrum-mempressure | ferrum-desktop release | `lifecycle.policy = "memory-pressure"` |
| cfg-ferrum-adaptive | ferrum-desktop release | `lifecycle.policy = "adaptive"` + weights |
| cfg-ferrum-shared-profile | ferrum-desktop release | `isolation.mode = "shared"` |
| cfg-ferrum-profile-per-site | ferrum-desktop release (needs a profile-capable TabHost backend, risk-r01) | `isolation.mode = "per-site-profile"` |
| cfg-ferrum-udf-per-site | ferrum-desktop release | `isolation.mode = "per-site-udf"` |
| cfg-ferrum-nosecurity-bench | **separate build** with Cargo feature `bench-nosecurity` | see below |

**The one exception to "one binary": `bench-nosecurity`.** exp-security-overhead needs an ablation where every policy decision returns "allow". A runtime switch that disables security in the shipped binary would be a security hazard, so the ablation is a **Cargo feature on `ferrum-security`**, `bench-nosecurity`. CI asserts that release artefacts are never built with it. The experiment must state the confound: two different binaries are being compared.

## 5. Persisted runtime state (not config)

`session.json` (tabs + snapshots, one format for restore and discard), `profiles.json` (site → profile map), `audit.jsonl`, `netlog/*.jsonl`, `telemetry/*.jsonl`. All of it lives in the app data dir, is written atomically (temp file + rename) where it is rewritten, and is **never committed**.
