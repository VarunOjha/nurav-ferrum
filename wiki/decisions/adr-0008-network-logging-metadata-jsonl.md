---
id: adr-0008
type: decision
title: "Network call logging is metadata-only JSONL written to a folder"
status: accepted
updated: 2026-10-19
sources:
  - raw/00-master-prompt.md
  - raw/01-scoping-decisions.md
  - raw/research/tauri-webview2-capabilities.md
related: [adr-0015, adr-0019, adr-0012, phase-p5-telemetry, phase-p4-security, comp-network-logger, comp-telemetry, comp-security-engine, comp-webview-manager, risk-r03, risk-r06]
approvable: true
date: 2026-10-08
decided_by: owner
supersedes: []
options:
  - "Metadata only (URL, method, status, resource type, timing, sizes, tab, policy decision) as JSONL"
  - "Metadata plus request/response headers"
  - "Full capture including bodies (HAR-like)"
phase: phase-p0-planning
tags: [network, logging, privacy, telemetry]
unverified:
  - claim: "Logging overhead of WebResourceResponseReceived handlers is negligible for benchmark runs"
    verify_in: phase-p6-benchmark-harness
---

# ADR-0008: Network call logging is metadata-only JSONL

## Context

Master prompt objective 11: "Dumps network call logs of browser to a folder for review of activity" ([raw/00-master-prompt.md](../raw/00-master-prompt.md) §2). The master prompt also says: "Do not commit private authentication tokens, browser profiles, or sensitive browsing information" (§12).

Scoping question Q5 asked how deep the log should go. The owner chose **"Metadata only (URL, method, status, resource type, timing, sizes, tab, policy decision) as JSONL; no headers/bodies"** ([raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md)).

Research ([raw/research/tauri-webview2-capabilities.md](../raw/research/tauri-webview2-capabilities.md) §4, §6, §9; VERIFIED):

- Tauri's `on_web_resource_request` fires **only for Tauri's own custom protocol**. It is **not** a network hook for HTTPS tabs.
- Neither Tauri nor wry exposes response events for remote content.
- Two reachable sources:
  - WebView2 `ICoreWebView2_2::WebResourceResponseReceived`, raised for every resource response (navigations, redirects, subresources, fetch). It is non-blocking and has no ordering guarantee.
  - The DevTools Protocol `Network.*` events, via `CallDevToolsProtocolMethod("Network.enable")` and `GetDevToolsProtocolEventReceiver`.
- Both require **raw COM** through `with_webview` and are `unsafe` ([ADR-0019](adr-0019-raw-webview2-com-boundary.md)).

## Options considered

| Option | Pros | Cons |
|---|---|---|
| A. **Metadata-only JSONL** | Meets the "review activity" goal. Small files. Low privacy exposure. Line-oriented, so streamable, append-safe and easy to analyse in Python | No headers or bodies, so some debugging questions cannot be answered. URLs themselves can contain tokens (query strings) |
| B. Metadata plus headers | Richer debugging | Headers carry cookies and authorisation tokens: a high privacy and security risk, and they would need redaction rules. Not the owner's choice |
| C. Full HAR-like capture | Complete record | Large, very sensitive, costly to capture (bodies). It perturbs benchmark measurements. Not the owner's choice |

## Decision

### Owner decision (verbatim)

As recorded in [raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md), scoping answer Q5 (that file records the owner's words verbatim-in-substance):

> Q5 Network call logging depth: **Metadata only** (URL, method, status, resource type, timing, sizes, tab, policy decision) as JSONL; no headers/bodies

This quoted choice is what `decided_by: owner` and `status: accepted` cover (SCHEMA §10.4 rule 3(b)).

### Claude elaboration (binding only once the owner APPROVES this ADR)

Everything below in this section is Claude's elaboration of the owner's choice. Under SCHEMA §10.4 it binds implementation only after the owner approves this ADR (given in Claude Code and recorded in `plan/approvals.json`, adr-0023); until then it is a proposal.

**Option A.** One JSON object per line, one file per Ferrum run, plus rotation by size.

Proposed record fields, to be finalised on the `comp-network-logger` page:

| Group | Fields |
|---|---|
| Timing | `ts` (ISO 8601), `t_mono_ms` |
| Request | `tab_id`, `profile`, `url`, `method`, `resource_type` |
| Response | `status`, `redirect_to` (when present), `timing` (as available), `encoded_size` / `decoded_size` (as available) |
| Policy | `policy_decision` (`allowed` / `blocked:<rule>`) |
| Errors | `error` (net error, when present). `WebResourceResponseReceived` fires on responses, so a request that fails with no response may never produce it. Observed in p5.10 ([netlog-coverage-p5.10.json](../raw/evidence/phase-p5-telemetry/netlog-coverage-p5.10.json)): a request that gets no response produces no event, so it is not in the log; CDP `Network.loadingFailed` was not tried, because the CDP route was not taken |

No header values and no bodies, ever.

Implementation source: `WebResourceResponseReceived` through the raw-COM boundary ([ADR-0019](adr-0019-raw-webview2-com-boundary.md)). CDP `Network.*` is the alternative if the needed fields (resource type, sizes) are not available there. It gives address, method and status; resource type and size are derived from two named headers (`Sec-Fetch-Dest`, `Content-Length`), and it has no timing, so the record's time is when the response was reported (p5.9, [check-p5.9](../raw/evidence/phase-p5-telemetry/check-p5.9.txt)).

Policy decisions are joined from `comp-security-engine`'s audit events, by tab and navigation id, so blocked requests appear in the log even though they produce no response.

Storage rules:

- The log folder is **outside the git repo** by default, under the user's local app-data folder. Owner's answer to Q-114 ([raw/owner/2026-10-18-s08-p5-questions.md](../raw/owner/2026-10-18-s08-p5-questions.md)): full URLs are kept in the local log; the log is **off by default** and switched on in settings (benchmark runs switch it on themselves); files older than **14 days** are deleted (changeable in settings). Location: `%LOCALAPPDATA%\Ferrum\netlogs\<run-timestamp>.jsonl`, size-based rotation with a total cap set in settings. A "redact query values" mode stays mandatory for any log copied into `wiki/raw/bench/`.
- Logs from benchmark runs that are archived into `wiki/raw/bench/` must contain only synthetic-local or approved public workload URLs.

## Consequences

### Positive

- Activity can be reviewed per tab and per profile, including blocked requests (useful for P4 security audit logging).
- The same JSONL can feed `comp-telemetry` and the analysis for navigation metrics.

### Negative

- **Raw COM required.** This depends on `unsafe` WebView2 COM code. Handlers must be unregistered on tab close, or reference cycles keep webviews alive (research §5).
- **No ordering guarantee.** Records may arrive out of order, so consumers must sort by timestamp.
- **Benchmark perturbation.** Logging adds work during measured runs. The logger must be switchable per configuration, and its overhead measured. Whether it is negligible is UNVERIFIED[phase-p6-benchmark-harness].
- **URL sensitivity.** Full URLs may include session tokens in query strings. The owner chose to keep them in the local log (Q-114); the off-by-default switch and the 14-day deletion limit how long they sit on disk.

### Follow-ups

- P5: implement `comp-network-logger`. Validation tests: synthetic local page with N known subresources and one redirect, whose log must contain exactly the expected records.
- P6: an A/B overhead check (logger on vs off) on one workload before any comparative campaign.

### Related risks and phases

- Risks: `risk-r03` (raw COM via `with_webview`), `risk-r06` (benchmark-only interaction). The in-process CDP route (`CallDevToolsProtocolMethod` + `GetDevToolsProtocolEventReceiver` over COM) does not open a debugging port ([raw/research/tauri-webview2-capabilities.md](../raw/research/tauri-webview2-capabilities.md) §6, §7). `risk-r06` applies only to the external Playwright connection over `--remote-debugging-port`, which the logger must coexist with during benchmark runs.
- Phases: `phase-p5-telemetry` (owner), `phase-p4-security` (audit events).

## Verification / evidence

- Owner answer Q5: [raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md).
- Hook availability: [raw/research/tauri-webview2-capabilities.md](../raw/research/tauri-webview2-capabilities.md) §4 (on_web_resource_request is custom-protocol only), §6 ("Events only reachable via raw COM"), §9 (capability matrix row "Network metadata log").
- Exit evidence (P5): logger validation test output under `wiki/raw/evidence/phase-p5-telemetry/`.
