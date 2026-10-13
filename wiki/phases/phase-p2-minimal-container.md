---
id: phase-p2-minimal-container
type: phase
title: "P2 Minimal container (Milestone M1): one shell, one content WebView, safe navigation"
status: done
updated: 2026-10-13
sources:
  - raw/00-master-prompt.md
  - raw/01-scoping-decisions.md
  - raw/research/tauri-webview2-capabilities.md
related: [phase-p1-foundation, phase-p3-tabs-sessions, comp-app-shell, comp-webview-manager, comp-core, comp-webview2-runtime, risk-r01, risk-r02, risk-r06, risk-r10, adr-0006, adr-0007, adr-0015, adr-0019, ov-open-questions, ov-research-workload-catalog]
approvable: true
phase: phase-p2-minimal-container
tags: [milestone-m1, tauri, webview2, navigation]
milestone: M1
order: 2
depends_on: [phase-p1-foundation]
est_sessions: 4
entry_criteria:
  - "phase-p1-foundation has status done and key phase-p1-foundation#exit is APPROVED."
  - "Owner approval recorded and not stale in plan/approvals.json for the P2 dependency set: schema, phase-p2-minimal-container (as revised after spike synthesis p1.9), every ADR in decisions (including the ADRs created in p1.9, which are added to the list when they exist), every component in components."
  - "Spike S1 (multi-webview) and the profile-route decision from p1.9 are recorded; this page has been revised to match them."
  - "Q-202 (local HTTPS fixture scheme) is answered in ov-open-questions, or the owner accepted its default."
  - "No open Q-NNN blocks any id in the dependency set."
deliverables:
  - "apps/desktop: compilable Tauri 2 application with a trusted shell WebView (vanilla TS + Vite) and one untrusted content WebView."
  - "Configurable HTTPS start URL; address bar; back, forward, refresh; current URL display; loading and error states."
  - "Redirect and internal-navigation handling; external links and non-web schemes per adr-0015."
  - "Persistent cookies and session across restarts."
  - "DevTools available in debug builds only."
  - "Locked-down capabilities: no remote capability; shell capability targeted by webview label; app ACL manifest."
  - "Google OAuth detection with an 'open in system browser' offer (no circumvention)."
  - "Local fixture server for navigation tests; smoke test suite; structured tracing logs."
  - "Updated README run instructions, component pages and M1 known-limitations list."
tasks:
  - id: p2.1
    title: "Local fixture server (tests/fixtures/) serving deterministic pages: redirect chains (301, 302, 303, 307, 308, loop), target=_blank links, mailto and custom-scheme links, cookie setter, slow page, 404/500 pages"
    verify: "The fixture server is a Rust crate at tests/fixtures/server (axum 0.8.9, pinned exactly; [source readings](../raw/research/p2-source-readings.md) S3); 'cargo test --locked -p fixture-server' passes; each fixture URL returns the documented status code (curl -sI output saved). P6 workloads may reuse this server."
  - id: p2.2
    title: "Create apps/desktop with the Tauri version and hosting route fixed in p1.9; shell UI in vanilla TS + Vite (adr-0006); workspace member"
    verify: "Release build via the pinned Tauri CLI exits 0 (output saved); app window opens and shows the shell (owner or Claude observes; screenshot saved)."
  - id: p2.3
    title: "Capability lockdown: no capability with a remote section; shell capability targeted by webview label 'shell'; app ACL manifest generated at build time"
    verify: "Integration test loads a fixture page in the content WebView that calls an app command, a core plugin command and event emit/listen through the IPC bridge; every call is rejected and the rejection is logged."
  - id: p2.4
    title: "core crate: configuration model (start URL, navigation posture, data directory) with serde, validation and defaults"
    verify: "Unit tests cover valid config, missing file (defaults), invalid URL, non-https start URL handling per adr-0015."
  - id: p2.5
    title: "core crate: address-bar input normalisation as a pure function (scheme-less input, http upgrade/warn, non-web schemes need confirmation, whitespace, IDN, IPv6, javascript:, data:, file:, malformed)"
    verify: "Table-driven unit tests with at least one case per listed input class pass; malformed input never yields a navigation."
  - id: p2.6
    title: "webview-manager: create the content WebView as a controller Ferrum creates from Tauri's environment (adr-0029), navigate, track current URL and load state through raw COM events (NavigationStarting, SourceChanged, NavigationCompleted) in the adr-0019 module"
    verify: "Integration test navigates to two fixture pages and asserts the shell receives URL and load-state events in order."
  - id: p2.7
    title: "Back, forward, refresh with CanGoBack/GoBack/GoForward and the HistoryChanged event (adr-0030); buttons disabled when not possible"
    verify: "Smoke test: A then B then back shows A, forward shows B, refresh reloads B (fixture counts requests); button state matches history."
  - id: p2.8
    title: "Loading and error states: spinner while loading; navigation failure and HTTP error pages rendered by the shell, never by loading a local origin into the content WebView"
    verify: "Smoke tests with the slow, 404, 500 and unreachable-host fixtures assert the shell shows the right state; content WebView URL is never the app's local origin."
  - id: p2.9
    title: "Redirects and internal navigation: final URL shown after redirect chains; redirect loop shows an error"
    verify: "Smoke tests for each redirect fixture assert the final URL in the address bar; loop fixture ends in the error state."
  - id: p2.10
    title: "External links and schemes: target=_blank and window.open handled via the NewWindowRequested event (M1 behaviour: same view or system browser per config); mailto and other non-web schemes require shell confirmation before the OS handler is called"
    verify: "Smoke tests: _blank fixture follows the configured behaviour; scheme fixture shows the confirmation and does not launch without consent (launcher mocked in test)."
  - id: p2.11
    title: "Cookies and persistent session in a fixed user data folder under the user's local app data"
    verify: "Integration test: fixture sets a persistent cookie, app restarts, fixture echoes the cookie back."
  - id: p2.12
    title: "DevTools only in debug builds"
    verify: "Test or scripted check: release build has DevTools disabled (opening attempt has no effect); debug build can open them."
  - id: p2.13
    title: "Google OAuth policy: detect navigation to the Google OAuth authorization endpoint and offer 'open in system browser'; no user-agent spoofing or other circumvention"
    verify: "Unit test on the URL classifier with recorded URL patterns (no live Google login); smoke test with a fixture link pointing at a test-only pattern shows the banner."
  - id: p2.14
    title: "Structured logging with tracing (JSON lines to the app log folder); explicit error types; no panics on navigation errors"
    verify: "Log file produced in a smoke run parses as JSON lines; grep shows no 'panicked' entries."
  - id: p2.15
    title: "Smoke suite: Playwright over CDP (spike S4 passed; adr-0031) driving shell and content WebView, plus the manual checklist"
    verify: "Smoke suite command exits 0; output saved as evidence."
  - id: p2.16
    title: "Docs: README build/run instructions, component pages updated with last_verified_commit, SECURITY.md M1 section, known limitations"
    verify: "Wiki lint clean; component pages for comp-app-shell, comp-webview-manager, comp-core have status implemented and a last_verified_commit."
  - id: p2.17
    title: "Research track: literature batch 2 (WebView2 and Chromium process model, page lifecycle, embedded-webview resource studies)"
    verify: "New raw research notes with access dates; ov-research-literature-log (created in p1.14) updated; no unverified citation."
  - id: p2.18
    title: "Exit gate and owner M1 review (adr-0014)"
    verify: "All evidence files exist; lint clean; owner approves phase-p2-minimal-container#exit."
test_gate:
  automated:
    - "cargo fmt --all -- --check"
    - "cargo clippy --workspace --all-targets -- -D warnings"
    - "cargo test --workspace"
    - "cargo deny check"
    - "apps/desktop shell: npm run lint && npm run typecheck && npm run test"
    - "Tauri release build of apps/desktop"
    - "IPC denial integration test (p2.3)"
    - "Smoke suite (p2.15) covering p2.7 to p2.13"
    - "cd interactive_plan && npm run lint:wiki"
  manual:
    - "Owner launches the release build and visits five HTTPS sites of their choice (no Google sign-in); back, forward, refresh, address-bar entry work."
    - "Owner clicks a mailto link and confirms the confirmation prompt appears."
    - "Owner signs in to one non-Google site, restarts the app and confirms the session persists."
    - "Owner disconnects the network and confirms the error state is shown and the app recovers on reconnect."
  evidence:
    - raw/evidence/phase-p2-minimal-container/cargo-fmt.txt
    - raw/evidence/phase-p2-minimal-container/cargo-clippy.txt
    - raw/evidence/phase-p2-minimal-container/cargo-test.txt
    - raw/evidence/phase-p2-minimal-container/cargo-deny.txt
    - raw/evidence/phase-p2-minimal-container/shell-tests.txt
    - raw/evidence/phase-p2-minimal-container/release-build.txt
    - raw/evidence/phase-p2-minimal-container/ipc-denial.txt
    - raw/evidence/phase-p2-minimal-container/smoke.txt
    - raw/evidence/phase-p2-minimal-container/wiki-lint.txt
    - raw/evidence/phase-p2-minimal-container/manual-checklist.md
exit_criteria:
  - "Every master prompt section 16 Milestone 1 deliverable exists: compilable app, functional WebView, URL navigation, back/forward, refresh, basic error handling, documentation, smoke tests."
  - "All automated gate items passed on the exit commit with saved evidence."
  - "No remote page can call any Tauri command (p2.3 evidence)."
  - "Manual checklist completed by the owner."
  - "Owner approved phase-p2-minimal-container#exit."
risks: [risk-r01, risk-r02, risk-r06, risk-r10]
decisions: [adr-0006, adr-0007, adr-0010, adr-0011, adr-0014, adr-0015, adr-0018, adr-0019, adr-0029, adr-0030, adr-0031]
experiments: []
components: [comp-app-shell, comp-webview-manager, comp-core, comp-webview2-runtime]
unverified:
  - claim: "Moving keyboard focus into the content web view when the window becomes active fixes the Alt+Tab focus issue (13466)"
    verify_in: phase-p4-security
---

# P2 Minimal container (Milestone M1)

P2 builds the smallest useful Ferrum: one window with a trusted shell WebView and one untrusted content WebView that loads an HTTPS site. It covers master prompt section 5 "Phase 1: Minimal WebView Container" and section 16 "Milestone 1" ([raw/00-master-prompt.md](../raw/00-master-prompt.md)).

Even with a single tab, P2 uses the hosting model chosen for tabs: one window, the trusted shell as a Tauri child web view, and the content web view as a WebView2 controller Ferrum creates itself from Tauri's environment (adr-0007 as refined by the proposed adr-0029, from spikes S1 to S3 in [P1](phase-p1-foundation.md)). That way P3 adds tabs to a proven structure instead of rebuilding it. The shell never overlaps the content bounds: spike S1 showed child views are drawn on top.

## Scope

- Shell UI: address bar, back/forward/refresh, load indicator, error panel. Vanilla TS + Vite (adr-0006).
- Content WebView: navigation, redirects, external links, cookies, DevTools gating.
- Known issue from spike S1 (owner: fix later): after Alt+Tab back to the window, typing does not reach the web view until a click ([S1 report](../raw/evidence/phase-p1-foundation/spike-s1-multiwebview.md), Tauri issue 13466). P2 moves keyboard focus into the content web view when the window becomes active; that this fixes it is UNVERIFIED[phase-p4-security] (the owner's check was deferred at the P3 sign-off on 2026-10-13 and moves to the P4 hand checks) (the owner had not checked it by the P2 exit, 2026-10-12; it moves to the P3 keyboard checks).
- Security floor from day one. Every web view Tauri creates gets the IPC channel, and authorisation in Rust is the only protection ([raw/research/tauri-webview2-capabilities.md](../raw/research/tauri-webview2-capabilities.md) section 3). P2 therefore applies recipe items 1 to 3 (no `remote` capability, webview-label targeting, app ACL manifest) and proves them with the p2.3 negative test. The content web view is created by Ferrum (adr-0029) and has no IPC bridge at all; the same negative test showed it (verified in P2, [check-p2.3](../raw/evidence/phase-p2-minimal-container/check-p2.3.txt)). The full policy engine is [P4](phase-p4-security.md).
- Secure defaults from master prompt section 5: never bypass certificate validation, never weaken Chromium sandboxing, never bypass OAuth provider restrictions.

## Out of scope

- Multiple tabs, session restore, per-site profiles, downloads (P3).
- Blocklist, permission controls, iframe interception, audit log (P4).
- Telemetry and network logging (P5).
- Any performance claim.

## ADRs from p1.9

Spike synthesis (p1.9, 2026-10-11) proposed three ADRs, now in this page's `decisions`:
[adr-0029](../decisions/adr-0029-profile-route-raw-com-tab-controllers.md) (tab web views are controllers Ferrum creates,
one profile per site), [adr-0030](../decisions/adr-0030-back-forward-raw-com-history.md) (back/forward through the browser's
history calls) and [adr-0031](../decisions/adr-0031-benchmark-cdp-path-visible-tab.md) (one CDP test-robot path, visible tab
only). They are `proposed` until the owner approves them in chat; P2 cannot start before that, and if the owner chooses other
options this page is revised again. This edit is the intended re-approval point for this page in Approval Wave 3
([ops-approval-workflow §8](../operations/ops-approval-workflow.md#8-approval-waves)).

## Fixture HTTPS question (owner decision before P2)

This is [Q-202](../overview/ov-open-questions.md#q-202-local-fixture-scheme-loopback-http-exemption-or-a-locally-trusted-development-ca) in the canonical register, which gates P2 and P4 entry. Navigation tests need deterministic pages. Three options, none of which weakens certificate validation in the shipped app:

1. A locally trusted development certificate (a local CA installed into the user certificate store with owner consent) so fixtures are served over HTTPS on loopback.
2. Fixtures over `http://127.0.0.1` under a test-only configuration. Under adr-0015 HTTP is upgraded or warned, so tests would exercise the warning path, not the HTTPS path.
3. Public HTTPS sites only for HTTPS-specific smoke checks, fixtures over HTTP for everything else.

Claude's recommendation is option 1 for fixtures plus a few public HTTPS sites in the owner's manual checklist. Option 1 works without weakening certificate checks (verified in P2, [check-p2.1](../raw/evidence/phase-p2-minimal-container/check-p2.1.txt)). Its one
side effect is the local test certificate authority in the developer's Windows user Root store, which is
name-constrained to `localhost`, `127.0.0.0/8` and `::1` (installed with the owner's confirmation).

## Step order

```mermaid
flowchart LR
  p2_1["p2.1 fixtures"] --> p2_6["p2.6 content WebView"]
  p2_2["p2.2 app scaffold"] --> p2_3["p2.3 capability lockdown"]
  p2_4["p2.4 config"] --> p2_6
  p2_5["p2.5 URL normalisation"] --> p2_6
  p2_3 --> p2_6
  p2_6 --> p2_7["p2.7 back/fwd/refresh"]
  p2_6 --> p2_8["p2.8 load + error states"]
  p2_6 --> p2_9["p2.9 redirects"]
  p2_6 --> p2_10["p2.10 external links"]
  p2_6 --> p2_11["p2.11 cookies"]
  p2_2 --> p2_12["p2.12 DevTools gating"]
  p2_6 --> p2_13["p2.13 OAuth policy"]
  p2_2 --> p2_14["p2.14 tracing"]
  p2_7 --> p2_15["p2.15 smoke suite"]
  p2_8 --> p2_15
  p2_9 --> p2_15
  p2_10 --> p2_15
  p2_11 --> p2_15
  p2_13 --> p2_15
  p2_15 --> p2_16["p2.16 docs"]
  p2_16 --> p2_18["p2.18 exit review"]
  p2_17["p2.17 literature batch 2"] --> p2_18
```

p2.3 comes before any remote page is loaded, so a regression in IPC exposure is caught from the first content navigation.

## Checkpoints and interruption recovery

- One task, one commit, one `code` log entry naming the task id, with the matching component page updated in the same commit (SCHEMA section 9.8).
- Pure-Rust tasks (p2.4, p2.5) have unit tests and can be resumed by running `cargo test -p` on the crate.
- Smoke tests are added per feature task, not only at p2.15, so `cargo test --workspace` plus the smoke command show exactly which feature tasks are done.

## Test gate rationale

Master prompt Milestone 1 asks for "smoke tests". The owner asked for rigorous phase-wise testing, so the gate also requires unit tests for every pure function, the IPC denial test (security cannot wait until P4), a release build (DevTools gating only shows there) and a manual checklist on real sites.

## Research track

Literature batch 2 (p2.17) continues the protocol from p1.14.

## Owner review checkpoint (adr-0014)

The owner gets the release build, the manual checklist and the evidence folder. Approval key `phase-p2-minimal-container#exit`. The P3 dependency set must also be approved before P3 starts.
