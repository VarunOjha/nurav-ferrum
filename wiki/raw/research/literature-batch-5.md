---
id: research-literature-batch-5
type: research-note
title: "Literature batch 5 (P5): benchmarking methodology, page-load measurement, browser benchmark practice, and the specifications behind Ferrum's timing metrics"
updated: 2026-10-19
sources:
  - https://api.crossref.org/works/10.1145/1297027.1297033
  - https://evaluate.inf.usi.ch/node/2
  - https://api.crossref.org/works/10.1145/1508244.1508275
  - https://sape.inf.usi.ch/publications/asplos09
  - https://api.crossref.org/works/10.1145/2464157.2464160
  - https://kar.kent.ac.uk/33611/
  - https://arxiv.org/abs/1602.00602
  - https://www.usenix.org/conference/nsdi13/technical-sessions/presentation/wang_xiao
  - https://browserbench.org/Speedometer3.0/about.html
  - https://w3c.github.io/paint-timing/
  - https://w3c.github.io/largest-contentful-paint/
  - https://w3c.github.io/navigation-timing/
  - https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-getprocesstimes
---

# Literature batch 5 (P5, task p5.13)

> Raw research note. Written by Claude in session s08. **Access date for every URL: 2026-10-19.**
> Labels as in batches 1 to 4: **VERIFIED** = what Claude read on the page named, fetched in this session (through a
> fetch tool that summarises and limits quotes; quotes are what it returned); **UNCERTAIN** = not read in a primary
> page. No subagent was used. The ACM Digital Library refused automated reading (HTTP 403), so for the three ACM papers
> the bibliographic data comes from Crossref and the summary from an author-group or repository page; only abstracts
> or landing pages were read, never full texts (one full-text PDF could not be read by the tool). This is reading, not
> a literature review, and makes no novelty claim.
>
> Search topics: benchmarking methodology (repetition, statistics, measurement bias, warm-up); page-load measurement;
> browser benchmark practice; the W3C specifications that define Ferrum's startup and navigation timings; Windows CPU
> time semantics.

## A. Benchmarking methodology

### L1. Georges, Buytaert, Eeckhout — "Statistically rigorous Java performance evaluation", OOPSLA 2007 (22nd ACM SIGPLAN conference), pp. 57–76. DOI 10.1145/1297027.1297033 — VERIFIED (metadata, abstract excerpts)

- Crossref: title, the three authors, proceedings, 2007, pages 57–76 (no abstract in Crossref).
- EVALUATE bibliography record (USI): abstract excerpts "Java performance is far from being trivial to benchmark
  because it is affected by various factors" and "This paper shows that prevalent methodologies can be misleading,
  and can even lead to incorrect conclusions."
- Not read: the paper's own recommendations (confidence intervals, start-up versus steady-state, number of
  invocations); a PDF hosted by the second author was fetched but the tool could not read its text. UNCERTAIN.
- Relevance: Ferrum's comparisons must not rest on a single run or a best-of-N number.

### L2. Mytkowicz, Diwan, Hauswirth, Sweeney — "Producing wrong data without doing anything obviously wrong!", ASPLOS 2009 (14th international conference), pp. 265–276. DOI 10.1145/1508244.1508275 — VERIFIED (metadata, abstract)

- Crossref: title, the four authors, proceedings, 2009, pages 265–276.
- USI SAPE group page (Hauswirth's group): abstract: "changing a seemingly innocuous aspect of an experimental setup
  can result in a systems researcher drawing wrong conclusions"; this is *measurement bias*; "Our results demonstrate
  that measurement bias is significant and commonplace"; a survey of 133 papers (ASPLOS, PACT, PLDI, CGO) found that
  "none of the papers with experimental results adequately consider measurement bias"; two remedies: causal analysis
  to detect it and setup randomisation to avoid it.
- A search result summary reported that an IBM Research listing counts this differently; not read, not used.
- Relevance: setup details (environment, order, layout) can bias Ferrum against Chrome or Edge; randomised trial
  order and recorded setup (ov-research-fairness-protocol) answer this.

### L3. Kalibera, Jones — "Rigorous benchmarking in reasonable time", ISMM 2013 (ACM SIGPLAN International Symposium on Memory Management), Seattle, pp. 63–74. DOI 10.1145/2464157.2464160 — VERIFIED (metadata, abstract)

- Crossref: title, both authors, proceedings, 2013, pages 63–74. Kent Academic Repository page: same title, authors
  Tomas Kalibera and Richard E. Jones, ISMM 2013 Seattle, the DOI.
- Abstract (repository page): "Experimental evaluation is key to systems research."; the authors "provide a
  statistically rigorous methodology for repetition and summarising results"; "repetition is most needed where most
  uncertainty arises"; a cost model gives the repetitions needed at each level (builds, executions, iterations) for a
  given precision; results reported as confidence intervals for effect sizes; demonstrated with DaCapo and SPEC CPU on
  three platforms.
- Relevance: the trial design (launches × iterations) and effect-size confidence intervals in
  ov-research-statistical-analysis-plan.

### L4. Barrett, Bolz-Tereick, Killick, Mount, Tratt — "Virtual Machine Warmup Blows Hot and Cold", OOPSLA 2017, pp. 52:1–52:27 (arXiv 1602.00602, v6 6 October 2017) — VERIFIED (arXiv abstract page)

- Abstract: VMs with JIT compilers "are traditionally thought to execute programs in two phases" (warm-up, then
  steady state); the authors give an automated statistical method based on changepoint analysis to tell whether a
  benchmark reaches a steady state and whether it is peak performance; on three machines "at most 43.5% of <VM,
  benchmark> pairs consistently reach a steady state of peak performance".
- Relevance: browser JavaScript engines are JIT VMs; Ferrum's trials must not assume that discarding a fixed number of
  warm-up iterations leaves a steady state.

## B. Page-load measurement and browser benchmark practice

### L5. Wang, Balasubramanian, Krishnamurthy, Wetherall — "Demystifying Page Load Performance with WProf", NSDI 2013 (10th USENIX Symposium), Lombard IL, pp. 473–485 — VERIFIED (USENIX presentation page)

- University of Washington. Abstract: "Web page load time is a key performance metric that many techniques aim to
  reduce."; WProf is "a lightweight in-browser profiler that produces a detailed dependency graph" of a page load;
  350 pages studied under caching, SPDY and mod_pagespeed; "computation is a significant factor that makes up as much
  as 35% of the critical path"; "synchronous JavaScript plays a significant role in page load time by blocking HTML
  parsing".
- Relevance: page-load time mixes network and computation, so Ferrum's navigation records keep the response,
  DOMContentLoaded and load moments separately (p5.7) rather than one number.

### L6. BrowserBench — "About Speedometer 3.0" (browserbench.org; no date shown) — VERIFIED (project documentation)

- Each test "Measures the time to add, complete, and remove 100 todo items in a basic list" (and other journeys:
  rich-text editing, charts, a news site); it "synchronously execute[s] a large number of the operations" and
  approximates asynchronous work "with a zero-second timer that is scheduled immediately after each execution of
  synchronous operations"; it "does not attempt to measure concurrent asynchronous work (e.g. in Web Workers)"; it is
  developed "under a multistakeholder governance model" between "the three widely distributed web browser engine
  projects" (not named on the page); it "should not be used as a way to compare the performance of different
  JavaScript frameworks".
- The page does not say how the score is computed or how many iterations run. UNCERTAIN.
- Relevance: a cross-vendor responsiveness benchmark that runs the same way in every Chromium-based product; a
  candidate workload for P6, with its own limits stated.

## C. The specifications behind Ferrum's timing metrics

### L7. W3C — "Paint Timing", Editor's Draft 14 October 2026 (editors Ian Clelland, Noam Rosenthal) — VERIFIED

- First paint: "FP marks the first time the browser renders anything for a given document"; it excludes the default
  background paint. First contentful paint: when the browser renders "the first bit of image or text content from the
  DOM"; "An element target is contentful when ..." (non-empty text, an image, a background image, canvas, video
  poster or first frame, SVG, a non-empty input value).
- `startTime` of a paint entry: "a DOMHighResTimeStamp of when the paint occurred", the default paint timestamp (the
  presentation time if the implementation has it, otherwise the end of the rendering update).
- No explicit rule for hidden documents was found.
- An Editor's Draft "may change at any moment".

### L8. W3C — "Largest Contentful Paint", Editor's Draft 26 August 2026 (editor Yoav Weiss) — VERIFIED

- Candidates are images and text nodes, each reported at most once; the size is the visible area (clipped to the
  viewport; an upscaled image's size is divided by the scale factor; a candidate covering the whole viewport is
  dropped). Video posters were not mentioned in what the tool returned: UNCERTAIN.
- "The algorithm terminates whenever scroll or input events occur." `startTime` returns the entry's `renderTime`,
  the default paint timestamp; `loadTime` is the image's load time (0 for text).
- Limitation stated: pages loaded "initially off-screen, such as in background tabs" will "report larger values than
  may be expected".

### L9. W3C — "Navigation Timing Level 2", Editor's Draft 1 September 2026 (editors Yoav Weiss, Noam Rosenthal) — VERIFIED

- `startTime` of a PerformanceNavigationTiming entry is 0; `responseStart` is "the time immediately after the user
  agent receives the first byte of the response"; `domContentLoadedEventStart` "is measured before the user agent
  dispatches the DOMContentLoaded event"; `loadEventEnd` "is measured after the user agent completes handling the load
  event"; `type` is `navigate`, `reload` or `back_forward` ("Navigation that's applied from history").
- `redirectCount`: "If there is no redirect or there is any redirect that is not from the same origin as the
  destination document, this attribute must return zero."

## D. Windows CPU time

### L10. Microsoft Learn — "GetProcessTimes function (processthreadsapi.h)" (ms.date 2018-12-05; updated 2025-07-01) — VERIFIED

- Kernel and user times: "The time that each of the threads of the process has executed ... is determined, and then
  all of those times are summed together"; user time "can exceed the amount of real time elapsed ... if the process
  executes across multiple CPU cores"; values are counts of 100-nanosecond units.
- The page makes **no statement about the granularity** (resolution) of these times.

## E. What this batch settles or supports (Claude's reading)

- **LCP definition (metric-startup-lcp).** Ferrum's in-app value is the `startTime` of the last
  `largest-contentful-paint` entry a buffered observer sees, read 1 s after the page loaded with no input or scroll
  (p5.6, p5.11). Per L8, `startTime` is the render time, and candidates stop only at input or scroll, so with no input
  the last entry is the spec's largest contentful paint. That the same holds in WebView2 is supported by the p5.6 run
  (entries reported; check-p5.6), not by a separate comparison with Chrome.
- **FCP and first paint (metric-startup-fcp).** Ferrum reads `first-contentful-paint` and `first-paint` entries' start
  times, which L7 defines as the paint's time.
- **Navigation timing (metric-nav-latency).** L9 confirms the p5.9 finding that the page's own `redirectCount` is 0
  after a redirect from another origin, so the host's count is the right one for the record.
- **GetProcessTimes granularity (metric-tree-cpu-time).** L10 is silent; the observation on this PC stands: in the p5.5
  standalone runs every CPU total was a whole multiple of 15.625 ms (140.625, 78.125, 31.25, 15.625 and 0 ms;
  sampler-cost-p5.5.json), and the p5.3 self-reading had 156250 and 1875000 (100 ns units, both multiples of
  15.625 ms; check-p5.3). Cycle counts are the finer measure for short windows.
- **Trial design (ov-research-statistical-analysis-plan).** L1 to L4 support repeated launches with confidence
  intervals on effect sizes (L3), randomised setup and order (L2), and a check for steady state instead of a fixed
  warm-up count (L4).
