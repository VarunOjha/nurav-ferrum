---
id: adr-0015
type: decision
title: "Default navigation posture is open browsing + blocklist"
status: accepted
updated: 2026-10-19
sources:
  - raw/00-master-prompt.md
  - raw/01-scoping-decisions.md
  - raw/research/tauri-webview2-capabilities.md
  - raw/owner/2026-10-13-s03-p4-questions.md
related: [adr-0007, adr-0008, adr-0010, adr-0019, phase-p2-minimal-container, phase-p3-tabs-sessions, phase-p4-security, comp-security-engine, comp-webview-manager, comp-app-shell, exp-security-overhead]
approvable: true
date: 2026-10-08
decided_by: owner
supersedes: []
options:
  - "Open browsing + blocklist (any HTTPS; HTTP upgraded/warned; non-web schemes need confirmation)"
  - "Allowlist-only (web-app container for configured sites)"
  - "Open browsing with no filtering"
phase: phase-p0-planning
tags: [security, navigation, policy]
unverified:
  - claim: "Cancelling LaunchingExternalUriScheme alone stops WebView2 from starting the other app on Ferrum's tab views (FrameNavigationStarting and the event itself verified in P4)"
    verify_in: phase-p6-benchmark-harness
  - claim: "Google refuses OAuth sign-in in a Ferrum (WebView2) tab in practice"
    verify_in: phase-p6-benchmark-harness
---

# ADR-0015: The default navigation posture is open browsing + blocklist

## Context

The master prompt asks for domain allowlists and blocklists, navigation interception, external protocol handling and origin-aware policy evaluation ([raw/00-master-prompt.md](../raw/00-master-prompt.md) §4 "Security Policy Engine", §5 Phase 3). It also sets hard rules: do not bypass certificate validation, do not weaken Chromium sandboxing, and do not bypass OAuth provider restrictions on embedded browsers (§5 Phase 1).

Scoping question Q12 asked for the default navigation posture. The owner chose **"Open browsing + blocklist (any HTTPS; HTTP upgraded/warned; non-web schemes require confirmation)"** ([raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md)).

Research facts ([raw/research/tauri-webview2-capabilities.md](../raw/research/tauri-webview2-capabilities.md) §4, §6, §8, §10; VERIFIED):

- **Main frame only, and it fails open.** Tauri `on_navigation` maps to WebView2 `NavigationStarting`. It covers the **main frame only** and does fire for redirects. **If the URL fails to parse, tauri-runtime-wry returns `true` (allow).**
- **No iframe hook in Tauri.** `FrameNavigationStarting` exists only via raw COM.
- **External schemes need raw COM.** `LaunchingExternalUriScheme` exists only via raw COM.
- **Popups.** With no `on_new_window` handler, wry suppresses popups silently. With a handler, Ferrum can deny, allow, or route the popup into a new tab.
- **Downloads.** The wry default download handler allows when the app sets none.
- **Permissions.** `on_permission_request` sees only *new* requests; persisted choices bypass it. Keeping the app authoritative needs `SavesInProfile(FALSE)` via raw COM.
- **Google OAuth.** Google's policy forbids OAuth requests from embedded user-agents the developer controls, and Ferrum tabs qualify. Ferrum must detect the flow and offer to open it in the system browser, never work around it. Whether Google actually refuses sign-in in a Ferrum tab is UNVERIFIED[phase-p6-benchmark-harness] (re-targeted in P3: Ferrum never loads the sign-in page in a tab, by design since P2, so observing it is a deliberate P4 security test; re-targeted in P4: P4's tests use local test pages only and did not open it; P6 chooses the real-world workloads, where a sign-in would next matter, risk-r10), to be observed and not circumvented.

## Options considered

| Option | Pros | Cons |
|---|---|---|
| A. **Open browsing + blocklist** | General browser-like usability. Matches benchmark needs (arbitrary public sites). Owner's choice | Larger attack surface than an allowlist. The blocklist's quality determines its value |
| B. Allowlist-only | Smallest attack surface. Fits "web application container" | Not browser-like. Each new site needs configuration. Not the owner's choice. Remains available as a **per-profile option** |
| C. No filtering | Simplest | Fails the master prompt's policy-engine requirements |

## Decision

### Owner decision (verbatim)

As recorded in [raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md), scoping answer Q12 (that file records the owner's words verbatim-in-substance):

> Q12 Default navigation posture: **Open browsing + blocklist** (any HTTPS; HTTP upgraded/warned; non-web schemes require confirmation)

This quoted choice is what `decided_by: owner` and `status: accepted` cover (SCHEMA §10.4 rule 3(b)).

### Claude elaboration (binding only once the owner APPROVES this ADR)

Everything below in this section is Claude's elaboration of the owner's choice. Under SCHEMA §10.4 it binds implementation only after the owner approves this ADR (given in Claude Code and recorded in `plan/approvals.json`, adr-0023); until then it is a proposal.

**Option A**, with these rules for `comp-security-engine`:

1. **Schemes:**
   - `https:` is allowed unless blocklisted.
   - `http:` is loaded as typed, without an automatic HTTPS upgrade, and the shell shows a visible "not secure" warning bar while the page is on HTTP (owner answer to Q-112, 2026-10-13, [raw/owner/2026-10-13-s03-p4-questions.md](../raw/owner/2026-10-13-s03-p4-questions.md): "Allow HTTP with a warning bar"; this is the "warned" branch of the owner's Q12 words).
   - Non-web schemes (`mailto:`, `ms-*:`, custom app protocols) need **explicit user confirmation** and are logged.
   - `file:`, `javascript:` (as a top-level navigation), `data:` (as a top-level navigation) and the app's own local origin are **denied in tabs**.
2. **Domain blocklist and allowlist** (master prompt §4 requires both; Q12 chose the default posture, it did not drop allowlists):
   - The **blocklist** is a local, owner-editable list with exact-host and domain-suffix rules (subdomain matching). It ships empty apart from the security-suite fixture domains; the owner adds sites in Settings; no third-party lists until their licences and update process are reviewed (owner answer to Q-113, 2026-10-13).
   - The **allowlist** is a local, owner-editable list with the same rule syntax. It is used in two ways:
     - *Override:* an allowlist entry that is more specific than a matching blocklist rule wins (for example, allow `docs.example.com` while `example.com` and its subdomains are blocked). At equal specificity, block wins.
     - *Allowlist-only mode:* an optional mode, set globally or per profile, in which only allowlisted hosts may be navigated to and everything else is denied (this is option B, kept available as a configuration).
   - Default: open mode with an empty allowlist, per Q12. Every rule is re-evaluated on each redirect hop and for frames.
3. **Fail closed.** The security engine itself parses URLs. **Unparsable URLs are denied**, whatever Tauri's fail-open default does. Iframe navigations and external-scheme launches are intercepted through raw COM, `FrameNavigationStarting` and `LaunchingExternalUriScheme` ([ADR-0019](adr-0019-raw-webview2-com-boundary.md)). On the tab controllers Ferrum creates (adr-0029), P4 verified both: a frame showing a blocked host is refused ([check-p4.3](../raw/evidence/phase-p4-security/check-p4.3.txt)), and a custom-scheme link raises `LaunchingExternalUriScheme`, which Ferrum cancels and turns into its confirmation bar, with nothing launched without the click ([check-p4.4](../raw/evidence/phase-p4-security/check-p4.4.txt)). That the cancel alone would stop WebView2 from starting the other app is UNVERIFIED[phase-p6-benchmark-harness] (re-targeted in P5: P5 added no test that watches for an app WebView2 might start itself; re-targeted in P4: the live test mocks Ferrum's own launcher and does not watch for an app WebView2 might start itself; the risky link types were refused by the policy first); spike S3 showed raw COM events work on such views.
4. **Certificate errors are never bypassed.** There is no "proceed anyway" for TLS errors.
5. **Popups** (`on_new_window`) open as a new Ferrum tab under the same policy once tabs exist (P3). In P2, which has no tabs, they open in the same view or in the system browser, per configuration. They are never allowed as an uncontrolled native window.
6. **Downloads** are always routed through Ferrum's handler. The default destination is the user's Downloads folder, and executable file types need a confirmation prompt. The final policy is set in P4.
7. **Permissions** (camera, microphone, geolocation, notifications, clipboard read, …) are **denied by default, with per-site grants** stored in Ferrum settings, which are authoritative (`SavesInProfile(FALSE)` via raw COM). This matches `comp-security-engine` and `phase-p4-security` task p4.5. A grant is revocable.
8. **Google OAuth.** Ferrum detects Google OAuth flows (`accounts.google.com` authorization endpoints) and offers "Open in system browser". No user-agent spoofing or other workaround, ever.
**Note (2026-10-11, after P1; Claude elaboration, the owner's choice above is unchanged).** Under adr-0029 tab views are WebView2 controllers Ferrum creates itself, so for tabs the Tauri hooks named in this ADR (`on_navigation`, `on_new_window`, `on_download`, `on_permission_request`) are replaced by their WebView2 events (`NavigationStarting`, `NewWindowRequested`, `DownloadStarting`, `PermissionRequested`) in the raw-COM module (adr-0019). Tauri's fail-open URL-parse default therefore does not apply to tabs; the security engine still denies unparsable URLs.

9. **Audit trail.** Every denial or confirmation is an audit event. These events feed the network log's `policy_decision` field ([ADR-0008](adr-0008-network-logging-metadata-jsonl.md)).

## Consequences

### Positive

- Browser-like usability, plus defined security behaviour for the cases the master prompt tests (§11): blocked domains, external protocols, redirect-based bypass and malformed URLs.
- Fail-closed URL parsing removes a known fail-open gap.

### Negative

- Iframe and external-scheme coverage depends on raw COM (`risk-r03`).
- An open-browsing posture means the security tests must be thorough. A blocklist is advisory protection, not a sandbox.
- Google sign-in will likely not work in tabs, which costs usability.

### Follow-ups

- P2 (M1): a minimal policy: scheme handling, fail-closed parse, no local origin; popups (`target=_blank`, `window.open`) open in the same view or in the system browser per configuration (task p2.10, since P2 has no tabs); Google OAuth detection with an "Open in system browser" offer (task p2.13).
- P3: popups become new Ferrum tabs under the same policy (rule 5); per-site settings.
- P4 (M3): the full engine (blocklist, allowlist override and allowlist-only mode, permissions default deny), the security test suite (master prompt §11) and the threat model.
- Owner answers ([ov-open-questions](../overview/ov-open-questions.md)): Q-109 (OAuth hand-off UX; p2.13 builds it), Q-112 (HTTP behaviour: allow with a warning bar) and Q-113 (blocklist ships empty) are answered.
- Recommended defaults: Q-109: detect navigations to Google's OAuth authorization endpoints and show a bar offering to open the URL in the default browser, never spoof the user agent, and keep benchmark workloads free of Google logins. Q-112 (not chosen by the owner): always try HTTPS first; if that fails, show an interstitial with "Continue over HTTP (this time)" and an optional per-site remember toggle, each continue logged as a policy event. Q-113 (chosen): a local owner-edited list that ships empty apart from the security-suite fixture domains; no third-party lists until their licences and update process are reviewed in a research note.
- `exp-security-overhead` measures policy-evaluation latency, separately from correctness tests (master prompt §7).

### Related risks and phases

- Risks: `risk-r03` (raw COM).
- Phases: `phase-p2-minimal-container`, `phase-p3-tabs-sessions`, `phase-p4-security`.

## Verification / evidence

- Owner answer Q12: [raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md).
- Hook semantics: [raw/research/tauri-webview2-capabilities.md](../raw/research/tauri-webview2-capabilities.md) §4, §8, §10.4.
- P4 evidence: the security test suite output (blocked domain, allowlist override of a blocklist suffix rule, allowlist-only mode denying a non-listed host, redirect bypass, malformed URL, external protocol, iframe navigation, local-origin navigation attempt, permission default deny) under `wiki/raw/evidence/phase-p4-security/`.
