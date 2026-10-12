---
id: research-literature-batch-2
type: research-note
title: "Literature batch 2 (P2): WebView2 and Chromium process model, site isolation, tab sleeping and discarding, embedded and Electron app resource studies"
updated: 2026-10-11
sources:
  - https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/process-model
  - https://chromium.googlesource.com/chromium/src/+/main/docs/process_model_and_site_isolation.md
  - https://www.usenix.org/conference/usenixsecurity19/presentation/reis
  - https://api.crossref.org/works/10.1145/1519065.1519090
  - https://blogs.windows.com/msedgedev/?p=25059
  - https://developer.chrome.com/blog/tab-discarding/
  - https://arxiv.org/abs/2308.16734
  - https://api.crossref.org/works/10.1007/978-3-031-70245-7_13
  - http://www.ivanomalavolta.com/files/papers/QUATIC_2024_2.pdf
---

# Literature batch 2 (P2, task p2.17)

> Raw research note. Written by Claude in session s02. **Access date for every URL: 2026-10-11.**
> Labels as in batch 1: **VERIFIED** = read in the primary page fetched in this session; **UNCERTAIN** = not read in
> a primary source. Web pages were read through a fetch tool that summarises; quoted text is what the tool returned.
> The QUATIC 2024 paper (L8) was read as full text (author's PDF, text extracted locally). This is reading, not a
> literature review, and makes no novelty claim.

## L1. Microsoft Learn — "Process model for WebView2 apps"

- URL: https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/process-model (page metadata: ms.date
  2022-04-01, updated_at 2026-06-12).
- **VERIFIED** quotes: "The WebView2 Runtime uses the same process model as the Microsoft Edge browser." A WebView2
  process group has "A single browser process", "One or more renderer processes" and "Other helper processes, such
  as the GPU process and the Audio service process." "All processes in a WebView2 Runtime processes collection are
  tied to the browser process, which in turn is associated with a single user data folder." "If you create multiple
  `CoreWebView2Environment` objects that are configured the same way (including sharing the same user data folder),
  they will represent the same user data folder and the same associated collection of processes." Creating a second
  environment on a folder in use with different options means it "will fail to create `WebView2` objects".
  "A given renderer process is not associated with a single `CoreWebView2` instance, because the renderer process can
  serve frames in multiple `CoreWebView2` instances that use the same user data folder, depending on website
  isolation."
- Relevance: the unit of process accounting for Ferrum is the user data folder's process group, not a single view.
  This supports adr-0029 (one environment, profiles inside it; COM-7 "identical environment options") and the
  measurement note's process-tree attribution. The page says nothing about profiles inside one folder: that part
  stays with spike S2's observation.

## L2. Chromium docs — "Process Model and Site Isolation"

- URL: https://chromium.googlesource.com/chromium/src/+/main/docs/process_model_and_site_isolation.md (no author or
  date shown).
- **VERIFIED** quotes: a site is "scheme plus eTLD+1, such as `https://example.com`". "In (one-)site-per-process
  mode, each process is locked to documents from a single site", "Used on: Desktop platforms (Windows, Mac, Linux,
  ChromeOS)." On desktop Chromium uses "a 'soft' process limit based on the memory available"; above it, it "makes an
  attempt to start randomly reusing same-site processes". A SiteInstance is "the core unit of Chromium's process
  model"; a BrowsingInstance is "a group of tabs and frames that have references to each other".
- Relevance: renderer-process counts in Chrome, Edge and Ferrum depend on how many distinct sites are open and on
  the soft limit, so benchmark workloads must fix the site mix (not only the tab count). Ferrum's per-site profiles
  (adr-0010) map to the same site notion (scheme plus eTLD+1).

## L3. Reis, Moshchuk, Oskov — "Site Isolation: Process Separation for Web Sites within the Browser", 28th USENIX Security Symposium (USENIX Security '19), Santa Clara, CA, 2019, pp. 1661–1678

- URL: https://www.usenix.org/conference/usenixsecurity19/presentation/reis (authors: Google).
- **VERIFIED**: title, three authors, venue, year, pages; abstract read. Quote: "Site Isolation locks each renderer
  process to documents from a single site and filters certain cross-site data from each process." "Our performance
  results indicate it is practical to deploy this level of isolation while sufficiently preserving compatibility
  with existing web content."
- The abstract gives **no memory-overhead number**; any overhead figure from this paper is **UNCERTAIN** until the
  paper body is read. Do not cite a number from it yet.
- Relevance: primary source for "one renderer process per site" on desktop Chrome, which shapes every memory
  comparison in the paper.

## L4. Reis, Gribble — "Isolating web programs in modern browser architectures", Proceedings of the 4th ACM European Conference on Computer Systems (EuroSys 2009), pp. 219–232. DOI: 10.1145/1519065.1519090

- **VERIFIED** (Crossref metadata): title, authors Charles Reis and Steven D. Gribble, venue, April 2009, pages,
  DOI. Content **UNCERTAIN** (paper not read). Cite only as the origin of the multi-process browser architecture
  until read.

## L5. Microsoft Edge Team — "Sleeping tabs in Microsoft Edge: Save even more resources with recent updates", Microsoft Edge Blog, 7 April 2022

- URL: https://blogs.windows.com/msedgedev/?p=25059.
- **VERIFIED** quotes: "On average, each sleeping tab saves 85% of memory and 99% CPU for Microsoft Edge." "8% more
  tabs on average will sleep". The post does not say how these numbers were measured.
- **Correction to the seed list**: the seed's "do not cite" entry described this address as a 2021 post with "26%
  less CPU" (from a search snippet). The page fetched today is dated 2022-04-07 and gives different numbers. The seed
  snippet must not be used.
- Use: a vendor claim, method not stated. It may be cited only as "Microsoft states …", never as a measured result.

## L6. Osmani — "Tab Discarding in Chrome — A Memory-Saving Experiment", Chrome for Developers blog, 31 August 2015

- URL: https://developer.chrome.com/blog/tab-discarding/.
- **VERIFIED** (historical): discarding starts "when it's detected that system memory is running pretty low"; the
  discard order listed is "Internal pages like new tab page, bookmarks, etc. Tabs selected a long time ago Tabs
  selected recently Apps running in a window Pinned tabs The selected tab"; a discarded tab "will reload when
  clicked", with form content and scroll position restored "the same way they would be during forward/backward tab
  navigation."
- **UNCERTAIN**: today's Chrome Memory Saver rules (search results mention a machine-learning model from Chrome 140;
  only third-party pages said so). Not read in a primary source; do not cite. The current Chromium
  `performance_manager` policy stays on the open list.
- Relevance: prior art for Ferrum's discard state and its restore expectations (P7); a 2015 description must be
  labelled as historical.

## L7. Horn, Lahnaoui, Reinoso, Peng, Isakov, Islam, Malavolta — "Native vs Web Apps: Comparing the Energy Consumption and Performance of Android Apps and their Web Counterparts", MOBILESoft 2023 (arXiv 2308.16734, submitted 2023-08-31)

- **VERIFIED** (arXiv abstract page): "We confirm that native apps consume significantly less energy than their Web
  counterparts, with large effect size. Web apps use more CPU and memory, with statistically significant difference
  and large effect size." 10 platforms in 5 categories; Android.
- The DOI 10.1109/MOBILSoft59058.2023.00013 is as shown on the arXiv page; not resolved here (**UNCERTAIN**). A
  "53% more energy" figure seen in search snippets was not read in the paper: do not cite it.
- Relevance: same research group and method family as L8; Android, so not evidence about Windows desktop.

## L8. Thangadurai, Saha, Rupanya, Naeem, Enriquez, Scoccia, Martinez, Malavolta — "Electron vs. Web: A Comparative Analysis of Energy and Performance in Communication Apps", Quality of Information and Communications Technology (QUATIC 2024), Communications in Computer and Information Science, Springer, 2024, pp. 177–193. DOI: 10.1007/978-3-031-70245-7_13

- **VERIFIED**: metadata (Crossref) and full text (author's PDF). Abstract quote: "While Electron-based apps exhibit
  higher CPU utilization and in some cases slightly higher network usage, their Web-based counterparts tend to
  consume more energy and memory under various configurations."
- Method as read in the paper: a laptop with an Intel i7-11370H, Ubuntu 22.04.2; Skype 8.104, Slack 4.34 and Discord
  6.2 desktop (Electron) versus their web versions in Google Chrome 117; energy and CPU with PowerJoular 0.6.2 (one
  sample per second); memory as process RSS from `ps` divided by total RAM; network with TShark; 2- and 8-minute
  calls in four interaction modes, each combination run eight times in random order with two-minute pauses. Their
  conclusion: "negligible differences in shorter interactions, while extended durations uncovered significant
  discrepancies". Threats section: they did not test several apps as tabs in one browser.
- Relevance: the closest desktop prior work found so far. Differences to Ferrum's study: Linux, not Windows; Electron
  (bundled Chromium), not WebView2; memory as per-process RSS (the double-counting the measurement note warns about,
  so their memory numbers are not comparable to Ferrum's planned metric); one app per browser instance.

## Still open after batch 2

- Body of L3 (overhead numbers) and L4.
- Current Chrome Memory Saver and Chromium `performance_manager` policy (primary source).
- Any study of WebView2 apps' resource use on Windows (none found in this batch).
- The seed's remaining "do not cite" items not covered here.
