---
id: phase-p3-tabs-sessions
type: phase
title: "P3 Tabs and sessions (Milestone M2): multi-tab, session restore, per-site settings"
status: done
updated: 2026-10-19
sources:
  - raw/00-master-prompt.md
  - raw/01-scoping-decisions.md
  - raw/research/tauri-webview2-capabilities.md
  - raw/research/measurement-methodology.md
  - raw/owner/2026-10-12-s02-p3-questions.md
  - raw/owner/2026-10-12-s02-p2-checklist-and-p3-autoapproval.md
  - raw/owner/2026-10-12-s02-feature-set-request.md
  - raw/owner/2026-10-12-s02-feature-set-design-answers.md
  - raw/owner/2026-10-12-s02-feature-set-design-pick.md
related: [phase-p2-minimal-container, phase-p4-security, ov-open-questions, comp-app-shell, comp-webview-manager, comp-core, risk-r01, risk-r02, adr-0007, adr-0010, adr-0028, adr-0032, adr-0033]
approvable: true
phase: phase-p3-tabs-sessions
tags: [milestone-m2, tabs, sessions, profiles, downloads, feature-set-bookmarks]
milestone: M2
order: 3
depends_on: [phase-p2-minimal-container]
est_sessions: 5
entry_criteria:
  - "phase-p2-minimal-container has status done and key phase-p2-minimal-container#exit is APPROVED."
  - "Owner approval recorded and not stale in plan/approvals.json for the P3 dependency set: schema, phase-p3-tabs-sessions, every ADR in decisions (plus the p1.9 profile-route ADR), every component in components."
  - "No open Q-NNN blocks any id in the dependency set."
deliverables:
  - "Tab manager: create, close, switch, reorder; one untrusted child WebView per tab."
  - "Keyboard shortcuts for tab and navigation actions."
  - "Configurable startup websites and persistent settings (versioned settings file)."
  - "Session restoration after normal exit and after a crash."
  - "Per-site settings, including the per-site profile assignment chosen in p1.9."
  - "Per-tab navigation history and a local, clearable global history."
  - "Basic download management."
  - "Shell remains responsive while a tab runs CPU-heavy script."
  - "Settings interface in the trusted shell (startup sites, per-site settings, download folder) and a sidebar (open tabs, history)."
  - "Integration tests for tabs, sessions, settings and downloads."
  - "New small feature set (added 2026-10-12, owner request): bookmarks; search of the past (history and bookmarks) from the address bar; a manual, passphrase-encrypted backup file to move bookmarks and history to another Ferrum (adr-0032); a refreshed look and logo chosen by the owner on a design canvas."
tasks:
  - id: p3.1
    title: "core crate: tab model as pure Rust (ids, order, active tab, create/close/switch/move, closed-tab stack)"
    verify: "Unit tests plus randomised operation-sequence tests assert invariants: exactly one active tab when at least one exists; ids never reused; closing the active tab activates a neighbour."
  - id: p3.2
    title: "webview-manager: one child WebView per tab, created only from async contexts (Windows deadlock note), hidden/shown on switch, laid out on resize, fully closed and handlers released on tab close"
    verify: "Integration test opens 20 tabs, switches through all, closes all; WebView count returns to zero and no WebView2 process belonging to a closed profile remains (checked with the process-info API used in spike S3)."
  - id: p3.3
    title: "Shell tab strip UI under the normal Windows title bar (Q-125) and keyboard shortcuts (new tab, close tab, next/previous tab, focus address bar, back/forward, reload) that work when focus is inside tab content without giving remote pages IPC access"
    verify: "Smoke tests send each shortcut with focus in the shell and with focus in a tab; the action happens; the p2.3 IPC denial test still passes."
  - id: p3.4
    title: "Persistent settings and configurable startup websites: versioned settings file in the app config folder, atomic write, schema migration from version 1"
    verify: "Unit tests: round trip, unknown future version refused with a clear error, corrupted file falls back to defaults and keeps a backup; integration test: startup sites open in order."
  - id: p3.5
    title: "Session restoration: tab list (URL, order, active, profile, history position) persisted periodically and on exit with atomic write; restored on start"
    verify: "Integration tests: normal exit then restart restores tabs; forced process kill then restart restores the last persisted state; restore of a tab whose site is now unreachable shows the error state, not a crash."
  - id: p3.6
    title: "Per-site settings including profile assignment via the p1.9 route (adr-0029); site key = registrable domain (Q-111); a top-level navigation to another site asks first, then moves the tab to that site's profile, losing its back history, which the bar says (Q-209)"
    verify: "Integration test: two fixture sites mapped to different profiles do not see each other's cookies; same site in two tabs shares one profile; subdomains of one registrable domain share a profile; a cross-site navigation shows the confirmation bar, Cancel keeps the tab, Confirm re-hosts it in the other profile; settings survive restart."
  - id: p3.7
    title: "Navigation history: per-tab back/forward state in the shell; local global history list, clearable, never stored in the repo"
    verify: "Unit tests on the history store; smoke test: clearing history empties the list and the file."
  - id: p3.8
    title: "Basic downloads via on_download: default Downloads folder or prompt, progress, completion and failure states in the shell"
    verify: "Integration test downloads a fixture file and checks size and hash; failure fixture shows the error state."
  - id: p3.9
    title: "Shell responsiveness under a CPU-heavy tab"
    verify: "Smoke test: with a busy-loop fixture in tab A, switching to tab B and typing in the address bar completes within the test timeout defined in the test (a requirement threshold, not a measurement result); result recorded."
  - id: p3.10
    title: "Deadlock regression guard: tab creation is never reachable from a synchronous command or event handler"
    verify: "Code review checklist item plus a test that creates tabs from the shell's command path in a loop without hanging (test timeout)."
  - id: p3.14
    title: "Settings interface in the trusted shell WebView (master prompt section 4): startup sites, per-site settings including profile assignment, download folder; reads and edits configuration only through host commands that validate input and write via the p3.4 atomic settings store"
    verify: "Integration test drives the settings UI host commands to change startup sites, a per-site setting and the download folder, restarts, and asserts the changes persisted and took effect; invalid input (non-existent folder, unparseable URL) is rejected with an error and leaves the file unchanged; the p2.3 IPC denial test shows remote tabs cannot invoke the settings commands; shell unit tests cover the settings view."
  - id: p3.15
    title: "Sidebar in the trusted shell (master prompt section 4): collapsible panel listing open tabs and history, laid out beside the tab content area so it never overlaps child WebView bounds (z-order constraint, issue 15682)"
    verify: "Smoke test toggles the sidebar and asserts the active tab's WebView bounds shrink and grow so the two never overlap; selecting a tab or history entry in the sidebar activates or navigates it; keyboard toggle works with focus in a tab; shell unit tests cover the sidebar component."
  - id: p3.16
    title: "Owner review round 1 fixes (raw/owner/2026-10-12-s02-p3-review-round-1.md): a tab that turns into a download shows no error panel and, if it never showed a page, closes when the download ends; site icons (favicons) in the tab strip and sidebar; a clearly visible app icon; Ferrum findable in Task Manager"
    verify: "Shell unit tests cover the icon and page rules; smoke tests: a download opened in a new window completes, its extra tab closes and no error panel shows; a page's own icon appears in its tab, a page without one shows none; the program file carries the new icon (orange, not the old dark square)."
  - id: p3.17
    title: "Feature set, design: Claude asks the owner the design questions one at a time (feel, light and dark, address-bar suggestions, bookmarks placement, new-tab page, logo), shows options on a Claude design canvas, the owner picks; the choice is recorded as an ADR and a frozen copy of the chosen design"
    verify: "Owner's answers and choice transcribed in raw/owner/; the chosen design frozen under raw/evidence/phase-p3-tabs-sessions/design/; a look ADR records the choice; no application code changes."
  - id: p3.18
    title: "Feature set, store (adr-0032): one SQLite file (ferrum.db, rusqlite with bundled SQLite) for history and bookmarks with a text index on titles and addresses; history.json imported once and kept as history.json.imported; limit 50 000 entries; Clear history empties tables and index and compacts the file"
    verify: "Unit tests: import from a sample history.json, round trip, search by title and address words, oldest entries dropped past the limit, Clear history leaves no entry in tables, index or file text, non-http(s) bookmark refused; cargo deny passes with the new crate; the p3.7 smoke test (clear empties the list) still passes."
  - id: p3.19
    title: "Feature set, bookmarks: a star in the address bar adds or edits the page's bookmark; bookmarks listed where the design puts them (sidebar section and/or a bar), with rename, move and delete; host commands only for the trusted shell"
    verify: "Smoke tests: star a page, it appears in the list; rename and delete work; a bookmark opens its page; bookmarks survive a restart; the p2.3 IPC denial test shows remote pages cannot call the bookmark commands."
  - id: p3.20
    title: "Feature set, address-bar search of the past: as the owner types, suggestions from bookmarks, history and open tabs (best matches first), keyboard first (arrows, Enter, Esc, remove an entry); the list is never hidden under the page view (z-order constraint, issue 15682): the approach is chosen in the task, either moving the page view while the list is open or a separate suggestion window"
    verify: "Smoke tests: typing part of a visited title shows it; arrow keys and Enter open it; Esc closes the list; the list's area and the page view never overlap while it is open; an open tab is offered as switch-to-tab; shell unit tests cover ranking."
  - id: p3.21
    title: "Feature set, backup (adr-0032): Export writes one passphrase-encrypted .ferrum-backup file (bookmarks and history, format version); Import asks for the passphrase, shows what is inside, then merge or replace (replace keeps a dated copy of ferrum.db first); cookies, logins and site data are never included"
    verify: "Unit tests: round trip; wrong passphrase, a changed byte and a truncated file are each refused with nothing changed; a javascript: bookmark inside a backup is dropped; size limit enforced; smoke test: export from one data folder, import into a fresh one, bookmarks and history match; the passphrase appears in no log."
  - id: p3.22
    title: "Feature set, look and logo (adr-0033): the Graphite look in light and dark following Windows, built as a theme of named design tokens so more themes can be added later as data; accent colour and compact/roomy density as settings; IBM Plex fonts bundled; new-tab page with search, favourites and most visited; gentle motion off under Windows' reduce-animations; logo 8 (split tile) from one SVG source for the program, window and taskbar icons"
    verify: "Shell unit tests and smoke suite pass; a test fails if any shell colour is written outside the theme tokens; switching accent and density changes the shell without restart; screenshots in light and dark saved and compared with the frozen design by the owner; the program file carries the split-tile icon; no remote fonts or images are loaded by the shell (CSP unchanged)."
  - id: p3.23
    title: "Feature set, integration and owner checklist: p3.18 to p3.22 added to the P3 integration suite and gate; new owner checklist items for bookmarks, address-bar search, backup and look"
    verify: "The P3 gate runs the new tests and passes; docs/testing/manual-checklist-p3.md has the new items."
  - id: p3.11
    title: "Integration test suite consolidating p3.2 to p3.9, p3.14 and p3.15"
    verify: "One command runs the suite and exits 0; output saved."
  - id: p3.12
    title: "Research track: literature batch 3 (tab-usage studies, Chrome and Edge lifecycle policies, mobile lifecycle analogues)"
    verify: "New raw research notes with access dates; seed-list entries marked UNCERTAIN are either verified or still flagged."
  - id: p3.13
    title: "Docs and exit gate: component pages updated, README features, known limitations (e.g. z-order constraints), owner M2 review"
    verify: "All evidence files exist; lint clean; owner approves phase-p3-tabs-sessions#exit."
test_gate:
  automated:
    - "cargo fmt --all -- --check"
    - "cargo clippy --workspace --all-targets -- -D warnings"
    - "cargo test --workspace"
    - "cargo deny check"
    - "apps/desktop shell: npm run lint && npm run typecheck && npm run test"
    - "Tauri release build of apps/desktop"
    - "P3 integration suite (p3.11)"
    - "P2 smoke suite and IPC denial test (regression)"
    - "cd interactive_plan && npm run lint:wiki"
  manual:
    - "Owner uses Ferrum with at least eight tabs across several sites for one working session and reports issues."
    - "Owner checks every keyboard shortcut with focus in a tab."
    - "Owner kills the app from Task Manager and confirms tabs are restored."
    - "Owner downloads a file from a real site and confirms it lands where expected."
    - "Carried over from the P2 checklist (owner's first round, 2026-10-12): after Alt+Tab back, typing reaches the page without a click; Open on a mail link starts the mail app; a sign-in survives closing and reopening Ferrum."
    - "Feature set (p3.23): owner bookmarks pages, finds a past page by typing in the address bar, exports a backup, opens it with a wrong and then the right passphrase and restores it with Merge (on this PC, or on another PC), and checks the new look and logo in light and dark."
  evidence:
    - raw/evidence/phase-p3-tabs-sessions/cargo-clippy.txt
    - raw/evidence/phase-p3-tabs-sessions/cargo-test.txt
    - raw/evidence/phase-p3-tabs-sessions/cargo-deny.txt
    - raw/evidence/phase-p3-tabs-sessions/shell-tests.txt
    - raw/evidence/phase-p3-tabs-sessions/release-build.txt
    - raw/evidence/phase-p3-tabs-sessions/integration.txt
    - raw/evidence/phase-p3-tabs-sessions/regression-smoke.txt
    - raw/evidence/phase-p3-tabs-sessions/wiki-lint.txt
    - raw/evidence/phase-p3-tabs-sessions/manual-checklist.md
exit_criteria:
  - "Every master prompt section 16 Milestone 2 deliverable exists: tab manager, session management, persistent settings, navigation controls, UI improvements, integration tests."
  - "All automated gate items, including P2 regressions, passed on the exit commit."
  - "Profile isolation behaves as the p1.9 ADR states (p3.6 evidence); anything shared is listed on the comp-webview-manager page."
  - "Feature set (p3.17 to p3.23) built and checked, or explicitly moved out by the owner."
  - "Owner approved phase-p3-tabs-sessions#exit."
risks: [risk-r01, risk-r02, risk-r09]
decisions: [adr-0006, adr-0007, adr-0010, adr-0014, adr-0032, adr-0033]
experiments: []
components: [comp-app-shell, comp-webview-manager, comp-core]
unverified:
  - claim: "Moving keyboard focus into the content web view when the window becomes active fixes the Alt+Tab focus issue (13466)"
    verify_in: phase-p6-benchmark-harness
---

# P3 Tabs and sessions (Milestone M2)

P3 turns the single content WebView into a tab manager. It covers master prompt section 5 "Phase 2: Multi-Website Container" and section 16 "Milestone 2" ([raw/00-master-prompt.md](../raw/00-master-prompt.md)), plus the per-site profile isolation the owner chose in Q7 ([raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md)) through the route fixed in spike S2 ([P1](phase-p1-foundation.md), p1.6 and p1.9).

## Scope

- Tab model as pure Rust in the core crate, so its rules are tested without a GUI.
- Child WebViews per tab with hide/show switching. Hiding matters later: TrySuspend requires `IsVisible == false` ([raw/research/tauri-webview2-capabilities.md](../raw/research/tauri-webview2-capabilities.md) section 6), which P7 relies on.
- Known constraints from research that shape the UI: tab content is always drawn above the shell, so shell menus must never overlap tab bounds (issue 15682); WebView creation from synchronous commands deadlocks on Windows (section 2).
- Owner answers of 2026-10-12 ([raw/owner/2026-10-12-s02-p3-questions.md](../raw/owner/2026-10-12-s02-p3-questions.md)): the normal Windows title bar first, tab strip just under it (Q-125); a site is its registrable domain (Q-111); a top-level navigation to another site asks first, then moves the tab to that site's profile (Q-209).
- Shortcuts with focus in a page (p3.3): WebView2's `AcceleratorKeyPressed` on each tab view reports the key before the page sees it; Ferrum's keys are marked handled and never reach the page; nothing is injected into the page, and the p2.3 IPC test still passes ([check-p3.3](../raw/evidence/phase-p3-tabs-sessions/check-p3.3.txt)). CDP key events do not reach this hook, so the smoke test presses real keys.
- Per-site profiles (p3.6): site key from the `psl` crate (VERIFIED maintained, [p3-profiles-psl](../raw/research/p3-profiles-psl.md)); profile names within WebView2's documented rules; what stays shared is listed on [ov-arch-isolation-model](../architecture/ov-arch-isolation-model.md) §3 and [comp-webview-manager](../architecture/components/comp-webview-manager.md) ([check-p3.6](../raw/evidence/phase-p3-tabs-sessions/check-p3.6.txt)).
- Busy tab (p3.9): with a tab whose script never stops, switching tabs and typing an address in the shell each finished within the test's 5-second requirement, and the busy tab could be closed ([check-p3.9](../raw/evidence/phase-p3-tabs-sessions/check-p3.9.txt); timings there are test log, not measurements). This answers the planning claim that a busy tab does not block the shell; which renderer process hosts which view was not inspected (process isolation is examined in P4).
- Alt+Tab focus: P2 built the fix; the owner's check was deferred at the P3 sign-off (2026-10-13) and moves to the P4 hand checks (UNVERIFIED[phase-p6-benchmark-harness], carried from P2; re-targeted in P5: the owner signed off P4 with his hand checks still owed and they were not done during P5 either; they are listed again in docs/testing/manual-checklist-p5.md; re-targeted in P4: the owner signed off P4 on 2026-10-18 with his hand checks still owed).
- Per-site profiles. All profiles in one user data folder share the browser process and must use identical environment options (section 6), and `clear_all_browsing_data` is profile-wide. P3 documents exactly what is shared; P4 tests it as a security property.

## Out of scope

- Blocklists, permission prompts, secure-download rules (P4). Downloads in P3 are "basic" per master prompt Phase 2.
- Lifecycle states and discarding (P7). Hidden tabs simply stay hidden in P3.
- Split view. Master prompt section 4 lists it as "Split-view support in a later phase" and section 16 assigns it to no milestone. This plan proposes deferring it to after P8. The deferral is a proposal, not an owner decision: approving this page approves it, and it is also listed with the proposed non-goals and deferrals in [ov-project-overview](../overview/ov-project-overview.md) and [ov-open-questions](../overview/ov-open-questions.md) (Q-005), so the owner decides it explicitly.
- Blocklist and permission-grant editing in the settings interface (P4, p4.17), because the blocklist and permission model do not exist until P4.
- Feature set: searching the words inside visited pages, live sync, a server database, and moving cookies or logins
  between PCs ([adr-0032](../decisions/adr-0032-local-sqlite-store-encrypted-backup.md)).

## New small feature set: bookmarks, search of the past, backup, look (added 2026-10-12)

The owner asked for it during the P3 review
([raw/owner/2026-10-12-s02-feature-set-request.md](../raw/owner/2026-10-12-s02-feature-set-request.md)): "basic UI
enhancements", bookmarks, "search (of the past) on the URL bar", a manual and secure dump to load into another
Ferrum, and a look, feel and logo that make the browser "fun to use and ergonomic". It is a **small feature set
added to P3**, tasks p3.17 to p3.23, built after the owner approves this plan and
[adr-0032](../decisions/adr-0032-local-sqlite-store-encrypted-backup.md). Placing it in P3 keeps the larger plan
unchanged: P4 to P8 move later by the feature set's length (estimate: two to three sessions, a planning figure,
not a measurement), and the P3 sign-off covers it.

Order and why:

1. **Design first (p3.17).** Questions one at a time, then options on a design canvas. Bookmarks placement and the
   suggestion list's look decide what p3.19 and p3.20 build. Done 2026-10-12: the owner chose look A, Graphite, and
   logo 8, the split tile, and asked that themes can be configured later
   ([adr-0033](../decisions/adr-0033-graphite-look-split-tile-logo-themes.md)).
2. **Store (p3.18).** Bookmarks, search and backup all read and write it.
3. **Bookmarks (p3.19), address-bar search (p3.20), backup (p3.21).** Independent of each other once the store exists.
4. **Look and logo (p3.22)** last, over the finished parts, so styling is done once.
5. **Tests and checklist (p3.23)**, then the P3 gate and the owner's review (p3.13).

The address bar's suggestion list meets the same constraint as the sidebar: a page view is always drawn above the
shell, so a list that drops down over the page would be hidden. p3.20 either moves the page view down while the list
is open (as the sidebar shifts it sideways) or shows the list in its own small window, and its smoke test checks the
two never overlap.

## Step order

```mermaid
flowchart LR
  p3_1["p3.1 tab model"] --> p3_2["p3.2 WebView per tab"]
  p3_2 --> p3_3["p3.3 tab strip + shortcuts"]
  p3_4["p3.4 settings"] --> p3_5["p3.5 session restore"]
  p3_2 --> p3_5
  p3_2 --> p3_6["p3.6 per-site profiles"]
  p3_4 --> p3_6
  p3_2 --> p3_7["p3.7 history"]
  p3_2 --> p3_8["p3.8 downloads"]
  p3_3 --> p3_9["p3.9 responsiveness"]
  p3_2 --> p3_10["p3.10 deadlock guard"]
  p3_5 --> p3_11["p3.11 integration suite"]
  p3_6 --> p3_11
  p3_7 --> p3_11
  p3_8 --> p3_11
  p3_9 --> p3_11
  p3_4 --> p3_14["p3.14 settings UI"]
  p3_6 --> p3_14
  p3_8 --> p3_14
  p3_3 --> p3_15["p3.15 sidebar"]
  p3_7 --> p3_15
  p3_14 --> p3_11
  p3_15 --> p3_11
  p3_10 --> p3_11
  p3_11 --> p3_13["p3.13 docs + exit"]
  p3_13 --> p3_16["p3.16 review fixes"]
  p3_16 --> p3_17["p3.17 feature set: design"]
  p3_17 --> p3_18["p3.18 store"]
  p3_18 --> p3_19["p3.19 bookmarks"]
  p3_18 --> p3_20["p3.20 address-bar search"]
  p3_18 --> p3_21["p3.21 backup"]
  p3_19 --> p3_22["p3.22 look and logo"]
  p3_20 --> p3_22
  p3_21 --> p3_22
  p3_22 --> p3_23["p3.23 tests + checklist"]
  p3_23 --> p3_13
  p3_12["p3.12 literature batch 3"] --> p3_13
```

Task ids are stable identifiers, not an ordering: p3.14 and p3.15 were added after review and slot in before p3.11 as the diagram shows. p3.16 was added after the owner's first hands-on review of the P3 release build (2026-10-12); it fixes what that review found before the sign-off. p3.17 to p3.23 are the new small feature set the owner asked for
in that review (see the section above); the P3 gate and the owner's review (p3.13) run again after them.

## Checkpoints and interruption recovery

- Session restore (p3.5) uses the same atomic-write pattern as the plan app's approvals file: write a temp file, then rename. A crash never leaves a half-written session file.
- Each task's integration tests are added with the task. A resuming session runs `cargo test --workspace` and the integration suite to see which tasks hold.

## Test gate rationale

Tabs multiply every P2 behaviour, so the P2 smoke suite and IPC denial test run again as regressions. Session restore is tested after a forced kill, not just a clean exit, because that is the case users hit. Profile isolation is tested functionally here (cookies) and adversarially in P4.

## Research track

Literature batch 3 (p3.12) covers tab-usage and lifecycle policies, the closest prior art for P7.

## Owner review checkpoint (adr-0014)

The owner uses Ferrum for a real working session with many tabs (manual items) before approving `phase-p3-tabs-sessions#exit`.
