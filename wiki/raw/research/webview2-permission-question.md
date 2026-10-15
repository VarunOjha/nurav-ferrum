---
id: research-webview2-permission-question
type: research-note
title: "WebView2 permission requests: holding a request until the user answers, and which site asked (p4.20)"
updated: 2026-10-15
sources:
  - https://learn.microsoft.com/en-us/microsoft-edge/webview2/reference/win32/icorewebview2permissionrequestedeventargs (accessed 2026-10-15; reference version webview2-1.0.4258.31, ms.date 2026-09-21)
  - https://learn.microsoft.com/en-us/microsoft-edge/webview2/reference/win32/icorewebview2permissionrequestedeventargs2 (accessed 2026-10-15; same version)
  - https://learn.microsoft.com/en-us/microsoft-edge/webview2/reference/win32/icorewebview2frame3 (accessed 2026-10-15; same version)
  - "webview2-com-sys 0.39.1 source, src/bindings.rs: ICoreWebView2PermissionRequestedEventArgs::GetDeferral and ICoreWebView2Deferral::Complete (cargo registry copy, read 2026-10-15)"
  - "Ferrum source, crates/webview-manager/src/webview2.rs (p4.5 permission handler, read 2026-10-15)"
---

# WebView2 permission requests: holding a request and knowing who asked

> Raw research note. Written by Claude in session s07 on 2026-10-15 for task p4.20 (owner answer Q-227, adr-0034:
> a Chrome-style question before a site may use the camera, microphone, location, notifications or clipboard).
> **VERIFIED** = read on that day on the official Microsoft page (or library source) named. **UNCERTAIN** = inferred,
> or not stated for this case. **TO OBSERVE** = the p4.20 live test records what happens. Nothing here was tested on
> this PC when the note was written.

## 1. Holding a request until the user answers

| # | Claim | Grade | Source |
|---|---|---|---|
| 1.1 | `ICoreWebView2PermissionRequestedEventArgs::GetDeferral` returns a deferral: "Use the deferral object to make the permission decision at a later time." | VERIFIED | event-args page, GetDeferral |
| 1.2 | "The deferral only applies to the current request, and does not prevent the `PermissionRequested` event from getting raised for new requests. However, for some permission kinds the WebView will avoid creating a new request if there is a pending request of the same kind." | VERIFIED | event-args page, GetDeferral |
| 1.3 | The answer is given with `put_State` (`COREWEBVIEW2_PERMISSION_STATE_ALLOW`, `_DENY` or `_DEFAULT`); "The default value is `COREWEBVIEW2_PERMISSION_STATE_DEFAULT`." Microsoft's sample sets the state and then calls `deferral->Complete()`. | VERIFIED | event-args page; frame page sample |
| 1.4 | The Rust bindings Ferrum uses have both calls: `GetDeferral(&self) -> Result<ICoreWebView2Deferral>` and `ICoreWebView2Deferral::Complete`. | VERIFIED | webview2-com-sys 0.39.1 bindings |
| 1.5 | "If a deferral is not taken on the event args, the subsequent scripts are blocked until the event handler returns. If a deferral is taken, the scripts are blocked until the deferral is completed." This is written on the **frame** event page. Whether the main `CoreWebView2` event pauses the page the same way is not stated. | VERIFIED (frame event) / UNCERTAIN (main event) | frame page, add_PermissionRequested |
| 1.6 | Consequence for Ferrum: while the question waits, the asking page may be paused. A request must therefore never wait without an end: it is answered when the user clicks, or refused when the tab navigates, reloads or closes. | PROPOSAL | from 1.5 |
| 1.7 | Whether the page stays responsive while the question waits. | TO OBSERVE | p4.20 live test |

## 2. Which site asked

| # | Claim | Grade | Source |
|---|---|---|---|
| 2.1 | `get_Uri`: "The origin of the web content that requests the permission." | VERIFIED | event-args page |
| 2.2 | For a request from an iframe, both the frame's and the `CoreWebView2`'s `PermissionRequested` events are raised, the frame's first; setting `Handled` to TRUE in the frame handler stops the `CoreWebView2` event. Ferrum registers only the `CoreWebView2` event, so it also sees iframe requests. | VERIFIED | frame page; event-args2 page, put_Handled |
| 2.3 | So for an iframe request `Uri` is the iframe's origin, not the top page's. Ferrum compares its site with the tab's page site to refuse other-site frames without a question. | UNCERTAIN (inferred from 2.1 and 2.2) | p4.20 live test checks it with a cross-site frame |
| 2.4 | `get_IsUserInitiated`: TRUE "when the permission request was initiated through a user gesture", with the note "Being initiated through a user gesture does not mean that user intended to access the associated resource." Ferrum does not use it to decide. | VERIFIED | event-args page |

## 3. What does not change

| # | Claim | Grade | Source |
|---|---|---|---|
| 3.1 | Since p4.5 Ferrum sets `SavesInProfile(FALSE)` where the runtime offers it (`ICoreWebView2PermissionRequestedEventArgs3`), so WebView2 keeps no answer and every request reaches Ferrum. The deferral does not change this. | VERIFIED (Ferrum code) | webview2.rs |
| 3.2 | Microsoft's sample answers on the UI thread after the handler returned (`RunAsync`), and takes the deferral inside the handler. Ferrum does the same: the handler takes the deferral and returns; the answer comes later from the shell's click. | VERIFIED (sample) / PROPOSAL (Ferrum) | frame page sample |
