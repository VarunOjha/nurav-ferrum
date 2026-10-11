---
id: research-literature-batch-1
type: research-note
title: "Literature batch 1 (P1): ARC original paper, Page Lifecycle report, Windows memory-pressure signal, WebView2 suspend semantics"
updated: 2026-10-11
sources:
  - https://www.usenix.org/conference/fast-03/arc-self-tuning-low-overhead-replacement-cache
  - https://wicg.github.io/page-lifecycle/
  - https://learn.microsoft.com/en-us/windows/win32/api/memoryapi/nf-memoryapi-creatememoryresourcenotification
  - https://learn.microsoft.com/en-us/microsoft-edge/webview2/reference/win32/icorewebview2_3
---

# Literature batch 1 (P1, task p1.14)

> Raw research note. Written by Claude in session s02. **Access date for every URL: 2026-10-11.**
> It closes four gaps that the seed list ([related-work-seed.md](related-work-seed.md), section "do not cite") named.
> Labels as in the seed list: **VERIFIED** = read in the primary page fetched in this session; **UNCERTAIN** = not read
> in a primary source. Pages were read through a fetch tool that summarises; quoted sentences are the quotes the tool
> returned from the page. This is reading, not a literature review, and makes no novelty claim.

## L1. Megiddo, Modha — "ARC: A Self-Tuning, Low Overhead Replacement Cache", USENIX FAST '03 (2nd USENIX Conference on File and Storage Technologies), San Francisco, March 2003

- URL: https://www.usenix.org/conference/fast-03/arc-self-tuning-low-overhead-replacement-cache (PDF linked there:
  https://www.usenix.org/events/fast03/tech/full_papers/megiddo/megiddo.pdf).
- Verification: **VERIFIED** — the USENIX conference page: title, both authors (IBM Almaden Research Center),
  conference and date. No DOI on the page; page numbers not shown (not recorded here).
- Content read (abstract on the page): ARC "dynamically, adaptively, and continually balances between the recency and
  frequency components"; the authors argue it is "empirically universal", competitive with fixed policies tuned per
  workload, without workload-specific parameters. (Numbers in the abstract are the paper's own trace results, not
  reproduced here.)
- Relevance: the original paper behind seed entry G4 (the later IEEE Computer article). Prior art for an eviction
  policy that tunes itself instead of using fixed thresholds — directly relevant to Ferrum's adaptive tab lifecycle
  policy and to any novelty framing.

## L2. WICG "Page Lifecycle" — Draft Community Group Report, 9 June 2022, editor Scott Haseley (Google)

- URL: https://wicg.github.io/page-lifecycle/
- Verification: **VERIFIED** — the report itself.
- Content read: defines two lifecycle states, **frozen** and **discarded**; the `freeze` event (document becomes frozen),
  the `resume` event (document leaves frozen) and the read-only `document.wasDiscarded`. "A document is frozen, any
  tasks associated with the document will not run"; "A task is runnable if its document is either null or fully
  active, and is also unfrozen" — so timers and tasks of a frozen document wait until it is resumed.
- Status note: a Community Group report, not a W3C Recommendation; cite it as such.
- Relevance: the web-platform contract a page sees when a browser freezes or discards it. Ferrum's lifecycle states
  (BACKGROUND, IDLE, DISCARD_CANDIDATE, DISCARDED) should map onto these signals where WebView2 provides them (see L4).

## L3. Win32 `CreateMemoryResourceNotification` (memoryapi.h) — Microsoft Learn reference

- URL: https://learn.microsoft.com/en-us/windows/win32/api/memoryapi/nf-memoryapi-creatememoryresourcenotification
- Verification: **VERIFIED** — the reference page.
- Content read: `HANDLE CreateMemoryResourceNotification(MEMORY_RESOURCE_NOTIFICATION_TYPE)` with
  `LowMemoryResourceNotification` ("Available physical memory is running low") and `HighMemoryResourceNotification`
  ("Available physical memory is high"). Applications wait on the handle or poll it with
  `QueryMemoryResourceNotification`. "This is a system-wide event, so all applications receive notification when the
  object is signaled." There is "a range of memory availability where neither … object is signaled", in which
  applications "should attempt to keep the memory use constant". Minimum client: Windows XP. The page gives **no
  threshold values** (when "low" and "high" are signalled is not specified there — UNCERTAIN, needs another source or
  an experiment).
- Relevance: the OS memory-pressure signal Ferrum's memory-pressure policy can react to (seed list gap
  "Windows memory-pressure signalling").

## L4. WebView2 `ICoreWebView2_3::TrySuspend` / `Resume` / `IsSuspended` — Microsoft Learn Win32 reference (version 1.0.4191.47 page; introduced in 1.0.774.44)

- URL: https://learn.microsoft.com/en-us/microsoft-edge/webview2/reference/win32/icorewebview2_3
- Verification: **VERIFIED** — the reference page (it notes it is no longer maintained and points to the new API
  reference; content read as published).
- Content read: TrySuspend lets the app "have the WebView2 consume less memory". "The CoreWebView2Controller's
  IsVisible property must be false when the API is called. Otherwise, the API fails with
  `HRESULT_FROM_WIN32(ERROR_INVALID_STATE)`." "Suspending is similar to putting a tab to sleep in the Edge browser.
  Suspending pauses WebView script timers and animations, minimizes CPU usage for the associated browser renderer
  process and allows the operating system to reuse the memory…". Suspend is **best effort**; a running script finishes
  first; under some conditions the completion reports `isSuccessful` false with `S_OK`. "The WebView will be
  automatically resumed when it becomes visible." "Some APIs like Navigate will auto resume the WebView."
- Not on the page: whether the page receives the Page Lifecycle `freeze`/`resume` events (L2) when suspended —
  **UNCERTAIN**; must be tested (P7 lifecycle experiments).
- Relevance: matches spike S3 (2026-10-11): TrySuspend succeeded only while hidden, and `show()` woke the view. The
  "Navigate auto-resumes" rule matters for Ferrum's state machine (a navigation must move a tab out of a sleep state).

## Still open after this batch

- Threshold values behind Low/HighMemoryResourceNotification on Windows 11 (L3).
- Whether WebView2 fires `freeze`/`resume` on TrySuspend/Resume (L4 vs L2).
- The seed list's other "do not cite" items (Edge 2021 sleeping-tabs post, Chromium performance_manager heuristics,
  AMD RAPL accuracy on Windows) remain unread.
