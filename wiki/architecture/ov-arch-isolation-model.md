---
id: ov-arch-isolation-model
type: overview
title: "Architecture: isolation model (WebView2 profiles in a shared browser process)"
status: review
updated: 2026-10-14
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
unverified: []
---

# Isolation model

Owner decision Q7 / adr-0010: **default site isolation = WebView2 profiles in a shared browser process** ([scoping](../raw/01-scoping-decisions.md)). Master prompt §5 Phase 3 asks Ferrum to *"Document precisely which resources remain shared"* and *"not claim complete process or security isolation without validating it"*. This page is the planning version of that document. Every "shared/separate" cell is VERIFIED from a research note, labelled DERIVED, or carries an unverified tag naming the phase that verifies it.

## 1. Isolation modes (runtime config `isolation.mode`)

| Mode | Mechanism | Browser process | Storage | Availability |
|---|---|---|---|---|
| `shared` | All tabs in the default profile of one UDF | shared | **shared** across all sites (and with the shell) | Built (P2) |
| `per-site` (**default, Q7**; called `per-site-profile` in early plans) | One named WebView2 profile per site, one UDF | shared | per profile: cookies, preferences, cache (VERIFIED) | Built (p3.6, adr-0029) |
| `per-site-udf` | One UDF per site, with its own WebView2 environment made by Ferrum | **separate process group per UDF** (VERIFIED; observed in p4.15) | separate | Built (p4.15). Higher memory per Microsoft docs; not the default (Q7) |
| `private` (per tab, not a mode) | `IsInPrivateModeEnabled` per controller (VERIFIED) | shared | ephemeral | Built (p4.7) |

The mode is a **runtime** setting read at start (a change applies after a restart), so exp-isolation-overhead can compare
the modes on one binary. The three modes were run on the same two-site test in p4.15 ([check-p4.15](../raw/evidence/phase-p4-security/check-p4.15.txt)):
each site's cookie, localStorage and IndexedDB stayed with that site in every mode; a site moved to another named
profile saw an empty store under `per-site` and `per-site-udf` and its own data under `shared` (named profiles do not
apply there). No mode was found infeasible.

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
| GPU process | **Shared**: one GPU process served the shell and tabs in three profiles | OBSERVED in P4 (p4.7 process inventory, [check-p4.7](../raw/evidence/phase-p4-security/check-p4.7.txt)) |
| Utility processes (network service and other services) | **Shared**: two utility processes served every profile. WebView2's process list does not say which service each one runs | OBSERVED in P4 (p4.7, [check-p4.7](../raw/evidence/phase-p4-security/check-p4.7.txt)) |
| Audio service, crash reporting | Not seen: no page played sound, and crash reporting is not a process kind WebView2 lists. Ferrum treats them as shared | Not tested (P4) |
| Renderer processes | Shared **across WebViews on a UDF** (VERIFIED). In P4 each site's page ran in its own renderer (site A, site B, the empty tab and the shell: four renderers, none hosting two of them). Chromium also puts different sites in different renderers inside one profile, so this shows that no renderer was shared, not that profiles cause it | OBSERVED in P4 (p4.7, [check-p4.7](../raw/evidence/phase-p4-security/check-p4.7.txt)) |
| Cookies, preferences, HTTP cache | **Separate** per profile | VERIFIED (multi-profile doc). Cookies observed in P3 (p3.6): a site's cookie set in its own tab was not sent by the same site framed in another site's tab; with one shared profile it was ([check-p3.6](../raw/evidence/phase-p3-tabs-sessions/check-p3.6.txt)) |
| localStorage, IndexedDB | **Separate** per profile: the same site in another profile saw none of its cookie, localStorage or IndexedDB values, and saw them again back in its own profile; clearing one site's profile left another site's data intact | OBSERVED in P4 (p4.7 live test, [check-p4.7](../raw/evidence/phase-p4-security/check-p4.7.txt)) |
| Service workers | Not tested in P4 | Not tested |
| Permission grants | Ferrum keeps none in any profile: every request is answered by Ferrum and WebView2 is told not to save it (p4.5) | OBSERVED in P4 ([check-p4.5](../raw/evidence/phase-p4-security/check-p4.5.txt)) |
| HSTS, DNS cache, socket pools, client cert choices | Not tested in P4. They belong to the network service, which is one shared process (row above), so Ferrum treats them as shared | DERIVED from the observed shared utility processes; not tested |
| InPrivate (private tabs) | A private tab (profile `ferrum-private`, InPrivate) saw no data of the same site's normal profile, and its own data was gone after the last private tab closed | OBSERVED in P4 (p4.7, [check-p4.7](../raw/evidence/phase-p4-security/check-p4.7.txt)) |
| Environment options (browser args, extensions, proxy, language) | **Must be identical** for all WebViews on the UDF | VERIFIED (otherwise creation fails with `ERROR_INVALID_STATE`) |
| Remote debugging port (benchmark runs) | **Shared**: one port serves the whole UDF | Flag is environment-level: VERIFIED (Tauri note §7). Observed in P3 (p3.6 smoke tests): one debugging port listed the shell and tab views of several profiles (`ferrum-default`, `site-site-a.localhost`, `site-site-b.localhost`, `user-work`) as pages ([check-p3.6](../raw/evidence/phase-p3-tabs-sessions/check-p3.6.txt)) |
| Runtime binaries (Evergreen) | **May share** mapped image pages with Edge, on eligible systems when versions match | Hard-linking on eligible systems when versions match: VERIFIED ([measurement note §6.2](../raw/research/measurement-methodology.md)); page sharing is DERIVED from it ("may share") |
| Ferrum host process (Rust) | Shared | by design |

## 3a. What `per-site-udf` separates (p4.15, observed)

| Resource | Under `per-site-udf` | Basis |
|---|---|---|
| Browser, GPU and utility processes | **Separate per site**: with two sites open, three environments (the shell's and one per site), each with one browser, one GPU and two utility processes (3, 3 and 6 in all) | OBSERVED in p4.15 ([isolation-modes](../raw/evidence/phase-p4-security/isolation-modes.md)) |
| User data folder | One per site profile, `<data folder>/udf/<profile>`; two sites given the same named profile share one; empty and private tabs stay in the shell's folder | OBSERVED (folders checked in the p4.15 test) |
| Renderers | Each site's page in its own renderer, in its own environment | OBSERVED in p4.15 |
| Environment options | Copied from the shell's environment, so they are the same in all three modes (including wry's default switches: SmartScreen off, autoplay allowed; Q-225) | By construction (code), not a test |
| Browser process lifetime | A site's browser ended by itself when its last tab closed; opening the site again started a new one | OBSERVED in p4.15 (app log) |
| Start-up of a site's browser | About 0.5 s when no other site browser ran, about 5 s when one did, in the test setup (two runs, from the app log; cause not found) | OBSERVED, not measured (P6) |
| Remote debugging port | Every site browser gets the same switch from the test environment; the tests read site pages through their titles and do not rely on the port for them. Whether the site browsers opened it was not checked | Not tested |
| Ferrum host process, runtime binaries | Shared, as in the other modes | by design / §3 |

## 4. Consequences for measurement (risk-r05)

- Profiles share the UDF's process group, so **memory cannot be split per profile or per tab by PID** (measurement note §2.2). Per-tab numbers, where reported, are labelled "renderer(s) hosting this tab's frames" (via `GetProcessExtendedInfos` associated frames) and are **never summed** to a total.
- exp-isolation-overhead compares modes on the **whole-tree** private commit, measured by the harness.

## 5. Verification plan (phase-p4-security)

1. **Process inventory per mode.** Enumerate processes via `GetProcessExtendedInfos` plus an ETW/Job cross-check, and record process kinds (shared vs per-profile).
2. **Storage isolation fixtures.** Site A sets cookie/localStorage/IndexedDB values. Site B in another profile must not read them (master prompt §11 "Session data isolation").
3. **Cross-site navigation re-host test.** The profile switches; no state carries over.
4. Each row tagged as unverified for P4 above becomes VERIFIED or is corrected, with evidence under `wiki/raw/evidence/phase-p4-security/`.
   Done in P4 (p4.7): every such row is now observed, derived (said so) or "not tested" ([check-p4.7](../raw/evidence/phase-p4-security/check-p4.7.txt)).
