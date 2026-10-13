---
id: research-webview2-task-manager-grouping
type: research-note
title: "WebView2 processes appear as a separate \"WebView2 Manager\" group in Windows 11 Task Manager"
updated: 2026-10-13
sources:
  - https://github.com/MicrosoftEdge/WebView2Feedback/issues/5628 (accessed 2026-10-13)
  - https://github.com/orgs/tauri-apps/discussions/15522 (accessed 2026-10-13)
  - target/release/ferrum-desktop.exe and its running processes on the dev PC (observed 2026-10-13)
---

# WebView2 processes and the Task Manager group name

> Raw research note. Written by Claude in session s02 on 2026-10-13 after the owner asked why Task Manager shows
> "webview manager" instead of Ferrum. **VERIFIED** = read on that day at the source named; **OBSERVED** = seen on the
> dev PC on that day (one look, not a measurement).

## 1. What the sources say

- **VERIFIED** (WebView2Feedback issue #5628, opened 2026-06-25, assigned to a Microsoft engineer 2026-06-30): in
  Windows 11 Task Manager, the WebView2 child processes of an app (browser, GPU, renderer, network, storage, crashpad)
  appear as a separate "WebView2 Manager" group instead of under the app that started them. The reporter's app
  "already calls SetCurrentProcessExplicitAppUserModelID for taskbar grouping, but this does not affect Task Manager
  process grouping", and "No WebView2 API or configuration was found to control the process group display name in Task
  Manager." On 2026-10-13 the page showed no Microsoft answer, workaround or fix version.
- **VERIFIED** (tauri-apps discussion #15522, 2026-06-19): a Tauri v2 app asked to change "WebView2 Manager" to the app
  name. The reply: "build.shortDescription / bundle metadata does not appear to control the WebView2 Manager
  child-process group name in Windows Task Manager"; the app's own process uses the app's metadata, while the WebView2
  Manager entries are child processes of the WebView2 runtime; a change "likely needs a Tauri/WebView2 integration
  change rather than a normal app metadata setting". No workaround was given.

## 2. What Ferrum does (dev PC)

- **OBSERVED**: `ferrum-desktop.exe` (release build of 2026-10-12) has FileDescription and ProductName "Ferrum"; its
  running process shows description and window title "Ferrum".
- **OBSERVED**: Ferrum's process is the direct parent of one `msedgewebview2.exe` (description "Microsoft Edge
  WebView2", the main WebView2 process), which had 12 child processes at that moment.

## 3. Consequences for Ferrum

- No supported way was found to show Ferrum's name on the WebView2 group. Renaming or repackaging Microsoft's signed
  runtime is excluded (it would weaken WebView2 security, CLAUDE.md §6).
- An engine that Ferrum ships itself (for example the Chromium Embedded Framework, whose helper process can, as far as
  Claude knows, be the app's own program; not checked against a source here) might avoid the label, but would change the engine choice the project rests on (WebView2, owner
  scoping, raw/01-scoping-decisions.md). Not evaluated further; registered as Q-223.
