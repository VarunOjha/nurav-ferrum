---
id: comp-security-engine
type: component
title: "Security policy engine"
status: in-progress
updated: 2026-10-19
sources:
  - raw/evidence/phase-p5-telemetry/check-p5.15.txt
  - raw/owner/2026-10-18-s08-q229-block-requests-fully.md
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
  - "evaluate_resource(&Policy, url) -> Option<Decision> (p5.15): Some(deny) for an http(s) request to a blocked host (unless a more specific allow entry overrides) or an unreadable http(s) address; None otherwise"
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

**p4.4, links to other apps.** Owner answer Q-224: any link type may be offered, always with the user's click. The
engine refuses four types without asking (`RISKY_SCHEMES`: `ms-appinstaller`, `ms-msdt`, `search-ms`, `ms-officecmd`;
each was used to make one click run or install something, sources in
[raw/research/p4-risky-uri-schemes.md](../../raw/research/p4-risky-uri-schemes.md); Claude's proposal, for the owner's
review) and, when the settings list `external_allowlist` is not empty, every type missing from it (rules
`external-risky`, `external-not-listed`). In the app every request to show the confirmation bar
(`external::request`: page links, links WebView2 hands over through `LaunchingExternalUriScheme`, typed addresses and
pop-ups) and the confirming click (`external_open_confirm`, checked again in case settings changed) pass the engine.
Tests: one engine test (coverage still 100 percent), one app test for the list's syntax, live spec `external-schemes`
(3 passed; launcher replaced by a test stand-in), check script `scripts/verify/p4.4-ask-before-opening.ps1`.

**p4.5, permissions** ([crates/security/src/permissions.rs](../../../crates/security/src/permissions.rs)). Every
permission kind WebView2 reports (camera, microphone, location, notifications, clipboard reading, sensors, automatic
downloads, file access, autoplay, local fonts, MIDI, window placement) is refused unless the page's site has a grant
in settings (`[[sites]] permissions`, compared by registrable domain like per-site profiles); `http:` and unreadable
pages never get one, and an unknown kind is refused. Rules `permission-granted`, `permission-not-granted`,
`permission-not-secure-site`, `permission-unknown-kind`. The app asks it from WebView2's `PermissionRequested`
(comp-webview-manager), logs every request (kind, scheme and host, rule) and notes refusals on the toolbar. Observed in
the live test: a frame's request reaches the page-level `PermissionRequested` and is refused there; the camera request
reached Ferrum on this PC. Tests: three engine tests (coverage still 100 percent), one settings test, one app test, live
spec `permissions` (4 passed), check script `scripts/verify/p4.5-permission-prompts.ps1`. The settings screen edits
the grants since p4.17 (below).

**p4.20, the permission question** ([adr-0034](../../decisions/adr-0034-permission-question-chrome-style.md), owner
answers Q-227 and Q-228). `Grants::decide(origin, kind, &PermissionContext { page, now, once })` returns a
`PermissionDecision { verdict, rule }` with verdict `Allow`, `Deny` or `Ask`. Order: unknown kind; not an `https:` site
(`permission-not-secure-site`); a reported site other than the tab page's (`permission-other-site-frame`); "never"
(`[[sites]] never`, `permission-never`); granted (`permission-granted`); the tab's this-time answers
(`permission-allowed-once`, `permission-blocked-once`); a kind outside the five asked kinds
(`PermissionKind::ASKED`: camera, microphone, geolocation, notifications, clipboard-read) is `permission-not-granted`;
a quiet site (`[[sites]] closed`, `permission-quiet`); otherwise `Ask` (`permission-ask`). Settings version 4 adds
`never` and `closed` (`ClosedQuestion { kind, count, quiet_until }`; 3 closes in a row give 7 quiet days); a kind cannot
be both allowed and never. Tests: six engine tests, one settings test, check script
`scripts/verify/p4.20-permission-question.ps1` ([check-p4.20](../../raw/evidence/phase-p4-security/check-p4.20.txt)).

**p4.6, downloads** ([crates/security/src/downloads.rs](../../../crates/security/src/downloads.rs)).
`clean_file_name` keeps only the last part of a site's file name and removes control, invisible and
direction-changing characters, replaces the characters Windows forbids with `_`, drops trailing dots and spaces, puts
`_` before device names (`CON`, `NUL`, `COM1`, ...) and shortens names over 200 characters, keeping the extension.
`is_program` recognises Ferrum's list of program types (`PROGRAM_EXTENSIONS`: executables, installers, scripts,
shortcuts, disk images and similar); the shell warns on such a download's line. The app saves only in the configured
folder (since p3.8) and has no code that opens a download. Observed in the p4.6 live test (local test server only):
WebView2 had already cleaned the names it suggested (`_.._escape-attempt.txt`, `photo_gpj.exe`, `_CON.txt`), so this
cleaning is a second layer; the saved `setup.exe` had no "downloaded from the internet" mark (Zone.Identifier stream);
whether downloads from real websites get that mark was not tested. Tests: three engine tests (coverage still 100
percent), live spec `safe-downloads` (4 passed), check script `scripts/verify/p4.6-safe-downloads.ps1`.

**p4.9, security audit log** ([apps/desktop/src-tauri/src/audit.rs](../../../apps/desktop/src-tauri/src/audit.rs)).
The engine stays pure; the app writes one JSON line per refusal to `audit.jsonl` next to `ferrum.jsonl`: `time` (UTC,
milliseconds), `tab` (0 when none), `origin` (scheme and host only; `(typed)` for the address bar), `action` (`page`,
`redirect`, `frame`, `new-window`, `permission-<kind>`, `address-bar`, `shell`, `download`, `link-to-app-confirm`),
`rule` (the engine's rule name, or `pop-up-rate-limit`, `typed-*`, `shell-app-only`, `no-download-folder`,
`not-the-link-asked-about`) and `decision` (`deny`). Nothing else: no path, query, fragment, typed text or page
content. At 1 MB the file is rotated (three older files kept). Tests: three unit tests; the live security tests of
p4.3, p4.4, p4.5 and p4.8 now also require their audit line, every line passes a schema check, and spec `audit-log`
checks that a secret in an address or in typed text never reaches the file
([check-p4.9](../../raw/evidence/phase-p4-security/check-p4.9.txt)). Found during p4.9 (older shell race, P3): when a page
finished, or was refused, before the address bar's command replied, the reply cleared the toolbar note ("HTTP 404",
"Blocked …"); the shell now clears it only when no page event came in meanwhile (affected tests 3 of 3 clean after the
fix; the redirect test prints the shell's event order if it ever fails again).

**p4.16, benchmark-only ablation build** (cfg-ferrum-nosecurity-bench, for exp-security-overhead). Cargo feature
`bench-nosecurity` on this crate (forwarded by ferrum-desktop's feature of the same name). With it, `evaluate` lets
every web address (`http`, `https`, `about`, `data`, `blob`) load with rule `bench-nosecurity-ablation-rule`, without
the blocklist, allowlist, HTTP policy or address rules; an address that cannot be read follows the normal rules. Kept
on even in this build, narrower than the phase page's "every policy decision returns allow" on purpose (told to the
owner in chat on 2026-10-14): Ferrum's own origin (`tauri:`, `http(s)://tauri.localhost`), the forbidden schemes (local files, `javascript:`, browser pages) and links to other apps (still confirmed or refused) keep their rules, and permission refusals and download cleaning are unchanged. `is_bench_nosecurity()` says which build this is. The rule variant and its name
exist only in the ablation build, so their text is a marker: `scripts/security-static-check.ps1` proves the normal
release program has the feature off (cargo tree) and contains none of the markers, while an ablation build made as a
positive control contains all of them ([nosecurity-absent](../../raw/evidence/phase-p4-security/nosecurity-absent.txt),
[check-p4.16](../../raw/evidence/phase-p4-security/check-p4.16.txt)); CI runs it after the release build. Tests: one in the normal build, two
with the feature (`tests/bench_nosecurity.rs`; the other tests expect the normal rules and are not run with it).

**p4.17, the settings screen edits the engine's lists**: blocked sites and per-site grants are edited in the shell's
settings screen; every blocked-site line goes through `HostRule::parse` before it is saved, and the saved settings
rebuild the policy at once (comp-app-shell; [check-p4.17](../../raw/evidence/phase-p4-security/check-p4.17.txt)). The "not secure" bar for plain
HTTP (owner answer Q-112) is built there too. The audit log of refusals (p4.9) replaces the plain log lines.

## Implementation status (P5)

**p5.15, requests to blocked sites are never sent** (owner answer Q-229, after the p5.9 finding that a refused typed
address still reached the server): `evaluate_resource` decides each network request of a tab before it goes out,
for the page, its frames and everything they load (images, scripts, fetches, workers). Only `https:` and `http:` are
decided: a blocked host is refused, as for navigations a more specific allowlist entry overrides, and an unreadable
web address is refused (fail closed); `data:`, `blob:` and Ferrum's own addresses are left to `evaluate`. The
allowlist-only mode does not apply here (it limits which pages open, not what an allowed page loads). The tab views
call it from WebView2's request event (comp-webview-manager) with the policy in effect, so a settings change applies
at once; each refusal is an audit record (action `request`, rule `blocklist`) and, when on, a network-log record.
Tests: `crates/security/tests/resource_requests.rs` (4: blocked hosts in every spelling, allow override,
allowlist-only not applied, other schemes passed, unreadable addresses refused, random paths and inputs). Live
([check-p5.15](../../raw/evidence/phase-p5-telemetry/check-p5.15.txt)): with 127.0.0.1 blocked, a typed address, a link, a redirect, a frame, an image and a fetch
each left the test server's request counter untouched, and an allowed fetch was counted; with the filter switched
off in a debug-only test mode, the typed attempt reached the server again (the control). Cost, rough ([block-requests-cost-p5.15.json](../../raw/evidence/phase-p5-telemetry/block-requests-cost-p5.15.json)): the `/netlog` page (six requests) loaded 30 times with the filter on, then 30 times with it off: median load 51.6 against 81.9 ms (an unsaved development run just before: 61.2 against 69.2 ms). The order was fixed (on first) and the spread between runs is larger than any difference, so no cost is claimed. The test switch skips only the decision: the request event stays registered in both runs, so the cost of registering it is not measured here (P6 measures Ferrum with and without its security rules, exp-security-overhead).
