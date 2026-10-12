---
id: research-literature-batch-3
type: research-note
title: "Literature batch 3 (P3): tab-usage studies, Chrome and Edge tab-sleeping policies today, Android and iOS lifecycle analogues, GreedyDual origin"
updated: 2026-10-12
sources:
  - https://api.crossref.org/works/10.1145/3411764.3445585
  - https://api.semanticscholar.org/graph/v1/paper/DOI:10.1145/3411764.3445585
  - https://api.crossref.org/works?query.bibliographic=A+study+of+tabbed+browsing+among+Mozilla+Firefox+users
  - https://api.crossref.org/works?query.bibliographic=Parallel+browsing+behavior+on+the+web+Huang+White
  - https://support.google.com/chrome/answer/12929150?hl=en
  - https://learn.microsoft.com/en-us/deployedge/microsoft-edge-policies/sleepingtabstimeout
  - https://developer.android.com/guide/components/activities/process-lifecycle
  - https://developer.apple.com/tutorials/data/documentation/uikit/responding-to-memory-warnings.json
  - https://www.usenix.org/legacy/publications/library/proceedings/usits97/full_papers/cao/cao_html/cao.html
---

# Literature batch 3 (P3, task p3.12)

> Raw research note. Written by Claude in session s02. **Access date for every URL: 2026-10-12.**
> Labels as in batches 1 and 2: **VERIFIED** = read in the primary page fetched in this session; **UNCERTAIN** = not
> read in a primary source. Web pages were read through a fetch tool that summarises, or as raw text with `curl`
> (Crossref, Semantic Scholar, Apple's page data, the USENIX HTML paper); quoted text is what the source returned.
> This is reading, not a literature review, and makes no novelty claim.
>
> Search strings used: `tab usage study browser`, `tabbed browsing Firefox users`, `parallel browsing behavior`,
> `Microsoft Edge sleeping tabs documentation SleepingTabsTimeout policy`, `Chrome Memory Saver`, `Android process
> lifecycle cached process`, `UIKit responding to memory warnings`, and the GreedyDual reference chain of Cao and Irani.

## L1. Chang, Hahn, Kim, Coupland, Breneisen, Kim, Hwong, Kittur — "When the Tab Comes Due: Challenges in the Cost Structure of Browser Tab Usage", CHI 2021, pp. 1–15. DOI 10.1145/3411764.3445585

- **VERIFIED** (Crossref): title, the eight authors in this order, "Proceedings of the 2021 CHI Conference on Human
  Factors in Computing Systems", pages 1-15, issued 2021-05-06. Crossref has no abstract.
- The publisher page (dl.acm.org) refused the fetch (HTTP 403). The abstract was read in the Semantic Scholar record
  of this DOI (a secondary record, not the publisher): "We interviewed ten information workers asking about their tab
  management strategies and walk through each open tab on their work computers four times over two weeks. We
  uncovered competing pressures pushing for keeping tabs open (ranging from interaction to emotional costs) versus
  pushing for closing them (such as limited attention and resources). We then surveyed 103 participants to estimate
  the frequencies of these pressures at scale." Wording **VERIFIED in that record**; that it matches the publisher's
  abstract is **UNCERTAIN** until read there.
- Updates the seed list (D6), whose findings came only from news coverage (UNCERTAIN): the study design (10
  interviews over two weeks, a survey of 103) is now read in an abstract record; specific findings beyond the abstract
  remain unread.
- Relevance: users keep tabs open for reasons with real costs on both sides; supports a workload of many long-lived
  tabs and makes the usability cost of discarding a tab a first-class outcome for P7.

## L2. Dubroy, Balakrishnan — "A study of tabbed browsing among Mozilla Firefox users", CHI 2010. DOI 10.1145/1753326.1753426

- **VERIFIED** (Crossref search result): title, authors Dubroy and Balakrishnan, "Proceedings of the SIGCHI Conference
  on Human Factors in Computing Systems", issued 2010-04-10, DOI as above.
- Content **UNCERTAIN**: no abstract in Crossref or Semantic Scholar; not read. Listed only so a later batch reads it
  (an early field study of tab use).

## L3. Huang, White — "Parallel browsing behavior on the web", Hypertext 2010. DOI 10.1145/1810617.1810622

- **VERIFIED** (Crossref search result): title, authors Huang and White, "Proceedings of the 21st ACM conference on
  Hypertext and hypermedia", issued 2010-06-13, DOI as above.
- Content **UNCERTAIN**: no abstract found; not read. Listed for a later batch (log-based study of parallel browsing).

## L4. Google Chrome Help — "Personalize Chrome performance" (Memory Saver)

- URL: https://support.google.com/chrome/answer/12929150?hl=en (no date on page).
- **VERIFIED** quotes: "Chrome deactivates tabs that you aren't currently using. When you access an inactive tab, it
  automatically reloads." Three modes: "Moderate: Get moderate memory savings. Your tabs become inactive after a longer
  period of time."; "Balanced (recommended): ... Your tabs become inactive after an optimal period of time."; "Maximum:
  ... Your tabs become inactive after a shorter period of time." Tabs not deactivated: active audio or video (playback
  or calls), screen share, page notifications, active downloads, partially filled forms, pinned tabs, connected
  devices (USB or Bluetooth).
- The page gives **no times** for the modes. Today's exact rules (batch 2's open item) remain **UNCERTAIN**; "optimal
  period" suggests an adaptive rule, but the page does not say how it is chosen.
- Relevance: the shipped Chrome policy is recency-based with mode-dependent timing and a fixed list of exemptions
  (media, forms, downloads, devices, pinned). Ferrum's P7 guards should cover at least the same exemptions, and the
  benchmark must record which Memory Saver mode Chrome ran with (fairness protocol).

## L5. Microsoft Learn — "Microsoft Edge Browser Policy Documentation SleepingTabsTimeout"

- URL: https://learn.microsoft.com/en-us/deployedge/microsoft-edge-policies/sleepingtabstimeout (ms.date 2026-10-07,
  updated_at 2026-10-07).
- **VERIFIED** quotes: "This policy setting lets you configure the timeout, in seconds, after which inactive background
  tabs are automatically put to sleep if sleeping tabs is enabled. By default, this timeout is 900 seconds (15
  minutes)." "When energy saver is active, Microsoft Edge uses the shorter of this timeout and the energy saver
  timeout. The energy saver timeout is 5 minutes in maximum savings mode. In other active modes, it's 30 minutes, or
  15 minutes on devices with less than 6 GB of memory." Allowed values: 30 seconds (Edge 103 and later), 5, 15 and 30
  minutes, 1, 2, 3, 6 and 12 hours. Supported on Windows and macOS from Edge 88; not on Android or iOS. Applies only
  when `SleepingTabsEnabled` is enabled or not configured and the user has turned sleeping tabs on.
- Relevance: a fixed, documented idle threshold (15 minutes by default) that shortens under energy saver and on
  small-memory devices: the clearest published "fixed-idle" baseline for Ferrum's policy 2 (P7), and a value the
  benchmark must set explicitly for Edge (fairness protocol).

## L6. Android Developers — "Processes and app lifecycle" (last updated 2025-02-10 UTC)

- URL: https://developer.android.com/guide/components/activities/process-lifecycle
- **VERIFIED** quotes: "When low on memory, Android places each process into an importance hierarchy based on the
  components running in them and the state of those components." Order: foreground, visible, service, cached. "A
  cached process is one that is not currently needed, so the system is free to kill it as needed when resources like
  memory are needed elsewhere. In a normally behaving system, these are the only processes involved in resource
  management." "A well-running system has multiple cached processes always available, for efficient switching between
  applications, and regularly kills the cached apps as needed." The page also notes that from Android 13 an app
  process may receive limited or no execution time until it enters an active lifecycle state.
- Relevance: an importance-ordered, kill-the-least-important-first design with "freeze" of cached processes: the
  mobile analogue of Ferrum's lifecycle states (active, hidden, suspended, discarded), with the same idea that
  discarding the least valuable background work is routine, not exceptional.

## L7. Apple Developer Documentation — "Responding to memory warnings" (UIKit)

- URL: https://developer.apple.com/documentation/uikit/responding-to-memory-warnings (read through its page data:
  https://developer.apple.com/tutorials/data/documentation/uikit/responding-to-memory-warnings.json).
- **VERIFIED** quotes: "If the system runs low on free memory and is unable to reclaim memory by terminating suspended
  apps, UIKit sends a low-memory warning to running apps." "When your app receives a low-memory warning, free up as much
  memory as possible, as quickly as possible. Remove references to images, media files, or any large data files that
  already have an on-disk representation and can be reloaded later." "Failure to reduce your app's memory usage may
  result in your app's termination."
- **Closes** the seed list's open point (F3): that iOS ends suspended apps to reclaim memory is now read in an Apple
  primary source (this page), not only assumed.
- Relevance: a two-step pattern (end suspended work first, then ask running work to shed reloadable data) that maps
  onto Ferrum's discard-then-`MemoryUsageTargetLevel=Low` options in P7.

## L8. Cao, Irani — "Cost-Aware WWW Proxy Caching Algorithms", USITS '97 (HTML full paper)

- URL: https://www.usenix.org/legacy/publications/library/proceedings/usits97/full_papers/cao/cao_html/cao.html and
  its section pages node3, node8, node9, node19.
- **VERIFIED** quotes (section "GreedyDual-Size Algorithm"): "The original GreedyDual algorithm is proposed by Young
  [You91b]." "The algorithm associates a value, H, with each cached page p. Initially, when a page is brought into
  cache, H is set to be the cost of bringing the page into the cache ... When a replacement needs to be made, the page
  with the lowest H value is replaced, and then all pages reduce their H values by the minimum value of H over all the
  pages in the cache. If a page is accessed, its H value is restored to the cost of bringing it into the cache."
  "we extend the GreedyDual algorithm by setting H to cost/size upon an access to a document". The implementation keeps
  "an 'inflation' value L, and let all future setting of H be offset by L": "If p is already in the cache, set H(p) to
  L + c(p)/s(p)." Section "Online-Optimality": "GreedyDual-Size is k-competitive, where k is the ratio of the size of
  the cache to the size of the smallest document."
- **VERIFIED** reference entry [You91b]: "N. Young. The k-server dual and loose competitiveness for paging.
  Algorithmica, June 1994, vol. 11, (no. 6):525-41. Rewritten version of 'On-line caching as cache size varies', in The
  2nd Annual ACM-SIAM Symposium on Discrete Algorithms, 241-250, 1991."
- **Closes** two seed-list open points: G1 (the H, cost/size and inflation-value detail was from an automated summary;
  now read in the paper's own section) and G2 (that Young's Algorithmica paper introduced GreedyDual was from prior
  knowledge; now read in Cao and Irani's text and reference list).
- Relevance: the formal template for a cost-aware discard order (reload cost over memory size, aged by an inflation
  value), with a known competitive bound, against which Ferrum's adaptive policy (P7) must be positioned.

## Still open after this batch

- Publisher abstracts or full text of L1 to L3; the CHI 2021 findings beyond the abstract.
- How Chrome chooses the "optimal period" of Memory Saver's balanced mode (L4).
- The overhead numbers in the body of Reis, Moshchuk, Oskov 2019 (from batch 2).
