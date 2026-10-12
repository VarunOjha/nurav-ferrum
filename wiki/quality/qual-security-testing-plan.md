---
id: qual-security-testing-plan
type: quality
title: "Security testing plan: master prompt section 11 mapped to harmless fixtures"
status: draft
updated: 2026-10-11
sources:
  - raw/00-master-prompt.md
  - raw/01-scoping-decisions.md
  - raw/research/tauri-webview2-capabilities.md
  - raw/research/measurement-methodology.md
related: [qual-testing-strategy, qual-definition-of-done, qual-phase-gate-checklist, qual-ci-plan, ov-risk-register, phase-p2-minimal-container, phase-p3-tabs-sessions, phase-p4-security, comp-security-engine, comp-webview-manager, comp-app-shell, comp-network-logger, comp-webview2-runtime, adr-0007, adr-0008, adr-0010, adr-0015, exp-security-overhead, risk-r01, risk-r07, risk-r09, risk-r10, risk-r18, risk-r19]
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
  - claim: "WebView2 raises LaunchingExternalUriScheme for an unregistered custom scheme navigated from a tab"
    verify_in: phase-p4-security
  - claim: "WebView2 marks downloaded files with Mark-of-the-Web"
    verify_in: phase-p4-security
  - claim: "Terminating a renderer process from the harness raises ProcessFailed on the affected webview without crashing the host"
    verify_in: phase-p4-security
  - claim: "navigator.permissions.query in the page reflects a host-side PermissionRequested denial (with SavesInProfile false) in WebView2"
    verify_in: phase-p4-security
  - claim: "Separate WebView2 profiles keep cookies, localStorage and IndexedDB of the same origin apart"
    verify_in: phase-p4-security
  - claim: "WebView2 refuses to load a page with an untrusted certificate unless the app handles ServerCertificateErrorDetected"
    verify_in: phase-p4-security
---

# Security testing plan

The master prompt (§11) requires automated tests for ten areas, harmless controlled fixtures, never weakening WebView2 security to improve benchmarks, and documenting the threat model and the properties actually enforced ([master prompt](../raw/00-master-prompt.md)). This page maps each area to concrete fixtures, steps and pass criteria. Tests are numbered **SEC-01..SEC-13**. SEC-01..SEC-10 follow master prompt §11 in order; SEC-11..SEC-13 are additions from the research ([tauri-webview2-capabilities](../raw/research/tauri-webview2-capabilities.md)).

Security **correctness** tests live here. Security **overhead** (policy evaluation latency, isolation cost) is measured separately in `exp-security-overhead` (master prompt §7).

## 1. Threat model summary (detailed version belongs on `comp-security-engine`)

| Item | Content |
|---|---|
| Adversary | A malicious or compromised **remote web page** loaded in a tab, including its iframes, popups, redirects and downloads |
| Assets | Ferrum's native commands and the trusted shell (comp-app-shell); other sites' session data (profiles, adr-0010); the user's file system (downloads); the OS (external protocol handlers); the network log's integrity (adr-0008) |
| Trust boundary | Tab webviews are untrusted; the shell webview and Rust host are trusted (adr-0007). Every tab-to-host message crosses the boundary |
| Out of scope | Local malware or an administrator attacker; a compromised WebView2 runtime; Chromium renderer exploits (Ferrum relies on Chromium's sandbox and must not weaken it). Supply-chain risk is handled by dependency auditing ([qual-ci-plan](qual-ci-plan.md)), not here |
| Posture | Open browsing with a blocklist; HTTP upgraded or warned; non-web schemes need confirmation (adr-0015, Q12) |

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

Fixtures need several **origins**. A local server on `127.0.0.1` gives distinct origins through distinct ports. The open question is the scheme:

| Option | Pros | Cons |
|---|---|---|
| HTTP on loopback, allowed only by a **test-build-only** policy exception compiled out of release builds | No certificate handling; nothing installed on the machine | The exception itself must be tested to be absent in release (SEC-12) |
| HTTPS with a **locally trusted test CA** installed in the user certificate store | Exercises the real HTTPS path | Installs a root certificate on the owner's machine (security-relevant; needs approval and cleanup) |

Ferrum must never bypass certificate validation (master prompt §5) to make fixtures work. Recommendation: HTTP-on-loopback test exception for most tests, plus SEC-13 to prove certificate errors are not bypassed. This is listed as an owner question in [ov-risk-register](../risks/ov-risk-register.md).

## 4. Test catalogue

Levels: **U** = Rust unit/property test of the policy engine (no browser); **I** = integration with a real WebView2 tab; **E** = E2E through the built app.

### SEC-01 Blocked-domain navigation (master prompt §11 item 1)

- **Threat:** a page navigates the tab to a blocklisted host.
- **U:** `evaluate(url)` against the blocklist for exact host, subdomains, mixed case, trailing dot, user-info (`user@host`), explicit port, IDN in Unicode and punycode forms, IPv4 and IPv6 literals. Property: any URL whose host matches a block rule is denied regardless of path, query or fragment.
- **E fixture:** `block-nav.html` on origin A with (a) a link, (b) `location.href =`, (c) a meta refresh, (d) a form submission, (e) `window.open`, all to a host on the test blocklist.
- **Pass:** every attempt is cancelled; the tab stays on origin A; one denial per attempt appears in the audit log with the rule that matched.
- **Phase:** U in P4 (policy engine); E in P4. Related: risk-r07.

### SEC-02 External protocol handling (item 2)

- **Threat:** a page launches an OS handler without consent.
- **Fixture:** `ext-proto.html` with links and scripted navigations to `ferrum-test-proto:x`, `mailto:`, and `file:` URLs, plus one inside an iframe.
- **Steps:** click each; answer the confirmation prompt with *deny* in automated runs.
- **Pass:** a confirmation is required for every non-web scheme; with *deny*, nothing launches (no new process in the session's process snapshot) and the denial is logged. `file:` from a remote page is always denied.
- **Phase:** P4. Depends on raw-COM `LaunchingExternalUriScheme` (UNVERIFIED[phase-p4-security]).

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

### SEC-05 Permission denial (item 5)

- **Threat:** a page gains camera, microphone, location, notifications or clipboard access without policy approval.
- **Fixture:** `perm.html` requests geolocation, camera, microphone, notifications and clipboard-read, each on a button.
- **Pass (primary, observable outcome):** under the default policy each request is denied or prompted per the policy table and the decision is logged; for a denial, the page-side API call fails (the geolocation error callback fires, `getUserMedia` rejects and no capture stream or track is granted, `Notification.requestPermission` does not resolve to `granted`, the clipboard read rejects).
- **Secondary (recorded, not a pass criterion):** the `navigator.permissions.query` state for each permission is recorded. Whether it reflects a host-side denial is UNVERIFIED[phase-p4-security]; a mismatch is logged as a finding about WebView2 behaviour, not a Ferrum failure. A persisted earlier choice does not bypass the policy (TW §4 notes that persisted choices skip the permission event unless `SavesInProfile` is controlled via raw COM).
- **Phase:** P4.

### SEC-06 Session data isolation (item 6)

- **Threat:** one site's session data is visible to another isolated site, or clearing one wipes another.
- **Fixture:** `store.html` writes a cookie, `localStorage` and an IndexedDB record; `read.html` reads them.
- **Steps:** load `store.html` in a tab assigned profile P1; load `read.html` at the **same origin** in a tab assigned P2; then clear P1's data and check P2 and the shell.
- **Pass:** P2 sees none of P1's data; clearing P1 leaves P2 and the shell intact. The test also records both tabs' browser process id, to document what remains shared (master prompt §5 Phase 3: document which resources remain shared).
- **Depends on** the profile route chosen for risk-r01. Isolation by profile itself is UNVERIFIED[phase-p4-security].
- **Phase:** P4 (a first version runs inside the risk-r01 spike in P1).

### SEC-07 Download handling (item 7)

- **Threat:** a page writes outside the download folder, auto-downloads many files, or gets a file executed.
- **Fixture:** a server route that returns plain text with: a normal name; a name containing `..\` path traversal; an executable-looking extension; and a page that triggers several downloads at once.
- **Pass:** files land only inside the configured download folder with sanitised names; risky types prompt or are blocked per policy; multiple automatic downloads require permission; nothing is opened or executed automatically; each decision is logged. Whether WebView2 applies Mark-of-the-Web is recorded, not assumed (UNVERIFIED[phase-p4-security]).
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
- **Steps:** with three tabs open, the test finds a tab's renderer PID via WebView2 process info and terminates that process from the harness (harmless to the system).
- **Pass:** the affected tab shows a crash state with a reload action; reload restores it; the shell and unaffected tabs keep working; the event is logged. Tabs sharing the killed renderer are reported as affected, not hidden (renderers can be shared across webviews on one data folder, [measurement-methodology](../raw/research/measurement-methodology.md) §2.2). Relies on raw-COM `ProcessFailed` (UNVERIFIED[phase-p4-security]).
- **Phase:** P4; crash-state UI from P3.

### SEC-11 Debug port never in release builds (addition)

- **Why:** an open remote-debugging port exposes every webview, including the trusted shell, to local processes (TW §7).
- **Pass:** a release build started normally exposes no debugging endpoint; benchmark and test builds that enable it are labelled as such and bind to loopback.
- **Phase:** P2 onward.

### SEC-12 Static configuration checks (addition)

- **Pass:** no capability file has a `remote` section; the shell capability targets the shell webview label; an app ACL manifest exists; browser arguments contain no weakening flag; the test-only loopback exception and devtools are absent from release configuration.
- **Runs in** the `security-static` CI job ([qual-ci-plan](qual-ci-plan.md)).
- **Phase:** P2 onward.

### SEC-13 Certificate errors are not bypassed (addition)

- **Fixture:** a local HTTPS server with a self-signed, untrusted certificate.
- **Pass:** navigation fails with an error state; Ferrum offers no "proceed anyway" path (master prompt §5: do not bypass certificate validation). Expected default WebView2 behaviour: UNVERIFIED[phase-p4-security].
- **Phase:** P2 (error state) and P4.

## 5. Traceability

| Master prompt §11 item | Test | Risks |
|---|---|---|
| Blocked-domain navigation | SEC-01 | risk-r07 |
| External protocol handling | SEC-02 | risk-r07, risk-r18 |
| Unauthorized native command invocation | SEC-03, SEC-12 | risk-r19 |
| Cross-origin access attempts | SEC-04 | risk-r19 |
| Permission denial | SEC-05 | risk-r19 |
| Session data isolation | SEC-06 | risk-r01, risk-r09 |
| Download handling | SEC-07 | risk-r07 |
| Redirect-based policy bypass | SEC-08 | risk-r07 |
| Malformed URL handling | SEC-09 | risk-r07 |
| Application recovery after renderer crashes | SEC-10 | risk-r18 |

## 6. Unverified items on this page

All are listed in the frontmatter `unverified:` block and tagged inline in SEC-02, SEC-05, SEC-06, SEC-07, SEC-10 and SEC-13. One more applied to the whole E2E level, driving Ferrum tab webviews with Playwright over CDP in a test build: verified in P2 for the shell and the content view ([check-p2.15](../raw/evidence/phase-p2-minimal-container/check-p2.15.txt)).
