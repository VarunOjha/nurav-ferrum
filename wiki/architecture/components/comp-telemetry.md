---
id: comp-telemetry
type: component
title: "Telemetry engine (in-app process sampling, events, exports)"
status: planned
updated: 2026-10-18
sources:
  - raw/00-master-prompt.md
  - raw/research/measurement-methodology.md
  - raw/research/tauri-webview2-capabilities.md
related: [ov-arch-data-flows, ov-arch-crate-graph, ov-arch-webview2-integration, comp-webview-manager, comp-resource-manager, comp-benchmark-harness, comp-research-analysis, comp-core, comp-windows-os, comp-app-shell, risk-r05, phase-p5-telemetry, exp-startup, exp-navigation, exp-baseline-footprint]
approvable: true
path: crates/telemetry/
crate: ferrum-telemetry
trust_level: trusted
phase_introduced: phase-p5-telemetry
shipped: true
unsafe_code: true
responsibilities:
  - "Collect resource metrics: per-process private commit, working set (secondary), CPU time, cycle time over the WebView2 environment PID set (master prompt 4)"
  - "Track navigation performance from webview-manager NavTiming events (master prompt 4)"
  - "Measure startup latency marks: process creation, window visible, first navigation completed (master prompt 4)"
  - "Record lifecycle transitions from the resource manager (master prompt 4)"
  - "Export structured datasets as JSONL/CSV with run metadata and config hash (master prompt 4)"
  - "Track experiment metadata: versions (app, WebView2 runtime, OS), config_sha256, run id (master prompt 4)"
  - "Provide the reusable Windows process-sampling library (win module) shared with the benchmark harness"
  - "Provide the memory-pressure signal to the resource manager"
interfaces:
  - "win::sample(pids) -> Vec<ProcSample> (safe wrapper)"
  - "win::system_memory() -> SystemMemory"
  - "Recorder: record(Event), flush(), export(dir)"
  - "Aggregation: tree_private_commit(samples), never sum per-process peaks"
  - "export (p5.1): Record (run, process_sample, tree_sample, startup_mark, nav_timing), ExportWriter::create(dir, RunMeta, max_bytes) / write(&Record) / rotate() / finish(), csv::to_csv / from_csv, validate_file / validate_bytes"
  - "Export schema v1 file: crates/telemetry/schema/v1/record.schema.json (JSON Schema 2020-12)"
connects:
  - to: comp-windows-os
    label: "per-process counters (GetProcessMemoryInfo EX2, GetProcessTimes, QueryProcessCycleTime) and system memory status"
    kind: os-api
    crosses_trust_boundary: true
  - to: comp-resource-manager
    label: "aggregated process samples and memory-pressure signal"
    kind: rust-api
    crosses_trust_boundary: false
  - to: comp-benchmark-harness
    label: "per-run in-app telemetry export (JSONL/CSV + run metadata)"
    kind: data-export
    crosses_trust_boundary: false
  - to: comp-research-analysis
    label: "in-app telemetry datasets (lifecycle transitions, navigation timings)"
    kind: data-export
    crosses_trust_boundary: false
  - to: comp-core
    label: "shared types and event definitions"
    kind: rust-api
    crosses_trust_boundary: false
unverified:
  - claim: "PROCESS_MEMORY_COUNTERS_EX2 fields are available via the windows 0.62 crate on this machine"
    verify_in: phase-p5-telemetry
---

# comp-telemetry

**The in-app view.** It covers what only Ferrum can see (lifecycle transitions, policy decisions, per-tab navigation timings) and gives a cross-check of process metrics. **It is not the cross-browser measurement of record.** The external harness measures all products uniformly ([measurement note §2](../../raw/research/measurement-methodology.md); [data flows §3](../ov-arch-data-flows.md)).

Metric rules taken from the measurement note:

- the headline is the sum of `PrivateUsage` over an exactly attributed PID set;
- working set is secondary and comes with an over-count caveat;
- peaks are taken from the summed time series, never as a sum of per-process peaks;
- processes are never matched by executable name;
- crashpad is not in `GetProcessExtendedInfos` and is handled symmetrically.

`sysinfo` is not used for headline numbers. EX2 availability through the `windows` 0.62 crate is UNVERIFIED[phase-p5-telemetry].

## Export format v1 (p5.1)

Built in p5.1 (`crates/telemetry/src/export/`). One JSON object per line (JSONL); the `type` field names the record.

- **Run line first.** Every file starts with a `run` record: `schema_version` 1, `run_id`, `file_seq`, start time, Ferrum version, git commit and whether the tree was dirty, Windows build, WebView2 runtime, `config_sha256` (ov-arch-configuration) and `machine_id` (which machine-inventory record describes the PC). So each file can be read alone and every number traces to its setup.
- **Records.** `process_sample` (one process: private commit, working set, private working set when available, page faults, user and kernel CPU time, cycles; the process is named by pid plus creation time), `tree_sample` (the sum over the attributed set: the headline series), `startup_mark` (the Q-115 chain: process created, window visible, shell first paint, tab FCP, tab LCP) and `nav_timing` (offsets after navigation start, origin relation, redirect count, outcome). Lifecycle transitions are added by p5.8. Absent values are written as `null`, never left out.
- **Strict reading.** Unknown fields and unknown record types are refused; `t_ms` (milliseconds on the run clock) never goes backwards; a file must end with a line break.
- **Safe files.** The writer writes `<run_id>.<seq>.jsonl.part`, rotates by size, and renames to `<run_id>.<seq>.jsonl` only after a flush and sync to disk. A crash leaves a `.part` file, which the checker refuses. A run id cannot be reused.
- **CSV.** One table per record type with `run_id` first; the run line has no table (it is read from the JSONL). Values are numbers, `true`/`false` and snake_case enum names, so no quoting is needed.
- **Version rule.** v1 may gain record types while P5 is in progress; it is frozen at the P5 exit gate, and any later change bumps the version.
- **Checks.** `cargo test -p ferrum-telemetry export::` (10 tests: round trips, rotation, crash file, eleven damaged fixtures in `crates/telemetry/tests/fixtures/export-v1/`, the JSON Schema compared with the types); `scripts/verify/p5.1-export-file-format.ps1`.

## Unsafe invariants

`unsafe` is allowed only in `mod win`:

- process handles are opened with the least access needed and closed via RAII;
- every PID is paired with its creation time (guards against PID reuse);
- output structs are size-initialised (`cb` fields) before each call;
- no pointer escapes the call.

Each block's `// SAFETY:` comment names the invariant. The PID set itself comes from `comp-webview-manager` (COM), so telemetry makes no WebView2 COM calls.
