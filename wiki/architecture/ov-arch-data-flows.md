---
id: ov-arch-data-flows
type: overview
title: "Architecture: runtime data flows"
status: review
updated: 2026-10-09
sources:
  - raw/research/tauri-webview2-capabilities.md
  - raw/research/measurement-methodology.md
  - raw/research/nextjs-stack.md
  - raw/01-scoping-decisions.md
  - raw/00-master-prompt.md
related: [ov-arch-system-overview, ov-arch-trust-boundaries, ov-arch-webview2-integration, ov-arch-lifecycle-state-machine, ov-arch-configuration, comp-app-shell, comp-webview-manager, comp-security-engine, comp-resource-manager, comp-telemetry, comp-network-logger, comp-benchmark-harness, comp-interactive-plan, comp-tab-content, comp-webview2-runtime, adr-0008, adr-0016, phase-p5-telemetry, risk-r08, adr-0019]
approvable: true
audience: both
phase: phase-p0-planning
tags: [data-flow, ipc, telemetry, network-log]
unverified:
  - claim: "In-process CDP Network.* events (via GetDevToolsProtocolEventReceiver) provide method, status, resource type, timing and encoded size fields"
    verify_in: phase-p5-telemetry
  - claim: "Network.enable on every tab has acceptable overhead (to be quantified, not assumed)"
    verify_in: phase-p5-telemetry
  - claim: "FCP/LCP can be read from a tab via host-initiated script or CDP without adding IPC to the page"
    verify_in: phase-p5-telemetry
  - claim: "The IPC rejection of untrusted tab content holds end to end"
    verify_in: phase-p4-security
---

# Runtime data flows

Six flows. Flows 1–5 happen at runtime inside Ferrum. Flow 6, approvals, is **not runtime** and exists only to make that explicit.

## 1. Navigation (user-typed URL, including redirects)

```mermaid
sequenceDiagram
  participant U as User
  participant S as comp_app_shell (shell UI + host)
  participant W as comp_webview_manager
  participant P as comp_security_engine
  participant R as comp_webview2_runtime
  participant T as comp_telemetry
  U->>S: types URL, Enter
  S->>S: shell UI invoke("tab_navigate") via tauri-ipc (shell capability, webview label "shell")
  S->>W: navigate(tab_id, input) on async command
  W->>P: evaluate(Navigation{url, tab, site, initiator=user})
  P-->>W: Allow / Deny{rule} / Confirm{scheme}
  alt Allow
    W->>R: Webview::navigate(url)
    loop each NavigationStarting (initial + every redirect hop)
      R-->>W: NavigationStarting(uri) [Tauri on_navigation + raw COM handler]
      W->>P: evaluate(Navigation{uri, initiator=redirect or page})
      P-->>W: decision (fail-closed on parse error)
      W->>R: allow or SetCancel
    end
    R-->>W: NavigationCompleted / on_page_load Finished
    W->>T: NavTiming{tab, start, end, outcome}
    W-->>S: event tab-updated{url, title, loading=false}
  else Deny
    P->>P: append audit.jsonl (denied)
    W-->>S: event tab-blocked{url, rule}
  end
```

Page-initiated navigations (links, `location=`, form posts, `window.open`) enter at the NavigationStarting / NewWindowRequested step. Iframe navigations come in through raw-COM `FrameNavigationStarting` ([integration §2](ov-arch-webview2-integration.md)).

## 2. IPC commands: the shell is allowed, remote content is denied

```mermaid
sequenceDiagram
  participant SH as Shell WebView (local origin)
  participant TC as comp_tab_content (remote origin)
  participant R as comp_webview2_runtime
  participant H as comp_app_shell (Tauri host, ACL)
  SH->>R: window.ipc.postMessage(invoke tab_navigate)
  R->>H: WebMessageReceived(source = local origin, webview label "shell")
  H->>H: Origin::Local, capability "shell" matches webview label
  H-->>SH: command result
  TC->>R: window.ipc.postMessage(invoke any command)
  R->>H: WebMessageReceived(source = https://site, webview label "tab-N")
  H->>H: Origin::Remote, no capability declares remote
  H-->>TC: rejected (ACL), logged
```

The facts behind this flow are VERIFIED in the [Tauri note §3](../raw/research/tauri-webview2-capabilities.md). That the rejection holds end to end will be proven by the P4 tests (UNVERIFIED[phase-p4-security] until then) ([trust boundaries §4](ov-arch-trust-boundaries.md)).

**Proposed shell command surface** (names are PROPOSALs, finalised in phase-p2-minimal-container / phase-p3-tabs-sessions): `tab_create`, `tab_close`, `tab_activate`, `tab_navigate`, `tab_back`, `tab_forward`, `tab_reload`, `tab_stop`, `settings_get`, `settings_set`, `session_list`, `download_list`, `external_open_confirm`, `netlog_open_folder`. Events (Rust → shell): `tab-updated`, `tab-blocked`, `tab-lifecycle`, `download-updated`, `permission-request`, `external-scheme-request`.

## 3. Telemetry sampling (in-app)

```mermaid
sequenceDiagram
  participant K as tokio tick (sample_interval)
  participant W as comp_webview_manager (UI thread, COM)
  participant T as comp_telemetry
  participant O as comp_windows_os
  participant M as comp_resource_manager
  K->>W: request PID set
  W->>W: Environment13 GetProcessExtendedInfos (UI thread, COM-1)
  W-->>T: PidSet{pid, creation_time, kind, frames}
  T->>O: GetProcessMemoryInfo (EX2), GetProcessTimes, QueryProcessCycleTime (off UI thread)
  O-->>T: counters
  T->>T: aggregate (sum PrivateUsage over the set, never sum per-process peaks)
  T->>M: ProcessSample + pressure signal
  T->>T: append samples.jsonl (export dir)
```

Metric definitions follow the [measurement note §1–3](../raw/research/measurement-methodology.md): private commit is the headline, and working set is secondary with a caveat. **In-app samples are not the measurement of record for the cross-browser comparison.** The harness measures every product externally, with a Job Object plus counters ([comp-benchmark-harness](components/comp-benchmark-harness.md)). In-app samples drive policies and serve as cross-checks.

**Startup marks.** Process creation time (`GetProcessTimes`), then `window-visible` (shell reports first paint of its own UI), then first tab NavigationCompleted, then FCP/LCP read from the page. How FCP/LCP are read without adding page→host IPC is UNVERIFIED[phase-p5-telemetry]; candidates are host-initiated `ExecuteScript` and CDP `Runtime.evaluate`.

## 4. Network-log capture (adr-0008: metadata only, JSONL)

```mermaid
sequenceDiagram
  participant W as comp_webview_manager (webview2::netlog)
  participant R as comp_webview2_runtime
  participant N as comp_network_logger
  participant F as netlog folder
  W->>R: add_WebResourceResponseReceived on tab create (adr-0008 route)
  R-->>W: request + response objects (may contain headers)
  W->>W: reduce to allow-listed fields (COM-9), drop headers, cookies, bodies
  W->>N: NetRecord{ts, tab, site, url, method, status, resource_type, timing, sizes, policy_decision}
  N->>N: validate schema, apply url_mode
  N->>F: append JSONL (per-session file, size rotation)
```

- **Implementation route (accepted adr-0008; config default `route = "web-resource-response"`):** `ICoreWebView2_2::WebResourceResponseReceived`. It fires for every response, including redirects and subresources. It is non-blocking with no ordering guarantee (VERIFIED). Whether it exposes every field in the record schema (resource type, sizes) is UNVERIFIED[phase-p5-telemetry].
- **Alternative:** in-process DevTools Protocol over COM (`CallDevToolsProtocolMethod("Network.enable")` + `GetDevToolsProtocolEventReceiver`). It needs **no** remote debugging port. That the method and receiver exist is VERIFIED (Tauri note §6); which event fields it provides is UNVERIFIED[phase-p5-telemetry]. A P5 spike checks the fields; switching the route, or using both for cross-validation, requires a superseding decision.
- The overhead of the chosen route (handler cost, or `Network.enable` if CDP is used) is measured, not assumed: UNVERIFIED[phase-p5-telemetry]. The logger is a runtime toggle so exp-security-overhead / exp-baseline-footprint can run with it off and on.
- **Privacy:** fields are allow-listed (adr-0008, scoping Q5). Log folders are gitignored and never committed (master prompt §12).

## 5. Lifecycle transitions

```mermaid
sequenceDiagram
  participant M as comp_resource_manager
  participant W as comp_webview_manager
  participant R as comp_webview2_runtime
  participant T as comp_telemetry
  participant S as comp_app_shell
  M->>M: decide(snapshot, inputs, config, now) -> actions
  M->>W: Suspend(tab) or Discard(tab) via LifecycleActuator
  W->>R: ExecuteScript guard probe (async completion, COM-2)
  R-->>W: probe JSON (untrusted)
  W->>W: re-check guards on UI thread
  alt guards pass
    W->>R: TrySuspend or Close controller
    W-->>M: ActionResult ok
  else guard fails
    W-->>M: ActionResult rejected(guard)
  end
  M->>T: LifecycleTransition record
  W-->>S: event tab-lifecycle{tab, state}
```

See [lifecycle state machine](ov-arch-lifecycle-state-machine.md) for states, guards and policies.

## 6. Approval flow: NOT a runtime flow

```mermaid
flowchart LR
  owner["Owner (browser on 127.0.0.1)"] --> comp_interactive_plan["comp-interactive-plan (Next.js, local only)"]
  wiki_pages["wiki/**/*.md (read-only for the app)"] --> comp_interactive_plan
  comp_interactive_plan --> approvals["plan/approvals.json (written only by the app)"]
  approvals --> claude["Claude session reads at every phase gate"]
```

The plan app is planning tooling (adr-0016). It has **no connection to Ferrum's runtime**, is never shipped, and is never started by the product. Claude never writes `plan/approvals.json` (wiki SCHEMA §10.1).
