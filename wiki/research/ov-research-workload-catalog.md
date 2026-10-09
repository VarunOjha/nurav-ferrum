---
id: ov-research-workload-catalog
type: overview
title: "Workload catalog and fixture hosting"
status: draft
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/research/measurement-methodology.md
  - raw/research/tauri-webview2-capabilities.md
related:
  - ov-research-plan
  - comp-benchmark-harness
  - comp-network-logger
  - adr-0015
  - wl-static-info
  - wl-spa-js-heavy
  - wl-large-dom
  - wl-continuous-scroll
  - wl-frequent-nav
  - wl-video-playback
  - wl-canvas-webgl
  - wl-multi-active
  - wl-many-background
  - wl-session-churn
  - wl-security-nav-mix
  - wl-public-supplementary
approvable: true
phase: phase-p6-benchmark-harness
tags:
  - research
  - workloads
unverified:
  - claim: "How Chromium assigns sites for IP-literal and localhost hosts"
    verify_in: phase-p6-benchmark-harness
---

# Workload catalog

Master prompt §9 asks for controlled local test pages wherever possible, with public websites only as a supplement ([master prompt](../raw/00-master-prompt.md)).

| §9 item | Workload | Title | Kind |
|---|---|---|---|
| 1 | [wl-static-info](workloads/wl-static-info.md) | Static informational website | `synthetic-local` |
| 2 | [wl-spa-js-heavy](workloads/wl-spa-js-heavy.md) | JavaScript-heavy single-page application | `synthetic-local` |
| 3 | [wl-large-dom](workloads/wl-large-dom.md) | Large DOM website | `synthetic-local` |
| 4 | [wl-continuous-scroll](workloads/wl-continuous-scroll.md) | Continuous scrolling | `synthetic-local` |
| 5 | [wl-frequent-nav](workloads/wl-frequent-nav.md) | Frequent navigation | `synthetic-local` |
| 6 | [wl-video-playback](workloads/wl-video-playback.md) | Video playback | `synthetic-local` |
| 7 | [wl-canvas-webgl](workloads/wl-canvas-webgl.md) | Canvas / WebGL application | `synthetic-local` |
| 8 | [wl-multi-active](workloads/wl-multi-active.md) | Multiple simultaneously active sessions | `synthetic-local` |
| 9 | [wl-many-background](workloads/wl-many-background.md) | Many background sessions | `synthetic-local` |
| 10 | [wl-session-churn](workloads/wl-session-churn.md) | Repeated session destruction and restoration | `synthetic-local` |
| - | [wl-security-nav-mix](workloads/wl-security-nav-mix.md) | Security navigation mix (overhead workload) | `synthetic-local` |
| - | [wl-public-supplementary](workloads/wl-public-supplementary.md) | Supplementary public websites | `public-real-world` |

## Fixture hosting (shared by all local workloads)

- **Fixture server:** part of `comp-benchmark-harness`. It serves `benchmarks/workloads/<slug>/` on loopback, sets cache headers per scenario, records beacons from the fixture pages (timing, equivalence hashes, state tokens), and can be stopped on purpose to simulate a network interruption.
- **Origins:** cross-origin scenarios use different ports. Cross-site scenarios use different hosts (`127.0.0.1` and `localhost`). How Chromium assigns sites for IP-literal and `localhost` hosts is UNVERIFIED[phase-p6-benchmark-harness]. Confirm it in P6 before calling any scenario cross-site.
- **Scheme (owner question R-Q8):** Ferrum's navigation posture upgrades or warns on HTTP (`adr-0015`), and certificate validation must never be bypassed (master prompt §5). The options are (a) plain HTTP on loopback with a benchmark-only loopback exemption, or (b) HTTPS with a locally trusted development CA. Both affect security, so neither is chosen without the owner.
- **Determinism:** fixtures are generated at build time with fixed seeds. Every fixture carries a version hash, and the hash is recorded with each trial.
- **Equivalence:** every fixture reports a content hash and its completed work units. A trial whose values do not match the expected ones is invalid. It is kept in the raw data and reported, never dropped silently.
- **No third-party requests** from local fixtures. The network log (`comp-network-logger`) is used to check this.

## Supplementary public websites

- Report them separately and never pool them with the local results.
- No logins. Google sign-in flows are excluded, because Google's policy forbids OAuth in embedded user agents ([Tauri/WebView2 note](../raw/research/tauri-webview2-capabilities.md) §8, VERIFIED).
- Keep the request rate low: one visit per site per trial, with a fixed dwell time. Respect each site's terms.
- Record page weight and request count with each trial so that content drift can be detected.
- The site list is TBD and needs owner approval (R-Q9).
