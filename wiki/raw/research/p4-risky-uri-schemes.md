---
id: research-p4-risky-uri-schemes
type: research-note
title: "Link types to other apps that attackers have abused on Windows (for Ferrum's always-refused list, p4.4)"
updated: 2026-10-13
sources:
  - https://www.microsoft.com/en-us/security/blog/2023/12/28/financially-motivated-threat-actors-misusing-app-installer/ (accessed 2026-10-13)
  - https://www.bitdefender.com/blog/businessinsights/technical-advisory-cve-2022-30190-zero-day-vulnerability-follina-in-microsoft-support-diagnostic-tool/ (search result, 2026-10-13)
  - https://www.sentinelone.com/?p=67589 (search result, 2026-10-13)
  - https://www.bleepingcomputer.com/news/security/new-windows-search-zero-day-added-to-microsoft-protocol-nightmare/ (search result, 2026-10-13)
  - https://www.trellix.com/blogs/research/beyond-file-search-a-novel-method/ (search result, 2026-10-13)
  - https://www.bleepingcomputer.com/news/security/phishing-emails-abuse-windows-search-protocol-to-push-malicious-scripts/ (search result, 2026-10-13)
  - https://www.malwarebytes.com/blog/news/2021/12/vulnerability-in-windows-10-uri-handler-leads-to-remote-code-execution (search result, 2026-10-13)
  - https://0patch.com/blog/micropatching-ms-officecmd-remote-code (search result, 2026-10-13)
---

# Link types to other apps that attackers have abused on Windows

> Raw research note. Written by Claude in session s03 on 2026-10-13 for task p4.4 (owner answer Q-224: any link type
> may be offered, always with a click; Claude proposes a short always-refused list for the owner's review).
> **VERIFIED** = read on that day on the page named (primary source). **REPORTED** = taken from search-result summaries of
> security-press articles on that day; the article pages themselves were not opened. Nothing here was tested on this PC.

## 1. Findings

| Scheme | What happened | Grade | Source |
|---|---|---|---|
| `ms-appinstaller` | Microsoft disabled the handler by default ("Microsoft has disabled the ms-appinstaller protocol handler by default"; disabled in App Installer build 1.21.3421.0) because threat actors used it as an "access vector for malware" that "can bypass mechanisms designed to help keep users safe from malware" | VERIFIED | Microsoft Security blog, 2023-12-28 |
| `ms-msdt` | CVE-2022-30190 ("Follina"): remote code execution through the Microsoft Support Diagnostic Tool URL protocol; Microsoft's workaround was to disable the MSDT URL protocol by deleting the `ms-msdt` registry key; patched 2022-06-14 | REPORTED | Bitdefender, SentinelOne advisories (2022) |
| `search-ms` | Windows Search can be made to query a remote file share and show it with a custom window title, so remote malicious files look local; used from web pages (JavaScript) and phishing attachments (2022 to 2024) | REPORTED | BleepingComputer (2022, 2024), Trellix (2023) |
| `ms-officecmd` | CVE-2021-43905: argument injection in the default handler; a web page redirecting to a crafted `ms-officecmd:` address could run code with one click (Positive Security research, late 2021) | REPORTED | Malwarebytes (2021-12), 0patch |

## 2. Use in Ferrum (Claude's proposal, not an owner decision)

These four schemes (`ms-appinstaller`, `ms-msdt`, `search-ms`, `ms-officecmd`) are refused without asking,
even though Ferrum asks before every link to another app: each one has been used to make one click run or install
something. The list is short on purpose and is the owner's to review (Q-224).
