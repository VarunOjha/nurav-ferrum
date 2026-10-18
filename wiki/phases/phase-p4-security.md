---
id: phase-p4-security
type: phase
title: "P4 Security (Milestone M3): policy engine, permissions, isolation tests, threat model"
status: gate-review
updated: 2026-10-15
sources:
  - raw/00-master-prompt.md
  - raw/01-scoping-decisions.md
  - raw/research/tauri-webview2-capabilities.md
  - raw/research/measurement-methodology.md
  - raw/owner/2026-10-14-s06-p4-15-reapproval-and-q225.md
  - raw/owner/2026-10-14-s07-p4-18-exe-download-fix-a.md
  - raw/owner/2026-10-15-s07-p4-18-reapproval-and-q226.md
  - raw/research/smartscreen-webview2.md
  - raw/owner/2026-10-14-s06-p4-16-reapproval-and-mishap.md
  - raw/owner/2026-10-15-s07-q227-permission-question-chrome-style.md
  - raw/owner/2026-10-15-s07-q228-other-site-frames-like-chrome.md
related: [phase-p3-tabs-sessions, phase-p5-telemetry, phase-p6-benchmark-harness, comp-security-engine, comp-webview-manager, comp-app-shell, risk-r01, risk-r03, adr-0010, adr-0015, adr-0034, exp-security-overhead, exp-isolation-overhead]
approvable: true
phase: phase-p4-security
tags: [milestone-m3, security, threat-model, policy, permissions, isolation]
milestone: M3
order: 4
depends_on: [phase-p3-tabs-sessions]
est_sessions: 5
entry_criteria:
  - "phase-p3-tabs-sessions has status done and key phase-p3-tabs-sessions#exit is APPROVED."
  - "Owner approval recorded and not stale in plan/approvals.json for the P4 dependency set: schema, phase-p4-security, every ADR in decisions, every component in components, exp-security-overhead and exp-isolation-overhead."
  - "No open Q-NNN blocks any id in the dependency set."
deliverables:
  - "Threat model and full SECURITY.md: assets, adversaries, trust boundaries, enforced properties, explicitly unenforced properties."
  - "Security policy engine crate: origin-aware navigation policy, blocklist, posture per adr-0015, fail-closed parsing."
  - "Interception at every reachable layer: main frame, redirects, iframes, new windows, external schemes."
  - "Permission controls with the app as the authority; secure download behaviour; session storage configuration."
  - "Restricted native capability exposure, proven by tests."
  - "Security audit log of denied actions (JSONL)."
  - "Renderer crash recovery."
  - "Automated security test suite covering all ten master prompt section 11 items with harmless fixtures."
  - "Documentation of exactly which resources remain shared between profiles and tabs."
  - "Isolation modes shared-profile, profile-per-site and udf-per-site selectable by configuration, with the per-site user-data-folder feasibility finding documented (p4.15)."
  - "Benchmark-only ablation feature cfg-ferrum-nosecurity-bench, proven absent from release builds (p4.16)."
  - "Settings UI for blocklist and per-site permission grants (p4.17)."
  - "SmartScreen switched back on in every WebView2 environment, with a research note on what it checks and sends (p4.18, owner answer Q-225)."
  - "Ferrum's own message when SmartScreen blocks a site, instead of the generic load-error panel (p4.19, owner answer Q-226)."
  - "A Chrome-style question before a site may use the camera, microphone, location, notifications or clipboard, with remembered answers in Settings (p4.20, owner answer Q-227, adr-0034)."
  - "Designs (not results) for exp-security-overhead and exp-isolation-overhead, with microbenchmark harnesses."
tasks:
  - id: p4.1
    title: "Threat model: assets, adversaries (malicious site, malicious iframe, compromised dependency, local process using a debug port), trust boundaries from the architecture pages, in-scope and out-of-scope threats; SECURITY.md completed"
    verify: "SECURITY.md and the security quality page list every boundary edge from the component pages (edges with crosses_trust_boundary true) and map each threat to a control and a test id or to 'not enforced'."
  - id: p4.2
    title: "Policy engine (pure Rust, security crate): origin-aware evaluation, domain allowlist and blocklist with subdomain matching (an allowlist entry more specific than a matching block rule wins; equal specificity = block; optional allowlist-only mode, adr-0015 rule 2), HTTPS allowed, HTTP upgrade or warn, non-web schemes need confirmation, unparseable URL denied (fail closed), decision record with reason"
    verify: "Table-driven unit tests per rule (including allowlist override of a blocklist suffix rule, equal-specificity block, and allowlist-only mode denying a non-listed HTTPS host) plus randomised input tests (no panic, unparseable input always denied); 100 percent of decision branches covered by tests (coverage report saved)."
  - id: p4.3
    title: "Interception at all layers: Tauri on_navigation plus raw COM NavigationStarting (to close the fail-open path), FrameNavigationStarting for iframes, NewWindowRequested, every redirect hop re-evaluated"
    verify: "Security tests: blocked domain via direct navigation, via 302 redirect from an allowed fixture, via iframe, via window.open and via a malformed URL are all denied and logged."
  - id: p4.4
    title: "External protocol handling via LaunchingExternalUriScheme: shell confirmation, per-scheme allowlist, no silent launch"
    verify: "Security test: custom-scheme fixture triggers the confirmation; without consent the OS handler is never invoked (launcher mocked)."
  - id: p4.5
    title: "Permission controls: PermissionRequested handled by policy; sensitive kinds (camera, microphone, geolocation, notifications, clipboard read) denied by default; per-site grants in settings; decisions not persisted by the WebView2 profile (SavesInProfile false via raw COM)"
    verify: "Security tests: fixture requests each permission kind; default deny observed in page script; a per-site grant is honoured and revocable."
  - id: p4.6
    title: "Secure downloads: destination restricted to the configured folder, no auto-open, warning for executable types, filename sanitisation"
    verify: "Security tests with fixtures offering a path-traversal filename and an executable type: file lands sanitised in the configured folder and the warning shows."
  - id: p4.7
    title: "Session storage configuration and isolation documentation: per-site profiles, optional InPrivate tabs, per-profile data clearing; list of shared resources (browser process, GPU process, binaries, other) established by tests and process inspection, not assumed"
    verify: "Security tests: cookies, localStorage and IndexedDB written by site A are not readable by site B in a different profile; clearing profile A leaves profile B intact; shared-resource list on comp-webview-manager cites the evidence."
  - id: p4.8
    title: "Restricted native capability exposure: remote content cannot reach app commands, core plugin commands, event emit/listen or the exempt internal fetch-channel command; tabs cannot navigate to the app's own local origin; invoke key not relied upon"
    verify: "Security tests from a remote-origin fixture for each listed path all fail; a test attempts top-level navigation of a tab to the app's local origin and it is blocked."
  - id: p4.9
    title: "Security audit log: every denied action as a JSONL record (time, tab, origin, action, rule, decision); rotation; no page content"
    verify: "Every security test asserts its matching audit record exists; a schema test validates all records."
  - id: p4.10
    title: "Renderer and browser process failure recovery via ProcessFailed and browser-exit events: crashed tab state, reload, no shell crash"
    verify: "Test deliberately crashes a tab renderer (method from spike S3) and asserts the crashed state, then reload succeeds; shell stays responsive."
  - id: p4.11
    title: "Consolidated security suite mapping master prompt section 11 items 1 to 10 to test ids, kept separate from performance tests"
    verify: "One command runs the suite and exits 0; the suite includes the allowlist cases (override of a blocklist rule, allowlist-only mode denying a non-listed host); a mapping table (item to test id) is on the security quality page."
  - id: p4.15
    title: "Isolation modes selectable by configuration: shared-profile (every tab in the default profile), profile-per-site (adr-0010, route from p1.9) and udf-per-site (one user data folder per site via Tauri data_directory, so one WebView2 environment and browser process group per site); feasibility of per-site user data folders investigated (master prompt section 5 Phase 3) and the resources each mode shares or separates documented from observation"
    verify: "Integration test runs the same two-site fixture in each mode and asserts the expected storage separation (cookies, localStorage, IndexedDB); process inspection (ProcessInfosChanged / process-tree snapshot) records browser-process count per mode to raw/evidence/phase-p4-security/isolation-modes.md; mode switch takes effect after restart and is rejected for invalid values; any mode found infeasible is recorded as such with the observed error, not silently dropped. Modes provide cfg-ferrum-shared-profile, cfg-ferrum-profile-per-site and cfg-ferrum-udf-per-site for exp-isolation-overhead."
  - id: p4.16
    title: "Benchmark-only security ablation flag cfg-ferrum-nosecurity-bench: a compile-time Cargo feature under which the site rules (blocklist, allowlist, plain-HTTP handling) let every web address load, while Ferrum's own origin, forbidden schemes, links to other apps and permission refusals keep their rules (narrower build accepted by the owner, raw/owner/2026-10-14-s06-p4-16-reapproval-and-mishap.md); never enabled in release builds, local fixtures only"
    verify: "Unit tests under the feature assert that every web address is allowed and that Ferrum's own origin, local files and links to other apps are still kept out; a CI security-static check builds the release profile and proves the feature and its symbols are absent (feature list of the release build plus a string/symbol scan of the binary), output saved to raw/evidence/phase-p4-security/nosecurity-absent.txt; the build refuses to start the ablation binary without an explicit benchmark-mode argument."
  - id: p4.17
    title: "Settings UI for security: blocklist editing and per-site permission grants (view, grant, revoke) in the trusted shell settings interface from p3.14, writing config only through host commands"
    verify: "Integration test adds a blocklist domain and a camera grant through the settings UI host commands, restarts, and asserts both persisted and enforced (blocked navigation logged; grant honoured, then revoked); the p2.3 IPC denial test shows remote tabs cannot call these commands."
  - id: p4.18
    title: "SmartScreen back on in every WebView2 environment (owner answer Q-225): Ferrum sets the browser arguments itself, the same for the shell's and the site environments, without msSmartScreenProtection; autoplay and the two Edge-menu switches unchanged"
    verify: "A research note in raw/research (access dates) says what SmartScreen checks and sends inside WebView2, cited by the privacy page and SECURITY.md; an automated check proves no environment's browser arguments contain msSmartScreenProtection (shell and site environments); a live check opens Microsoft's SmartScreen test page named in the note and records what WebView2 shows, as observed (a missing warning is recorded, not hidden)."
  - id: p4.19
    title: "Ferrum's own SmartScreen block message (owner answer Q-226): when SmartScreen blocks a page, the shell shows 'Microsoft Defender SmartScreen reported this site as unsafe' instead of the generic 'could not be loaded' panel, with no 'Try again'"
    verify: "Live test opens Microsoft's demo phishing page (raw/research/smartscreen-webview2.md, 4.2) in the per-site and per-site-udf modes and asserts the SmartScreen panel text and no 'Try again' button; a page that fails for another reason (unreachable test address) still shows the generic panel with 'Try again'; the block is logged; shell unit test for the panel text."
  - id: p4.20
    title: "Chrome-style permission question (owner answer Q-227, adr-0034): camera, microphone, location, notifications and clipboard requests wait for Allow this time, Always allow on this site or Never allow in a bar under the toolbar; remembered answers in Settings; no question for http pages, other-site frames, 'never' sites or a site quiet after 3 closes"
    verify: "A research note in raw/research (access dates) confirms that WebView2 can hold a permission request until it is answered, and the live test records which origin it reports for a frame's request (owner answer Q-228: like Chrome); unit tests for the decision (question, allow once, always, never, quiet time, http page, other-site frame, private tab); live tests with harmless test pages: the bar appears with the site's name, Allow this time and Always allow grant notifications and the clipboard (Always allow then shows in Settings and needs no new question), Never allow and close refuse (also for the camera, which is never switched on), an http page and another site's frame the page did not allow get no bar, a frame the page allowed is asked about under the page's site, navigating away refuses the waiting request, a private tab saves nothing; every case is in the security log."
  - id: p4.12
    title: "Overhead experiment design: microbenchmark harness for policy evaluation latency and permission-check overhead; designs for exp-security-overhead and exp-isolation-overhead finalised for P6 campaigns"
    verify: "Microbenchmarks run and save raw output as evidence of harness operation only (no claims); experiment pages updated with workloads, metrics and analysis plan; owner approves them."
  - id: p4.13
    title: "Research track: literature batch 4 (site isolation, embedded-browser security, WebView security studies)"
    verify: "New raw research notes with access dates."
  - id: p4.14
    title: "Exit gate and owner M3 review including the threat model"
    verify: "All evidence files exist; lint clean; owner approves phase-p4-security#exit."
test_gate:
  automated:
    - "cargo fmt --all -- --check"
    - "cargo clippy --workspace --all-targets -- -D warnings"
    - "cargo test --workspace"
    - "cargo deny check"
    - "Policy engine coverage report (p4.2)"
    - "Security suite (p4.11)"
    - "P3 integration suite, P2 smoke suite and IPC denial test (regression)"
    - "apps/desktop shell: npm run lint && npm run typecheck && npm run test"
    - "Tauri release build of apps/desktop"
    - "Release build security-static check: cfg-ferrum-nosecurity-bench absent (p4.16)"
    - "Isolation-mode integration test (p4.15)"
    - "cd interactive_plan && npm run lint:wiki"
  manual:
    - "Owner reads the threat model and SECURITY.md and confirms the 'not enforced' list is acceptable."
    - "Owner adds a domain to the blocklist through settings and confirms it is blocked, including via a link from another site."
    - "Owner triggers a camera or location request on a real site, sees Ferrum's question, and checks that Never allow refuses and Allow this time works (p4.20, owner answer Q-227)."
    - "Owner downloads a program file in Ferrum, answers Keep in Microsoft's download pop-up and confirms the download finishes (p4.18, owner answer: fix A)."
  evidence:
    - raw/evidence/phase-p4-security/cargo-clippy.txt
    - raw/evidence/phase-p4-security/cargo-test.txt
    - raw/evidence/phase-p4-security/cargo-deny.txt
    - raw/evidence/phase-p4-security/policy-coverage.txt
    - raw/evidence/phase-p4-security/security-suite.txt
    - raw/evidence/phase-p4-security/regression.txt
    - raw/evidence/phase-p4-security/shell-tests.txt
    - raw/evidence/phase-p4-security/release-build.txt
    - raw/evidence/phase-p4-security/nosecurity-absent.txt
    - raw/evidence/phase-p4-security/isolation-modes.md
    - raw/evidence/phase-p4-security/shared-resources.md
    - raw/evidence/phase-p4-security/microbench-harness-run.txt
    - raw/evidence/phase-p4-security/wiki-lint.txt
    - raw/evidence/phase-p4-security/manual-checklist.md
exit_criteria:
  - "Every master prompt section 16 Milestone 3 deliverable exists: navigation policy engine, permission controls, origin-aware capability restrictions, security tests, threat model documentation."
  - "All ten master prompt section 11 test items are automated and pass."
  - "No claim of complete process or security isolation anywhere in the repo or wiki without cited evidence (master prompt section 5 Phase 3)."
  - "Every raw COM use has a documented unsafe invariant on its component page."
  - "Owner approved phase-p4-security#exit."
risks: [risk-r01, risk-r03, risk-r07, risk-r19]
decisions: [adr-0008, adr-0010, adr-0014, adr-0015]
experiments: [exp-security-overhead, exp-isolation-overhead]
components: [comp-security-engine, comp-webview-manager, comp-app-shell]
unverified:
  - claim: "The browser-reported Source in WebMessageReceived cannot be spoofed by page script"
    verify_in: phase-p4-security
  - claim: "A remote page can or cannot navigate a tab top-level to the app's local origin"
    verify_in: phase-p4-security
  - claim: "The exempt internal fetch-channel command leaks nothing to remote content"
    verify_in: phase-p4-security
  - claim: "WebView2 applies Mark-of-the-Web or equivalent protections to downloaded files"
    verify_in: phase-p4-security
---

# P4 Security (Milestone M3)

P4 builds the security policy engine and proves, with tests, which security properties Ferrum actually enforces. It covers master prompt section 5 "Phase 3: Security Controls", section 11 "Security Testing" and section 16 "Milestone 3" ([raw/00-master-prompt.md](../raw/00-master-prompt.md)).

Phase-label note: the research note [raw/research/tauri-webview2-capabilities.md](../raw/research/tauri-webview2-capabilities.md) calls these "P3 security tests" because it uses the master prompt's phase numbering. In this plan they are P4.

## Scope

Research findings this phase must act on (all from the Tauri/WebView2 note, sections 3, 6 and 10):

- **The IPC channel exists in every WebView.** Protection is Rust-side authorisation. P2 already locked capabilities down; P4 extends the tests to every path, including the internal fetch-channel command that is exempt from the ACL check.
- **`on_navigation` fails open** for URLs that do not parse and never sees iframe navigations. The engine therefore also hooks raw COM `NavigationStarting` and `FrameNavigationStarting`, and its own parser denies on failure.
- **External schemes, certificate errors and some permission settings** are only reachable through raw COM. Each raw COM use needs a documented unsafe invariant (master prompt section 15).
- **Profiles share the browser process.** Isolation is about storage, not processes. Master prompt Phase 3 asks to "document precisely which resources remain shared" and forbids claiming complete isolation without validation; p4.7 does both. The same Phase 3 text asks to "investigate the feasibility of independent WebView2 user-data directories": p4.15 does this. The capabilities note records that Tauri's `data_directory` gives one WebView2 environment, user data folder and browser process per distinct directory (VERIFIED in its section 4), and that all WebViews sharing one user data folder must use identical environment options (section 6). Whether per-site folders are practical at Ferrum's tab counts is UNVERIFIED[phase-p4-security].
- **Navigation posture** is open browsing plus blocklist (Q12, adr-0015).

Security correctness tests are kept separate from performance measurement (master prompt section 7). P4 only designs the overhead experiments and checks their microbenchmark harness runs; the measurements happen in [P6](phase-p6-benchmark-harness.md).

## Out of scope

- Network call logging (P5, adr-0008). P4 defines the policy-decision field that the network log will carry.
- Remote-debugging-port hardening for benchmark builds beyond documenting it (P6 decides how benchmark builds are produced).
- Claims about overhead numbers.

## Step order

```mermaid
flowchart LR
  p4_1["p4.1 threat model"] --> p4_2["p4.2 policy engine"]
  p4_2 --> p4_3["p4.3 interception layers"]
  p4_2 --> p4_4["p4.4 external schemes"]
  p4_2 --> p4_5["p4.5 permissions"]
  p4_2 --> p4_6["p4.6 downloads"]
  p4_1 --> p4_7["p4.7 storage isolation"]
  p4_1 --> p4_8["p4.8 native exposure"]
  p4_3 --> p4_9["p4.9 audit log"]
  p4_4 --> p4_9
  p4_5 --> p4_9
  p4_6 --> p4_9
  p4_1 --> p4_10["p4.10 crash recovery"]
  p4_7 --> p4_15["p4.15 isolation modes"]
  p4_2 --> p4_16["p4.16 ablation flag"]
  p4_5 --> p4_17["p4.17 security settings UI"]
  p4_15 --> p4_11
  p4_16 --> p4_11
  p4_17 --> p4_11
  p4_15 --> p4_18["p4.18 SmartScreen back on"]
  p4_18 --> p4_19["p4.19 SmartScreen message"]
  p4_19 --> p4_11
  p4_17 --> p4_20["p4.20 permission question"]
  p4_20 --> p4_11
  p4_7 --> p4_11["p4.11 security suite"]
  p4_8 --> p4_11
  p4_9 --> p4_11
  p4_10 --> p4_11
  p4_11 --> p4_12["p4.12 overhead designs"]
  p4_12 --> p4_14["p4.14 exit review"]
  p4_13["p4.13 literature batch 4"] --> p4_14
```

The threat model comes first so that every later task can be traced to a threat it mitigates. Task ids are stable identifiers, not an ordering: p4.15 to p4.17 were added after review and slot in before p4.11 as the diagram shows; p4.18 was added during P4 (owner answer Q-225, [raw](../raw/owner/2026-10-14-s06-p4-15-reapproval-and-q225.md)), and p4.19 after it (owner answer Q-226, [raw](../raw/owner/2026-10-15-s07-p4-18-reapproval-and-q226.md)). p4.20 was added after p4.13, before the exit gate (owner answer Q-227, [adr-0034](../decisions/adr-0034-permission-question-chrome-style.md)); it changes p4.5's silent refusal into a question, so the security suite (p4.11) is rerun by the gate.

## Checkpoints and interruption recovery

- The policy engine is a pure crate with unit tests; resume by running its tests.
- Each security test is written together with the control it checks, and the item-to-test mapping on the security quality page is updated in the same commit. A resuming session reads the mapping to see which master prompt section 11 items are still open.

## Test gate rationale

Each master prompt section 11 item gets at least one automated test, with harmless local fixtures. Tests are adversarial: they try the bypasses research identified (redirect, iframe, malformed URL, local-origin navigation, exempt command). Coverage of the policy engine's decision branches is required because a missed branch is a missed policy.

## Research track

Literature batch 4 (p4.13): site isolation and embedded-browser security, needed for the paper's security and usability trade-offs section.

## Owner review checkpoint (adr-0014)

The owner reviews the threat model and the "not enforced" list, performs the manual checks and approves `phase-p4-security#exit`.
