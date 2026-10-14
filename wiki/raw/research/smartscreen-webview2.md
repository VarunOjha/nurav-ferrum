---
id: research-smartscreen-webview2
type: research-note
title: "SmartScreen inside WebView2: what it checks, what it sends to Microsoft, how it is switched, and Microsoft's test pages (p4.18)"
updated: 2026-10-14
sources:
  - https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/data-privacy (accessed 2026-10-14; page updated 2026-10-02)
  - https://learn.microsoft.com/en-us/legal/microsoft-edge/privacy (accessed 2026-10-14; page updated 2026-10-07, section "SmartScreen" and section "WebView2")
  - https://learn.microsoft.com/en-us/deployedge/microsoft-edge-security-smartscreen (accessed 2026-10-14; ms.date 2026-07-08)
  - https://learn.microsoft.com/en-us/dotnet/api/microsoft.web.webview2.core.corewebview2settings.isreputationcheckingrequired (accessed 2026-10-14; page updated 2026-10-12)
  - https://learn.microsoft.com/en-us/dotnet/api/microsoft.web.webview2.core.corewebview2environmentoptions.additionalbrowserarguments (accessed 2026-10-14; page updated 2026-10-12)
  - https://learn.microsoft.com/en-us/microsoft-edge/webview2/platforms/winui2-uwp (accessed 2026-10-14; page updated 2026-09-02, section "SmartScreen")
  - https://learn.microsoft.com/en-us/defender-endpoint/defender-endpoint-demonstration-smartscreen-url-reputation (accessed 2026-10-14; page updated 2026-08-14)
  - https://demo.smartscreen.msft.net/ (accessed 2026-10-14)
  - "wry 0.57.0 source, src/webview2/mod.rs lines 300-333 (cargo registry copy, read 2026-10-14)"
  - "tauri 2.12.3 source, src/webview/mod.rs line 1033 additional_browser_args (cargo registry copy, read 2026-10-14)"
---

# SmartScreen inside WebView2

> Raw research note. Written by Claude in session s07 on 2026-10-14 for task p4.18 (owner answer Q-225: switch
> SmartScreen back on in every Ferrum environment, after a note on what it sends to Microsoft).
> **VERIFIED** = read on that day on the official Microsoft page (or library source) named. **UNCERTAIN** = inferred,
> or not stated for WebView2 specifically. **PROPOSAL** = Claude's suggestion for Ferrum. Nothing here was tested on
> this PC when the note was written; the live check of p4.18 records what was observed.

## 1. What SmartScreen is and what it checks

| # | Claim | Grade | Source |
|---|---|---|---|
| 1.1 | "Microsoft Defender SmartScreen ("SmartScreen") is a security feature that is enabled by default to help users safely browse the web." In WebView2 the `IsReputationCheckingRequired` setting controls it. | VERIFIED | WebView2 data-and-privacy page |
| 1.2 | It checks **sites**: it analyses visited pages "for indications of suspicious behavior" and checks visited sites "against a dynamic record of reported phishing sites"; a page judged malicious gets a full-page warning. | VERIFIED | Edge SmartScreen page, "Site analysis" |
| 1.3 | It checks **downloads**: whether "a downloaded app or app installer is potentially malicious" from "download traffic, download history, past anti-virus results, and URL reputation". Known-bad files are blocked, unknown files get a caution warning, known-good files download silently. | VERIFIED | Edge SmartScreen page, "File analysis" |
| 1.4 | Sites are sorted into "top traffic, dangerous, or unknown". A local list (downloaded periodically) covers top-traffic and known-dangerous sites. | VERIFIED | Edge privacy page, "SmartScreen" |
| 1.5 | Whether WebView2 shows the same warning page and download warnings as Edge is not stated on the WebView2 pages. | UNCERTAIN | none: the live check of p4.18 records what WebView2 actually shows |

## 2. What it sends to Microsoft

From the Edge privacy page, section "SmartScreen" (the WebView2 data-and-privacy page points to this section for what
is sent), three kinds of check:

| # | When | What is sent | Grade |
|---|---|---|---|
| 2.1 | A visited site is on the local **top-traffic** list | Nothing: "When you visit a top traffic site, SmartScreen doesn't send the URL to the SmartScreen service." A site on the local **dangerous** list is blocked without loading. | VERIFIED |
| 2.2 | Any other site (every URL "that aren't categorized as top traffic") | "the URL, relevant information about the site, an identifier unique to your device, and general location information". Results are kept locally and "automatically cleared at the end of the browser session". | VERIFIED |
| 2.3 | A download completes | "information about the file such as the file hash, file name, download URI, and an identifier unique to your device". The download finishes or not depending on the answer. | VERIFIED |
| 2.4 | All of the above | Sent "with HTTPS encryption". Microsoft "stores data about the reputation checks" to build its database of bad sites and files; it "is used only for Microsoft security services" and "is never used to identify or target you in any way" (Microsoft's statement, not something Ferrum can check). | VERIFIED (as Microsoft's statement) |
| 2.5 | The WinUI 2 (UWP) WebView2 page says plainly: "WebView2 sends URLs that are navigated to in your application to the SmartScreen service". | VERIFIED |
| 2.6 | **Duty for the app maker:** "If you don't disable SmartScreen, you must provide notice to all users that your software includes Microsoft Defender SmartScreen, and collects and sends the user's information to Microsoft as disclosed in Microsoft Privacy Statement and in SmartScreen in User data and privacy in Microsoft Edge." | VERIFIED (WebView2 data-and-privacy page) |
| 2.7 | Whether the "relevant information about the site" includes the full URL with its query string (the part after `?`) is not stated. Press reports from 2019 said Edge sent full URLs; they are not used here. | UNCERTAIN |

## 3. How it is switched on and off

| # | Claim | Grade | Source |
|---|---|---|---|
| 3.1 | `IsReputationCheckingRequired` defaults to `true` and applies per **user data folder**: SmartScreen is on if any WebView2 sharing the folder has it `true`. A change applies on the next navigation or download. | VERIFIED | IsReputationCheckingRequired page |
| 3.2 | The Windows setting "SmartScreen for Microsoft Edge" overrides it: when that Windows setting is off, SmartScreen is off "regardless of the IsReputationCheckingRequired value". | VERIFIED | IsReputationCheckingRequired page |
| 3.3 | The browser argument `--disable-features=msSmartScreenProtection` switches the navigation check off (Microsoft names it, set through `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS`, for WinUI 2 apps). | VERIFIED | WinUI 2 (UWP) page |
| 3.4 | Browser arguments: switches are separated by spaces, features in one `--disable-features` by commas; "calling this API twice will replace the previous value rather than appending to it"; enabled/disabled features are merged with the built-in ones. | VERIFIED | AdditionalBrowserArguments page |
| 3.5 | wry 0.57.0 uses Tauri's `additional_browser_args` when it is set; only when it is **not** set does it use its default `--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection` (plus `--autoplay-policy=no-user-gesture-required` when autoplay is on). Tauri 2.12.3 exposes this as `WebviewBuilder::additional_browser_args`. | VERIFIED | wry and tauri source, cargo registry |
| 3.6 | Ferrum never sets `IsReputationCheckingRequired` (searched the Ferrum crates and wry 0.57.0 source on 2026-10-14: no match), so it keeps its default `true`. With the browser argument removed, nothing in Ferrum switches SmartScreen off. | VERIFIED (search of the code) |
| 3.7 | On this PC the per-user registry value `HKCU\Software\Microsoft\Edge\SmartScreenEnabled` reads 1, and no WebView2 or Edge policy key overrides browser arguments or SmartScreen. That this value is the Windows setting of 3.2 is Claude's reading, not stated by Microsoft. | UNCERTAIN |

## 4. Microsoft's test pages

| # | Claim | Grade | Source |
|---|---|---|---|
| 4.1 | Microsoft's demo site is `https://demo.smartscreen.msft.net/`, titled "Microsoft Defender SmartScreen Demo"; "These pages are just for demonstration ... nothing is actually malicious." The Edge SmartScreen page links it ("our demo site"). | VERIFIED | demo site; Edge SmartScreen page |
| 4.2 | Known phishing page: `https://demo.smartscreen.msft.net/phishingdemo.html`, "A page known for phishing that should be blocked". Requirements stated: Windows 10 or 11 and Microsoft Edge. | VERIFIED | Defender URL reputation demonstrations page |
| 4.3 | Other pages: "Is this phishing?" (`/other/areyousure.html`), malware page (`/other/malware.html`), blocked download (`/download/malwaredemo/freevideo.exe`), exploit page, malvertising frame; app-reputation downloads (known good, unknown, known malware). The demo site itself links the same pages under `nav.smartscreen.msft.net`. | VERIFIED | same two pages |

## 5. Use in Ferrum (PROPOSAL)

1. Ferrum sets the browser arguments itself, one string for every environment (the shell's, through Tauri's
   `additional_browser_args`, and the site environments of p4.15):
   `--disable-features=msWebOOUI,msPdfOOUI --autoplay-policy=no-user-gesture-required` (wry's default without
   `msSmartScreenProtection`; the two Edge-menu switches and autoplay unchanged, owner answer Q-225).
2. The live check opens only the **phishing page** (4.2): a page, not a download, so nothing is saved or run. It
   records what Ferrum shows, as observed. If no warning appears, that is recorded, with 3.2 and 3.7 as the first
   things to check.
3. Ferrum's documentation must tell users that SmartScreen is on and what it sends (2.6): SECURITY.md and the
   data-flows page cite this note.
