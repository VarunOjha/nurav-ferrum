---
id: risk-r08
type: risk
title: "The network logger needs raw COM or CDP because Tauri has no response hook for https tabs"
status: open
updated: 2026-10-08
sources:
  - raw/research/tauri-webview2-capabilities.md
  - raw/01-scoping-decisions.md
  - raw/00-master-prompt.md
related: [phase-p5-telemetry, adr-0008, comp-network-logger, comp-webview-manager, comp-telemetry, risk-r18, risk-r14, qual-testing-strategy]
approvable: true
tags: [network-log, webview2, com, privacy]
likelihood: 5
impact: 3
mitigation: "Implement comp-network-logger on WebResourceResponseReceived via raw COM (non-blocking, unordered), keep the metadata-only JSONL schema of adr-0008 with a versioned schema and validation tests, use CDP Network events only as a fallback, never write headers or bodies, keep logs out of git, and measure the logger's overhead before it is enabled in benchmark runs."
spike: null
owner_phase: phase-p5-telemetry
trigger: "Required metadata fields (status, sizes, timing, resource type) are missing from the event args; events are lost under load; iframe requests are missing; the log contains tokens in query strings that the owner considers sensitive."
fallback: "CDP Network.* events via GetDevToolsProtocolEventReceiver (after Network.enable), accepting the CDP dependency, or a reduced field set documented in adr-0008."
unverified:
  - claim: "WebResourceResponseReceived event args provide every field adr-0008 requires (status, resource type, timing, sizes)"
    verify_in: phase-p5-telemetry
  - claim: "Logging every response adds overhead below the harness noise floor"
    verify_in: phase-p6-benchmark-harness
---

# risk-r08: The network logger needs raw COM or CDP because Tauri has no response hook for https tabs

| Likelihood | Impact | Score | Status | Owner phase |
|---|---|---|---|---|
| 5 | 3 | 15 | open | `phase-p5-telemetry` |

Score = likelihood × impact (SCHEMA §6.5). Scales are planning judgements, not measurements. Full register: [ov-risk-register](ov-risk-register.md).

## Description and evidence

The owner chose metadata-only network logging (URL, method, status, resource type, timing, sizes, tab, policy decision) as JSONL, without headers or bodies (adr-0008, Q5; master prompt §2 objective 11). Verified (TW §4, §6, §10 item 5):

- Tauri's `on_web_resource_request` covers only Tauri's own custom protocol, **not** https tab traffic.
- `ICoreWebView2_2::WebResourceResponseReceived` fires for every resource response (navigations, redirects, subresources, fetch), is non-blocking and has **no ordering guarantee**. It is not used by wry or Tauri, so it needs raw COM (see risk-r18).
- The legacy request filter misses cross-origin iframes; `AddWebResourceRequestedFilterWithRequestSourceKinds` (`ICoreWebView2_22`) covers them.
- The CDP alternative needs `Network.enable` first.

Privacy: URLs can carry tokens. The master prompt (§12) forbids committing sensitive browsing information, so logs live in a git-ignored folder. Whether to redact query strings is an owner decision.

Sources: [tauri-webview2-capabilities](../raw/research/tauri-webview2-capabilities.md), [scoping decisions](../raw/01-scoping-decisions.md), [master prompt](../raw/00-master-prompt.md). Abbreviations: TW = tauri-webview2-capabilities, MM = measurement-methodology, RW = related-work-seed, NX = nextjs-stack, LW = llm-wiki-pattern.

## Early-warning signs (trigger)

Required metadata fields (status, sizes, timing, resource type) are missing from the event args; events are lost under load; iframe requests are missing; the log contains tokens in query strings that the owner considers sensitive.

## Mitigation

Implement comp-network-logger on WebResourceResponseReceived via raw COM (non-blocking, unordered), keep the metadata-only JSONL schema of adr-0008 with a versioned schema and validation tests, use CDP Network events only as a fallback, never write headers or bodies, keep logs out of git, and measure the logger's overhead before it is enabled in benchmark runs.

## De-risking spike (proposed)

Phase: `phase-p5-telemetry` (first task).
1. Register `WebResourceResponseReceived` on one tab via `with_webview`; load a local fixture page with known subresources (image, script, fetch, iframe, redirect).
2. Check that every expected request appears exactly once with the fields adr-0008 lists; note any field the event does not provide.

The `spike` frontmatter field stays `null` until the owning phase page assigns a task id (`pN.M`); the integrator or phase owner then sets it here.

## Fallback if realised

CDP Network.* events via GetDevToolsProtocolEventReceiver (after Network.enable), accepting the CDP dependency, or a reduced field set documented in adr-0008.

## Unverified claims

- WebResourceResponseReceived event args provide every field adr-0008 requires (status, resource type, timing, sizes). UNVERIFIED[phase-p5-telemetry]
- Logging every response adds overhead below the harness noise floor. UNVERIFIED[phase-p6-benchmark-harness]

## Affects

`phase-p5-telemetry`, `adr-0008`, `comp-network-logger`, `comp-webview-manager`, `comp-telemetry`, `risk-r18`, `risk-r14`, `qual-testing-strategy`
