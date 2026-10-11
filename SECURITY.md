# Security

Ferrum is a research prototype in its foundation phase (P1). There is no released build yet.
The canonical security design lives in the wiki; this file is the short entry point.

## Reporting a vulnerability

Until a public repository and a contact address exist, report problems privately to the project owner
(not in a public issue). Please include the Ferrum commit, Windows build and WebView2 runtime version.
A reporting address will be added here before the first public release.

## Threat model (outline)

- **Trust zones.** The shell web view (Ferrum's own UI) is trusted; every tab web view shows untrusted web
  content and must never reach the shell's commands ([trust boundaries](wiki/architecture/ov-arch-trust-boundaries.md),
  [isolation model](wiki/architecture/ov-arch-isolation-model.md), [adr-0007](wiki/decisions/adr-0007-child-webviews.md)).
- **Per-site profiles** keep each site's cookies and storage apart ([adr-0010](wiki/decisions/adr-0010-isolation-webview2-profiles.md)).
  Spike S2 showed one route where this works with one shared browser process
  ([spike S2 report](wiki/raw/evidence/phase-p1-foundation/spike-s2-profiles.md)).
- **Raw WebView2 calls** are confined to one audited module with written unsafe invariants
  ([adr-0019](wiki/decisions/adr-0019-raw-webview2-com-boundary.md); draft invariants in the
  [spike S3 report](wiki/raw/evidence/phase-p1-foundation/spike-s3-raw-com.md)).
- **Navigation posture:** open web with a blocklist ([adr-0015](wiki/decisions/adr-0015-navigation-posture-open-blocklist.md)).
- Security test plan: [qual-security-testing-plan](wiki/quality/qual-security-testing-plan.md). P4 builds and tests the security engine.

## Debug port (benchmarks and debugging only)

The benchmark harness drives web views through the Chrome DevTools Protocol, enabled with
`WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=<port>`. That port exposes **every** web view,
including the trusted shell, to any local process
([spike S4 report](wiki/raw/evidence/phase-p1-foundation/spike-s4-playwright-cdp.md)). It is never enabled in
normal builds. WebView2 ignores these environment flags for elevated processes, so benchmarks run non-elevated.

## OAuth and sign-in

Embedded web views are a known problem for Google sign-in; Ferrum must not weaken WebView2 or OAuth restrictions
to get around it. The sign-in hand-off design is an open question (Q-109 in
[open questions](wiki/overview/ov-open-questions.md)), settled before P2.

## Rules Ferrum keeps

No weakening of WebView2/Chromium security, certificate validation or OAuth restrictions, not even for
benchmarks ([CLAUDE.md](CLAUDE.md) §6). No secrets, tokens or browser profiles in git.
