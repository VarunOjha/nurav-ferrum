---
id: ov-arch-isolation-model
type: overview
title: "Architecture: isolation model (WebView2 profiles in a shared browser process)"
status: review
updated: 2026-10-08
sources:
  - raw/01-scoping-decisions.md
  - raw/research/tauri-webview2-capabilities.md
  - raw/research/measurement-methodology.md
  - raw/00-master-prompt.md
related: [ov-arch-trust-boundaries, ov-arch-webview2-integration, ov-arch-configuration, comp-webview-manager, comp-webview2-runtime, comp-tab-content, comp-security-engine, adr-0010, risk-r01, risk-r05, phase-p3-tabs-sessions, phase-p4-security, exp-isolation-overhead, risk-r09, phase-p5-telemetry]
approvable: true
audience: both
phase: phase-p0-planning
tags: [isolation, profiles, webview2]
unverified:
  - claim: "The network service process is shared across all profiles on one UDF"
    verify_in: phase-p4-security
  - claim: "Renderer processes are never shared between different WebView2 profiles"
    verify_in: phase-p4-security
  - claim: "localStorage, IndexedDB, service workers and permissions are partitioned per profile"
    verify_in: phase-p4-security
  - claim: "HSTS state, DNS cache, socket pools and client-certificate selections are shared or partitioned across profiles"
    verify_in: phase-p4-security
  - claim: "A maintained Rust public-suffix-list crate is available for registrable-domain computation"
    verify_in: phase-p4-security
  - claim: "Audio service and crashpad processes are shared across profiles on one UDF"
    verify_in: phase-p4-security
  - claim: "The remote debugging port exposes every profile's tab WebViews and the shell WebView as CDP targets"
    verify_in: phase-p5-telemetry
  - claim: "WebView2 profile names have length or character-set limits that a 'site-' + 32-hex name satisfies"
    verify_in: phase-p3-tabs-sessions
---

# Isolation model

Owner decision Q7 / adr-0010: **default site isolation = WebView2 profiles in a shared browser process** ([scoping](../raw/01-scoping-decisions.md)). Master prompt §5 Phase 3 asks Ferrum to *"Document precisely which resources remain shared"* and *"not claim complete process or security isolation without validating it"*. This page is the planning version of that document. Every "shared/separate" cell is VERIFIED from a research note, labelled DERIVED, or carries an unverified tag naming the phase that verifies it.

## 1. Isolation modes (runtime config `isolation.mode`)

| Mode | Mechanism | Browser process | Storage | Availability |
|---|---|---|---|---|
| `shared` | All tabs in the default profile of one UDF | shared | **shared** across all sites (and with the shell) | Stock Tauri today (VERIFIED APIs) |
| `per-site-profile` (**target, Q7**) | One named WebView2 profile per site, one UDF | shared | per profile: cookies, preferences, cache (VERIFIED) | Needs a profile-capable tab backend (risk-r01; [integration §3](ov-arch-webview2-integration.md)) |
| `per-site-udf` | One UDF per site (`data_directory`) | **separate process group per UDF** (VERIFIED) | separate | Works today (VERIFIED). Higher memory per Microsoft docs; contradicts Q7 |
| `private` (per tab) | `incognito` = `IsInPrivateModeEnabled` per controller (VERIFIED) | shared | ephemeral | Works today (VERIFIED) |

The mode is a **runtime** switch, so exp-isolation-overhead can compare the modes on one binary.

## 2. Site → profile assignment (`per-site-profile`)

- **Site key** = registrable domain (eTLD+1) of the top-level URL. That needs a Public Suffix List implementation, and crate selection is UNVERIFIED[phase-p4-security].
- **Profile name** = `site-` + a stable hash of the site key (any WebView2 profile-name length or character-set limits are UNVERIFIED[phase-p3-tabs-sessions]; a 32-hex form follows Tauri PR #16054, Tauri note §6). A mapping file `profiles.json` (site key ↔ profile name) lives in the app data dir.
- **Creation-time binding.** A tab's profile is fixed when its WebView is created (VERIFIED: no API found to change a live controller's profile).
- **Cross-site top-level navigation inside a tab.** PROPOSAL, owner to confirm: when a top-level navigation leaves the tab's site, `webview-manager` **re-hosts** the tab. It closes the WebView and creates a new one in the target site's profile at the target URL. Back/forward history before the switch is lost, and the shell keeps a Ferrum-side URL history so the user can still go back. Alternatives: (a) keep the original profile, so data lands in the wrong profile and isolation is broken; (b) block cross-site navigation, which hurts usability. Redirect chains during OAuth/SSO make this hard, so it needs a P3/P4 prototype.
- **The shell WebView** is created by Tauri, so it lives in the **default** profile. Tabs never use the default profile in `per-site-profile` mode, and the shell keeps no web storage (trust-boundaries rule R9).

## 3. What remains shared (planning matrix)

Applies to `per-site-profile` mode: one UDF, many profiles.

| Resource | Shared across profiles? | Basis |
|---|---|---|
| Browser process (`msedgewebview2.exe` main) | **Shared** | VERIFIED: profiles share one UDF and one browser process (multi-profile doc, Tauri note §6) |
| GPU process | **Expected shared**: one per process group, and the group is tied to the UDF | DERIVED (not verified) from VERIFIED process-model text ([measurement note §2.2](../raw/research/measurement-methodology.md)); confirm empirically in P4 |
| Network service / utility processes | Probably shared | UNVERIFIED[phase-p4-security] |
| Audio service, crashpad | Probably shared | UNVERIFIED[phase-p4-security] |
| Renderer processes | Shared **across WebViews on a UDF** (VERIFIED). Not shared **across profiles** | UNVERIFIED[phase-p4-security] |
| Cookies, preferences, HTTP cache | **Separate** per profile | VERIFIED (multi-profile doc) |
| localStorage, IndexedDB, service workers, permission grants | Expected separate | UNVERIFIED[phase-p4-security] |
| HSTS, DNS cache, socket pools, client cert choices | Unknown | UNVERIFIED[phase-p4-security] |
| Environment options (browser args, extensions, proxy, language) | **Must be identical** for all WebViews on the UDF | VERIFIED (otherwise creation fails with `ERROR_INVALID_STATE`) |
| Remote debugging port (benchmark runs) | **Expected shared**: the flag is environment-level, so one port serves the whole UDF | Flag is environment-level: VERIFIED (Tauri note §7). Whether all profiles and the shell are exposed as CDP targets: UNVERIFIED[phase-p5-telemetry] (Tauri note §7 marks CDP target mapping UNCERTAIN) |
| Runtime binaries (Evergreen) | **May share** mapped image pages with Edge, on eligible systems when versions match | Hard-linking on eligible systems when versions match: VERIFIED ([measurement note §6.2](../raw/research/measurement-methodology.md)); page sharing is DERIVED from it ("may share") |
| Ferrum host process (Rust) | Shared | by design |

## 4. Consequences for measurement (risk-r05)

- Profiles share the UDF's process group, so **memory cannot be split per profile or per tab by PID** (measurement note §2.2). Per-tab numbers, where reported, are labelled "renderer(s) hosting this tab's frames" (via `GetProcessExtendedInfos` associated frames) and are **never summed** to a total.
- exp-isolation-overhead compares modes on the **whole-tree** private commit, measured by the harness.

## 5. Verification plan (phase-p4-security)

1. **Process inventory per mode.** Enumerate processes via `GetProcessExtendedInfos` plus an ETW/Job cross-check, and record process kinds (shared vs per-profile).
2. **Storage isolation fixtures.** Site A sets cookie/localStorage/IndexedDB values. Site B in another profile must not read them (master prompt §11 "Session data isolation").
3. **Cross-site navigation re-host test.** The profile switches; no state carries over.
4. Each row tagged UNVERIFIED[phase-p4-security] above becomes VERIFIED or is corrected, with evidence under `wiki/raw/evidence/phase-p4-security/`.
