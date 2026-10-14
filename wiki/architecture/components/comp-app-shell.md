---
id: comp-app-shell
type: component
title: "Application shell (Tauri host + vanilla-TS shell UI)"
status: implemented
last_verified_commit: ebc79ca
updated: 2026-10-13
sources:
  - raw/00-master-prompt.md
  - raw/01-scoping-decisions.md
  - raw/research/tauri-webview2-capabilities.md
  - raw/owner/2026-10-10-s01-browser-ui-choice.md
related: [ov-arch-system-overview, ov-arch-trust-boundaries, ov-arch-data-flows, ov-arch-configuration, comp-webview-manager, comp-security-engine, comp-resource-manager, comp-telemetry, comp-network-logger, comp-core, comp-tab-content, comp-webview2-runtime, comp-windows-os, adr-0006, adr-0007, adr-0015, adr-0028, risk-r02, phase-p2-minimal-container, phase-p3-tabs-sessions]
approvable: true
path: apps/desktop/
crate: ferrum-desktop
trust_level: trusted
phase_introduced: phase-p2-minimal-container
shipped: true
unsafe_code: false
responsibilities:
  - "Window creation and layout of shell bands vs the active tab rectangle (master prompt 4: window creation)"
  - "Custom navigation controls: back, forward, reload, stop (master prompt 4)"
  - "Tab strip and tab management UI (master prompt 4)"
  - "Address bar with URL normalisation (https default) (master prompt 4)"
  - "Sidebar (master prompt 4)"
  - "Keyboard shortcuts (master prompt 4, Phase 2)"
  - "Settings interface rendered in the trusted shell WebView only (master prompt 4)"
  - "Split-view support in a later phase (master prompt 4)"
  - "Host the Tauri runtime: register app commands, capability files (shell only, no remote), app ACL manifest"
  - "Compose and wire all Ferrum crates (channels between telemetry, resource manager and webview manager)"
  - "User confirmation dialogs for external schemes, downloads and permissions; open-in-system-browser for Google OAuth"
interfaces:
  - "Tauri commands (PROPOSAL): tab_create, tab_close, tab_activate, tab_navigate, tab_back, tab_forward, tab_reload, tab_stop, settings_get, settings_set, session_list, download_list, external_open_confirm, netlog_open_folder"
  - "Events consumed: tab-updated, tab-blocked, tab-lifecycle, download-updated, permission-request, external-scheme-request"
  - "CLI: --config <path> (experiment override)"
connects:
  - to: comp-webview-manager
    label: "tab and navigation commands (create, close, activate, navigate, back, forward, reload)"
    kind: rust-api
    crosses_trust_boundary: false
  - to: comp-security-engine
    label: "settings edits to policy (blocklist, permissions, schemes)"
    kind: rust-api
    crosses_trust_boundary: false
  - to: comp-resource-manager
    label: "user interaction signals and lifecycle exclusions"
    kind: rust-api
    crosses_trust_boundary: false
  - to: comp-telemetry
    label: "startup marks (window visible, shell ready)"
    kind: rust-api
    crosses_trust_boundary: false
  - to: comp-network-logger
    label: "network log settings (enable, folder)"
    kind: rust-api
    crosses_trust_boundary: false
  - to: comp-core
    label: "load and save configuration; shared types"
    kind: rust-api
    crosses_trust_boundary: false
  - to: comp-webview2-runtime
    label: "hosts the trusted shell WebView (local bundled UI only)"
    kind: webview2-com
    crosses_trust_boundary: true
  - to: comp-windows-os
    label: "confirmed external URI hand-off and open-in-system-browser"
    kind: os-api
    crosses_trust_boundary: true
unverified:
  - claim: "Moving keyboard focus into the content web view when the window becomes active fixes the Alt+Tab focus issue (13466)"
    verify_in: phase-p4-security
  - claim: "A custom (frameless) title bar has a window-resize problem in Tauri (issue #12207); P3 kept the normal Windows title bar"
    verify_in: phase-p4-security
---

# comp-app-shell: application shell

The Ferrum desktop application. It has two halves in one component:

1. **Shell UI.** Vanilla TypeScript + Vite (adr-0006), in `apps/desktop/` (`index.html`, `src/`), rendered in the **trusted shell WebView** at the local app origin.
2. **Tauri host.** The `ferrum-desktop` crate in `apps/desktop/src-tauri/`. It owns the window, registers commands, holds the capability files and wires the other crates together.

## Look

The owner chose how the browser looks ([adr-0028](../../decisions/adr-0028-browser-look-tabs-top-ferrum-panel.md),
option A of the design canvas, 2026-10-10): tabs across the top with the Windows 11 window buttons at the right; a
toolbar with back, forward, reload, a rounded address bar with a lock, a shield button with a blocked count, a panel
toggle and a menu; the website in the middle; and a **Ferrum panel** on the right (about 352 px) with memory, CPU,
sleeping tabs, blocked sites and this tab's network log (metadata only, adr-0008). Sleeping tabs show a moon. Calm
warm grey, one rust-orange accent, IBM Plex Sans and Mono, light and dark. No AI assistant. Frozen design:
[option-a.dc.html](../../raw/evidence/phase-p0-planning/browser-ui/option-a.dc.html). All numbers on it are samples;
nothing is measured. The panel's sections fill in as later phases land (P4 blocking, P5 measurement and network log,
P7 sleeping tabs). The shell loads no remote resources: its content security policy allows only the app's own files and the IPC
channel, and the shell works under it, bridge included (verified in P2, [check-p2.3](../../raw/evidence/phase-p2-minimal-container/check-p2.3.txt); the policy
is in `apps/desktop/src-tauri/tauri.conf.json`). P2 did not bundle the IBM Plex fonts (the shell used IBM Plex if
installed, else Segoe UI and Consolas); P3 bundles them (p3.22: `@fontsource` IBM Plex Sans and Mono, imported in
`apps/desktop/src/main.ts`).

**Title bar.** Option A as drawn puts the tabs in the window's top bar, which needs a custom title bar; the design
notes below advise against one at first (resize problem, Tauri issue #12207, UNVERIFIED[phase-p4-security]; not tested in P1 because spike S1 used the normal title bar, and P3 built no custom title bar). The owner answered
[Q-125](../../overview/ov-open-questions.md#q-125-tabs-in-the-windows-top-bar-custom-title-bar-or-the-normal-windows-title-bar-first)
on 2026-10-12: the normal Windows title bar first, with the tab strip just under it. That is what P3 built.

## Design notes

- **Layout under the child-WebView model (adr-0007).** Shell chrome occupies fixed bands, and the active tab's child WebView fills the remaining rectangle. Child WebViews render above the shell (Tauri issue #15682, [Tauri note §2](../../raw/research/tauri-webview2-capabilities.md)). So menus, dropdowns, settings and dialogs **never overlap the tab rectangle**. Either the shell temporarily hides the active tab WebView, or the overlay is drawn inside the shell bands. Focus after Alt+Tab (#13466) was seen in P1 ([S1 report](../../raw/evidence/phase-p1-foundation/spike-s1-multiwebview.md); owner: fix later). P2 built the fix (`restore_focus`); the owner has not checked it yet (first checklist round, 2026-10-12), so it is UNVERIFIED[phase-p4-security] and goes on the P4 hand checks (deferred at the P3 sign-off on 2026-10-13). Resize and z-order behaved as designed in S1 and P2. Resize with a custom title bar (#12207) is UNVERIFIED[phase-p4-security]; P3 kept the normal title bar (Q-125).
- **Capabilities.** Exactly one capability file, `shell.json`, targets `"webviews": ["shell"]`. **No capability declares `remote`.** A CI check enforces this ([trust boundaries R1–R3](../ov-arch-trust-boundaries.md)).
- **Commands are async.** Tab creation runs from async commands: creating web views from a synchronous handler deadlocks on Windows (VERIFIED, Tauri note §2; reproduced in spike S1). Under adr-0029 the shell asks `webview-manager`, which creates the tab controller on the UI thread through `with_webview` and reports completion asynchronously.
- **No web storage in the shell** (trust rule R9). Settings go through `settings_get`/`settings_set` to Rust-side `config.toml`.
- **Secure defaults** (master prompt §5): DevTools only in dev builds, a strict CSP, and no remote resources in the shell.

## Phase plan

- phase-p2-minimal-container (M1): shell plus **one** child tab WebView, address bar, back/forward/reload, loading/error states.
- phase-p3-tabs-sessions (M2): tabs, shortcuts, session restore, per-site settings UI, downloads list.
- phase-p4-security (M3): permission and external-scheme prompts, blocked-navigation UI.
- Later: the Ferrum panel's sections as their data sources land (adr-0028); split view.

## Implementation status (P2, first working app)

Built in P2 and checked by the task scripts (evidence in [the P2 evidence folder](../../raw/evidence/phase-p2-minimal-container/)); the frontmatter's
`last_verified_commit` is the last commit these checks passed on.

- **Window and layout.** One window `main`. The shell is a Tauri child web view `shell` in a band at the top (52 px
  toolbar, plus 44 px while a confirmation bar shows). One content view below it, created by `ferrum-webview-manager`
  (adr-0029). The two never overlap; while the shell's full error panel shows, the content view is hidden and the shell
  takes the window (`shell_cover`).
- **Shell UI** (`apps/desktop/index.html`, `src/main.ts`, `src/style.css`; Vite 8.3.4, TypeScript 7.0.2,
  `@tauri-apps/api` 2.12.3): back, forward, reload/stop, the address bar with the lock (only for a page that loaded
  over https), a status text, a progress bar, the confirmation bar (links that open outside Ferrum; Google sign-in),
  and the error panel with "Try again". After the owner's first checklist round (2026-10-12) the loading signal is a
  moving 3 px accent line plus "Loading…" in the accent colour (it was a 2 px line, and a typed address cleared the text
  at once), and the confirmation bar uses the theme colours, so it is readable in dark mode (it was light on light). The
  smoke suite checks both (the bar's contrast is at least 4.5:1 in light and dark mode).
- **Tauri host** (`apps/desktop/src-tauri/src/`: `main.rs`, `content.rs`, `external.rs`, `logging.rs`, `selftest.rs`).
  Implemented commands, all shell-only (declared in `build.rs`, granted only by `capabilities/shell.json`, which has no
  `remote` section; [check-p2.3](../../raw/evidence/phase-p2-minimal-container/check-p2.3.txt)): `app_ping`, `app_quit`, `shell_layout`, `shell_cover`,
  `shell_focused`, `tab_navigate`, `tab_back`, `tab_forward`, `tab_reload`, `tab_stop`, `external_open_confirm`,
  `external_cancel`. One event to the shell, `tab`, with the kinds `navigation-starting`, `source-changed`,
  `navigation-completed`, `history-changed`, `title-changed`, `got-focus`, `new-window`, `external-scheme`,
  `external-request`, `sign-in-offer`, `blocked`. The interface list in the frontmatter stays the full plan.
- **Settings**: `config.toml` in the app config folder, `--config <path>` override (comp-core).
- **Shell security**: the CSP in `tauri.conf.json` allows only the app's own files and the IPC channel; in P2 fonts
  were not bundled (the shell named IBM Plex and fell back to Segoe UI and Consolas, all local); P3 bundles IBM Plex
  with the app (p3.22). Developer tools only in debug
  builds ([check-p2.12](../../raw/evidence/phase-p2-minimal-container/check-p2.12.txt)).
- **Logs**: `ferrum.jsonl`, JSON lines, sites as scheme and host only ([check-p2.14](../../raw/evidence/phase-p2-minimal-container/check-p2.14.txt)).

## Implementation status (P3, tabs and sessions)

- p3.2, tabs: the shell web view now fills the window and reports the space it keeps (`shell_layout { top, left }`);
  tab views fill the rest and are drawn above it. Top band: the tab strip (36 px, under the normal Windows title bar,
  owner answer Q-125), the toolbar and the confirmation bar. The app keeps the tab list (`ferrum_core::tabs`, p3.1)
  and one view per tab (`content.rs`); only the active tab's view is shown. New commands, all shell-only: `tab_new`,
  `tab_close`, `tab_activate`, `tab_move`, `tab_next`, `tab_previous`, `tab_reopen`, `tab_list`, and `test_stats`
  (debug builds only; a release build refuses). Events: `tabs` (the tab list), `tab` (one view's events, now with
  the tab id) and `link` (links to other apps, Google sign-in, blocked requests). `shell_cover` takes the tab id. Tab
  creation is never awaited by a caller: commands that create views are async and only queue the work on the UI
  thread (p3.10).
- p3.3, shortcuts and strip: Ctrl+T new tab (cursor in the address bar), Ctrl+W or Ctrl+F4 close, Ctrl+Tab or
  Ctrl+Page Down next, Ctrl+Shift+Tab or Ctrl+Page Up previous, Ctrl+Shift+T reopen, Ctrl+1 to Ctrl+8 a tab by
  position, Ctrl+9 the last tab, Ctrl+L, Alt+D or F6 the address bar, Alt+Left back, Alt+Right forward, F5 or Ctrl+R
  reload; Ctrl+Shift+S (sidebar) and Ctrl+Comma (settings) arrive with p3.15 and p3.14. Keys pressed in the shell are
  handled by the shell (`logic.ts`, `shortcutFor`); keys pressed in a page by the app (`shortcuts.rs`, through
  WebView2's accelerator-key hook; the page never sees them). Event `shell-command` asks the shell to focus its
  address bar. Tabs can be dragged to reorder them and closed with a middle click. Debug-only `test_focus` puts
  focus in a page or the shell for the real-key smoke tests ([check-p3.3](../../raw/evidence/phase-p3-tabs-sessions/check-p3.3.txt)).
- p3.5, session restore (`session.rs`): the tab list is saved to `session.json` in the data folder about once a
  second while it changes and on a normal exit (`RunEvent::Exit`), atomically; on start the last session opens again
  (same order, same active tab) when `restore_on_startup` is on, else the start-up pages. An unreadable session file is
  copied aside; one from a newer Ferrum is neither restored nor overwritten. Self-test runs (`FERRUM_SELFTEST`) never
  read or write it (they use the real data folder). Debug-only `test_crash` ends the process at once for the crash
  test (no kill command). Known limit: back/forward history is not restored (WebView2 cannot give a new view a
  history); each tab reopens its last address ([check-p3.5](../../raw/evidence/phase-p3-tabs-sessions/check-p3.5.txt)).
- p3.6, per-site profiles: each tab's view is created in the profile of its address (`profile_for`). The navigation
  gate stops a page that leads to another profile: an empty tab moves at once; otherwise the bar asks ("Open <site> in
  its own profile? This tab's back history will be lost.", Continue / Cancel; `link` event kind `cross-site`,
  commands `cross_site_confirm` (only the address asked about) and `cross_site_cancel`). Typed addresses move without
  asking; redirects stay in the current profile ([check-p3.6](../../raw/evidence/phase-p3-tabs-sessions/check-p3.6.txt)).
- p3.7, history (`history.rs`): pages that load (web addresses, HTTP status below 400) are recorded with their title in
  `history.json` in the data folder, saved with the session saver and on exit; commands `history_list` (newest first,
  optional search and limit) and `history_clear` (empties the list and the file at once). Self-test runs keep it in
  memory only. Per-tab back and forward: the toolbar's buttons follow the active tab's own `history-changed` state. The
  history is browsing data: it stays in the data folder and is never committed (the p3.7 check looks)
  ([check-p3.7](../../raw/evidence/phase-p3-tabs-sessions/check-p3.7.txt)).
- p3.18, library (`library.rs`, adr-0032): history (and, from p3.19, bookmarks) live in `ferrum.db` in the data
  folder through `ferrum_core::store`, written at once per change (no save on exit any more). On the first start with
  `ferrum.db` an old `history.json` is imported and renamed `history.json.imported` (nothing deleted). A file from a
  newer Ferrum is left alone, a damaged one is copied aside (`.broken-<seconds>`); either way the library runs in
  memory for that run. Self-test runs use memory only. `history_list` searches words of titles and addresses (word
  starts, all words required); `history_clear` also clears the word index and compacts the file
  ([check-p3.18](../../raw/evidence/phase-p3-tabs-sessions/check-p3.18.txt)).
- p3.19, bookmarks (`bookmarks.rs`, shell `main.ts`): commands `bookmark_list`, `bookmark_for`, `bookmark_add`,
  `bookmark_update`, `bookmark_move`, `bookmark_remove`, `appearance_get`, `appearance_set`, allowed only for the shell
  (`shell.json`; tab views have no bridge). The star in the address bar (filled when the page is bookmarked; only web
  pages) adds the page to the "Favourites bar" folder and opens the editor bar (name, folder with suggestions, Done,
  Remove; Enter and Esc); the bookmarks bar (that folder, hideable) and the editor are part of the top band, so the
  tab view moves down and never sits under them. The sidebar gains a Bookmarks section: every folder (the bar's
  first), open, Edit, remove. Ctrl+D and Ctrl+Shift+O move focus to the shell (like Ctrl+L); Ctrl+Shift+B is saved as
  `[appearance] bookmarks_bar` ([check-p3.19](../../raw/evidence/phase-p3-tabs-sessions/check-p3.19.txt)).
- p3.20, address-bar search of the past: commands `library_suggest` (up to 3 bookmarks and 8 history pages for the
  typed words) and `history_remove` (Shift+Delete). The shell matches open tabs itself with the same rule (every typed
  word starts a word of the title or address) and shows three groups: Open tabs (not the active one; "Switch to tab"),
  Bookmarks, History (each page once, "how long ago"), matched word starts in the accent colour. Arrow keys, Enter,
  Esc, click; the address bar is a combobox (`aria-activedescendant`). The list is part of the top band, so the tab
  view moves down while it is open and never covers it (the smoke test compares the page's height with the band)
  ([check-p3.20](../../raw/evidence/phase-p3-tabs-sessions/check-p3.20.txt)).
- p3.21, backup and restore (`backup.rs`, adr-0032): commands `backup_suggest_path` (the download folder,
  `ferrum-backup-<date>.ferrum-backup`), `backup_export` (a new file only, never over an existing one),
  `backup_preview` (what is inside; nothing changes) and `backup_import` (merge, or replace after a dated copy
  `ferrum.db.before-import-<seconds>`); the key derivation runs off the main thread; the passphrase is wiped and
  never logged (the smoke test reads every log). The Backup and restore screen (from the sidebar) covers the active
  tab like Settings: make a backup (passphrase twice), look inside, Merge into mine, Replace mine (asked twice)
  ([check-p3.21](../../raw/evidence/phase-p3-tabs-sessions/check-p3.21.20261012-1618.txt)).
- p3.22, look and logo (adr-0033): `src/themes.ts` holds the themes as data (Graphite: named colour tokens for light
  and dark), the accents (orange, blue, green, violet; a brighter shade in dark mode, a darker one in light mode) and
  the densities (roomy, compact); `applyLook` sets them as CSS custom properties on the root element, and light or
  dark follows Windows (`prefers-color-scheme`, live). `style.css` writes no colour of its own (a unit test checks, and
  another that every token it uses is set). `appearance_get`/`appearance_set` carry `theme`, `accent`, `density`
  (`[appearance]`), changed at once from Settings (Appearance). IBM Plex Sans and Mono are bundled from
  `@fontsource` 5.3.0 (OFL-1.1, Latin subset), so the shell loads no remote fonts (CSP unchanged). The new-tab page
  covers an empty tab (logo, a search box that opens the address bar, favourites from the bookmarks bar's folder,
  most visited) and refreshes each time it appears. Gentle fades and transitions, all off under
  `prefers-reduced-motion`. Logo 8, the split tile, is `icons/app-icon.svg` (also `public/logo.svg`), from which
  `icon.ico` and `icon.png` are generated; the p3.16 check samples the orange half
  ([check-p3.22](../../raw/evidence/phase-p3-tabs-sessions/check-p3.22.txt); screenshots
  [dark](../../raw/evidence/phase-p3-tabs-sessions/design/p3.22-look-dark.png) and
  [light](../../raw/evidence/phase-p3-tabs-sessions/design/p3.22-look-light.png)).
- P3 self-scan fixes (2026-10-13, owner request): (1) a user settings file that could not be used at start (unreadable,
  from a newer Ferrum, or broken with no copy made) is never overwritten: Settings and Appearance refuse to save and say
  why (`UserConfigPath` carries the reason; `settings::user_file`). (2) New shell-only command `app_notes`: start-up
  problems (that settings file, or a `ferrum.db` that could not be used and is kept in memory) are shown in the status
  area instead of only in the log. (3) An old `history.json` is imported at every start until it has been renamed, so a
  failed first import is retried. (4) Backup export never replaces a file, even one that appeared during the key
  derivation (`fsutil::write_new`); two session saves at the same moment use separate temporary files. (5) Shell:
  changing the backup file or passphrase after "look inside" hides Merge and Replace again, and a failed replace asks
  twice again; an error panel going away no longer shows the page over Settings, Backup or the new-tab page; the
  new-tab page hides at once under Settings and Backup; typing again forgets the highlighted suggestion; variables
  used by early events are declared before the first await. (6) The p2.3 lockdown probe now also tries the bookmark,
  history, suggestion, backup and appearance commands from a website (all must be refused).
- p3.8, downloads (`downloads.rs`): files go to `[downloads] folder` (else the Windows Downloads folder) under the
  name WebView2 suggests (the file name only; a name already on disk or already given out in this run gets
  ` (1)`, ` (2)`, ...: nothing is ever replaced). The shell's downloads bar (top band) shows each download: percent and
  size while running, "Done" or "Failed"; Clear removes finished ones. Event `download` (`started`, `progress` at most
  every 200 ms, `completed`, `failed`; a retry of the same address replaces its older line). Risky file types and
  "ask where to save" are P4 (adr-0015) ([check-p3.8](../../raw/evidence/phase-p3-tabs-sessions/check-p3.8.txt)).
- p3.16, owner review fixes: (1) a navigation that turns into a download (for example a site opening a PDF in a new
  window) no longer shows the "could not be loaded" panel; a tab that never showed a web page and only started a
  download closes when the download ends (the download does not depend on the tab). (2) Site icons: the app turns
  the view's `FaviconChanged` PNG into a `data:image/png;base64,...` address (tab event kind `favicon`); the shell
  shows it in the tab strip and the sidebar's tab list and accepts nothing else (the shell's CSP allows `data:` images
  only). (3) A new app icon (`icons/app-icon.svg`, a rust-orange tile with a white F; `icon.ico` and `icon.png`
  made from it with the Tauri CLI), compiled into the program file; `build.rs` now rebuilds when the icons change.
- p3.9, a busy tab: a tab whose script never stops does not block the shell: switching tabs and typing an address
  each finished within the test's 5-second requirement, and the busy tab closed normally
  ([check-p3.9](../../raw/evidence/phase-p3-tabs-sessions/check-p3.9.txt)).
- p3.10, no freeze on new tabs: a command that can create a tab view is `async` (the scan found `cross_site_confirm`
  was not, and fixed it); views are made in the background and nothing waits for them; nothing on the tab path
  blocks on a reply except the debug-only `test_stats` (off the UI thread). Review checklist:
  `docs/developer/code-review-checklist.md`. A burst of about 40 tab commands settles and pop-ups still open tabs
  ([check-p3.10](../../raw/evidence/phase-p3-tabs-sessions/check-p3.10.txt)).
- p3.14, settings screen: a toolbar button (⚙) and Ctrl+Comma open it in the content area (the active tab's view is
  hidden meanwhile; switching tabs closes it). It edits start-up sites (one per line), "reopen the tabs from last
  time", per-site named profiles and the download folder, and shows whether isolation is per site. The shell never
  writes the file: `settings_get` and `settings_set` (`settings.rs`) check every value (address rules, settings rules,
  the folder must exist), list every problem in plain words, and only then write the user settings file atomically
  and apply the settings (`AppConfig` is behind a lock: profiles and the folder at once, start-up sites at the next
  start). The p2.3 probe page now also tries `settings_set`: refused for a website ("allowed on: webviews shell"),
  and tab views have no bridge ([check-p3.14](../../raw/evidence/phase-p3-tabs-sessions/check-p3.14.txt)).
- p3.15, sidebar: a panel left of the content area (toolbar button ☰, Ctrl+Shift+S from the toolbar or from a page)
  listing open tabs (choose one to switch) and history (search box; choose an entry to open it in the active tab;
  Clear history). The shell reports its width with `shell_layout { left }`, so tab views start to its right and never
  overlap it (pages are drawn above the shell's window). Sidebar history shows each address once, newest first
  ([check-p3.15](../../raw/evidence/phase-p3-tabs-sessions/check-p3.15.txt)).
- New windows: `new_window = "new-tab"` is the new default (`same-view` and `system-browser` stay). One tab may open
  at most one new tab per second; further requests are blocked with "Pop-up blocked" on that tab. WebView2's
  user-initiated flag is not used (it was `true` for a script-only pop-up). A real pop-up policy is P4 work.

Known limitations of the P2 version (the tab-related ones are lifted above): one view and no tabs (P3); the normal Windows title bar; the Alt+Tab focus
fix (`restore_focus`) awaits the owner's manual check (moved to P3); opening a link in another app has been tested only with a
stand-in launcher (the owner's manual mailto check). The smoke robot uses WebView2's remote-debugging switch
(adr-0031); it is an environment variable that also works on release builds.

## Implementation status (P4, security)

- p4.3, every navigation asks the security engine: the Tauri host's new `policy.rs` builds the navigation policy from
  the settings (and again when the settings screen saves; a bad site rule refuses the save) and decides each tab
  navigation, redirect hop, frame and new window (comp-security-engine, "Implementation status (P4)"). The shell view
  itself gets Tauri's `on_navigation` hook: it may show only Ferrum's own pages (`http://tauri.localhost`), so the one
  view that can call the app never shows a website (threat T03). The `blocked` message carries the rule and whether it
  was a frame; the toolbar says why ("Blocked: host is on your blocked sites list", "... is not on your allowed sites
  list", "Blocked a frame: ...") and keeps the note through WebView2's "cancelled" end of the blocked load, until the
  tab's next page starts. A typed address the address bar refuses is logged with its reason only.
- p4.4, links to other apps: `external::request` (every confirmation-bar request) and `external_open_confirm` (the
  click) ask the security engine; a refused type gets a toolbar note instead of the bar ("Blocked: ms-msdt links are
  always refused (known to be abused)", "... links are not on your allowed list"). Settings key
  `external_allowlist`; a bad entry refuses the settings like a bad site rule.
- p4.5, permissions: `policy::permission_filter` decides each request of a tab from the settings in effect now
  (security engine), logs it and notes a refusal on the toolbar ("Blocked: camera for example.com (allow it in
  Settings)"). The settings screen's site rows carry the grants (`SiteRow.permissions`; left out, the site keeps its
  grants), so saving the screen never drops them.
- p4.6, downloads: the host saves under the security engine's cleaned name and sends `program: true` for program
  types; the download line then shows "⚠ Program file: open it only if you trust the site". Nothing in Ferrum opens a
  downloaded file.
- p4.7, private tabs and clearing a site: Ctrl+Shift+N (or `tab_new_private`) opens a private tab: an InPrivate view in
  the profile `ferrum-private`, marked "Private" on the tab strip, kept out of the history and never saved in the
  session; a private tab stays in that profile whatever site it shows. `site_data_clear { site }` deletes everything
  stored for one site in its own profile (refused while a tab of that site is open, or when sites share one profile).
  A settings screen button for it is p4.17. Test hook `test_processes` (debug builds) returns the process inventory.
- Not yet: the "not secure" bar for plain HTTP (owner answer Q-112); today the address bar shows the warning sign only.
