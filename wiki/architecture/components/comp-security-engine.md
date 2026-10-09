---
id: comp-security-engine
type: component
title: "Security policy engine"
status: planned
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/01-scoping-decisions.md
  - raw/research/tauri-webview2-capabilities.md
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
  - "evaluate(Request) -> Decision where Request = Navigation | FrameNavigation | NewWindow | Download | Permission | ExternalScheme"
  - "Decision = Allow | Deny{rule_id} | Confirm{reason} | Upgrade{url} | OpenInSystemBrowser"
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
