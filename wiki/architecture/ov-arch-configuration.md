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
2. **User config file.** `config.toml` in the app config dir, which on Windows is `%APPDATA%\dev.ferrum.desktop\` (roaming); logs and
WebView2 data go to `%LOCALAPPDATA%\dev.ferrum.desktop\` (read in the Tauri and dirs sources and seen on disk in P2,
[source readings](../raw/research/p2-source-readings.md) S1). The shell's settings UI edits this layer, through the host. The shell never writes the file directly.
3. **Experiment override.** `--config <path>` on the command line, used by the harness. It is used for a whole run and is never written back.

The **effective config** is serialised in canonical form and hashed (`config_sha256`). It is written into every telemetry export and every harness trial record. Config changes at runtime (from settings) emit a `ConfigChanged` event with the new hash.

## 3. Schema sketch (TOML; key names are PROPOSALs, values are placeholders, not tuned)

TOML is proposed because experiment configs are human-edited. The owner chose TOML (Q-214); P2 uses the `toml` crate 1.1.8, pinned exactly and clean under `cargo deny`
([source readings](../raw/research/p2-source-readings.md) S3, [check-p2.4](../raw/evidence/phase-p2-minimal-container/check-p2.4.txt)). JSON via `serde_json` is the fallback.

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

## 4a. Versions and safe writing (built in P3, p3.4)

The file starts with `version = 2`. A file without `version` is the P2 format (version 1) and is upgraded when read;
the only change from version 1 is that a file which did not choose `new_window` keeps `same-view`, the P2 default,
because the new default (a new tab) would change what the user had. A file from a newer Ferrum is refused with a clear
message and left untouched (the app uses the defaults). Ferrum writes the file atomically: a temporary file next to it,
then one rename. A user file that cannot be read as TOML is copied aside (`config.toml.broken-<seconds>`) before the
defaults are used, so nothing the user wrote is lost. `--user-config <path>` replaces the user file's location (the
tests use their own file); the override layer (`--config`) still applies when the user file fails. Every start-up site
opens as a tab, in order, the first active ([check-p3.4](../raw/evidence/phase-p3-tabs-sessions/check-p3.4.txt)).

The settings screen (P3, p3.14) edits the user file through the host only (`settings_set`: every value checked, then
one atomic write; nothing is written on any problem). It edits start-up sites, `restore_on_startup`, `[[sites]]` and
`[downloads] folder`; per-site profiles and the folder apply at once, start-up sites at the next start.

`[session] restore_on_startup` is on by default from version 2: the last session's tabs open again, else the start-up
pages (a version-1 file keeps it off, the P2 behaviour). The session itself is runtime state (section 5).

## 5. Persisted runtime state (not config)

`history.json` (built in P3, p3.7: the local history, newest first, at most 1000 entries, clearable at once), `session.json` (built in P3, p3.5: version 1, the tabs with address, title and profile, and the active tab; saved about once a second while it changes and on exit; lifecycle snapshots for discard are P7), `profiles.json` (site → profile map), `audit.jsonl`, `netlog/*.jsonl`, `telemetry/*.jsonl`. All of it lives in the app data dir, is written atomically (temp file + rename) where it is rewritten, and is **never committed**.
