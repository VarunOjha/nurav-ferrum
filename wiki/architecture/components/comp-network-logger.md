---
id: comp-network-logger
type: component
title: "Network logger (metadata-only JSONL)"
status: planned
updated: 2026-10-18
sources:
  - raw/evidence/phase-p5-telemetry/check-p5.10.txt
  - raw/evidence/phase-p5-telemetry/netlog-coverage-p5.10.json
  - raw/evidence/phase-p5-telemetry/netlog-cost-p5.10.json
  - raw/evidence/phase-p5-telemetry/check-p5.9.txt
  - raw/evidence/phase-p5-telemetry/blocked-request-reaches-server-p5.9.txt
  - raw/00-master-prompt.md
  - raw/01-scoping-decisions.md
  - raw/research/tauri-webview2-capabilities.md
related: [ov-arch-data-flows, ov-arch-trust-boundaries, ov-arch-configuration, comp-webview-manager, comp-benchmark-harness, comp-core, comp-app-shell, adr-0008, phase-p5-telemetry, risk-r08, adr-0019]
approvable: true
path: crates/network-logger/
crate: ferrum-network-logger
trust_level: trusted
phase_introduced: phase-p5-telemetry
shipped: true
unsafe_code: false
responsibilities:
  - "Dump network call metadata of every tab to a folder for review (master prompt 2, item 11)"
  - "Enforce the metadata-only record schema: ts, t_ms, tab, profile, site, url, method, status, resource_type, content_length, policy_decision (scoping Q5, adr-0008; built in p5.9)"
  - "Never record headers, cookies, request or response bodies"
  - "Append JSONL in one folder per app session with size-based rotation and a per-session file cap; full URLs kept (Q-114); off by default, switched on in settings; session folders older than 14 days deleted (Q-114); query values redacted only when a log is copied into wiki/raw/bench/ (adr-0008)"
  - "Provide per-trial request logs for benchmark workload-equivalence checks"
interfaces:
  - "NetLog::open(root, session, rotate_bytes, max_files), NetLog::write(&NetRecord), NetLog::rotate(), NetLog::folder() (p5.9)"
  - "prune(root, now, retention_days, keep) deletes only Ferrum's own old session folders; session_name(start, pid); rfc3339_ms"
  - "NetRecord (in ferrum-network-logger itself, not ferrum-core: nothing else needs the type), SCHEMA_VERSION 1, FIELDS, validate, parse_line (strict: unknown fields refused); ResourceType::from_fetch_dest"
connects:
  - to: comp-benchmark-harness
    label: "per-trial request logs for workload-equivalence checks"
    kind: data-export
    crosses_trust_boundary: false
  - to: comp-core
    label: "network record type and config"
    kind: rust-api
    crosses_trust_boundary: false
unverified:
  - claim: "Logging every tab's network events adds acceptable CPU and memory overhead"
    verify_in: phase-p6-benchmark-harness
---

# comp-network-logger

**Safe-Rust sink only** (`#![forbid(unsafe_code)]`). The capture happens in `comp-webview-manager::webview2::netlog`. That module subscribes to `WebResourceResponseReceived` (the implementation route of accepted adr-0008), with in-process DevTools Protocol `Network.*` events as the alternative if a P5 spike finds fields missing (a switch needs a superseding decision). It reduces each event to the allow-listed fields before handing a `NetRecord` over ([data flows §4](../ov-arch-data-flows.md)). Tauri offers no response hook for https tabs (`on_web_resource_request` only covers Tauri's custom protocol, VERIFIED in the [Tauri note §4](../../raw/research/tauri-webview2-capabilities.md)). That is why the capture lives in the COM layer.

## Implementation status (P5, p5.9)

Built in p5.9 (`crates/network-logger/src/lib.rs`; capture in `comp-webview-manager`; the app's `netlog` module in
`apps/desktop/src-tauri/src/netlog.rs`; settings `[network_log]` in `comp-core`).

- **Record** (one JSON line, exactly these fields, absent values `null`): `ts` (UTC, milliseconds), `t_ms` (the
  telemetry run clock: since Ferrum's process was created), `tab`, `profile` (empty for a refused navigation, where the
  policy engine does not know it), `site` (scheme and host), `url` (full, Q-114), `method`, `status`, `resource_type`,
  `content_length`, `policy_decision` (`allowed`, or `blocked:<rule>` with the audit log's rule name). A unit test
  checks the field list and that no field name looks like a header, cookie or body; a line with any other field is
  refused when read back.
- **Where the values come from** (`WebResourceResponseReceived`, the route of adr-0008; spike S3 had shown the event
  works): address, method and status of the request and response. `resource_type` is derived from the request's
  `Sec-Fetch-Dest` (document, frame, stylesheet, script, image, font, media, fetch for `empty`, worker, manifest,
  other) and `content_length` from the response's `Content-Length`; both headers are read by name and only the derived
  value is kept. The event gives no timing: `t_ms` is when the response was reported. Requests that fail without a
  response are not seen (coverage is p5.10).
- **Blocked navigations** are written by the app next to their audit record (`policy::decide`), with no method and no
  status, so they appear even though no response belongs to them.
- **Files:** `<data dir>/<[network_log] dir, default netlogs>/<YYYYMMDD-HHMMSS-pid>/netlog.NNNN.jsonl` (UTC start
  time), a new file at `rotate_mb` (50 MiB), at most `max_files` (20) per session, the session's oldest deleted beyond
  that. At start, session folders older than `retention_days` (14) are deleted: only folders named like a session, in
  them only `netlog.NNNN.jsonl` files, and a folder only once empty (a unit test leaves a foreign file and folders
  alone). The handler is registered only while the log is on, so tab views pay nothing when it is off (the default).
- **Finding (Q-229):** with the log on, a typed address that the blocklist refused showed both its `blocked:blocklist`
  record and, 15 ms later, a 200 response for the same address in the same tab. The page was never shown, but a
  diagnostic run confirmed the request reached the server (three refused tries counted)
  ([finding](../../raw/evidence/phase-p5-telemetry/blocked-request-reaches-server-p5.9.txt)). The log records what
  WebView2 reports, so such a response is written as `allowed` (no rule stopped the response itself). What to do about
  the blocklist is the owner's question Q-229.
- **Checked** ([check-p5.9](../../raw/evidence/phase-p5-telemetry/check-p5.9.txt)): 6 unit tests (fields, checks, resource types, time and folder names, rotation with the file cap, safe deletion of old sessions) and the settings test (off by default, limits); live, with the log on, the `/netlog` test page gave exactly its six expected records (the page as `document`, its stylesheet, script and image, the frame of site-b as `frame`, the fetch as `fetch`; all 200, with their sizes), the refused address a `blocked:blocklist` record, and every record exactly the allowed fields; the same run again showed one response for the refused address (Q-229). With the default settings no log folder was made.

## Coverage and cost (p5.10)

Kind by kind, what the log sees (`apps/desktop/tests/smoke/network-log-coverage.spec.ts`, log on, one tab, debug
build; raw table [netlog-coverage-p5.10.json](../../raw/evidence/phase-p5-telemetry/netlog-coverage-p5.10.json),
run [check-p5.10](../../raw/evidence/phase-p5-telemetry/check-p5.10.txt)):

| Kind | Test request | In the log | Entry or note |
|---|---|---|---|
| Top-level page | the /netlog document | yes | `GET /netlog 200 document` |
| Sub-resources | stylesheet, script, image of /netlog | yes | `GET /netlog/style.css 200 stylesheet`; `GET /netlog/app.js 200 script`; `GET /icon.png 200 image` |
| Frame of another site | site-b /landing in an iframe | yes | `GET site-b/landing 200 frame` |
| Fetch from the page | /netlog/data.json | yes | `GET /netlog/data.json 200 fetch` |
| Sub-resources on a second visit | stylesheet, script, image of /netlog again (the cache may serve them; the log cannot tell) | yes | reported again with 200; whether the cache served them is not in the record |
| Redirect hop 1 (301) | /redirect/chain | yes | `GET /redirect/chain 301 document` |
| Redirect hop 2 (302) | /redirect/302 | yes | `GET /redirect/302 302 document` |
| Redirect target | /landing after the chain | yes | `GET /landing 200 document` |
| Request with no response | fetch to a port nobody listens on | **no** | no entry (no response came, and nothing was reported) |
| Service worker script | /sw/sw.js | **no** | no entry (the worker's script was not reported to the tab's view in this run) |
| Request made by the service worker | /sw/from-worker.json (fetched when it installs) | **no** | no entry (not reported to the tab's view in this run) |
| Request answered by the service worker | /sw/via-worker.json (no network) | yes | reported as 200 with an empty resource type, although no network request was made |
| Request passed on by the service worker | /sw/passthrough.json | yes | reported once, as the page's fetch |

**Cost pilot** (`network-log-cost.spec.ts`; raw [netlog-cost-p5.10.json](../../raw/evidence/phase-p5-telemetry/netlog-cost-p5.10.json)):
30 loads of `/netlog` (six requests each) per run. Log off: page load median 53.7 ms (41.3 to 81.2), Ferrum's process 31.8 ms CPU per load, all its processes 309.9 ms. Log on: 52.4 ms (35.3 to 80.6), 32.8 ms and 285.9 ms. A development run of the same spec just before (not saved; numbers from the session transcript) gave the log-on run the slower one: median 72.2 against 62.2 ms, Ferrum's process 44.8 against 37.0 ms per load. So the spread between runs is larger than any difference the log makes here. This is a rough pilot of the tool, not a result: debug build, one run each way, always off first, and run-to-run
spread was not measured. No limit applies; whether the cost is acceptable is decided by the P6 A/B check (above).

**Privacy.** Log folders sit outside the repo by default (app data dir) and are gitignored if pointed inside it. The schema test asserts that no header, cookie or body field exists. Whether the overhead of logging is acceptable is UNVERIFIED[phase-p6-benchmark-harness]. It is measured with the logger on and off. Re-targeted from P5 on 2026-10-18: p5.10 ran only a rough pilot (debug build, one run each way, below); adr-0008 puts the A/B check that decides it before the first comparative campaign, with the harness in P6.
