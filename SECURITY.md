# Security

Ferrum is a research prototype. Phase P3 (tabs and sessions, milestone M2) is built and waiting for the owner's
review; there is no released build yet.
The canonical security design lives in the wiki; this file is the short entry point.

## Reporting a vulnerability

Until a public repository and a contact address exist, report problems privately to the project owner
(not in a public issue). Please include the Ferrum commit, Windows build and WebView2 runtime version.
A reporting address will be added here before the first public release.

## Threat model (outline)

- **Trust zones.** The shell web view (Ferrum's own UI) is trusted; every tab web view shows untrusted web
  content and must never reach the shell's commands ([trust boundaries](wiki/architecture/ov-arch-trust-boundaries.md),
  [isolation model](wiki/architecture/ov-arch-isolation-model.md), [adr-0007](wiki/decisions/adr-0007-child-webviews.md)).
- **Per-site profiles** keep each site's cookies and storage apart ([adr-0010](wiki/decisions/adr-0010-isolation-webview2-profiles.md)).
  Spike S2 showed one route where this works with one shared browser process
  ([spike S2 report](wiki/raw/evidence/phase-p1-foundation/spike-s2-profiles.md)).
- **Raw WebView2 calls** are confined to one audited module with written unsafe invariants
  ([adr-0019](wiki/decisions/adr-0019-raw-webview2-com-boundary.md); draft invariants in the
  [spike S3 report](wiki/raw/evidence/phase-p1-foundation/spike-s3-raw-com.md)).
- **Navigation posture:** open web with a blocklist ([adr-0015](wiki/decisions/adr-0015-navigation-posture-open-blocklist.md)).
- Security test plan: [qual-security-testing-plan](wiki/quality/qual-security-testing-plan.md). P4 builds and tests the security engine.

## What the first version (M1, phase P2) does

Checked by the P2 task scripts (evidence: [wiki/raw/evidence/phase-p2-minimal-container/](wiki/raw/evidence/phase-p2-minimal-container/)):

- **No website can call Ferrum's commands.** Every command is declared and granted only to the shell web view; no
  capability has a `remote` section. The website view is a WebView2 controller Ferrum creates itself and has no Tauri
  bridge at all (check p2.3).
- **Address rules.** Only `https`, `http` and `about:blank` load. `http` addresses typed in the address bar are
  upgraded to `https` by default. `javascript:`, `data:`, `file:` and similar addresses are refused (task p2.5).
- **Links to other apps** (`mailto:` and custom schemes) are stopped and shown on a confirmation bar; nothing is
  handed to Windows without the user's click, and the app opens only the one link it asked about (p2.10).
- **New windows** never open: they load in the same view, or (setting `new_window = "system-browser"`) in the
  user's browser on a click (p2.10).
- **Google sign-in** is never loaded inside Ferrum and never worked around (no user-agent change): a bar offers the
  user's normal browser (p2.13; owner answer Q-109).
- **Developer tools** are off in release builds in both views (p2.12). WebView2's own setting blocks F12 and the
  context menu but not a direct `OpenDevToolsWindow` call, so Ferrum's code makes no such call.
- **Certificates** are never bypassed: Ferrum has no code that overrides a certificate check. A page that fails to
  load for a certificate reason gets Ferrum's error panel, which offers no way around it (p2.8; a certificate failure
  itself was not part of the P2 tests). The automated tests use a local certificate authority that is name-constrained to `localhost`, `127.0.0.0/8` and
  `::1` and installed only for the developer's Windows user (p2.1).
- **Logs** record sites as scheme and host only, never full addresses (p2.14).

Known limitations of M1: one site profile for everything (per-site profiles arrive in P3); no blocklist or
permission prompts yet (P4); the WebView2 remote-debugging switch below; the system-browser and mail hand-off has
been tested only with a stand-in launcher until the owner's manual check.

## What P3 (M2, tabs and sessions) adds

Checked by the P3 task scripts (evidence: [wiki/raw/evidence/phase-p3-tabs-sessions/](wiki/raw/evidence/phase-p3-tabs-sessions/)):

- **A profile per site.** Each site (its registrable domain, from the Public Suffix List) gets its own WebView2
  profile: cookies and storage stay apart. A test shows a site's cookie is not sent when that site is framed inside
  another site's tab, while one shared profile would send it (p3.6). What profiles still share (one browser process,
  one data folder, the debugging port when on) is listed in
  [ov-arch-isolation-model](wiki/architecture/ov-arch-isolation-model.md); process isolation itself is tested in P4.
- **Changing site asks first.** A link that leads a tab to another site's profile is stopped; the shell asks, and only
  the address it asked about moves (p3.6). A redirect to another site stays in the first site's profile (P4 gap).
- **Bookmarks and history (feature set, adr-0032).** Kept in `ferrum.db` in the data folder, reachable only through
  shell-only commands (tab views have no bridge); only `http`/`https` addresses are stored, so a `javascript:` or
  `file:` "bookmark" cannot be saved or imported; Clear history removes entries and their word index and compacts the
  file (p3.18 to p3.20).
- **The backup file (adr-0032).** Argon2id key from your passphrase (at least 12 characters, never stored or logged)
  and XChaCha20-Poly1305 over the contents and the header (RustCrypto crates, no cryptography of Ferrum's own); a wrong
  passphrase, any changed byte or a cut file is refused as a whole, a file asking for unreasonable key-derivation work
  is refused, and an import replaces nothing before making a copy of the library. Cookies, logins and site data are
  never in it (p3.21).
- **Pages still cannot reach the app.** Keyboard shortcuts inside a page are taken from WebView2's key hook before the
  page sees them; nothing is injected into pages (p3.3). The settings commands are shell-only; the p2.3 test page now
  also tries `settings_set` and is refused (p3.14). The settings screen never writes the file itself: the app checks
  every value first and writes in one step.
- **Browsing data stays local.** `session.json`, `ferrum.db` (history and bookmarks, since p3.18; an old
  `history.json` is imported once and renamed `history.json.imported`), profiles and downloads live in the data folder
  only; the history can be cleared at once, leaving nothing of it inside `ferrum.db`; git ignores `ferrum.db` and
  backup files, and a check fails if a `session.json`, `history.json`, `ferrum.db` or backup file is ever tracked in
  git (p3.7).
  Logs still record only scheme and host.
- **Downloads** go to the download folder under the file name only (a site cannot choose the folder) and never replace
  a file (p3.8). Risky file types and "ask where to save" are P4.
- **Pop-ups**: at most one new tab per tab per second; WebView2's "user initiated" flag is not trusted (it was true
  for a script-only pop-up). A real pop-up policy is P4.
- **Debug-only test commands** (`test_stats`, `test_focus`, `test_crash`) refuse in release builds.

## Debug port (benchmarks and debugging only)

The benchmark harness drives web views through the Chrome DevTools Protocol, enabled with
`WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=<port>`. That port exposes **every** web view,
including the trusted shell, to any local process
([spike S4 report](wiki/raw/evidence/phase-p1-foundation/spike-s4-playwright-cdp.md)). Ferrum never sets it; the
smoke tests and benchmarks set it for their own runs. The switch is an environment variable that WebView2 also reads
for release builds, so anyone who can already start programs as the user can turn it on; it gives them no more than
that. WebView2 ignores these environment flags for elevated processes, so benchmarks run non-elevated.

## OAuth and sign-in

Embedded web views are a known problem for Google sign-in; Ferrum must not weaken WebView2 or OAuth restrictions
to get around it. The owner chose the hand-off (Q-109 in [open questions](wiki/overview/ov-open-questions.md)):
Ferrum recognises Google's sign-in address and offers "Open in browser"; nothing opens without the user's click.

## Rules Ferrum keeps

No weakening of WebView2/Chromium security, certificate validation or OAuth restrictions, not even for
benchmarks ([CLAUDE.md](CLAUDE.md) §6). No secrets, tokens or browser profiles in git.
