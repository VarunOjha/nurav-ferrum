---
id: ov-research-fairness-protocol
type: overview
title: "Fairness protocol and per-trial environment record"
status: draft
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/01-scoping-decisions.md
  - raw/research/measurement-methodology.md
  - raw/research/tauri-webview2-capabilities.md
related:
  - ov-research-plan
  - ov-research-configurations
  - comp-benchmark-harness
  - risk-r05
  - risk-r06
  - adr-0012
  - phase-p1-foundation
approvable: true
phase: phase-p6-benchmark-harness
tags:
  - research
  - fairness
unverified:
  - claim: "Opening a remote-debugging port (and attaching a CDP client) does not change the resource behaviour of the measured product beyond the A/A noise floor"
    verify_in: phase-p6-benchmark-harness
  - claim: "A method exists to match the content viewport (not the outer window size) across Ferrum, the baseline, Chrome and Edge"
    verify_in: phase-p6-benchmark-harness
  - claim: "Chrome Memory Saver can be set by policy to the value observed in chrome://settings/performance on this install"
    verify_in: phase-p6-benchmark-harness
  - claim: "A method exists to block Chrome/Edge auto-update during a campaign"
    verify_in: phase-p6-benchmark-harness
  - claim: "msedgewebview2.exe processes of Ferrum and the baseline join the harness Job Object of the host process (measurement note §2.2 UNCERTAIN)"
    verify_in: phase-p6-benchmark-harness
---

# Fairness protocol

Sources: master prompt §8 and §10 ([master prompt](../raw/00-master-prompt.md)), the [measurement note](../raw/research/measurement-methodology.md) §§2, 3, 6, and the [Tauri/WebView2 note](../raw/research/tauri-webview2-capabilities.md) §7.

## 1. Rules that cannot be broken

1. **Do not disable the resource-saving features of Chrome or Edge for the headline comparison** (master prompt §8). The headline uses the **as-shipped defaults** of each product. Matched configurations (`cfg-chrome-matched`, `cfg-edge-matched`) are run only as a labelled secondary analysis (owner question R-Q1).
2. **Never weaken WebView2 or Chromium security** (sandbox, certificate validation) to improve results (master prompt §11).
3. **Never select processes by executable name.** Each target is launched suspended into its own harness-created Job Object with a fresh profile or user data folder (measurement note §2.3). Whether the `msedgewebview2.exe` processes of Ferrum and the baseline are descendants of the host and therefore join its job is UNCERTAIN in measurement note §2.2: UNVERIFIED[phase-p6-benchmark-harness] (checked first in the P1 de-risking spike, then with ETW in the P6 A/A phase). The **attribution mode** of each product is therefore fixed from that check, **before** any comparative data is collected, and written into the pre-registration: either *job-only* (S(t) = job members), or *job ∪ GetProcessExtendedInfos* (S(t) = job members plus the PIDs that `GetProcessExtendedInfos` reports for the product's WebView2 environment, plus crashpad handled symmetrically). The mode is never chosen or changed after seeing data. For Chrome and Edge the intended mode is job-only; whether their child processes break away from the job is also UNCERTAIN (measurement note §2.3) and is checked with an ETW process trace in the same spike and A/A phase before their mode is fixed. Once the mode is fixed, a trial fails if a process belonging to the product (by the product's own process list, or by `GetProcessExtendedInfos` for Ferrum and the baseline) is outside the attributed set S(t). Job-wide counters (`PeakJobMemoryUsed`, job CPU accounting) are used only for products whose mode is job-only with complete membership; otherwise peaks and CPU time come from sampling, for every product in that comparison.
4. **Treat every product the same way.** All products, Ferrum included, are driven over the same Playwright `connectOverCDP` path with the same debugging flag. Playwright documents that path as "significantly lower fidelity" (VERIFIED, measurement note §4.2). The overhead of having a CDP client attached is measured in the A/A phase. Whether opening a debugging port changes behaviour is UNVERIFIED[phase-p6-benchmark-harness].
5. **Target applications never run elevated.** WebView2 ignores environment-variable flags for elevated processes (Tauri/WebView2 note §7, VERIFIED). Elevated samplers (PresentMon, the energy sampler) run as separate processes.

## 2. Equivalence checklist (master prompt §8)

| Dimension | Control |
|---|---|
| Website workloads | The same fixture version hash, and equivalence beacons must match ([ov-research-workload-catalog](ov-research-workload-catalog.md)) |
| Viewport sizes | Fixed outer window size and position, with the content viewport recorded. Ferrum's shell UI takes space, so the **content** viewport is matched, not the window size. Matching method UNVERIFIED[phase-p6-benchmark-harness] |
| Network conditions | Loopback fixture server, no external network for local workloads. Any network emulation is applied the same way through CDP and labelled as an ablation |
| Cache policies | Fresh profile per launch. Cached and uncached scenarios are controlled by fixture headers and warm-up navigations |
| Authentication state | No logins for any workload |
| Browser extensions | None (Chrome and Edge fresh profiles, `--disable-extensions` where applicable; WebView2 browser extensions off) |
| Background throttling policies | As shipped and **recorded** (Edge sleeping tabs, Chrome background tab freezing, Memory Saver set explicitly to the recorded value) |
| Hardware configuration | One machine. CPU model, RAM, GPU, driver, display mode, power plan and AC power recorded |
| Window state | Visible, unoccluded, the same size, a single monitor. On Windows 11, timer resolution and EcoQoS depend on visibility (measurement note §3, VERIFIED) |

## 3. Features that change resource use (record them, and set them by policy)

| Feature | Default (source) | Handling |
|---|---|---|
| Edge sleeping tabs | On by default (measurement note §6.1, VERIFIED) | Left on in `cfg-edge`, off in `cfg-edge-matched`. Recorded |
| Edge Startup Boost | "may initially be off or on" (VERIFIED) | **Off** (`StartupBoostEnabled`=0) in every Edge configuration, because it pre-launches processes and makes the T0 boundary meaningless. This is a measurement-validity control, not a resource-saving feature, and it is reported in the paper. An optional exploratory `cfg-edge-startupboost` can show perceived startup with the boost |
| Edge energy saver | On a device with no battery it is off by default (VERIFIED) | Set explicitly to its default and recorded |
| Chrome Memory Saver | Default **conflicting** across sources (UNCERTAIN in the measurement note) | Set explicitly by policy to the value observed on this install, which is checked in `chrome://settings/performance`. UNVERIFIED[phase-p6-benchmark-harness] |
| Chrome background tab freezing | On when the policy is unset (VERIFIED) | Left on in `cfg-chrome`, off in `cfg-chrome-matched` |
| Chrome spare renderer | Present (VERIFIED) | Included. It is a real cost of the product |

## 4. Version pinning and recording

- Record the four-part versions **with every trial**: Chrome, Edge, WebView2 runtime (registry `pv`), Windows build, the Ferrum commit, fixture hashes and analysis-script hashes. The versions observed in session 1 were WebView2 154.0.4258.62, Edge 154.0.4258.x and Chrome 154.0.8037.x ([scoping decisions](../raw/01-scoping-decisions.md)).
- **Abort the whole block** if any product version changes during it. The block is kept in the raw data, flagged `invalid-version-drift`, and reported.
- **Chrome:** Chrome for Testing (no auto-update) or branded Chrome with updates blocked. Owner question R-Q2. How to block updates is UNVERIFIED[phase-p6-benchmark-harness].
- **Edge** cannot be pinned the same way. Record its version, block updates during a campaign, and abort on any version change.
- **WebView2:** Evergreen, the Fixed Version runtime (`browserExecutableFolder`), or both. Owner question R-Q3. On Evergreen, Edge and WebView2 share hard-linked binaries when their versions match (measurement note §6.2, VERIFIED), so the runtime mode is recorded.

## 5. OS noise controls

Use a fixed power plan on AC power and record it. Pause Windows Update. Leave Defender on and record its state. Record the search-indexing state. Close all other user apps. Log ambient and CPU temperature. Cool down between cells until package temperature and idle power are within the session-baseline tolerance (the tolerance is set in P6). Run products in randomised blocks so that slow drift spreads across all of them (measurement note §6.3, DERIVED).

## 6. Per-trial environment record (minimum fields)

`run_id, block, cell_order_index, configuration, workload, fixture_hash, trial_kind (warmup|confirmatory|pilot|aa), product_versions{}, webview2_runtime_mode, ferrum_commit, policies{}, flags[], window{size, position, visible, occluded}, display{resolution, refresh_hz, scale}, power_plan, ac_power, cpu_model, ram_bytes, gpu, temps{start, end}, idle_baseline, process_set_check, failures[], start_utc, end_utc, harness_version, analysis_script_hash`

The schema is implemented in `comp-benchmark-harness` (P6). The field names are proposed.
