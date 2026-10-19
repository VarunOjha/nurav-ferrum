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
  - raw/evidence/phase-p5-telemetry/check-p5.3.txt
  - raw/evidence/phase-p5-telemetry/check-p5.4.txt
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
  - "win (p5.3, the crate's only unsafe code): read(pid) -> Reading {Read(Counters), Gone, Unreadable(reason)}; sample(pids) -> Vec<(pid, Reading)> (safe wrappers)"
  - "win::system_memory() -> SystemMemory"
  - "Recorder: record(Event), flush(), export(dir)"
  - "sampler (p5.3): SamplerConfig::new(interval_ms, 100 to 60000, default 1000); Sampler::tick(t_ms, set or why refused, read) -> process_sample records plus one tree_sample, or one sample_gap; tree_private_commit(samples); peak_private_commit(series), never a sum of per-process peaks"
  - "export (p5.1): Record (run, process_sample, tree_sample, sample_gap from p5.3, startup_mark, nav_timing), ExportWriter::create(dir, RunMeta, max_bytes) / write(&Record) / rotate() / finish(), csv::to_csv / from_csv, validate_file / validate_bytes"
  - "Export schema v1 file: crates/telemetry/schema/v1/record.schema.json (JSON Schema 2020-12)"
  - "attribution (p5.2): attribute(host_pid, &[Inventory]) -> ProcessSet {host_pid, members: [Member {pid, kind, source}]}; kind_of(webview2 kind name); the app joins every environment's GetProcessExtendedInfos list (shell first, then site environments) and exposes the set through the debug-only test_processes hook"
  - "test tool (p5.4): bin ferrum-ground-truth (alloc <MiB>, free, burn <ms>, quit on stdin), used by tests/ground_truth.rs; not part of the app"
  - "app hook (p5.3, debug builds only): test_sample(ticks 1 to 20, interval_ms) runs the sampler over the real set and returns its records"
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
---

# comp-telemetry

**The in-app view.** It covers what only Ferrum can see (lifecycle transitions, policy decisions, per-tab navigation timings) and gives a cross-check of process metrics. **It is not the cross-browser measurement of record.** The external harness measures all products uniformly ([measurement note §2](../../raw/research/measurement-methodology.md); [data flows §3](../ov-arch-data-flows.md)).

Metric rules taken from the measurement note:

- the headline is the sum of `PrivateUsage` over an exactly attributed PID set;
- working set is secondary and comes with an over-count caveat;
- peaks are taken from the summed time series, never as a sum of per-process peaks;
- processes are never matched by executable name;
- crashpad is not in `GetProcessExtendedInfos` and is handled symmetrically.

`sysinfo` is not used for headline numbers. `PROCESS_MEMORY_COUNTERS_EX2` is available through the `windows` 0.62 crate, and Windows fills its `PrivateWorkingSetSize` on this PC ([check-p5.3](../../raw/evidence/phase-p5-telemetry/check-p5.3.txt), p5.3).

## Export format v1 (p5.1)

Built in p5.1 (`crates/telemetry/src/export/`). One JSON object per line (JSONL); the `type` field names the record.

- **Run line first.** Every file starts with a `run` record: `schema_version` 1, `run_id`, `file_seq`, start time, Ferrum version, git commit and whether the tree was dirty, Windows build, WebView2 runtime, `config_sha256` (ov-arch-configuration) and `machine_id` (which machine-inventory record describes the PC). So each file can be read alone and every number traces to its setup.
- **Records.** `process_sample` (one process: private commit, working set, private working set when available, page faults, user and kernel CPU time, cycles; the process is named by pid plus creation time), `tree_sample` (the sum over the attributed set: the headline series), `sample_gap` (p5.3: a moment with no sum, because the set was refused or a running member could not be read), `startup_mark` (the Q-115 chain: process created, window visible, shell first paint, tab FCP, tab LCP) and `nav_timing` (offsets after navigation start, origin relation, redirect count, outcome). Lifecycle transitions are added by p5.8. Absent values are written as `null`, never left out.
- **Strict reading.** Unknown fields and unknown record types are refused; `t_ms` (milliseconds on the run clock) never goes backwards; a file must end with a line break.
- **Safe files.** The writer writes `<run_id>.<seq>.jsonl.part`, rotates by size, and renames to `<run_id>.<seq>.jsonl` only after a flush and sync to disk. A crash leaves a `.part` file, which the checker refuses. A run id cannot be reused.
- **CSV.** One table per record type with `run_id` first; the run line has no table (it is read from the JSONL). Values are numbers, `true`/`false` and snake_case enum names, so no quoting is needed.
- **Version rule.** v1 may gain record types while P5 is in progress; it is frozen at the P5 exit gate, and any later change bumps the version.
- **Checks.** `cargo test -p ferrum-telemetry export::` (10 tests: round trips, rotation, crash file, twelve damaged fixtures since p5.3 in `crates/telemetry/tests/fixtures/export-v1/`, the JSON Schema compared with the types); `scripts/verify/p5.1-export-file-format.ps1`.

## Process set (p5.2)

Built in p5.2 (`crates/telemetry/src/attribution.rs`; the app's `process_inventories` and `set_of` in `apps/desktop/src-tauri/src/content.rs`). Ferrum's set is its own process plus every process that WebView2's `GetProcessExtendedInfos` lists for each of Ferrum's environments (Tauri's `shell` environment and, in the per-site-udf mode, one per site). No code matches a process by its program name. Each process is counted once; a list with a pid of 0 or below, a process reported with two kinds, or an environment that lists no browser process is refused, never guessed.

- **Checked live** ([check-p5.2](../../raw/evidence/phase-p5-telemetry/check-p5.2.txt)): with the S1 spike app (another WebView2 host) running beside Ferrum in the per-site-udf mode with two sites open, the set held 17 processes (Ferrum, 3 browser, 4 renderer, 3 GPU, 6 utility). The Windows process list showed 19 WebView2 processes below Ferrum: those 16 plus 3 crash reporters, which WebView2 does not list. None of the other app's 9 WebView2 processes was in the set.
- **Empty list for a moment.** In the same run, right after a site's tab finished loading, that site's environment returned an empty list, so the set was refused; 2 s later the list was complete. The sampler (p5.3) must therefore retry or mark such a sample incomplete, and never record the smaller number.
- **Crash reporters** (crashpad) are not in WebView2's lists. They stay out of Ferrum's set; the harness treats them the same way for every product.

## Sampler (p5.3)

Built in p5.3 (`crates/telemetry/src/sampler.rs`, the Windows calls in `crates/telemetry/src/win.rs`, the app's debug-only `test_sample` hook in `apps/desktop/src-tauri/src/content.rs`). At each moment the sampler reads every member of Ferrum's set and writes one `process_sample` per member and one `tree_sample` with the sums.

- **Counters.** `GetProcessMemoryInfo` with `PROCESS_MEMORY_COUNTERS_EX2`: `PrivateUsage` (the headline), `WorkingSetSize` and `PrivateWorkingSetSize` (secondary), `PageFaultCount`; `GetProcessTimes` (creation time, user and kernel CPU time); `QueryProcessCycleTime`. Each handle is opened with `PROCESS_QUERY_LIMITED_INFORMATION` only.
- **Sums and peaks.** The tree's private commit and working set are the sums over the members read at that moment. A peak is read from the summed series (`peak_private_commit`), never by adding per-process peaks: a unit test has two processes that peak at different moments (series peak 110, sum of per-process peaks 200).
- **Processes that end or change.** A process is named by its pid and creation time. A process that ended before its read is left out (its memory is gone); its CPU time and cycles stay in the tree sums at their last reading, so the tree CPU never drops. A reused pid is a new process. A member created before Ferrum itself is someone else's process with a reused pid, so it is not counted.
- **Gaps, never a smaller number.** When the set is refused (the p5.2 finding), the app asks again once after 200 ms; if it is still refused, the moment is a `sample_gap` with reason `set_refused`. A running member that cannot be read, or Ferrum itself missing, gives `counters_unreadable` with the number missing. A gap changes no sampler state.
- **Interval.** 100 ms to 60 s, 1 s by default (`sample_interval_ms` in ov-arch-configuration). Each reading comes one interval after the one before, plus the time to list the set; a late reading is not caught up with a burst.
- **Checked** ([check-p5.3](../../raw/evidence/phase-p5-telemetry/check-p5.3.txt)): 8 unit tests on the adding-up rules; the test process reads every counter of itself, and an ended process reads as gone; live, with Ferrum in the per-site-udf mode and two sites open, six readings 500 ms apart (spacing 501 to 502 ms), 17 processes each, every sum equal to its members. In that run the set was refused once and complete on the retry; in an earlier run of the same check the retry was refused too, and the moment was written as a gap. These are checks of the meter in a debug build, not measurement results; accuracy against known amounts is p5.4.
- **Validated (p5.4)** ([check-p5.4](../../raw/evidence/phase-p5-telemetry/check-p5.4.txt)): against a helper program that uses known amounts (256 MiB written byte by byte, one thread busy for 2 s) and against psutil 7.2.2, and with a Ferrum tab that fills a 128 MiB JavaScript buffer, all 24 comparisons were inside limits committed before the first run (`crates/telemetry/tests/ground-truth-tolerances.json`). The limits and results per counter are on the metric pages (metric-tree-private-commit, metric-tree-private-working-set, metric-tree-working-set, metric-tree-cpu-time, metric-tree-cpu-cycles).
- **Not built yet.** Writing the samples to files during normal use, and the setting to switch it on, come with p5.11. `win::system_memory()` (the memory-pressure signal) is not built.

## Unsafe invariants

`unsafe` is allowed only in `mod win`:

- process handles are opened with the least access needed and closed via RAII;
- every PID is paired with its creation time (guards against PID reuse); a process whose exit time is set reads as gone;
- output structs are size-initialised (`cb` fields) before each call;
- no pointer escapes the call.

Each block's `// SAFETY:` comment names the invariant. The PID set itself comes from `comp-webview-manager` (COM), so telemetry makes no WebView2 COM calls.
