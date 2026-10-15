---
id: research-literature-batch-4
type: research-note
title: "Literature batch 4 (P4): browser site isolation, embedded-browser and WebView security, studies of WebView and hybrid-app flaws"
updated: 2026-10-15
sources:
  - https://www.usenix.org/conference/usenixsecurity19/presentation/reis
  - https://www.chromium.org/Home/chromium-security/site-isolation/
  - https://surface.syr.edu/eecs/217
  - https://seclab.illinois.edu/draco-a-system-for-uniform-and-fine-grained-access-control-for-web-code-on-android
  - https://research.google/pubs/draco-a-system-for-uniform-and-fine-grained-access-control-for-web-code-on-android/
  - https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/security
  - https://www.electronjs.org/docs/latest/tutorial/security
  - https://v2.tauri.app/concept/inter-process-communication/isolation/
  - https://ndss-symposium.org/?p=2020
  - https://success.cse.tamu.edu/osv-free/
  - https://par.nsf.gov/biblio/10065081
  - https://adamdoupe.com/publications/large-scale-study-of-mobile-web-app-security-most2015.md
  - https://cispa.de/de/research/publications/84728-open-access-alert-studying-the-privacy-risks-in-android-webview-s-web-permission-enforcement
  - https://arxiv.org/abs/2607.20698
---

# Literature batch 4 (P4, task p4.13)

> Raw research note. Written by Claude in session s07. **Access date for every URL: 2026-10-15.**
> Labels as in batches 1 to 3: **VERIFIED** = title, authors, venue and the quoted text read by Claude on the page named,
> fetched in this session (through a fetch tool that summarises; quotes are what it returned); **UNCERTAIN** = not read
> in a primary page. A research helper (subagent) first searched and proposed the sources; Claude then re-read every page
> itself. Two details the helper reported were not on the pages Claude read and are not used (marked below).
> This is reading, not a literature review, and makes no novelty claim. Only the abstract or landing page of each paper
> was read, not the full text.
>
> Search topics: browser site isolation; security of embedded browsers and WebViews (Android WebView, Electron, Tauri,
> WebView2); empirical studies of WebView and hybrid-app security (bridges, origin confusion, permissions).

## A. Browser site isolation

### L1. Reis, Moshchuk, Oskov — "Site Isolation: Process Separation for Web Sites within the Browser", 28th USENIX Security Symposium (USENIX Security '19), Santa Clara, August 2019, pp. 1661–1678 — VERIFIED

- Source: USENIX presentation page. Authors from Google.
- Read: "Site Isolation locks each renderer process to documents from a single site and filters certain cross-site data
  from each process."
- For Ferrum: the reference design for keeping untrusted sites in separate processes. Ferrum relies on WebView2's
  Chromium for this; its per-site profiles separate storage, not processes (p4.7, p4.15).

### L2. The Chromium Projects — "Site Isolation" (Chromium Security pages) — VERIFIED (vendor documentation, no date shown)

- Threats named: compromised renderers, universal cross-site scripting bugs, and side channels such as Spectre that
  "make reading arbitrary renderer process memory possible". Site Isolation is one layer of a "defense in depth"
  approach, next to the sandbox.
- Limits stated: processes follow sites, not origins ("Compatibility with document.domain changes currently requires us
  to use sites"); "Cross-Origin Read Blocking (CORB) is a best effort approach"; "Site Isolation is not yet supported in
  Android WebView".
- Memory cost stated by the vendor: "about 10-13% when isolating all sites with many tabs open" (desktop, Chrome 67);
  about 3-5% on Android (Chrome 77, sites users log into). Vendor figures for old versions, not Ferrum data.
- For Ferrum: the site-not-origin boundary and the memory cost frame exp-isolation-overhead; a vendor figure is context
  only, never a substitute for P6 measurements.

## B. Security of embedded browsers and WebViews

### L3. Luo, Hao, Du, Yin — "Attacks on WebView in the Android System", 27th Annual Computer Security Applications Conference (ACSAC 2011), Orlando, December 5–9 2011, pp. 343–352 — VERIFIED

- Source: Syracuse University repository page. Its recommended citation also names "Y. Wang", who is not in the page's
  author list; the author list above is the page's.
- Read: "Currently, in the Android market, 86 percent of the top 20 most downloaded apps in 10 diverse categories use
  WebView."
- For Ferrum: the founding argument that embedding a browser in an app changes the web's security model, the premise
  of Ferrum's threat model (p4.1).

### L4. Tuncay, Demetriou, Gunter — "Draco: A System for Uniform and Fine-grained Access Control for Web Code on Android", ACM CCS 2016 (October 2016) — VERIFIED

- Sources: Illinois security lab page (title, authors, venue, date) and Google Research publication page (abstract).
- Read: "Draco provides a declarative policy language that allows developers to define policies" and "a runtime system
  that dynamically enforces the policies"; implemented "in the Chromium Android System WebView app"; "Draco incurs
  negligible overhead, which is in the order of microseconds."
- For Ferrum: per-origin access control for the bridge between web code and the app; Ferrum's answer is stricter (no
  bridge at all in tab views, the shell only, p2.3 and p4.8).

### L5. Microsoft — "Develop secure WebView2 apps" (Microsoft Learn; ms.date 2026-07-14, updated 2026-09-14) — VERIFIED (vendor documentation)

- Headings read: "Treat all web content as insecure"; "Avoid generic proxies"; "Restrict web content functionality";
  "Update settings based on the origin of the new page" (use `NavigationStarting` and `FrameNavigationStarting` to
  block navigations); "Remove exposed host objects"; "Recommended privilege level for WebView2 host applications"
  (standard, non-elevated integrity). Also: when the host runs elevated, `WEBVIEW2_*` environment overrides including
  `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS` are ignored.
- For Ferrum: the vendor baseline. Ferrum's navigation gate (p4.3), no host objects or web messages in tab views, and a
  non-elevated host follow it; the elevated-host rule bears on the benchmark harness's debugging-port switch (P6).

### L6. Electron — "Security" tutorial (electronjs.org, no date shown) — VERIFIED (project documentation)

- Checklist of 20 items read, among them: "Do not enable Node.js integration for remote content", "Enable context
  isolation in all renderers", "Enable process sandboxing", "Do not disable `webSecurity`", "Disable or limit
  navigation", "Disable or limit creation of new windows", "Validate the `sender` of all IPC messages". Quote: "Under no
  circumstances should you load and execute remote code with Node.js integration enabled."
- For Ferrum: the closest peer framework's checklist; a comparison table for the paper's security section.

### L7. Tauri — "Isolation Pattern" (v2.tauri.app; last updated Jul 10, 2025) — VERIFIED (project documentation)

- Read: a separate JavaScript application in a sandboxed `<iframe>` intercepts IPC messages from the frontend before
  Tauri Core; each message is encrypted with AES-GCM (SubtleCrypto) with a key regenerated at every start. On Windows,
  external files do not load in sandboxed iframes, so scripts are inlined; ES Modules do not load. Quote: "Tauri highly
  recommends using the isolation pattern whenever it can be used."
- For Ferrum: Ferrum's shell is bundled, local code and tab views have no bridge; whether the isolation pattern adds
  anything for the shell is an open design question, not decided here.

## C. Studies of WebView and hybrid-app flaws

### L8. Georgiev, Jana, Shmatikov — "Breaking and Fixing Origin-Based Access Control in Hybrid Web/Mobile Application Frameworks", NDSS Symposium 2014 (22 Feb 2014) — VERIFIED

- Read: "Hybrid application frameworks introduce new browser APIs that let Web applications access native resources on
  mobile devices", and the frameworks "expose native resources to malicious Web content".
- Not used: the helper's mention of ads in iframes and of the defense's name (not on the page Claude read).
- For Ferrum: the canonical web-to-native origin confusion; Ferrum's frames get no bridge and no grant beyond their
  own site's (p4.5, p4.8).

### L9. Yang, Huang, Gu, Mendoza — "Study and Mitigation of Origin Stripping Vulnerabilities in Hybrid-postMessage Enabled Mobile Applications", IEEE S&P 2018 (San Francisco, May 2018), DOI 10.1109/SP.2018.00043 — VERIFIED

- Sources: the authors' lab page (authors, quote) and NSF PAR (venue, DOI; it lists only Yang and Huang).
- Read: "all origin information of a message is not respected or even lost during the message delivery in hybrid
  postMessage." Mitigation: OSV-Free, three new postMessage APIs.
- For Ferrum: any future message channel from web content must carry and check its origin; today Ferrum has none for
  tab views.

### L10. Mutchler, Doupé, Mitchell, Kruegel, Vigna — "A Large-Scale Study of Mobile Web App Security", Mobile Security Technologies Workshop (MoST), May 2015 — VERIFIED

- Source: an author's publication page.
- Read: 998,286 free mobile web apps on Google Play (June 2014 snapshot); "We find that 28% of the studied apps have at
  least one vulnerability."
- For Ferrum: shows at scale that loading untrusted content and weak navigation handling are common in WebView apps.

### L11. Nguyen, Stock — "Open Access Alert: Studying the Privacy Risks in Android WebView's Web Permission Enforcement", ACM AsiaCCS 2025 (published 2025-08-25) — VERIFIED

- Source: CISPA publication page.
- Read: 12,109 potential "privacy-harmful apps" that fail to enforce web permissions; 2,219 of them exploitable through
  a confused-deputy attack (websites reaching location, camera or microphone); affected apps with over 500 million
  installations.
- For Ferrum: the app's own permissions must never pass to any site that asks; Ferrum refuses by default and grants
  per site only (p4.5, p4.17).

### L12. Yu, Liu, Li, Sun, Cao — "Buzz to Boom: Detecting Message Progression Vulnerabilities in Electron Applications via Segmented Directed Fuzzing", arXiv:2607.20698 (submitted 22 July 2026; preprint, not peer reviewed) — VERIFIED

- Read: 589 real-world Electron applications; 23 zero-day message progression vulnerabilities, 22 leading to OS command
  execution; 13 acknowledgments, 11 fixes and 11 CVEs.
- For Ferrum: multi-step message chains from untrusted content to privileged code are the main desktop-container risk;
  a fuzzing approach is a possible later test of the shell's commands. Preprint status to be rechecked before citing.

## Not used

- Doyensec, "Electronegativity" (Black Hat USA 2017) and "Preloading Insecurity" (Black Hat Asia 2019): seen only in
  search results by the helper, not opened (UNCERTAIN).
- An NSF PAR PDF the helper could not read (possibly an Electron analysis tool): title and venue unconfirmed.
