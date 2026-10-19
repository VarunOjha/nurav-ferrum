---
id: qual-security-testing-plan
type: quality
title: "Security testing plan: master prompt section 11 mapped to harmless fixtures"
status: draft
updated: 2026-10-19
sources:
  - raw/evidence/phase-p5-telemetry/check-p5.15.txt
  - raw/owner/2026-10-18-s08-q229-block-requests-fully.md
  - raw/evidence/phase-p4-security/security-suite.20261017-2315.txt
  - raw/evidence/phase-p4-security/check-p4.16.20261017-2327.txt
  - raw/evidence/phase-p4-security/security-suite.20261015-1234.txt
  - raw/evidence/phase-p4-security/check-p4.19.txt
  - raw/evidence/phase-p4-security/check-p4.18.txt
  - raw/00-master-prompt.md
  - raw/01-scoping-decisions.md
  - raw/research/tauri-webview2-capabilities.md
  - raw/research/measurement-methodology.md
  - raw/owner/2026-10-11-s02-wave3-and-p2-questions.md
  - raw/owner/2026-10-13-s03-p4-questions.md
related: [ov-arch-trust-boundaries, comp-tab-content, comp-baseline-app, comp-benchmark-harness, comp-telemetry, comp-windows-os, comp-competitor-browsers, adr-0029, qual-testing-strategy, qual-definition-of-done, qual-phase-gate-checklist, qual-ci-plan, ov-risk-register, phase-p2-minimal-container, phase-p3-tabs-sessions, phase-p4-security, comp-security-engine, comp-webview-manager, comp-app-shell, comp-network-logger, comp-webview2-runtime, adr-0007, adr-0008, adr-0010, adr-0015, exp-security-overhead, risk-r01, risk-r07, risk-r09, risk-r10, risk-r18, risk-r19]
approvable: true
phase: phase-p4-security
tags: [security, testing, fixtures, threat-model]
scope: [phase-p2-minimal-container, phase-p3-tabs-sessions, phase-p4-security, phase-p5-telemetry, phase-p6-benchmark-harness, phase-p7-lifecycle]
test_kinds: [security, unit, integration, e2e, ci]
tooling:
  - "cargo test with proptest (policy engine unit and property tests)"
  - "local fixture server bound to 127.0.0.1"
  - "@playwright/test over CDP (E2E, test builds only)"
  - "raw-COM WebView2 handlers via with_webview (navigation, frame navigation, external schemes, process failure)"
unverified:
  - claim: "WebView2 marks downloaded files with Mark-of-the-Web"
    verify_in: phase-p5-telemetry
  - claim: "navigator.permissions.query in the page reflects a host-side PermissionRequested denial (with SavesInProfile false) in WebView2"
    verify_in: phase-p5-telemetry
  - claim: "WebView2 refuses to load a page with an untrusted certificate unless the app handles ServerCertificateErrorDetected"
    verify_in: phase-p5-telemetry
---

# Security testing plan

The master prompt (§11) requires automated tests for ten areas, harmless controlled fixtures, never weakening WebView2 security to improve benchmarks, and documenting the threat model and the properties actually enforced ([master prompt](../raw/00-master-prompt.md)). This page maps each area to concrete fixtures, steps and pass criteria. Tests are numbered **SEC-01..SEC-13**. SEC-01..SEC-10 follow master prompt §11 in order; SEC-11..SEC-13 are additions from the research ([tauri-webview2-capabilities](../raw/research/tauri-webview2-capabilities.md)).

Security **correctness** tests live here. Security **overhead** (policy evaluation latency, isolation cost) is measured separately in `exp-security-overhead` (master prompt §7).

## 1. Threat model summary (full threat model: §7)

| Item | Content |
|---|---|
| Adversary | A malicious or compromised **remote web page** loaded in a tab, including its iframes, popups, redirects and downloads |
| Assets | Ferrum's native commands and the trusted shell (comp-app-shell); other sites' session data (profiles, adr-0010); the user's file system (downloads); the OS (external protocol handlers); the network log's integrity (adr-0008) |
| Trust boundary | Tab webviews are untrusted; the shell webview and Rust host are trusted (adr-0007). Every tab-to-host message crosses the boundary |
| Out of scope | Local malware or an administrator attacker; a compromised WebView2 runtime; Chromium renderer exploits (Ferrum relies on Chromium's sandbox and must not weaken it). Supply-chain risk is handled by dependency auditing ([qual-ci-plan](qual-ci-plan.md)), not here |
| Posture | Open browsing with a blocklist that ships empty; `http:` loads as typed with a "not secure" warning bar; non-web schemes need confirmation (adr-0015, Q12; owner answers Q-112 and Q-113 of 2026-10-13) |

Verified facts the tests are built around (TW §3, §4, §6):
- The IPC bridge is attached to every webview, tabs included; protection is authorization in Rust. Remote origins reach no command unless a capability declares `remote`; `FETCH_CHANNEL_DATA_COMMAND` is exempt; the invoke key is in page context and is not a boundary.
- A window-label capability match also covers tabs in that window, so the shell capability targets the shell **webview label**.
- `on_navigation` is main-frame only and **allows** URLs that fail to parse (risk-r07); iframes need raw-COM `FrameNavigationStarting`.
- External schemes need raw-COM `LaunchingExternalUriScheme`; downloads default to allow if no handler is set; popups are silently suppressed if no handler is set.
- `clear_all_browsing_data` is profile-wide (risk-r09).

## 2. Fixture rules

1. Fixtures are static HTML and small scripts in `tests/security/fixtures/` (proposed path). They contain **no real exploit code**, contact **no external host**, and use **no real credentials**.
2. Downloads are short plain-text bytes, whatever their file name says.
3. External-protocol tests use an **unregistered** test scheme (for example `ferrum-test-proto:`) so nothing can launch; tests also assert no new process appeared.
4. Tests run as a normal (non-elevated) user.
5. Each test records the policy decision Ferrum logged (security audit log, master prompt §4) as well as the page-visible outcome, so silent allows are caught.
6. No automatic retries (see [qual-testing-strategy](qual-testing-strategy.md) section 9).

## 3. Serving fixtures: an owner decision

**Answered (Q-202, 2026-10-11, [owner answer](../raw/owner/2026-10-11-s02-wave3-and-p2-questions.md)): local HTTPS certificate.** The fixture server (p2.1) serves HTTPS on loopback with a name-constrained development CA installed for the owner's Windows user only; there is no loopback HTTP exception. The options as they were weighed:

Fixtures need several **origins**. A local server on `127.0.0.1` gives distinct origins through distinct ports. The question was the scheme:

| Option | Pros | Cons |
|---|---|---|
| HTTP on loopback, allowed only by a **test-build-only** policy exception compiled out of release builds | No certificate handling; nothing installed on the machine | The exception itself must be tested to be absent in release (SEC-12) |
| HTTPS with a **locally trusted test CA** installed in the user certificate store | Exercises the real HTTPS path | Installs a root certificate on the owner's machine (security-relevant; needs approval and cleanup) |

Ferrum must never bypass certificate validation (master prompt §5) to make fixtures work. SEC-13 still proves that certificate errors are not bypassed.

## 4. Test catalogue

Levels: **U** = Rust unit/property test of the policy engine (no browser); **I** = integration with a real WebView2 tab; **E** = E2E through the built app.

### SEC-01 Blocked-domain navigation (master prompt §11 item 1)

- **Threat:** a page navigates the tab to a blocklisted host.
- **U:** `evaluate(url)` against the blocklist for exact host, subdomains, mixed case, trailing dot, user-info (`user@host`), explicit port, IDN in Unicode and punycode forms, IPv4 and IPv6 literals. Property: any URL whose host matches a block rule is denied regardless of path, query or fragment.
- **E fixture:** `block-nav.html` on origin A with (a) a link, (b) `location.href =`, (c) a meta refresh, (d) a form submission, (e) `window.open`, all to a host on the test blocklist.
- **Pass:** every attempt is cancelled; the tab stays on origin A; one denial per attempt appears in the audit log with the rule that matched. Since p5.15 (owner answer Q-229) also: the blocked server receives no request at all, for the page, a frame or anything a page loads (a request counter on the test server; found in p5.9 that a cancelled page navigation was still sent).
- **Phase:** U in P4 (policy engine); E in P4; request level in P5 (p5.15, `block-requests`). Related: risk-r07.

### SEC-02 External protocol handling (item 2)

- **Threat:** a page launches an OS handler without consent.
- **Fixture:** `ext-proto.html` with links and scripted navigations to `ferrum-test-proto:x`, `mailto:`, and `file:` URLs, plus one inside an iframe.
- **Steps:** click each; answer the confirmation prompt with *deny* in automated runs.
- **Pass:** a confirmation is required for every non-web scheme; with *deny*, nothing launches (no new process in the session's process snapshot) and the denial is logged. `file:` from a remote page is always denied.
- **Phase:** P4. Depends on raw-COM `LaunchingExternalUriScheme`, verified in P4: WebView2 raises it for the custom test scheme `ferrum-test:`, and Ferrum's confirmation bar appears only through it ([check-p4.4](../raw/evidence/phase-p4-security/check-p4.4.txt)).

### SEC-03 Unauthorized native command invocation (item 3)

- **Threat:** remote content reaches Ferrum's native commands (risk-r19).
- **Fixture:** `ipc-probe.html` that calls, if present, `window.__TAURI_INTERNALS__.invoke`, `window.ipc.postMessage` and `window.chrome.webview.postMessage` with: an app command, a core plugin command, event emit and listen, and the fetch-channel command; then tries to navigate itself to the app's local origin.
- **Pass:** every invoke is rejected in Rust and logged; no event reaches the shell; the fetch-channel call returns nothing usable; navigation to the local origin is cancelled.
- **Static companion:** SEC-12.
- **Phase:** a minimal app-command and plugin-command check in P2; full in P4.

### SEC-04 Cross-origin access attempts (item 4)

- **Threat:** Ferrum weakens the browser's same-origin protections (for example by a flag).
- **Fixture:** origin A embeds an iframe from origin B and tries to read `contentDocument`, read B's cookies, `fetch` B without CORS headers, and read a cross-origin response body.
- **Pass:** every read is blocked by the browser, as in a stock Chromium configuration; the test also asserts that the effective browser arguments contain no flag that disables web security or site isolation (shared with SEC-12).
- **Phase:** P4.
- **Built (p4.11):** `cross-origin.spec`: site-a.localhost reads a frame of site-b.localhost (`contentDocument` null, document access `SecurityError`), fetches B in CORS mode (`TypeError`) and no-CORS mode (opaque, status 0, empty body), and does not see B's cookie; every browser process has no switch that weakens web security, site isolation or SmartScreen ([security-suite](../raw/evidence/phase-p4-security/security-suite.20261015-1234.txt)).

### SEC-05 Permission denial (item 5)

- **Threat:** a page gains camera, microphone, location, notifications or clipboard access without policy approval.
- **Fixture:** `perm.html` requests geolocation, camera, microphone, notifications and clipboard-read, each on a button.
- **Pass (primary, observable outcome):** under the default policy each request is denied or prompted per the policy table and the decision is logged; for a denial, the page-side API call fails (the geolocation error callback fires, `getUserMedia` rejects and no capture stream or track is granted, `Notification.requestPermission` does not resolve to `granted`, the clipboard read rejects).
- **Secondary (recorded, not a pass criterion):** the `navigator.permissions.query` state for each permission is recorded. Whether it reflects a host-side denial is UNVERIFIED[phase-p5-telemetry] (re-targeted in P4: the P4 permission tests check the page-side results only and did not record the query state, [check-p4.5](../raw/evidence/phase-p4-security/check-p4.5.txt)); a mismatch is logged as a finding about WebView2 behaviour, not a Ferrum failure. A persisted earlier choice does not bypass the policy (TW §4 notes that persisted choices skip the permission event unless `SavesInProfile` is controlled via raw COM).
- **Phase:** P4.

### SEC-06 Session data isolation (item 6)

- **Threat:** one site's session data is visible to another isolated site, or clearing one wipes another.
- **Fixture:** `store.html` writes a cookie, `localStorage` and an IndexedDB record; `read.html` reads them.
- **Steps:** load `store.html` in a tab assigned profile P1; load `read.html` at the **same origin** in a tab assigned P2; then clear P1's data and check P2 and the shell.
- **Pass:** P2 sees none of P1's data; clearing P1 leaves P2 and the shell intact. The test also records both tabs' browser process id, to document what remains shared (master prompt §5 Phase 3: document which resources remain shared).
- **Depends on** the profile route chosen for risk-r01. Isolation by profile itself was verified in P4: the same site in another profile sees none of its cookie, localStorage or IndexedDB, and clearing one site leaves another intact ([check-p4.7](../raw/evidence/phase-p4-security/check-p4.7.txt)).
- **Phase:** P4 (a first version runs inside the risk-r01 spike in P1).
- **Per isolation mode (p4.15, live spec `isolation-modes`):** the same two test sites run under `shared`, `per-site`
  and `per-site-udf`; each site's data stays with it in every mode, a site moved to another named profile sees an
  empty store under `per-site` and `per-site-udf` (its own data under `shared`), and the browser processes are counted
  per mode ([check-p4.15](../raw/evidence/phase-p4-security/check-p4.15.txt),
  [isolation-modes](../raw/evidence/phase-p4-security/isolation-modes.md)).

### SEC-07 Download handling (item 7)

- **Threat:** a page writes outside the download folder, auto-downloads many files, or gets a file executed.
- **Fixture:** a server route that returns plain text with: a normal name; a name containing `..\` path traversal; an executable-looking extension; and a page that triggers several downloads at once.
- **Pass:** files land only inside the configured download folder with sanitised names; risky types prompt or are blocked per policy; multiple automatic downloads require permission; nothing is opened or executed automatically; each decision is logged. Whether WebView2 applies Mark-of-the-Web is recorded, not assumed (UNVERIFIED[phase-p5-telemetry]; re-targeted in P4: a program file from the local test server had no Zone.Identifier mark, [check-p4.6](../raw/evidence/phase-p4-security/check-p4.6.txt), which does not settle downloads from the internet). With SmartScreen on (p4.18), a program file gets WebView2's own download pop-up, where SmartScreen asks about an unknown program; the test expects the download held and the pop-up opened; answering "Keep" is a manual check at the P4 review. A SmartScreen page block shows Ferrum's own SmartScreen panel and is audited (`page`, rule `smartscreen`; p4.19, live spec `smartscreen`, [check-p4.19](../raw/evidence/phase-p4-security/check-p4.19.txt)).
- **Phase:** basic download management in P3; security behaviour in P4.

### SEC-08 Redirect-based policy bypass (item 8)

- **Threat:** an allowed origin redirects to a blocked one.
- **Fixture routes:** 301, 302, 307 and 308 redirects from origin A to a blocked host; a three-hop chain ending blocked; a redirect to `ferrum-test-proto:`; a redirect to the app's local origin; a JavaScript redirect; a meta refresh; an iframe whose source redirects to a blocked host.
- **Pass:** each final target is evaluated and denied as in SEC-01, SEC-02 and SEC-03; the iframe case is denied via the frame-navigation hook (risk-r07).
- **Phase:** P4. WebView2 raises `NavigationStarting` for redirects (TW §4).

### SEC-09 Malformed URL handling (item 9)

- **Threat:** input the URL parser rejects is allowed by default (fail-open, risk-r07), or crashes the parser.
- **U (property):** for arbitrary strings, `evaluate` returns *deny* whenever parsing fails, and never panics. Seed corpus: empty string, whitespace, control characters and NUL, very long strings, invalid percent-encoding, mixed-script hosts, numeric hosts (`http://2130706433/`), `javascript:`, `data:`, `blob:`, `about:`, backslashes, missing scheme, IPv6 with zone id.
- **E fixture:** the same corpus typed into the address bar and used as link targets.
- **Pass:** no navigation to an unparseable target; address-bar input either normalises to a valid URL that is then evaluated, or is rejected with a visible message; no crash.
- **Phase:** U from P2 (address bar) and P4 (policy); E in P4.

### SEC-10 Recovery after renderer crashes (item 10)

- **Threat:** a crashed renderer takes down the shell or leaves the app unusable.
- **Steps:** with three tabs open (two of one site, one of another), a debug-only test hook lets the active tab load the browser's own `edge://kill` page once, which ends that tab's renderer (the method of spike S3; no process is killed from outside). The process inventory taken before tells which tabs shared that renderer. A second test ends the browser process itself the same way (`edge://inducebrowsercrashforrealz`).
- **Pass:** the affected tab shows a crash state with a reload action; reload restores it; the shell and unaffected tabs keep working; the event is logged. Tabs sharing the killed renderer are reported as affected, not hidden (renderers can be shared across webviews on one data folder, [measurement-methodology](../raw/research/measurement-methodology.md) §2.2). After a browser-process failure Ferrum starts again by itself and restores the tabs. Built on raw-COM `ProcessFailed`, observed working in p4.10 ([check-p4.10](../raw/evidence/phase-p4-security/check-p4.10.txt)).
- **Phase:** P4 (p4.10, live spec `crash-recovery`).

### SEC-11 Debug port never in release builds (addition)

- **Why:** an open remote-debugging port exposes every webview, including the trusted shell, to local processes (TW §7).
- **Pass:** a release build started normally exposes no debugging endpoint; benchmark and test builds that enable it are labelled as such and bind to loopback.
- **Phase:** P2 onward.

### SEC-12 Static configuration checks (addition)

- **Pass:** no capability file has a `remote` section; the shell capability targets the shell webview label; an app ACL manifest exists; browser arguments contain no weakening flag (SmartScreen part built in p4.18: source scan, and the switches of every browser process observed live, [check-p4.18](../raw/evidence/phase-p4-security/check-p4.18.txt)); the test-only loopback exception and devtools are absent from release configuration.
- **Runs in** the `security-static` CI job ([qual-ci-plan](qual-ci-plan.md)).
- **Phase:** P2 onward.

### SEC-13 Certificate errors are not bypassed (addition)

- **Fixture:** a local HTTPS server with a self-signed, untrusted certificate.
- **Pass:** navigation fails with an error state; Ferrum offers no "proceed anyway" path (master prompt §5: do not bypass certificate validation). Expected default WebView2 behaviour: UNVERIFIED[phase-p5-telemetry] (re-targeted in P4: no live certificate-error test exists yet; SEC-13 is not in the P4 suite, §5).
- **Phase:** P2 (error state) and P4.

### SEC-14 Logs carry no page content (addition, p4.9)

- **Threat:** the security audit log or the network log stores page content, form data, cookies or full addresses with secrets in them.
- **Pass:** a schema test validates every record the security suite produces: only the allowed fields (time, tab, origin, action, rule, decision for the audit log; adr-0008 fields for the network log) and no header, body or cookie field; each SEC test asserts its own audit record.
- **Phase:** P4 (audit log); P5 (network log).

## 5. Traceability

The whole suite runs with one command, apart from every performance test: `pwsh -NoProfile -File scripts/security-suite.ps1`
(p4.11; result [security-suite](../raw/evidence/phase-p4-security/security-suite.20261015-1234.txt), 6 of 6 parts passed; the
first run, [security-suite.txt](../raw/evidence/phase-p4-security/security-suite.txt), failed because the self-test's
probe view could not be created, fixed in p4.11). Live tests are the spec files in
`apps/desktop/tests/smoke/`; Rust tests are in `crates/security/src/policy.rs`.

| Master prompt §11 item | Test | Test ids (what runs) | Risks |
|---|---|---|---|
| 1 Blocked-domain navigation | SEC-01 | `security-navigation.spec` (typed, frame, window.open), `security-settings.spec` (blocked site set in the screen); Rust `allowlist_more_specific_than_block_wins`, `allowlist_only_mode_denies_everything_not_listed` and the rest of the engine tests | risk-r07 |
| 2 External protocol handling | SEC-02 | `external-schemes.spec`, `new-windows-links.spec` (mailto and custom-scheme links ask first) | risk-r07, risk-r18 |
| 3 Unauthorized native command invocation | SEC-03, SEC-12 | IPC self-test (`FERRUM_SELFTEST=ipc`, own data folder), `app-origin.spec` | risk-r19 |
| 4 Cross-origin access attempts | SEC-04 | `cross-origin.spec` (frame, CORS and no-CORS reads, another site's cookie; no weakening browser switch) | risk-r19 |
| 5 Permission denial | SEC-05 | `permissions.spec` (p4.20: the question, every answer, no-question cases, frames, private tabs), `security-settings.spec` (grant kept, honoured, revoked) | risk-r19 |
| 6 Session data isolation | SEC-06 | `isolation.spec`, `isolation-modes.spec`, `profiles.spec` | risk-r01, risk-r09 |
| 7 Download handling | SEC-07 | `safe-downloads.spec`, `downloads.spec` | risk-r07 |
| 8 Redirect-based policy bypass | SEC-08 | `security-navigation.spec` (302 to the blocked host), `redirects.spec` | risk-r07 |
| 9 Malformed URL handling | SEC-09 | `security-navigation.spec` (malformed address); Rust engine tests (randomised input, unparseable always denied) | risk-r07 |
| 10 Application recovery after renderer crashes | SEC-10 | `crash-recovery.spec` | risk-r18 |
| Additions | SEC-11, SEC-12, SEC-14 | source scan (no debugging port in the app), `scripts/security-static-check.ps1` (release build), `audit-log.spec`; SmartScreen `smartscreen.spec` (p4.18, p4.19) | risk-r19 |

Not in the suite: SEC-13 (certificate errors) has no live test yet (P2: no bypass code exists); the real-key shortcut
tests and every performance measurement stay outside it.

## 6. Unverified items on this page

All are listed in the frontmatter `unverified:` block and tagged inline in SEC-05, SEC-07 and SEC-13 (the SEC-10 item was observed in p4.10 and is closed; the SEC-02 and SEC-06 items were verified in P4). One more applied to the whole E2E level, driving Ferrum tab webviews with Playwright over CDP in a test build: verified in P2 for the shell and the content view ([check-p2.15](../raw/evidence/phase-p2-minimal-container/check-p2.15.txt)).

## 7. Threat model (p4.1)

This section is the threat model that [phase-p4-security](../phases/phase-p4-security.md) task p4.1 asks for. It builds on the preliminary model in [ov-arch-trust-boundaries](../architecture/ov-arch-trust-boundaries.md) (assets A1 to A6, boundaries TB1 to TB6, rules R1 to R9) and replaces its STRIDE table as the place where threats are tracked. [SECURITY.md](../../SECURITY.md) is the short public version.

**Words used in the "State" column.** *Enforced* = a control exists and a passing check is saved as evidence (the phase named). *Partly* = part of the control exists and is checked; P4 completes it. *Planned* = the control and its test are P4 tasks; nothing is claimed yet. *Not enforced* = Ferrum does not claim this protection: there is no control, or the control cannot be proven by a test. No property is called enforced without evidence under `wiki/raw/evidence/`.

### 7.1 Adversaries

| Id | Adversary | In scope | What Ferrum relies on |
|---|---|---|---|
| ADV1 | A malicious or compromised website in a tab: its scripts, ads, redirects, pop-ups and downloads | Yes, primary | Ferrum's controls (this page) plus Chromium's sandbox and same-origin policy, never weakened |
| ADV1b | A malicious iframe inside an honest site | Yes | The same controls, applied to frame navigations through raw-COM `FrameNavigationStarting` |
| ADV2 | A network attacker between Ferrum and a site | Yes for HTTPS; HTTP pages are open to it by the owner's choice (Q-112) | WebView2's certificate checks, never bypassed |
| ADV3 | Another program running as the same Windows user, for example one that connects to a debugging port | Partly: the debugging port only | The port is never opened by Ferrum; benchmark runs only. Everything else such a program can do (read the data folder) is not enforced |
| ADV4 | A compromised dependency (Rust crate, npm package) | Partly: known advisories only | `cargo deny`, `npm audit` and lockfiles ([qual-ci-plan](qual-ci-plan.md)); no test can prove a dependency is honest |
| ADV5 | An administrator, malware running elevated, or a compromised WebView2 runtime | No | Out of scope |

### 7.2 Trust-boundary edges

Every `connects` edge with `crosses_trust_boundary: true` on a component page, in component-page order. The check script `scripts/verify/p4.1-threat-model.ps1` reads the component pages and fails if an edge is missing here or in SECURITY.md. The "Threats" column refers to §7.3.

| Edge | From → to (kind) | Boundary | Threats | Control | Test |
|---|---|---|---|---|---|
| E01 | comp-app-shell → comp-webview2-runtime (webview2-com) | TB1 | T03 | The shell view loads only Ferrum's own bundled pages; its navigation handler denies every other address; strict CSP (rule R8) | SEC-12 |
| E02 | comp-app-shell → comp-windows-os (os-api) | TB3 | T08 | Nothing is handed to Windows without the user's click on the confirmation bar; only the one address asked about is opened (p2.10); per-scheme allowlist (p4.4) | SEC-02 |
| E03 | comp-baseline-app → comp-webview2-runtime (webview2-com) | TB4 | T22 | The baseline app is a benchmark tool, never shipped; it loads only benchmark fixtures and workload sites | not enforced |
| E04 | comp-benchmark-harness → comp-competitor-browsers (process-spawn) | TB4 | T23 | Fresh temporary profiles; recorded policies; no flag that weakens browser security (CLAUDE.md §6) | not enforced |
| E05 | comp-benchmark-harness → comp-competitor-browsers (cdp) | TB4 | T17 | Debugging port on loopback, during benchmark runs only | not enforced |
| E06 | comp-benchmark-harness → comp-webview2-runtime (cdp) | TB4 | T17 | Ferrum never sets the debugging port; only test and benchmark runs set it for their own process | SEC-11 |
| E07 | comp-benchmark-harness → comp-windows-os (os-api) | TB5 | T24 | Ferrum is never run elevated; any elevated energy sampler is a separate program (Q-123, open) | not enforced |
| E08 | comp-tab-content → comp-app-shell (tauri-ipc) | TB1 | T01 | Tab views have no Tauri bridge (adr-0029); zero `remote` capabilities; app commands granted to the shell view only (rules R1 to R7) | SEC-03 |
| E09 | comp-tab-content → comp-webview2-runtime (webview2-com) | TB1, TB3 | T02, T04, T05, T06, T07, T08, T09, T10, T16 | Every page-initiated request goes through the policy engine: navigation, redirect hop, frame, pop-up, scheme, permission and download (p4.2 to p4.6) | SEC-01 |
| E10 | comp-telemetry → comp-windows-os (os-api) | none (read-only) | T18 | Read-only counter queries on Ferrum's own processes; no elevation | not enforced |
| E11 | comp-webview-manager → comp-webview2-runtime (webview2-com) | TB2 | T11, T21 | Raw COM confined to one module with written unsafe invariants (adr-0019); one profile per site (adr-0010, p3.6) | SEC-06 |
| E12 | comp-webview-manager → comp-webview2-runtime (cdp) | TB1 | T25 | The in-process DevTools session is used for measurement only; no secret is passed into a page; nothing is injected in normal use (p3.3) | not enforced |
| E13 | comp-webview2-runtime → comp-webview-manager (webview2-com) | TB1 | T05, T06, T07, T15 | A handler for every event kind (navigation, frame, new window, download, permission, scheme, process failure); the engine parses addresses itself and denies what it cannot parse | SEC-08 |
| E14 | comp-webview2-runtime → comp-app-shell (webview2-com) | TB1 | T01 | Only the shell view has a bridge; Tauri checks the browser-reported source of each message (rule R7) | SEC-03 |
| E15 | comp-webview2-runtime → comp-tab-content (network) | TB1, TB2 | T12, T13, T14, T20, T26 | No certificate bypass; no browser flag that weakens web security or site isolation; SmartScreen left on (p4.18); Chromium's sandbox left as shipped | SEC-13 |

E09, E13 and E15 carry many threats; their "Test" column names the main test, and §7.3 names every test.

### 7.3 Threats, controls and tests

| Threat | Adversary | Edges | Control (task) | Test | State |
|---|---|---|---|---|---|
| T01 A page calls Ferrum's commands, events or the exempt fetch-channel command | ADV1 | E08, E14 | No bridge in tab views; zero `remote` capabilities; shell-only commands (p2.3, p4.8) | SEC-03, SEC-12 | Built and tested (p4.8): 16 ways in refused by the permission check from a website in a Tauri view; the exempt channel-fetch command is reached there but returns nothing (Ferrum creates no channels, checked); Ferrum tab views have no bridge |
| T02 A tab navigates to the app's own origin to be treated as local | ADV1 | E09 | Navigation handlers deny the app's origin for tabs (rule R4; p4.3, p4.8) | SEC-03, SEC-08 | Built and tested live (p4.8, `app-origin`: link, pop-up and typed address refused and logged) |
| T03 The shell view is led to remote content | ADV1 | E01 | Shell navigation handler allows only the local origin; strict CSP (rule R8; p4.8) | SEC-12 | Built and tested live (p4.8: the shell sent to a website stays on its own page; logged `shell-app-only`) |
| T04 A page sends the tab to a blocked site (link, script, form, meta refresh, pop-up) | ADV1 | E09 | Blocklist in the policy engine (p4.2, p4.3); since p5.15 the request itself is refused before it is sent (owner answer Q-229) | SEC-01 | Built; typed, redirect, frame and `window.open` tested live (p4.3); typed, link, redirect, frame, image and fetch requests reach no blocked server (p5.15, `block-requests`) |
| T05 A redirect chain reaches a blocked site | ADV1 | E09, E13 | Every redirect hop re-evaluated (p4.3) | SEC-08 | Built and tested live (p4.3, `security-navigation`) |
| T06 An iframe loads a blocked site | ADV1b | E09, E13 | Raw-COM `FrameNavigationStarting` (p4.3) | SEC-08 | Built and tested live (p4.3, `security-navigation`) |
| T07 A malformed address slips past the filter or crashes it | ADV1 | E09, E13 | Fail-closed parsing (p2.5 address bar; p4.2 engine) | SEC-09 | Built and tested live (p4.11, `security-navigation`: a malformed typed address refused and logged; engine tests cover unparsable addresses, p4.2) |
| T08 A link silently starts another app | ADV1 | E02, E09 | Confirmation bar (p2.10); per-scheme allowlist; no silent launch (p4.4) | SEC-02 | Built and tested live (p4.4, `external-schemes`: no launch without the click; four abused types always refused; optional list of allowed types) |
| T09 A page gets camera, microphone, location, notifications or clipboard without consent | ADV1 | E09 | Nothing allowed until the user chooses: Ferrum's question for five kinds, every other kind refused; answers saved in Ferrum's settings, `SavesInProfile(FALSE)`; only the shell can answer (p4.5, p4.17, p4.20, adr-0034) | SEC-05 | Built and tested live (p4.20, `permissions`: the question, Allow this time, Always, Never, close, quiet after 3 closes, no question for http pages and for frames their page did not allow, private tabs save nothing, a waiting request refused when the page changes; a website cannot answer, IPC self-test); grants set, kept after a restart, honoured and revoked through the settings screen (p4.17, `security-settings`) |
| T10 A download lands outside the download folder, replaces a file or runs | ADV1 | E09 | Download folder only, no replacing (p3.8); name sanitising, executable warning, no auto-open (p4.6) | SEC-07 | Built and tested live (p4.6, `safe-downloads`: name cleaned, folder kept, program warning, nothing opened; no "downloaded from the internet" mark seen on a local test download) |
| T11 Site A reads site B's cookies or storage, or clearing A wipes B | ADV1 | E11 | One profile per site (p3.6); per-profile clearing and isolation modes (p4.7, p4.15) | SEC-06 | Built and tested live (p4.7, `isolation`: cookie, localStorage and IndexedDB kept per profile; clearing site A leaves B; private tabs); the three isolation modes tested live in p4.15 (`isolation-modes`) |
| T12 Cross-origin reads, because a browser protection was weakened | ADV1 | E15 | No weakening flags; same-origin policy and site isolation as shipped | SEC-04 | Built and tested live (p4.11, `cross-origin`: every cross-site read refused; no weakening switch on any browser process) |
| T13 A man in the middle on HTTPS, through a certificate-error bypass | ADV2 | E15 | No "proceed anyway" path for certificate errors (p2.8) | SEC-13 | Partly (P2: no bypass code). No live certificate-error test exists yet: the P4 suite does not include SEC-13 (§5), so this is not claimed as tested |
| T14 A man in the middle reads or changes a plain HTTP page | ADV2 | E15 | Visible "not secure" bar only (Q-112: HTTP allowed) | not enforced | Not enforced (owner's choice); the bar is built and tested live (p4.17, `security-settings`) |
| T15 A renderer crash takes down the app | ADV1 | E13 | `ProcessFailed` handling, crashed-tab state and reload; restart with session restore after a browser-process failure (p4.10) | SEC-10 | Built and tested live (p4.10, `crash-recovery`: crashed tab marked and covered, other tab and shell keep working, reload recovers; engine failure restarts Ferrum with its tabs) |
| T16 Pop-ups flood the screen or keep a link to the opener page | ADV1 | E09 | New tab per pop-up, at most one per tab per second, no opener link (p3.2); pop-up policy (p4.3) | SEC-01 | Partly (P3: rate limit; p4.3: every pop-up address passes the policy) |
| T17 Another program on the PC drives Ferrum through a debugging port | ADV3 | E05, E06 | Ferrum never sets the port; release builds have no debug arguments | SEC-11 | Partly (P2: never set by Ferrum; benchmark runs open it by design) |
| T18 Another program reads Ferrum's data folder (history, sessions, logs) | ADV3 | E10 | Windows account protection only; backup files are encrypted (p3.21) | not enforced | Not enforced |
| T19 A dependency is compromised | ADV4 | none | Known-advisory checks (`cargo deny`, `npm audit`), lockfiles | not enforced | Not enforced (detection of known advisories only) |
| T20 A security or network log stores page content or secrets | ADV1 | E15 | Metadata-only records (adr-0008); audit log without page content (p4.9) | SEC-14 | Built and tested (p4.9: audit lines schema-checked in every security test; secret in address and typed text never written); network log P5 |
| T21 The benchmark-only no-security build reaches users, or debug-only test commands run in release | ADV4 | E11 | Release-build static check (p4.16); test commands refuse in release builds (P3) | SEC-12 | Built and tested (p4.16: the release build is scanned and has no benchmark-only switch or its marker texts; the benchmark build refuses to start without its flag; rerun in the P4 gate of 2026-10-17) |
| T22 The baseline benchmark app is used for normal browsing without Ferrum's controls | ADV1 | E03 | Not shipped; benchmark use only | not enforced | Not enforced |
| T23 A benchmark run touches the owner's real browser profile or weakens a competitor browser | ADV4 | E04 | Fresh temporary profiles; recorded policies (P6 harness) | not enforced | Not enforced in P4 (P6 harness check) |
| T24 An elevated energy sampler is misused | ADV3 | E07 | Separate program, read-only output; Ferrum never elevated (Q-123 open) | not enforced | Not enforced in P4 (P6) |
| T25 A page tampers with a measurement script run through the DevTools session | ADV1 | E12 | Measurement only, no secrets; results cross-checked by out-of-process counters (P5, P6) | not enforced | Not enforced |
| T26 A renderer exploit escapes the Chromium sandbox | ADV1 | E15 | Chromium sandbox left as shipped; WebView2 runtime kept up to date by Windows | not enforced | Not enforced (out of scope, ADV5 class) |

### 7.4 Explicitly not enforced

Ferrum makes no claim about these, and the docs must not imply one:

- Plain HTTP pages are not protected from network attackers; Ferrum only shows a warning bar (T14).
- Process isolation between sites: per-site profiles separate storage, not processes; what stays shared is measured in p4.7 (T11).
- Other programs running as the same Windows user can read Ferrum's data folder (T18) and, during benchmark runs, drive web views through the debugging port (T17).
- Dependencies are checked for known advisories only (T19).
- Renderer sandbox escapes and an elevated or administrator attacker (T26, ADV5).
- Benchmark tools (baseline app, harness, energy sampler, DevTools measurement scripts) are not hardened against the sites they load (T22 to T25).
- Google sign-in does not work inside Ferrum tabs by design; Ferrum offers the system browser instead and never works around the block.
