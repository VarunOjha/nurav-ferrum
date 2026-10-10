---
id: adr-0015
type: decision
title: "Default navigation posture is open browsing + blocklist"
status: accepted
updated: 2026-10-09
sources:
  - raw/00-master-prompt.md
  - raw/01-scoping-decisions.md
  - raw/research/tauri-webview2-capabilities.md
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
  - claim: "Raw-COM FrameNavigationStarting and LaunchingExternalUriScheme can be registered on Tauri-created tab webviews and cancel navigations reliably"
    verify_in: phase-p4-security
  - claim: "Google refuses OAuth sign-in in a Ferrum (WebView2) tab in practice"
    verify_in: phase-p3-tabs-sessions
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
- **Google OAuth.** Google's policy forbids OAuth requests from embedded user-agents the developer controls, and Ferrum tabs qualify. Ferrum must detect the flow and offer to open it in the system browser, never work around it. Whether Google actually refuses sign-in in a Ferrum tab is UNVERIFIED[phase-p3-tabs-sessions], to be observed and not circumvented.

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
   - `http:` is first upgraded to HTTPS. If the upgrade fails, an interstitial warning is shown. The exact behaviour is open question Q-112.
   - Non-web schemes (`mailto:`, `ms-*:`, custom app protocols) need **explicit user confirmation** and are logged.
   - `file:`, `javascript:` (as a top-level navigation), `data:` (as a top-level navigation) and the app's own local origin are **denied in tabs**.
2. **Domain blocklist and allowlist** (master prompt §4 requires both; Q12 chose the default posture, it did not drop allowlists):
   - The **blocklist** is a local, owner-editable list with exact-host and domain-suffix rules (subdomain matching). Its default contents and source are open question Q-113.
   - The **allowlist** is a local, owner-editable list with the same rule syntax. It is used in two ways:
     - *Override:* an allowlist entry that is more specific than a matching blocklist rule wins (for example, allow `docs.example.com` while `example.com` and its subdomains are blocked). At equal specificity, block wins.
     - *Allowlist-only mode:* an optional mode, set globally or per profile, in which only allowlisted hosts may be navigated to and everything else is denied (this is option B, kept available as a configuration).
   - Default: open mode with an empty allowlist, per Q12. Every rule is re-evaluated on each redirect hop and for frames.
3. **Fail closed.** The security engine itself parses URLs. **Unparsable URLs are denied**, whatever Tauri's fail-open default does. Iframe navigations and external-scheme launches are intercepted through raw COM, `FrameNavigationStarting` and `LaunchingExternalUriScheme` ([ADR-0019](adr-0019-raw-webview2-com-boundary.md)). That this works on Tauri-created webviews is UNVERIFIED[phase-p4-security].
4. **Certificate errors are never bypassed.** There is no "proceed anyway" for TLS errors.
5. **Popups** (`on_new_window`) open as a new Ferrum tab under the same policy once tabs exist (P3). In P2, which has no tabs, they open in the same view or in the system browser, per configuration. They are never allowed as an uncontrolled native window.
6. **Downloads** are always routed through Ferrum's handler. The default destination is the user's Downloads folder, and executable file types need a confirmation prompt. The final policy is set in P4.
7. **Permissions** (camera, microphone, geolocation, notifications, clipboard read, …) are **denied by default, with per-site grants** stored in Ferrum settings, which are authoritative (`SavesInProfile(FALSE)` via raw COM). This matches `comp-security-engine` and `phase-p4-security` task p4.5. A grant is revocable.
8. **Google OAuth.** Ferrum detects Google OAuth flows (`accounts.google.com` authorization endpoints) and offers "Open in system browser". No user-agent spoofing or other workaround, ever.
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
- Pending owner answers ([ov-open-questions](../overview/ov-open-questions.md)): Q-109 (OAuth hand-off UX; p2.13 builds it), Q-112 (HTTP behaviour), Q-113 (blocklist source).
- Recommended defaults: Q-109: detect navigations to Google's OAuth authorization endpoints and show a bar offering to open the URL in the default browser, never spoof the user agent, and keep benchmark workloads free of Google logins. Q-112: always try HTTPS first; if that fails, show an interstitial with "Continue over HTTP (this time)" and an optional per-site remember toggle, each continue logged as a policy event. Q-113: a local owner-edited list that ships empty apart from the security-suite fixture domains; no third-party lists until their licences and update process are reviewed in a research note.
- `exp-security-overhead` measures policy-evaluation latency, separately from correctness tests (master prompt §7).

### Related risks and phases

- Risks: `risk-r03` (raw COM).
- Phases: `phase-p2-minimal-container`, `phase-p3-tabs-sessions`, `phase-p4-security`.

## Verification / evidence

- Owner answer Q12: [raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md).
- Hook semantics: [raw/research/tauri-webview2-capabilities.md](../raw/research/tauri-webview2-capabilities.md) §4, §8, §10.4.
- P4 evidence: the security test suite output (blocked domain, allowlist override of a blocklist suffix rule, allowlist-only mode denying a non-listed host, redirect bypass, malformed URL, external protocol, iframe navigation, local-origin navigation attempt, permission default deny) under `wiki/raw/evidence/phase-p4-security/`.
