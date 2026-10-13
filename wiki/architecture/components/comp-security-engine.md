---
id: comp-security-engine
type: component
title: "Security policy engine"
status: in-progress
updated: 2026-10-13
sources:
  - raw/00-master-prompt.md
  - raw/01-scoping-decisions.md
  - raw/research/tauri-webview2-capabilities.md
  - raw/owner/2026-10-13-s03-p4-questions.md
related: [ov-arch-trust-boundaries, ov-arch-data-flows, ov-arch-configuration, ov-arch-isolation-model, comp-webview-manager, comp-app-shell, comp-core, comp-telemetry, adr-0010, adr-0015, phase-p2-minimal-container, phase-p4-security, exp-security-overhead, risk-r07, risk-r10, risk-r19, qual-security-testing-plan]
approvable: true
path: crates/security/
crate: ferrum-security
trust_level: trusted
phase_introduced: phase-p2-minimal-container
shipped: true
unsafe_code: false
responsibilities:
  - "Domain allowlists and blocklists (suffix match), applied to every redirect hop and to frames (master prompt 4)"
  - "Permission management: default deny, per-site overrides (master prompt 4)"
  - "Navigation interception decisions with fail-closed URL parsing (master prompt 4)"
  - "External protocol handling: confirm or deny non-web schemes (master prompt 4)"
  - "Native API access restrictions: deny tab navigation to the app's local origin; static check that no capability is remote (master prompt 4)"
  - "Secure session configuration: isolation mode and site-to-profile mapping rules (master prompt 4)"
  - "Security audit logging of denied actions to audit.jsonl (master prompt 4)"
  - "Google OAuth detection and system-browser hand-off decision (never UA spoofing)"
interfaces:
  - "evaluate(&Policy, &Request{url, context: TopLevel | Redirect | Frame | NewWindow, initiator}) -> Decision (built in p4.2)"
  - "Decision{verdict: Allow | AllowInsecure | Upgrade(url) | Confirm | Deny, rule: RuleId (stable name for the audit log), matched: the settings entry that matched}"
  - "Policy{blocklist, allowlist: RuleList, allowlist_only, http: HttpPolicy, external: ExternalSchemes}; RuleList::parse refuses any bad entry"
  - "Planned (p4.5, p4.6): permission and download requests; OpenInSystemBrowser stays in comp-core oauth (P2)"
  - "site_key(url) -> SiteKey (registrable domain)"
  - "AuditLog::append(DeniedAction)"
connects:
  - to: comp-core
    label: "policy config and decision types"
    kind: rust-api
    crosses_trust_boundary: false
  - to: comp-telemetry
    label: "policy evaluation latency samples"
    kind: rust-api
    crosses_trust_boundary: false
---

# comp-security-engine

A **pure, synchronous, side-effect-free** policy evaluator (`#![forbid(unsafe_code)]`, no Tauri dependency). The only side effect is the append-only audit log. Hooks call it in `comp-webview-manager`. Keeping it pure means every master prompt §11 rule can be unit-tested and fuzzed without a WebView, and policy evaluation latency (exp-security-overhead) can be measured in isolation.

Evaluation order, defaults and the threat model: [ov-arch-trust-boundaries §5–6](../ov-arch-trust-boundaries.md).

## Phase plan

- phase-p2-minimal-container: minimal rule set as secure defaults (https/http policy, deny local-origin navigation for tabs, external links → confirm, no remote capability + CI check).
- phase-p4-security (M3): full engine (blocklist, permissions, downloads, schemes, frames, audit log, OAuth hand-off), security test suite, finalised threat model.

## Implementation status (P4)

**p4.2, navigation policy** ([crates/security/src/policy.rs](../../../crates/security/src/policy.rs),
[rules.rs](../../../crates/security/src/rules.rs)). Pure Rust: dependencies `ferrum-core` (the `HttpPolicy` and
`ExternalSchemes` settings types) and `url`; no files, network, unsafe code or Tauri.

- **Rules.** `example.com` blocks or allows the host and every subdomain; `=www.example.com` only that host; IP
  addresses are exact. Entries are normalised like URLs (case, trailing dot, `xn--` names, numeric IPv4), and an
  entry with a scheme, port, path, wildcard or user name is refused. An allow rule wins only when it is strictly
  more specific than the block rule that matched (more labels, or exact over suffix); equal specificity blocks.
- **Order.** Address read first (longer than 2 MiB, control characters or white space, or unparseable: deny);
  then the scheme (`about:blank`, `data:` in frames, `blob:` only from the origin that made it, `javascript:`,
  `file:`, browser pages and Ferrum's own origin denied, other schemes confirm or deny per settings); then
  blocklist, allowlist override and allowlist-only mode; then plain HTTP warn or upgrade (owner answer Q-112:
  warn).
- **Tests.** 19 table-driven unit tests and 5 randomised tests (4 properties x 4096 cases, plus a seed corpus):
  no panic, unparseable input always denied, a blocked host denied however the address is written. Coverage
  (cargo-llvm-cov): 100 percent of regions, functions and lines of the engine; LLVM branch coverage needs a nightly
  compiler and is not reported ([coverage report](../../raw/evidence/phase-p4-security/policy-coverage.txt)).

**p4.3, wired into every navigation** ([apps/desktop/src-tauri/src/policy.rs](../../../apps/desktop/src-tauri/src/policy.rs)).
The app builds one `Policy` from the settings and replaces it when the settings screen saves. It is asked:

- by the tab view's `NavigationStarting` gate for the page itself, and again for **each redirect hop** (context
  `Redirect`);
- by the new `FrameNavigationStarting` gate for **every frame** (context `Frame`; a refused frame is cancelled, the
  page stays);
- for **every new window** a page asks for, before the new-window setting applies (context `NewWindow`).

A refusal cancels the navigation, is logged (`ferrum::policy`, "navigation denied": tab, context, scheme and host,
rule name, matching list entry) and is noted on the tab's toolbar ("Blocked: host is on your blocked sites list"). A
link to another app is offered on the confirmation bar; an `http:` address under `http_policy = "upgrade"` is
cancelled and opened again as `https:`. The `blob:` check uses the tab's current page as the starter, also for frames
(a frame's own origin is not reported by WebView2), so a cross-origin frame cannot open its own `blob:` addresses. The
shell view has a stricter rule through Tauri's `on_navigation`: only Ferrum's own pages (threat T03). A typed address
the address bar refuses is logged with its reason only (never the typed text).

Settings (version 3): `[security] blocklist`, `allowlist`, `allowlist_only`; `http_policy` defaults to `warn`
(owner answer Q-112); a version-2 file that did not choose keeps `upgrade`. A bad rule refuses the whole file at start
(Ferrum runs with the standard settings, shows a note and does not overwrite the file) and refuses a save from the
settings screen. Tests: three app rule tests and the live test `security-navigation` (blocked host typed, after a 302
from an allowed page, in a frame and in a `window.open`; malformed address; each refusal in the log), check script
`scripts/verify/p4.3-check-every-navigation.ps1`.

Not done yet: the shell shows the "not secure" warning as the address-bar sign only, not yet as a bar (owner answer
Q-112 asks for a bar; planned with the security settings screen, p4.17). The audit log of refusals (p4.9) replaces
the plain log lines.
