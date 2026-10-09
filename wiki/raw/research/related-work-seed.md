---
id: research-related-work-seed
type: research-note
title: Related-work SEED list (tab lifecycle, browser/WebView resource use, energy measurement, mobile lifecycle, cost-aware eviction)
updated: 2026-10-08
sources:
  - https://www.chromium.org/chromium-os/chromiumos-design-docs/tab-discarding-and-reloading
  - https://developer.chrome.com/docs/web-platform/page-lifecycle-api
  - https://developer.chrome.com/blog/freezing-on-energy-saver
  - https://blog.google/products/chrome/new-chrome-features-to-save-battery-and-make-browsing-smoother/
  - https://blogs.windows.com/msedgedev/2020/12/09/sleeping-tabs-beta-performance/
  - https://blogs.windows.com/msedgedev/2022/12/06/sleeping-tabs-edge-105-sleep-before-discarding/
  - https://blogs.windows.com/windowsexperience/2016/06/20/more-battery-with-edge/
  - https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/performance
  - https://api.crossref.org (DOI metadata lookups, see per-entry)
  - https://arxiv.org/abs/2108.00808
  - https://platypusattack.com/
  - https://source.android.com/docs/core/perf/lmkd
  - https://developer.android.com/topic/performance/appstandby
  - https://developer.apple.com/documentation/uikit/managing-your-app-s-life-cycle
  - https://www.usenix.org/conference/atc20/presentation/lebeck
  - https://www.usenix.org/conference/usits-97/cost-aware-www-proxy-caching-algorithms
  - https://www.usenix.org/conference/usenixsecurity19/presentation/reis
---

# Related-work SEED list

> **This is a SEED list, not a literature review.** It exists so later phases start from real,
> checked sources instead of memory. **The novelty of Ferrum's adaptive lifecycle policy is NOT
> established** — several entries below (Chrome freezing heuristics, Edge sleeping tabs under memory
> pressure, Android App Standby Buckets, GreedyDual-Size) are close prior art for "resource/cost-aware
> lifecycle policy". A full, systematic literature review is a **P8 / research-track deliverable** and
> must precede any novelty claim in the manuscript.
>
> No Ferrum measurements exist. Numbers quoted below are the *sources'* claims, reproduced only to
> characterise those sources. Vendor numbers are **vendor claims** (aggregate telemetry / internal
> lab), not independently reproducible, and must never be used as a Ferrum baseline.

Access date for every URL: **2026-10-08**.

Verification legend:
- **VERIFIED** — the primary page (publisher/USENIX/vendor/official docs) or Crossref DOI record was
  fetched in session and title/authors/venue/year matched; content claims were read in that source.
- **UNCERTAIN** — the specific claim was not read in a primary source (e.g. only in a search snippet,
  or an automated summary of a page I could not read in full).

Note on method: Crossref metadata (`https://api.crossref.org/works/<DOI>`) was used to confirm
title/authors/venue/year/pages for DOIs. For several papers only metadata (not full text) was read;
the "relevance" lines for those are framed as *why to read it*, not as claims about its findings.

---

## A. Chrome / Chromium tab discarding, freezing, Memory Saver

### A1. The Chromium Projects — "Tab Discarding and Reloading" (Chromium OS design doc)
- URL: https://www.chromium.org/chromium-os/chromiumos-design-docs/tab-discarding-and-reloading
- Verification: VERIFIED — page fetched; title matched; no author/date on page.
- Content read: background tabs are silently closed under low memory and reload on click; discard
  order: internal pages → tabs not accessed recently → recently accessed → tabs playing audio → apps in
  windows → pinned → active tab. Rationale given: Chrome OS avoids swap to spare flash wear.
- Relevance: canonical early description of a **fixed-priority, recency-based discard ordering** —
  essentially Ferrum's "fixed idle-time" and "memory-pressure" baselines (policies 2–3).

### A2. Philip Walton — "Page Lifecycle API", Chrome for Developers (updated 2023-12-01)
- URL: https://developer.chrome.com/docs/web-platform/page-lifecycle-api
- Verification: VERIFIED — page fetched; author and update date read on page.
- Content read: states Active, Passive, Hidden, Frozen, Terminated, Discarded; Frozen = browser
  suspends freezable tasks; Discarded is not observable at the time, detectable later via
  `document.wasDiscarded`; recommends persisting state on transition to hidden.
- Relevance: the web-platform contract pages can observe. Ferrum's ACTIVE/…/DISCARDED state machine
  should map onto these states, and its "unsaved form risk" heuristics should account for pages that
  rely on `freeze`/`resume`/`wasDiscarded`. Whether WebView2 fires these events on `TrySuspend` is
  **UNVERIFIED (verify in lifecycle phase via a probe page)**.

### A3. François Doray — "Freezing on Energy Saver", Chrome for Developers blog, 2025-01-20
- URL: https://developer.chrome.com/blog/freezing-on-energy-saver
- Verification: VERIFIED — page fetched; author/date on page.
- Content read: from Chrome 133, when Energy Saver is active, a browsing context group is frozen if all
  pages have been hidden and silent > 5 minutes and some same-origin frame subgroup is "CPU-intensive";
  exemptions for audio/video conferencing (mic/camera/capture/RTCPeerConnection), external-device
  APIs (WebUSB/Bluetooth/HID/Serial), and Web Locks / IndexedDB connections blocking others; opt-out
  origin trial `BackgroundPageFreezeOptOut`; inspect via `chrome://discards`.
- Relevance: **direct prior art for a resource-aware (CPU-based) lifecycle policy with an explicit
  safety-exemption list** — Ferrum's adaptive policy and "never discard during destructive operation"
  rule overlap substantially. The exemption list is a ready-made checklist for Ferrum's safety rules.

### A4. Mark Chang — "New Chrome features to save battery and make browsing smoother", Google Keyword blog, 2022-12-08
- URL: https://blog.google/products/chrome/new-chrome-features-to-save-battery-and-make-browsing-smoother/
- Verification: VERIFIED — page fetched; author/date on page.
- Content read: announces Memory Saver (frees memory from inactive tabs, reload on return, site
  exemptions) and Energy Saver (at 20% battery, limits background activity/visual effects). Claims
  Chrome "uses up to 40% and 10GB less memory" — **vendor claim; no methodology on page**.
- Relevance: establishes that the user-facing "inactive tab discard + allowlist" feature ships in the
  main competitor; Ferrum benchmarks vs Chrome must record whether Memory Saver/Energy Saver were on.

## B. Microsoft Edge sleeping tabs (vendor claims)

### B1. Eleanor Huynh — "Sleeping Tabs in Microsoft Edge: Delivering better browser performance", Microsoft Edge Blog, 2020-12-09
- URL: https://blogs.windows.com/msedgedev/2020/12/09/sleeping-tabs-beta-performance/
- Verification: VERIFIED — page fetched; title/author/date on page.
- Vendor claims (verbatim per fetch): "reduces memory usage by 32% on average"; "a sleeping tab uses
  37% less CPU on average than a non-sleeping tab"; basis "experimentation in Microsoft Edge Canary and
  Dev channels, aggregated across ~40,000 devices". No measurement methodology described.
- Relevance: vendor telemetry, not reproducible; useful only to motivate the problem and as a
  hypothesis scale, never as a baseline.

### B2. Microsoft Edge Team — "Sleeping Tabs in Microsoft Edge: Saving extra resources when you need it most", Microsoft Edge Blog, 2022-12-06
- URL: https://blogs.windows.com/msedgedev/2022/12/06/sleeping-tabs-edge-105-sleep-before-discarding/
- Verification: VERIFIED — page fetched (date/author per fetch summary).
- Vendor claims: from Edge 105, high-resource tabs are slept automatically when device memory is near
  its limit; "Sleeping a tab saves 83% of its memory on average"; "In September 2022, we slept 1.38
  billion tabs". Distinguishes **sleep (resume without reload)** from **discard (full reload)**.
- Relevance: (i) memory-pressure-triggered, resource-ranked sleeping = prior art for Ferrum policy 3/4;
  (ii) the sleep-vs-discard distinction should be explicit in Ferrum's state machine (WebView2
  `TrySuspendAsync` ≈ sleep; destroying the WebView ≈ discard).

### B3. Jason Weber — "Get more out of your battery with Microsoft Edge", Windows Experience Blog, 2016-06-20
- URL: https://blogs.windows.com/windowsexperience/2016/06/20/more-battery-with-edge/
- Verification: VERIFIED — page fetched.
- Vendor claims: lab rig (Surface Book, automated browsing) Edge 2,068 mW vs Chrome 2,819 mW vs
  Firefox 3,161 mW; telemetry averages also reported. Note: this is **legacy EdgeHTML Edge (2016)**,
  not today's Chromium Edge.
- Relevance: example of a vendor energy comparison and its methodology shape; historical only — not
  applicable to current Edge/WebView2.

## C. WebView2 resource management (official docs)

### C1. Microsoft Learn — "Performance best practices for WebView2 apps" (ms.date 2026-01-12)
- URL: https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/performance
- Verification: VERIFIED — page fetched (full markdown read).
- Content read: recommends one shared `CoreWebView2Environment` across controls to save memory;
  "app-level process sharing" via identical user data folder + options (shares cookies/caches);
  set `MemoryUsageTargetLevel = Low` on inactive WebViews ("may prompt the browser engine to drop cached
  data or swap memory to disk"); `TrySuspendAsync()` suspends the renderer and pauses scripts, resume
  with `Resume()`; "These `Try` operations are best-effort"; also notes "Each WebView2 control creates
  its own set of processes, such as browser, renderer, and GPU".
- Relevance: the primitives Ferrum's lifecycle manager will actually call. Supports owner risk #3
  (these are WebView2 COM APIs; reachability via Tauri/wry is **UNVERIFIED — verify in the
  WebView2-integration phase**). The doc's two statements about process sharing vs per-control
  processes must be reconciled empirically for Q7 (profiles in a shared browser process).

## D. Browser / web / hybrid-app resource and energy studies (academic)

### D1. Reis, Moshchuk, Oskov — "Site Isolation: Process Separation for Web Sites within the Browser", 28th USENIX Security Symposium (2019), pp. 1661–1678
- URL: https://www.usenix.org/conference/usenixsecurity19/presentation/reis
- Verification: VERIFIED — USENIX page fetched; title/authors/venue/pages matched.
- Relevance: the security architecture that drives Chromium's (and WebView2's) process count; explains
  why discarding/consolidation trades against isolation. Any Ferrum policy must not weaken it. (Paper
  reports overhead numbers; not read in full here — read before citing figures.)

### D2. Thiagarajan, Aggarwal, Nicoara, Boneh, Singh — "Who Killed My Battery? Analyzing Mobile Browser Energy Consumption", WWW 2012, pp. 41–50. DOI: 10.1145/2187836.2187843
- Verification: VERIFIED — Crossref metadata + author's abstract page
  (https://crypto.stanford.edu/~dabo/pubs/abstracts/browserpower.html) fetched.
- Content read (abstract): component-level energy of page rendering; CSS/JS download+parse is a large
  fraction; 30% energy reduction on Wikipedia mobile via script changes.
- Relevance: foundational browser-energy measurement methodology (mobile); informs workload design.

### D3. Aloísio, Gonçalves, de Macedo, Pereira, Saraiva — "Energy Wars — Chrome vs. Firefox: Which browser is more energy efficient?", SUSTAIN-SE workshop @ ASE 2020
- URL: https://conf.researchr.org/details/ase-2020/ase-2020--workshop--sustainse/4/Energy-Wars-Chrome-vs-Firefox-Which-browser-is-more-energy-efficient-
- Verification: VERIFIED (researchr programme page: title/authors/venue/year). DOI: none on page —
  **UNCERTAIN whether formally published in proceedings**.
- Relevance: preliminary desktop browser energy comparison with simulated user interactions; a
  closely related methodology precedent for Ferrum's workloads.

### D4. Horn, Lahnaoui, Reinoso, Peng, Isakov, Islam, Malavolta — "Native vs Web Apps: Comparing the Energy Consumption and Performance of Android Apps and their Web Counterparts", MOBILESoft 2023, pp. 44–54. DOI: 10.1109/MOBILSoft59058.2023.00013 (arXiv 2308.16734)
- Verification: VERIFIED — Crossref metadata; abstract read via arXiv search result
  (abstract text UNCERTAIN in exact wording).
- Content (abstract): 10 platforms; native apps consume significantly less energy; web apps use more
  CPU and memory (large effect sizes).
- Relevance: rigorous experiment design template (effect sizes, statistics) for web-vs-native style
  comparisons — analogous to Ferrum-vs-browser.

### D5. Kosasih W, Engel — "Performance Comparison of Tauri and Electron Frameworks in Multiplatform Desktop Application Development", bit-Tech 8(3):3875–3882, 2026. DOI: 10.32877/bt.v8i3.3733
- Verification: VERIFIED — Crossref metadata and abstract read.
- Content (abstract): identical Next.js-derived apps; Tauri installer ~99% smaller and "up to ten
  times lower RAM usage during idle".
- Relevance: the only peer-reviewed Tauri-vs-Electron resource study found. **Caution:** low-profile
  venue; whether RAM accounting included the WebView2 child processes is **UNVERIFIED** — this is
  exactly owner risk #5 (process-tree attribution). Do not cite its numbers without reading method.

### D6. Chang, Hahn, Kim, Coupland, Breneisen, Kim, Hwong, Kittur — "When the Tab Comes Due: Challenges in the Cost Structure of Browser Tab Usage", CHI 2021, pp. 1–15. DOI: 10.1145/3411764.3445585
- Verification: VERIFIED — Crossref metadata (title/authors/venue/year). Findings only via CMU news
  coverage in search — **UNCERTAIN**.
- Relevance: user-side evidence of many long-lived tabs used as reminders; motivates the workload
  ("many idle tabs") and the usability cost of discards.

## E. Software energy measurement / RAPL validation

### E1. Khan, Hirki, Niemi, Nurminen, Ou — "RAPL in Action: Experiences in Using RAPL for Power Measurements", ACM TOMPECS 3(2), Article 9, pp. 1–26, 2018. DOI: 10.1145/3177754
- Verification: VERIFIED — Crossref metadata (title, 5 authors, journal, vol 3 issue 2, pages 1–26,
  issued 2018-03-22) and abstract read. (Article number 9 seen in search results only — UNCERTAIN.)
- Content (abstract): studies strengths/weaknesses of **Intel's** RAPL for CPU and DRAM using
  microbenchmarks and Stream/Stress-ng etc.
- Relevance: standard RAPL caveats reference. **Its evidence is about Intel RAPL; it does not validate
  AMD counters** — must not be cited as support for AMD energy measurement.

### E2. Hähnel, Döbel, Völp, Härtig — "Measuring energy consumption for short code paths using RAPL", ACM SIGMETRICS Performance Evaluation Review 40(3):13–17, 2012. DOI: 10.1145/2425248.2425252
- Verification: VERIFIED — Crossref metadata + abstract.
- Relevance: granularity/update-rate limits of RAPL (Intel) — informs Ferrum's sampling interval and
  why per-transition energy attribution is hard.

### E3. Hackenberg, Schöne, Ilsche, Molka, Schuchart, Geyer — "An Energy Efficiency Feature Survey of the Intel Haswell Processor", IPDPSW 2015, pp. 896–904. DOI: 10.1109/IPDPSW.2015.70
- Verification: VERIFIED — Crossref metadata.
- Relevance: the RAPL-vs-external-reference validation methodology that E4 reuses; method template.

### E4. Schöne, Ilsche, Bielert, Velten, Schmidl, Hackenberg — "Energy Efficiency Aspects of the AMD Zen 2 Architecture", IEEE CLUSTER 2021, pp. 562–571. DOI: 10.1109/Cluster48925.2021.00087 (arXiv 2108.00808)
- Verification: VERIFIED — Crossref metadata; arXiv PDF full text read (Section VII, Conclusion).
- Content read (verbatim): "The results indicate that the energy data is modeled, not measured";
  "No DRAM domain is available and the RAPL package domain reports significantly lower power compared
  to the external measurement"; Conclusion: "Energy measurements of AMDs RAPL implementation should be
  considered inaccurate." Also: 1 ms update rate; "on our test system, RAPL is not accessible to
  unprivileged users." Test system: AMD EPYC 7502 (server Zen 2).
- Relevance: **most decision-relevant entry.** Directly challenges owner decision Q6 (AMD energy via
  RAPL-equivalent counters). Applicability to the owner's desktop AMD CPU (generation unknown) is
  **UNVERIFIED**, but defensible energy claims will likely need an external reference (wall-power
  meter) or must be reported as "modeled CPU-package energy" only.

### E5. Desrochers, Paradis, Weaver — "A Validation of DRAM RAPL Power Measurements", MEMSYS 2016, pp. 455–470. DOI: 10.1145/2989081.2989088
- Verification: VERIFIED — Crossref metadata only (full text not read).
- Relevance: example of validating a RAPL domain against physical measurement; method reference.

### E6. Lipp, Kogler, Oswald, Schwarz, Easdon, Canella, Gruss — "PLATYPUS: Software-based Power Side-Channel Attacks on x86", IEEE S&P 2021, pp. 355–371. DOI: 10.1109/SP40001.2021.00063
- Verification: VERIFIED — Crossref metadata; project site https://platypusattack.com/ fetched.
- Content read (site): CVE-2020-8694/8695; Linux security update made powercap RAPL access privileged;
  site notes AMD also provides RAPL from Zen. (Site detail about AMD Rome/Linux 5.8 — UNCERTAIN.)
- Relevance: explains *why* energy counters require privilege (owner risk #4) and why vendors may
  move to modeled values — a threat-to-validity citation.

## F. Mobile OS app lifecycle analogues

### F1. Android Open Source Project — "Low Memory Killer Daemon (lmkd)" (last updated 2026-06-17)
- URL: https://source.android.com/docs/core/perf/lmkd
- Verification: VERIFIED — page fetched.
- Content read: lmkd kills least-essential processes under memory pressure, chosen by `oom_score_adj`;
  modes trade "heaviest eligible task" vs "any eligible task"; Android 10+ uses PSI monitors.
- Relevance: OS-level memory-pressure discard with importance ranking and a pressure signal (PSI) —
  analogue for Ferrum policy 3; Windows' equivalent signal (memory resource notifications) is
  **UNVERIFIED — verify in lifecycle phase**.

### F2. Android Developers — "App Standby Buckets" (last updated 2026-10-01)
- URL: https://developer.android.com/topic/performance/appstandby
- Verification: VERIFIED — page fetched.
- Content read: buckets Active / Working set / Frequent / Rare / Restricted (+ never); system "might
  rely on a preloaded app that uses machine learning to determine how likely each app is to be used",
  else sorts by recency.
- Relevance: **prior art for usage-prediction-based adaptive resource policy** — weakens any novelty
  claim for "adaptive" lifecycle that uses predicted reuse.

### F3. Apple Developer Documentation — "Managing your app's life cycle" (UIKit)
- URL: https://developer.apple.com/documentation/uikit/managing-your-app-s-life-cycle (read via its
  JSON data endpoint, the HTML page is script-rendered)
- Verification: VERIFIED — title and text read.
- Content read: scenes may be foreground, background, or suspended; on entering background apps should
  "free up as much memory as possible, and prepare for your app snapshot".
- Relevance: suspend-with-snapshot analogue for Ferrum SUSPENDED + snapshot-thumbnail UX. (Claims that
  iOS purges suspended apps under memory pressure were **not** found on this page — UNCERTAIN.)

### F4. Lebeck, Krishnamurthy, Levy, Zhang — "End the Senseless Killing: Improving Memory Management for Mobile Operating Systems", USENIX ATC 2020, pp. 873–887
- URL: https://www.usenix.org/conference/atc20/presentation/lebeck
- Verification: VERIFIED — USENIX page fetched (title/authors/affiliations/pages/abstract).
- Content (abstract): mobile OSes kill apps instead of swapping; Marvin (AOT swap, GC co-design)
  runs >2x as many concurrent apps as Android, reclaims memory >60x faster than Android with swap.
- Relevance: academic argument that kill/discard is not the only option — supports evaluating
  suspend/`MemoryUsageTargetLevel=Low` (swap-like) against discard in Ferrum.

## G. Cost-aware cache replacement (conceptual analogues for discard policy)

### G1. Cao, Irani — "Cost-Aware WWW Proxy Caching Algorithms", USITS '97, Monterey CA, Dec 1997
- URL: https://www.usenix.org/conference/usits-97/cost-aware-www-proxy-caching-algorithms
  (HTML full paper: https://www.usenix.org/legacy/publications/library/proceedings/usits97/full_papers/cao/cao_html/cao.html)
- Verification: VERIFIED — USENIX page fetched; authors Pei Cao (UW-Madison) and Sandy Irani (UC
  Irvine); abstract read.
- Content: introduces **GreedyDual-Size**, combining locality with cost and size, non-parameterized.
  (Mechanism detail — H = cost/size with an inflation value — is from an automated summary: UNCERTAIN
  in exact form; read Section 3 before formalising.)
- Relevance: the closest conceptual template for Ferrum's "adaptive cost-aware" policy (reload cost vs
  memory size vs recency). Ferrum must cite it and position against it.

### G2. Young — "The k-server dual and loose competitiveness for paging", Algorithmica 11(6):525–541, 1994. DOI: 10.1007/BF01189992
- Verification: VERIFIED — Crossref metadata. That this paper introduces the original GreedyDual
  algorithm (which GreedyDual-Size extends) is from prior knowledge — **UNCERTAIN; confirm from Cao &
  Irani's references**.
- Relevance: theoretical (competitive-analysis) root of cost-aware eviction.

### G3. O'Neil, O'Neil, Weikum — "The LRU-K page replacement algorithm for database disk buffering", SIGMOD 1993 / SIGMOD Record 22(2):297–306. DOI: 10.1145/170036.170081 (proceedings DOI 10.1145/170035.170081)
- Verification: VERIFIED — Crossref metadata + abstract.
- Relevance: uses last-K reference times to estimate inter-arrival — analogue for predicting tab
  revisit likelihood from tab-activation history.

### G4. Megiddo, Modha — "Outperforming LRU with an adaptive replacement cache algorithm", IEEE Computer 37(4):58–65, 2004. DOI: 10.1109/MC.2004.1297303
- Verification: VERIFIED — Crossref metadata.
- Relevance: self-tuning recency/frequency balance (ARC) — analogue for an adaptive policy that tunes
  itself rather than using fixed idle thresholds.

---

## UNVERIFIED — do not cite (until checked in a primary source)

- **Megiddo & Modha, "ARC: A Self-Tuning, Low Overhead Replacement Cache", USENIX FAST 2003** — the
  original ARC paper; Crossref query did not return it; not fetched.
- **Microsoft Edge blog (2021) "Sleeping tabs … save even more resources" (blogs.windows.com/msedgedev/?p=25059)**
  — search snippet mentioned "26% less CPU"; page not fetched.
- **WICG/W3C Page Lifecycle specification** — not fetched; cite A2 or fetch the spec first.
- **Windows Central "sleeps 1.3 billion tabs"** — secondary press; use B2 instead.
- **Brave "outperforms other browsers" energy post; tech-insider / rustify "Tauri vs Electron 5x less
  RAM" articles** — vendor/blog content with unverified methodology; do not cite.
- **Pereira et al., "Energy efficiency across programming languages", SLE 2017, DOI
  10.1145/3136014.3136031** — metadata verified via Crossref but relevance marginal; not reviewed.
- **Any academic study of Electron/WebView2 resource overhead on Windows** — none found beyond D5.
- **AMD desktop (Zen 3/4/5) RAPL accuracy on Windows via LibreHardwareMonitor** — no source found;
  must be verified empirically (or literature-searched) in the benchmark-harness phase.
- **Chromium `performance_manager` / `resource_coordinator` source-level discard heuristics
  (current)** — only historical `oom_priority_manager`/`tab_manager` sources seen in search; not read.

---

## Decision-relevant observations (for ADR / risk register; not findings about Ferrum)

1. **Q6 energy on AMD is weaker than assumed.** E4 (peer-reviewed, full text read) reports AMD Zen 2
   RAPL is modeled, lacks DRAM, under-reports package power vs AC reference, and "should be considered
   inaccurate"; E1 (RAPL in Action) is Intel-specific. Propose: external wall-power meter as the
   reference, RAPL-like readings reported only as "modeled CPU package energy", or mark energy
   unsupported — owner decision needed.
2. **Prior art for "adaptive cost-aware" discard is substantial** (A3, B2, F1, F2, G1–G4). Novelty, if
   any, must be narrowly scoped (e.g., WebView2-embedded container setting, open reproducible
   evaluation) and confirmed by the P8 review.
3. **Sleep vs discard** is a first-class distinction in Edge (B2) and WebView2 APIs (C1:
   `TrySuspendAsync`, `MemoryUsageTargetLevel`, both best-effort). The state machine and benchmark
   should treat them separately.
4. **Benchmark fairness:** Chrome Memory Saver/Energy Saver (A4, A3) and Edge sleeping tabs (B1, B2)
   must be explicitly configured and recorded per trial; vendor percentages are not baselines.
5. **Safety exemptions:** Chrome's freezing exemption list (A3) is a vetted starting checklist for
   Ferrum's "never discard during destructive operation" rule.
6. **Process attribution (risk #5):** C1 states each WebView2 control spawns processes and that shared
   environments reduce memory; D5's Tauri RAM numbers may hinge on attribution — measure process trees.
