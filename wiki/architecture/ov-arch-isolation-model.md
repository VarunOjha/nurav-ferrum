---
id: ov-arch-isolation-model
type: overview
title: "Architecture: isolation model (WebView2 profiles in a shared browser process)"
status: review
updated: 2026-10-12
sources:
  - raw/research/p3-profiles-psl.md
  - raw/owner/2026-10-12-s02-p3-questions.md
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
  - claim: "Audio service and crashpad processes are shared across profiles on one UDF"
    verify_in: phase-p4-security
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

- **Site key** = registrable domain (eTLD+1) of the top-level URL (owner answer Q-111, "main domain",
  [raw/owner/2026-10-12-s02-p3-questions.md](../raw/owner/2026-10-12-s02-p3-questions.md)). Built in P3 (p3.6) with the
  `psl` crate 2.1.241, which compiles the Public Suffix List in; maintained and released every few days (VERIFIED,
  [p3-profiles-psl](../raw/research/p3-profiles-psl.md) R1). A host that is itself a suffix (`localhost`) and an IP
  address are their own site. `ferrum_core::profiles::site_key`.
- **Profile name** = `site-<site key>` (for example `site-example.com`), or `site-h-<24 hex digits of its SHA-256>`
  when that breaks WebView2's rules (VERIFIED limits: at most 64 characters, letters, digits and `# @ $ ( ) + - _ ~ .`
  and space, not ending in a period or space, case-insensitive; [p3-profiles-psl](../raw/research/p3-profiles-psl.md)
  R2). Named profiles from the settings (`[[sites]] profile = "work"`) become `user-<label>`; sites given the same label
  share it (for example two domains of one sign-in system). The name follows from the site and the settings, so no
  `profiles.json` mapping file is needed. Tabs with no site yet (an empty tab) use the profile `ferrum-default`, which
  is also the one profile of `[isolation] mode = "shared"`.
- **Creation-time binding.** A tab's profile is fixed when its WebView is created (VERIFIED: no API found to change a live controller's profile).
- **Cross-site top-level navigation inside a tab.** Owner answer Q-209 (2026-10-12): ask first, then **re-host**.
  Built in P3 (p3.6): when a page in a tab leads to an address whose profile differs from the tab's, the navigation is
  stopped and the shell's bar asks "Open <site> in its own profile? This tab's back history will be lost."; Continue
  closes the tab's view and creates one in the target profile at that address (same tab); Cancel keeps the tab where it
  was. Without asking: an empty tab (no site yet) moves at once; an address typed in the address bar moves (the user
  chose it); a new tab opens in its own site's profile. **Gap, recorded for P4:** a redirect stays in the tab's current
  profile (the server chose it, and moving mid-redirect would break sign-in flows), so a page reached by a cross-site
  redirect runs in the first site's profile until the user navigates again.
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
| Cookies, preferences, HTTP cache | **Separate** per profile | VERIFIED (multi-profile doc). Cookies observed in P3 (p3.6): a site's cookie set in its own tab was not sent by the same site framed in another site's tab; with one shared profile it was ([check-p3.6](../raw/evidence/phase-p3-tabs-sessions/check-p3.6.txt)) |
| localStorage, IndexedDB, service workers, permission grants | Expected separate | UNVERIFIED[phase-p4-security] |
| HSTS, DNS cache, socket pools, client cert choices | Unknown | UNVERIFIED[phase-p4-security] |
| Environment options (browser args, extensions, proxy, language) | **Must be identical** for all WebViews on the UDF | VERIFIED (otherwise creation fails with `ERROR_INVALID_STATE`) |
| Remote debugging port (benchmark runs) | **Shared**: one port serves the whole UDF | Flag is environment-level: VERIFIED (Tauri note §7). Observed in P3 (p3.6 smoke tests): one debugging port listed the shell and tab views of several profiles (`ferrum-default`, `site-site-a.localhost`, `site-site-b.localhost`, `user-work`) as pages ([check-p3.6](../raw/evidence/phase-p3-tabs-sessions/check-p3.6.txt)) |
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
