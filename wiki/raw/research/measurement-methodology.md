---
id: research-measurement-methodology
type: research-note
title: "Defensible measurement methodology on Windows 11 for Chromium browsers vs WebView2 apps"
updated: 2026-10-08
sources:
  - https://learn.microsoft.com/en-us/windows/win32/api/psapi/ns-psapi-process_memory_counters_ex
  - https://learn.microsoft.com/en-us/windows/win32/api/psapi/ns-psapi-process_memory_counters_ex2
  - https://learn.microsoft.com/en-us/windows/win32/memory/working-set
  - https://learn.microsoft.com/en-us/windows/win32/api/psapi/ns-psapi-psapi_working_set_ex_block
  - https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-getprocesstimes
  - https://learn.microsoft.com/en-us/windows/win32/api/realtimeapiset/nf-realtimeapiset-queryprocesscycletime
  - https://learn.microsoft.com/en-us/windows/win32/api/timeapi/nf-timeapi-timebeginperiod
  - https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-setprocessinformation
  - https://learn.microsoft.com/en-us/windows/win32/api/jobapi2/nf-jobapi2-assignprocesstojobobject
  - https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-jobobject_basic_accounting_information
  - https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-jobobject_extended_limit_information
  - https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/process-model
  - https://learn.microsoft.com/en-us/microsoft-edge/webview2/reference/win32/icorewebview2environment13
  - https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution
  - https://chromium.googlesource.com/chromium/src/+/main/docs/process_model_and_site_isolation.md
  - https://chromium.googlesource.com/chromium/src/+/main/components/policy/resources/templates/policy_definitions/Miscellaneous/
  - https://learn.microsoft.com/en-us/deployedge/microsoft-edge-browser-policies/sleepingtabsenabled
  - https://learn.microsoft.com/en-us/deployedge/microsoft-edge-browser-policies/efficiencymode
  - https://learn.microsoft.com/en-us/deployedge/microsoft-edge-browser-policies/startupboostenabled
  - https://support.google.com/chrome/answer/12929150
  - https://developer.chrome.com/blog/chrome-for-testing
  - https://github.com/GoogleChrome/chrome-launcher/blob/main/docs/chrome-flags-for-tools.md
  - https://developer.chrome.com/docs/web-platform/long-animation-frames
  - https://developer.chrome.com/docs/lighthouse/performance/interactive
  - https://web.dev/articles/fcp
  - https://playwright.dev/docs/webview2
  - https://playwright.dev/docs/api/class-browsertype#browser-type-connect-over-cdp
  - https://github.com/GameTechDev/PresentMon
  - https://github.com/GameTechDev/PresentMon/blob/main/README-ConsoleApplication.md
  - https://api.github.com/repos/GameTechDev/PresentMon/releases
  - https://api.github.com/repos/LibreHardwareMonitor/LibreHardwareMonitor/releases
  - https://raw.githubusercontent.com/LibreHardwareMonitor/LibreHardwareMonitor/master/LibreHardwareMonitorLib/Hardware/Cpu/Amd17Cpu.cs
  - https://pawnio.eu/
  - https://api.github.com/repos/namazso/PawnIO.Setup/releases
  - https://arxiv.org/abs/2108.00808
  - https://ar5iv.labs.arxiv.org/html/2108.00808
  - https://www.arxiv.org/abs/2401.15985
  - https://devblogs.microsoft.com/sustainable-software/measuring-your-application-power-and-carbon-impact-part-1/
  - https://www.pcworld.com/article/2912435/if-windows-defender-flags-winring0-on-your-gaming-pc-pay-attention.html
  - https://docs.rs/sysinfo/latest/sysinfo/struct.Process.html
  - https://raw.githubusercontent.com/GuillaumeGomez/sysinfo/main/src/windows/process.rs
  - https://crates.io/api/v1/crates/sysinfo
  - https://crates.io/api/v1/crates/windows
  - https://psutil.io/api/
  - https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.bootstrap.html
  - https://api.crossref.org/works/{doi} (8 DOIs, see §7.6)
---

# Measurement methodology for Ferrum benchmarks (Windows 11, AMD desktop)

> Research note (raw source layer, immutable once filed; corrections go in a new note or ADR).
> Access date for every URL: **2026-10-08**.
> Status legend: **VERIFIED** = read in the primary source on the access date (quotes are verbatim
> or near-verbatim from that source). **UNCERTAIN** = secondary source, summariser paraphrase,
> memory, or inference; each carries the phase in which it must be verified.
> **DERIVED** = computed or reasoned in-session from VERIFIED facts (shown so it can be re-checked).
> **No measurements exist yet. Nothing here is a performance result.**

---

## 0. Decision-relevant summary (TL;DR)

1. **Memory headline metric = Private Commit (`PrivateUsage`) summed over an exactly-attributed process set.**
   Private commit is private by definition, so it is additive across processes. Working set
   (`WorkingSetSize`) includes shareable pages and **double counts when summed** — report it only
   as a secondary metric, together with `PrivateWorkingSetSize` (EX2) which is additive.
2. **Attribute processes by identity, never by executable name.** `msedgewebview2.exe` and `msedge.exe`
   processes from other apps (Widgets, Teams, Edge Startup Boost …) would contaminate name-based sums.
   For WebView2 use `GetProcessExtendedInfos` (environment-scoped PID list); for Chrome/Edge use a
   fresh `--user-data-dir` + Job Object / ETW process-tree tracking.
3. **AMD "RAPL" energy is modeled, CPU-package-only, under-reports vs. wall power, and excludes DRAM**
   (Zen 2 study). LibreHardwareMonitor now uses the **PawnIO** driver (WinRing0 removed in v0.9.5) and
   exposes package *power* (W) computed from MSR 0xC001029B deltas — not energy. Treat AMD package
   energy as a *relative, CPU-package-only* indicator; a wall-power meter is required for any
   "system energy" claim. Windows E3/SRUM requires a battery → **not usable on this desktop**.
4. **Fairness traps found that the initial risk list does not cover:** Edge **Startup Boost** (pre-launches
   Edge at sign-in), Edge **sleeping tabs default ON**, Chrome **background tab freezing default ON when
   policy unset**, Chrome **spare renderer process**, Windows 11 **timer-resolution and EcoQoS
   throttling of occluded/minimized windows**, evergreen auto-update mid-study. Pin all via policy +
   flags and record them per trial.
5. **Version pinning:** Chrome for Testing (no auto-update, versioned) and WebView2 **Fixed Version**
   runtime (no auto-update; `browserExecutableFolder`). Edge Stable cannot be pinned the same way →
   record version per trial and block updates during a campaign (method UNCERTAIN, verify P-bench).
6. **Startup "time to interactive" (TTI) is retired** (removed from Lighthouse 10). Use process-start →
   window-visible → FCP → LCP; use LoAF/INP-style metrics for responsiveness. LoAF ≠ dropped frames;
   PresentMon (ETW, admin) is the frame-presentation source of truth.
7. **Statistics:** with n = 30 per arm, a two-sided α = 0.05 test at 80 % power detects only effects of
   roughly **d ≈ 0.72** (normal approx.; DERIVED); after a Bonferroni-style correction to α = 0.005 it
   is ≈ 0.94. Report effect sizes + bootstrap CIs (BCa default in SciPy; fall back to percentile when
   degenerate), Holm or BH correction, randomized/counterbalanced order, and an A/A test.

---

## 1. Per-process memory metrics (Win32 / PSAPI)

### 1.1 Counter semantics

| Field (struct) | Semantics (source) | Additive across processes? | Status |
|---|---|---|---|
| `WorkingSetSize` (PMC / EX / EX2) | "The current working set size, in bytes." Working set = "the set of pages in the virtual address space of the process that are currently resident in physical memory"; contains only pageable allocations (AWE / large pages excluded). | **No** — includes shareable pages (DLL images, shared sections); a page shared by k processes is counted k times. | VERIFIED |
| `PeakWorkingSetSize` | "The peak working set size, in bytes." Lifetime peak of one process. | No (and peaks of different processes occur at different times — summing peaks is meaningless). | VERIFIED |
| `PagefileUsage` | "The Commit Charge value in bytes for this process. Commit Charge is the total amount of private memory that the memory manager has committed for a running process." | **Yes** (private) | VERIFIED |
| `PrivateUsage` (EX / EX2) | "Same as **PagefileUsage**." | **Yes** | VERIFIED |
| `PeakPagefileUsage` | "The peak value in bytes of the Commit Charge during the lifetime of this process." | No (per-process lifetime peak) | VERIFIED |
| `PrivateWorkingSetSize` (EX2 only) | "The current private working set size, in bytes." | **Yes** (private resident pages) | VERIFIED |
| `SharedCommitUsage` (EX2 only) | "The current shared commit usage, in bytes." | **No** (shared) | VERIFIED |

- `PROCESS_MEMORY_COUNTERS_EX2` minimum client: "Windows 10 22H2 with September 2023 cumulative update or
  Windows 11 22H2 with September 2023 cumulative update" — satisfied by the observed Windows 11 Pro
  10.0.26200. VERIFIED (doc); availability on this machine UNCERTAIN until called (verify P-harness).
- Pages trimmed from a working set stay resident as "transition pages" until repurposed; working set
  therefore can drop (e.g. after `EmptyWorkingSet` or memory-manager trimming) without memory being
  freed. VERIFIED (Working Set doc). → Working set is sensitive to system memory pressure and to trimming
  by the app itself; private commit is not affected by trimming.
- `PSAPI_WORKING_SET_EX_BLOCK` (via `QueryWorkingSetEx`) exposes per-page `Shared` and `ShareCount`,
  where **"The maximum value of this member is 7."** VERIFIED. → A proportional-set-size (PSS)
  estimate (Σ page_size / ShareCount) is possible but **saturates at 7 sharers** (Chrome/Edge often
  have > 7 processes mapping the same DLL pages), so any PSS figure is a bounded approximation and
  must be labelled as such. Physical-frame-level de-duplication across processes is **not** exposed by
  these documented APIs (no PFN field). UNCERTAIN whether any other documented user-mode API exposes
  it; verify in P-harness (candidates: `NtQuerySystemInformation` SuperFetch classes — undocumented,
  avoid for reproducibility).

### 1.2 Recommended aggregation (DERIVED)

Per trial and per sample time *t*, over the attributed process set *S(t)*:

| Reported metric | Formula | Rationale |
|---|---|---|
| **Tree private commit** (headline) | Σ_{p∈S(t)} PrivateUsage_p | Additive, unaffected by trimming, matches "memory the app cost the system". |
| **Tree private working set** | Σ PrivateWorkingSetSize_p (EX2) | Additive resident-private memory (closest to "USS"). |
| Tree working set (secondary, flagged) | Σ WorkingSetSize_p | Over-counts shared pages; report only with the caveat and never as headline. |
| Peak tree private commit | max_t Σ PrivateUsage_p(t) from sampling, **or** `PeakJobMemoryUsed` when all processes are in a job | Never Σ of per-process peaks. |
| Optional PSS estimate | Σ_pages size/ShareCount | Bounded (ShareCount ≤ 7); expensive; diagnostic only. |

- Job-wide peak: `JOBOBJECT_EXTENDED_LIMIT_INFORMATION.PeakJobMemoryUsed` = "The peak memory usage of
  all processes currently associated with the job"; "The system tracks the value of
  PeakProcessMemoryUsed and PeakJobMemoryUsed constantly." VERIFIED. The struct's limit fields describe
  "virtual memory that can be committed", so peak-job-memory is commit-based — UNCERTAIN wording
  (the doc does not literally say "commit" for the Peak fields); verify empirically in P-harness by
  comparing with Σ PrivateUsage.
- Sampling between snapshots misses short peaks; job-object peak avoids this. DERIVED.
- Ferrum's **own shell process** (Rust/Tauri host) must be included in Ferrum's set, exactly as the
  Chrome browser process is included in Chrome's. DERIVED (fairness).

## 2. Process-tree attribution

### 2.1 Chromium / Chrome / Edge process model

- Desktop default is full Site Isolation: "In (one-)site-per-process mode, each process is locked to
  documents from a single site." VERIFIED (Chromium docs).
- "On desktop platforms, Chromium sets a 'soft' process limit based on the memory available on a given
  client"; beyond it, same-site processes are reused. VERIFIED. → Process counts (and therefore
  aggregate memory) depend on **installed RAM**; record total physical memory in every result.
- "Chromium often creates a spare RenderProcessHost with a live but unlocked renderer process, which is
  used the next time a renderer process is needed." VERIFIED. → An idle browser carries an extra
  renderer; this is a legitimate cost of the product and must be included, not filtered.
- Non-renderer processes: browser, GPU, network service, utility processes (and crashpad). VERIFIED in
  outline (Chromium docs, summarised); exact list per version UNCERTAIN → enumerate empirically
  (P-harness) via `--type=` command-line argument of each child process (UNCERTAIN mechanism).

### 2.2 WebView2 process model

- "A WebView2 process group includes … A single browser process. One or more renderer processes. Other
  helper processes, such as the GPU process and the Audio service process." VERIFIED.
- "All processes in a WebView2 Runtime processes collection are tied to the browser process, which in
  turn is associated with a single user data folder." Multiple UDFs → multiple process groups. VERIFIED.
- "A given renderer process is not associated with a single `CoreWebView2` instance, because the
  renderer process can serve frames in multiple `CoreWebView2` instances that use the same user data
  folder." VERIFIED. → **Per-tab memory attribution inside Ferrum is not well-defined** when renderers
  are shared; per-tab numbers must be labelled "renderer(s) hosting this tab's frames" (via
  `AssociatedFrameInfos`) and never summed to a total.
- Multiple environments on one UDF must be configured identically or "the second
  `CoreWebView2Environment` will fail to create `WebView2` objects". VERIFIED. (Relevant to the
  owner's Q7 decision — per-site *profiles* in one shared browser process: profiles share the UDF's
  process group.)
- `ICoreWebView2Environment13::GetProcessExtendedInfos` (introduced in SDK 1.0.2210.55): "Gets a
  snapshot collection of `ProcessExtendedInfo`s corresponding to all currently running processes
  associated with this `CoreWebView2Environment` excludes crashpad process", plus associated frames
  for renderers. VERIFIED. → Authoritative Ferrum-side PID set; **crashpad must be added separately**
  (by tree/ETW) for parity with Chrome/Edge, or excluded from all products symmetrically.
- Parent/child relationship of `msedgewebview2.exe` to the host app: UNCERTAIN (only secondary
  sources). Verify in P-harness with ETW/Process Explorer.

### 2.3 Collection mechanisms

| Mechanism | What it gives | Caveats | Status |
|---|---|---|---|
| **Job Object** created by the harness, target launched suspended and assigned | All descendants auto-join ("By default, all child processes are associated with the immediate job and every job in the parent job chain"); nested jobs supported since Windows 8; accounting "aggregated in each parent job". `JOBOBJECT_BASIC_ACCOUNTING_INFORMATION.TotalUserTime/TotalKernelTime` include "all terminated processes no longer associated with the job" → exact tree CPU time. | Children created with `CREATE_BREAKAWAY_FROM_JOB` leave the chain unless a job forbids breakaway. Chrome sandbox uses its own jobs (nesting is allowed since Win8). If the browser **hands off to an already-running instance** (same profile, or Edge Startup Boost) the new tree is empty — use a fresh UDF. | VERIFIED (API docs); Chrome/Edge breakaway behaviour UNCERTAIN → P-harness |
| Parent-PID walk (Toolhelp snapshot) | Simple tree | PID reuse; misses processes whose parent exited; snapshot races. | UNCERTAIN (standard practice; not re-read) |
| ETW kernel process provider (start/stop with parent PID) | Complete lifecycle incl. short-lived children | Requires admin / Performance Log Users; complexity. | UNCERTAIN → P-harness |
| `GetProcessExtendedInfos` (WebView2 only) | Exact environment PID set + frames | Ferrum-only; excludes crashpad. | VERIFIED |
| Chrome/Edge Task Manager / CDP `SystemInfo.getProcessInfo` | Browser's own view | Different metric definitions per browser; not comparable to Win32 counters. | UNCERTAIN |

**Recommendation (DERIVED):** Launch every target (Chrome, Edge, Ferrum, minimal Tauri baseline)
suspended inside a harness-owned Job Object with a fresh profile/UDF; cross-check membership with
`GetProcessExtendedInfos` (Ferrum/baseline) and an ETW process trace (all) during the A/A validation
phase; fail the trial if any PID outside the job appears in the browser's own process list.

## 3. CPU time

- `GetProcessTimes`: kernel/user times are sums over all threads, in 100-ns units; user time "can exceed
  the amount of real time elapsed … if the process executes across multiple CPU cores." VERIFIED.
- `QueryProcessCycleTime`: "The number of CPU clock cycles used by the threads of the process. This value
  includes cycles spent in both user mode and kernel mode." VERIFIED. The doc gives no conversion to
  seconds; cycles depend on frequency (boost/P-states), so cycles ≠ time. DERIVED: report cycle counts
  as a separate, frequency-sensitive metric; do not convert using nominal clock.
- Granularity of `GetProcessTimes` is commonly said to be clock-tick based (~15.6 ms) rather than exact:
  UNCERTAIN (not found in the primary doc) → in P-harness compare against job accounting and cycle time
  for an idle process. Pitfall for **idle CPU**: idle consumption is tiny; measure over long windows
  (minutes) and report CPU-seconds per minute, not instantaneous %.
- Exited processes lose their counters unless captured via Job accounting (which includes terminated
  processes — VERIFIED above). → Use job totals for tree CPU time.
- **Timer resolution:** since Windows 10 2004, `timeBeginPeriod` "no longer affects global timer
  resolution"; and "Starting with Windows 11, if a window-owning process becomes fully occluded,
  minimized, or otherwise invisible or inaudible to the end user, Windows does not guarantee a higher
  resolution than the default system resolution." VERIFIED. Also, "High resolutions can also prevent the
  CPU power management system from entering power-saving modes." VERIFIED. → Idle-CPU/energy results
  depend on window **visibility state**: harness must fix window state (visible, same size, same
  monitor, not occluded) for all products and record it.
- **EcoQoS:** opting into `PROCESS_POWER_THROTTLING_EXECUTION_SPEED` classifies a process as EcoQoS
  ("reducing CPU frequency or using more power efficient cores"); otherwise "the system will use its own
  heuristics to automatically infer a Quality of Service level." VERIFIED. Chromium reportedly applies
  EcoQoS to background processes (feature `UseEcoQoSForBackgroundProcess`): UNCERTAIN (secondary
  source only) → verify in P-bench via `GetProcessInformation(ProcessPowerThrottling)` on each child.

## 4. Frame timing and startup boundaries

### 4.1 Frames

| Source | Measures | Caveats | Status |
|---|---|---|---|
| **PresentMon** (Intel, MIT, latest v2.6.0, 2026-09-21) | ETW-based per-present data: `MsBetweenPresents`, `MsInPresentAPI`, `MsUntilDisplayed`, `DisplayedTime`, `MsBetweenDisplayChange`, `PresentMode`; target by `--process_name` / `--process_id`. | Requires elevation (or Performance Log Users membership); Chromium presents come from the **GPU process**, so target that PID. Composition path (DComp / DWM) differs between browser windows and an embedded WebView2 → `PresentMode` must be compared. | VERIFIED (tool/metrics); per-product present path UNCERTAIN → P-bench |
| `requestAnimationFrame` deltas in page | Main-thread frame callbacks | Measures callbacks, not displayed frames; throttled in background/occluded. | UNCERTAIN (standard knowledge) |
| **LoAF** (`PerformanceObserver` type `long-animation-frame`) | Rendering updates delayed > 50 ms; attrs `duration`, `blockingDuration`, `renderStart`, `styleAndLayoutStart`, `scripts`; shipped Chrome 123. | Responsiveness signal, **not** a dropped-frame counter. Available in Chrome, Edge and WebView2 at version 154 (Chromium-based) — UNCERTAIN for WebView2 until tested. | VERIFIED (API); WebView2 UNCERTAIN → P-bench |
| Chrome tracing (CDP `Tracing`) | Compositor frame events | Heavy overhead; event names change across versions. | UNCERTAIN |

### 4.2 Startup boundaries (recommended chain, DERIVED)

| Boundary | How to observe (all products) | Status |
|---|---|---|
| T0 process start | Harness timestamp at `CreateProcess` (QPC) + `GetProcessTimes` creation time | VERIFIED (API) |
| T1 first window visible | Win32 event hook / ETW for window show of the top-level window owned by the job | UNCERTAIN mechanism → P-harness |
| T2 navigation start → FCP | Paint Timing API `first-contentful-paint` (ignore background-tab entries; bfcache not reported; prerender uses `activationStart`) | VERIFIED (web.dev) |
| T3 LCP | `largest-contentful-paint` entries | UNCERTAIN (not re-read) |
| ~~TTI~~ | **Do not use**: "TTI was removed as a metric from Lighthouse 10 … overly sensitive to outlier network requests and long tasks"; use LCP, TBT, INP instead | VERIFIED |

- Edge **Startup Boost** "Allows Microsoft Edge processes to start at OS sign-in and restart in
  background after the last browser window is closed"; when not configured it "may initially be off or
  on". VERIFIED. → Edge cold-start numbers are invalid unless Startup Boost is disabled via policy
  (`StartupBoostEnabled`=0) and no `msedge.exe` is running before T0.
- Cold vs warm start must be defined (file cache state). Flushing the standby list requires privileged
  tools — UNCERTAIN method → P-bench; minimum: report "warm" start after N discarded warm-up launches.
- Playwright for WebView2 uses `connectOverCDP` with `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=
  --remote-debugging-port=…`; Playwright warns this connection "is significantly lower fidelity than
  the Playwright protocol connection". VERIFIED. → Use **the same `connectOverCDP` path for Chrome and
  Edge too** so instrumentation overhead is symmetric (DERIVED); measure the overhead of an attached CDP
  client in the A/A phase. Note `--remote-debugging-port` itself may change behaviour (UNCERTAIN).

## 5. Energy on an AMD Ryzen desktop

### 5.1 AMD RAPL-equivalent counters

- LibreHardwareMonitor's `Amd17Cpu.cs` (Family 17h+ i.e. Zen and later) reads
  `MSR_PWR_UNIT = 0xC0010299`, `MSR_PKG_ENERGY_STAT = 0xC001029B` and per-core
  `MSR_CORE_ENERGY_STAT = 0xC001029A`, computes Δenergy (handling 32-bit wrap) ÷ Δt and publishes a
  **"Package" power sensor (W)**, plus per-core "(SMU)" power. VERIFIED (source code read). → LHM
  exposes *power averaged over its polling interval*, not a cumulative energy counter; the harness must
  integrate W × Δt and its sampling interval adds error, or (better) read the MSR energy counter
  directly through PawnIO. The 32-bit counter wraps; poll often enough (wrap period depends on energy
  unit and power — DERIVED, compute in P-bench from the observed unit).
- Schöne et al., "Energy Efficiency Aspects of the AMD Zen 2 Architecture" (arXiv:2108.00808v2, TU
  Dresden): "the energy data is modeled, not measured"; "No DRAM domain is available";
  "DRAM energy consumption is not (fully) included in the package domain"; "RAPL package domain reports
  significantly lower power compared to the external measurement"; update rate ≈ 1 ms; conclusion that
  AMD's RAPL is unsuitable to optimize total energy consumption. VERIFIED (ar5iv full text, via
  summariser — exact quotes UNCERTAIN in wording, substance consistent across abstract + body).
  **Applicability to the owner's (unknown-generation) Ryzen: UNCERTAIN** — Zen 2 findings may not hold
  for Zen 3/4/5; no Zen 3+ validation study was found in this session.
- Raffin & Trystram, "Dissecting the software-based measurement of CPU energy consumption: a comparative
  analysis" (arXiv:2401.15985, rev. 2024-07-19) — Rust-based RAPL access mechanisms on Intel & AMD.
  VERIFIED (metadata/abstract only); AMD-specific findings not read → UNCERTAIN.
- Khan et al., "RAPL in Action" (ACM TOMPECS 2018, doi 10.1145/3177754) — Intel-focused. VERIFIED
  (metadata only).

### 5.2 Driver status (WinRing0 → PawnIO)

- LHM **v0.9.5 (2026-01-07)** release notes: "Swap WinRing0 to PawnIO", "Use PawnIO driver directly in
  LibreHardwareMonitorLib", "Add option to disable Ring0 driver installation"; **AMD Family 10h support
  temporarily disabled**. **v0.9.6 (2026-02-14)**: "Update PawnIO modules to 2.2", "Fix for new PawnIO
  release + new installer". VERIFIED (GitHub API).
- PawnIO: "a scriptable universal kernel driver"; official edition "digitally signed"; maintained by
  namazso; latest PawnIO.Setup release 2.2.0 (2026-03-15). VERIFIED.
- WinRing0 is detected by Microsoft Defender (e.g. `HackTool:Win32/Winring0`, `VulnerableDriver:WinNT/Winring0`)
  because of CVE-2020-14979 (arbitrary memory read/write). UNCERTAIN (secondary sources: PCWorld,
  Neowin, vendor forums) — consistent across sources. → **Never install WinRing0**; use LHM ≥ 0.9.5
  with PawnIO, or read MSRs via PawnIO's AMD module directly.
- Installing a kernel driver and running the sampler elevated is itself a measurement perturbation and a
  security decision → owner approval needed (ADR) before P-bench. Admin rights required: UNCERTAIN
  (expected for MSR access) → verify.

### 5.3 Windows E3 / SRUM

- "Today the E3 measurement capability is subject to one important constraint: it needs to be executed on
  a device which contains a battery." and "The data provided are estimates and don't necessarily reflect
  the energy at the wall". VERIFIED (Microsoft DevBlogs, 2020-09-14). → **E3/SRUM (`powercfg /srumutil`)
  is unsuitable on this desktop**; mark unsupported. Whether this constraint still holds in 2026:
  UNCERTAIN (verify by running `powercfg /srumutil` in P-bench; record output).

### 5.4 External meters

- An AC wall-power logging meter is the only way to support whole-system energy claims (DERIVED from
  §5.1 limitations). Device choice, accuracy class and logging rate: UNCERTAIN — owner question.
  Wall power includes PSU loss, GPU, fans, display (if powered from same strip); measure **idle
  baseline** per session and report Δ over baseline.

### 5.5 Recommended energy claims policy (DERIVED)

| Claim | Allowed with | Label |
|---|---|---|
| "CPU package energy (modeled) differed by X J" | PawnIO/LHM MSR readings, same session, randomized order | "AMD package energy counter (modeled; excludes DRAM; not wall energy)" |
| "System energy differed by X J" | Calibrated external meter only | — |
| Per-process energy | **Not supported** (no per-process attribution on desktop: E3 needs battery) | Mark unsupported |

## 6. Fairness controls

### 6.1 Browser features that change resource use (record + pin per trial)

| Feature | Default (source) | Control | Status |
|---|---|---|---|
| Edge sleeping tabs | "By default, sleeping tabs is turned on." Policy `SleepingTabsEnabled` (REG_DWORD, HKLM/HKCU `SOFTWARE\Policies\Microsoft\Edge`). Even when disabled "during moderate memory pressure, the system may freeze (sleep) tabs before discarding them." | Policy + per-trial record | VERIFIED |
| Edge energy saver (ex-efficiency mode) | Default `BalancedSavings`; "On devices with no battery, energy saver is disabled by default and does not become active" (except `AlwaysActive` or `EfficiencyModeEnabled`). | Policy `EfficiencyMode`=1 (NeverActive) for explicitness | VERIFIED |
| Edge Startup Boost | "may initially be off or on" | `StartupBoostEnabled`=0 | VERIFIED |
| Chrome Memory Saver (`HighEfficiencyModeEnabled`) | Policy `default: null` → user-controlled. Whether the *setting* is on by default: **conflicting** — support page summary says not enabled by default; 2023 press says enabled by default. | Set explicitly via policy; screenshot/record `chrome://settings/performance` | Policy VERIFIED; default UNCERTAIN |
| Chrome `MemorySaverModeSavings` | 0 Moderate / 1 Balanced / 2 Maximum; only effective when Memory Saver enabled | Policy | VERIFIED |
| Chrome background tab freezing (`BackgroundTabFreezingEnabled`) | "Not setting the policy means background tab freezing is enabled by default" | Policy | VERIFIED |
| Chrome Battery/Energy Saver (`BatterySaverModeAvailability`) | Throttles frame rate; `EnabledBelowThreshold` on battery | Policy 0 (Disabled) — irrelevant on desktop but set for explicitness | VERIFIED |
| Chrome launch flags | `--no-first-run`, `--user-data-dir`, `--no-default-browser-check`, `--disable-extensions`, `--disable-component-update`, `--disable-background-networking`, `--disable-background-timer-throttling`, `--disable-renderer-backgrounding`, `--disable-backgrounding-occluded-windows`; doc stresses use cases differ | **Design choice**: disabling throttling makes browsers *less* efficient than shipped defaults → benchmark **as-shipped defaults** for headline, and use flags only in labelled ablations. | Flags VERIFIED; recommendation DERIVED |
| WebView2 equivalents | Sleeping tabs/Memory Saver are browser-UI features; WebView2 has `TrySuspend` / `MemoryUsageTargetLevel` (Ferrum's own policy) | Report Ferrum's lifecycle policy on/off as experimental factor | UNCERTAIN (APIs covered by another note) |

**Owner decision needed (fairness framing):** compare (a) *as-shipped defaults* of each product, (b)
*matched* configuration (all memory-saving features off), or both. Recommended: both, with (a) as the
headline and (b) as the controlled comparison. DERIVED.

### 6.2 Version pinning and recording

- **Chrome for Testing**: "a dedicated flavor of Chrome targeting the testing use case, without
  auto-update"; versioned binaries per release. VERIFIED. Differences vs. branded Chrome for
  performance (e.g. field trials / variations, Google-branded components): UNCERTAIN → either benchmark
  branded Chrome with updates blocked and version recorded, or CfT, and state which.
- **WebView2 Fixed Version**: "The WebView2 Runtime on the client isn't automatically updated";
  "The most-patched version of the latest and second-latest major releases are available for download …
  Keep an archived copy"; point to it with `browserExecutableFolder` (or env
  `WEBVIEW2_BROWSER_EXECUTABLE_FOLDER`); > 250 MB; cannot run from UNC path; the `icacls` ACL step is
  documented for **Windows 10** unpackaged apps (Windows 11 unaffected). VERIFIED.
- **Evergreen**: "The client uses the new version of the WebView2 Runtime when your WebView2 app is
  restarted"; Edge and Evergreen runtime binaries are **hard-linked** on eligible systems when on the
  same version ("benefits for disk footprint, memory, and performance"). VERIFIED. → Ferrum (Evergreen)
  and Edge may **share mapped image pages** when versions match — another reason not to use summed
  working set; and switching Ferrum to Fixed Version changes this sharing (record the mode).
- Observed versions (01-scoping-decisions): WebView2 154.0.4258.62, Edge 154.0.4258.x, Chrome
  154.0.8037.x. Record exact four-part versions **per trial** (registry `pv` for WebView2; executable
  file version for Chrome/Edge). Abort/flag a campaign if any version changes mid-run (DERIVED).
- Blocking Edge/Chrome auto-update during a campaign: method UNCERTAIN (policies/services) → P-bench.

### 6.3 OS noise (DERIVED unless stated)

- Fixed power plan (record `powercfg /getactivescheme`), AC power, no other user apps, Windows Update
  paused, Defender real-time scanning **left on but recorded** (disabling it may be blocked by Tamper
  Protection — UNCERTAIN), search indexing state recorded, fixed display resolution/refresh rate,
  single monitor, ambient temperature and CPU temperature logged, cool-down until package temperature
  and idle power return within a tolerance of the session baseline.
- Interleave products in randomized blocks so slow drifts (thermal, background tasks, updates) spread
  across arms instead of biasing one.

## 7. Statistics

### 7.1 Design
- Randomized block design: each block runs every product × workload once in a random (or Latin-square
  counterbalanced) order; ≥ 30 blocks where practical (master prompt target). DERIVED.
- Warm-up launches discarded and reported. Pre-registered primary metrics per dimension, written before
  data collection (P-bench gate). DERIVED.
- **A/A test**: run the *same* product as two labelled arms through the full pipeline; the analysis must
  show no "significant" difference at the chosen error rate and yields the harness noise floor
  (minimum detectable difference). DERIVED.

### 7.2 Power / sample size (DERIVED, normal approximation, two-sample, two-sided, power 0.80)

| n per arm | min. detectable d (α=0.05) | min. detectable d (α=0.005) |
|---|---|---|
| 10 | 1.25 | 1.63 |
| 20 | 0.89 | 1.15 |
| 30 | 0.72 | 0.94 |
| 50 | 0.56 | 0.73 |

(t-distribution values are slightly larger. Computed in-session with Python `statistics.NormalDist`.)
→ 30 trials detect only medium-to-large standardized effects; small but practically relevant
differences (e.g. a few MB of private commit) may need more blocks if variance is high. Use the A/A
noise floor to decide (sequential stopping must be pre-registered to avoid optional-stopping bias).

### 7.3 Confidence intervals
- SciPy 1.18.0 `scipy.stats.bootstrap`: methods `'percentile'`, `'basic'`, `'BCa'`; **default
  `method='BCa'`, `n_resamples=9999`, `confidence_level=0.95`**; BCa CI elements "may be NaN … if the
  bootstrap distribution is degenerate" (DegenerateDataWarning). VERIFIED. → Use BCa for medians and
  mean differences; fall back to percentile and report when degenerate. Fix and record the RNG seed.
- Efron 1987, "Better Bootstrap Confidence Intervals", JASA, doi 10.1080/01621459.1987.10478410
  (BCa origin). Efron 1979, Annals of Statistics, doi 10.1214/aos/1176344552. VERIFIED (Crossref
  metadata only).

### 7.4 Effect sizes
- Hedges' g (bias-corrected standardized mean difference): Hedges 1981, J. Educational Statistics,
  doi 10.3102/10769986006002107. VERIFIED (metadata).
- Cliff's delta (ordinal dominance, robust to non-normal/heavy-tailed data typical of latency): Cliff
  1993, Psychological Bulletin, doi 10.1037/0033-2909.114.3.494. VERIFIED (metadata).
- Always also report the **raw difference in natural units** (MB, ms, J) with CI and the ratio — the
  practical-significance threshold per metric must be pre-registered (master prompt: distinguish
  "statistically detectable" from "practically meaningful"). DERIVED.

### 7.5 Multiple comparisons
- Many metrics × workloads × competitor pairs → control family-wise error with Holm (Holm 1979,
  Scandinavian Journal of Statistics 6(2) — UNCERTAIN citation details, Crossref lookup failed) or
  false-discovery rate with Benjamini–Hochberg (JRSS-B 1995, doi 10.1111/j.2517-6161.1995.tb02031.x —
  VERIFIED metadata). Define families in the pre-registration. DERIVED.

### 7.6 Benchmarking-methodology literature (metadata VERIFIED via Crossref; content not re-read → UNCERTAIN)
- Georges, Buytaert, Eeckhout, "Statistically rigorous Java performance evaluation", OOPSLA 2007,
  doi 10.1145/1297027.1297033.
- Mytkowicz, Diwan, Hauswirth, Sweeney, "Producing wrong data without doing anything obviously wrong!",
  ASPLOS 2009, doi 10.1145/1508244.1508275 (measurement bias from environment/setup).
- Kalibera, Jones, "Rigorous benchmarking in reasonable time", ISMM 2013, doi 10.1145/2464157.2464160
  (multi-level repetition design).
- Alt et al., "An Experimental Setup to Evaluate RAPL Energy Counters for Heterogeneous Memory",
  ICPE 2024, doi 10.1145/3629526.3645052.

## 8. Tools and crates

| Tool / crate | Fact | Status |
|---|---|---|
| `windows` crate (Microsoft) | latest stable **0.62.2** on crates.io (updated 2025-10-06) | VERIFIED |
| `sysinfo` crate | latest stable **0.39.6** (crates.io). On Windows `memory()` = `WorkingSetSize`, `virtual_memory()` = `PrivateUsage` (source `src/windows/process.rs`, uses `PROCESS_MEMORY_COUNTERS_EX`); `cpu_usage()` needs two refreshes separated by ≥ `MINIMUM_CPU_UPDATE_INTERVAL`. | VERIFIED |
| → implication | `sysinfo::memory()` is the **double-counting** metric and its name ("virtual_memory") for private commit is misleading; no `PrivateWorkingSetSize`. **Use direct `windows` crate calls** (`GetProcessMemoryInfo` with EX2, `GetProcessTimes`, `QueryProcessCycleTime`, Job Object APIs) in the Rust orchestrator; sysinfo at most for convenience/cross-check. | DERIVED |
| psutil (Python, analysis side) | `memory_info().rss` → `WorkingSetSize`; `vms` → "`PrivateUsage` (private committed pages only), which differs from the UNIX definition"; `memory_full_info()` "deprecated since version 8.0.0 … use `memory_footprint()`"; `cpu_percent()` first call returns 0.0. | VERIFIED |
| PresentMon | v2.6.0 (2026-09-21), MIT, ETW, needs elevation | VERIFIED |
| LibreHardwareMonitor | v0.9.6 (2026-02-14), PawnIO-based | VERIFIED |
| PawnIO | 2.2.0 (2026-03-15), signed official edition | VERIFIED |
| WPR/WPA (Windows Performance Toolkit) | ETW capture/analysis for process lifecycle, CPU sampling | UNCERTAIN (not researched this session) |

## 9. Items that contradict or extend the owner's decisions / initial risk list

1. **Risk (4) "AMD energy counters need admin + kernel driver, CPU-package only"** — confirmed and
   *strengthened*: counters are **modeled**, **exclude DRAM**, and **under-report vs. wall power**
   (Zen 2 evidence). LHM's old driver (WinRing0) is a Defender-flagged vulnerable driver; LHM ≥ 0.9.5
   uses PawnIO. Q6 wording "AMD RAPL-equivalent counters through LibreHardwareMonitor" is workable
   but must be labelled "modeled CPU-package energy", and an external meter is needed for any system
   energy claim. LHM exposes *power*, not cumulative energy → integration error.
2. **Risk (5) fair process-tree attribution** — extended: name-based process matching is unsafe
   (other WebView2 hosts, Edge Startup Boost); WebView2 renderers are shared across WebViews on a UDF
   so per-tab attribution is ill-defined; Evergreen WebView2 and Edge binaries are hard-linked (shared
   image pages) on matching versions.
3. **Q7 (per-site profiles in one shared browser process)** — measurement consequence: all profiles share
   one process group; per-site memory isolation cannot be measured per profile by PID alone.
4. **Q10/Q9 Playwright over CDP** — risk (6) confirmed by Playwright's own "significantly lower fidelity"
   warning; to stay fair, drive Chrome/Edge through the same CDP path.
5. **New risks:** timer-resolution/EcoQoS behaviour depends on window visibility (Win 11); Chrome
   background tab freezing default-on; Edge sleeping tabs default-on; Chrome soft process limit depends
   on RAM; E3/SRUM unavailable without a battery; `sysinfo` metric naming misleads.
6. **Master prompt metric "time to interactive"** — retired upstream; propose replacing with
   FCP/LCP + LoAF/INP-style responsiveness.

## 10. Open questions for the owner

1. Exact CPU model (Zen generation) and RAM size? (Zen 2 RAPL findings may not transfer; Chromium
   process limits depend on RAM.)
2. Will you buy/use a logging wall-power meter? If not, energy claims are limited to "modeled CPU
   package energy".
3. Approve installing PawnIO (signed kernel driver) + running the sampler elevated during benchmarks?
4. Fairness framing: as-shipped defaults, matched configuration, or both (recommended both)?
5. Branded Chrome (updates blocked, version recorded) or Chrome for Testing?
6. Ferrum benchmarks on Evergreen runtime (realistic; shares pages with Edge) or Fixed Version
   (reproducible), or both?

## 11. Verification plan hooks (phase tags)

| Item | Verify in |
|---|---|
| EX2 counters available on this machine; job peak semantics vs Σ PrivateUsage | P-harness (M5) |
| WebView2 parent/child + crashpad membership; Chrome/Edge job breakaway | P-harness (M5) |
| `GetProcessTimes` granularity vs cycle time | P-harness (M5) |
| PresentMon target PID / present mode per product; LoAF in WebView2 154 | P-bench |
| PawnIO MSR access, energy unit, wrap period, LHM vs direct MSR | P-bench (energy sub-phase) |
| `powercfg /srumutil` on this desktop | P-bench |
| Chrome Memory Saver actual default on this install | P-bench (record `chrome://settings/performance`) |
| Update-blocking method for Chrome/Edge | P-bench |
| A/A noise floor → sample-size decision | P-bench gate before comparative runs |
