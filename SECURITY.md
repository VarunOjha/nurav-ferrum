# Security

Ferrum is a research prototype. Phases P2 and P3 (milestones M1 and M2) are done; P4 (security, milestone M3) is in
progress. There is no released build yet.
The canonical security design lives in the wiki; this file is the short entry point.

## Reporting a vulnerability

Until a public repository and a contact address exist, report problems privately to the project owner
(not in a public issue). Please include the Ferrum commit, Windows build and WebView2 runtime version.
A reporting address will be added here before the first public release.

## Threat model

The full threat model, with every threat mapped to a control and a test, is in
[the security testing plan §7](wiki/quality/qual-security-testing-plan.md#7-threat-model-p41). This is the summary.

**What Ferrum protects.** Its own commands and the trusted shell window; each site's cookies and storage from other
sites; the user's files (downloads); other apps on the PC (links that start them); the history, bookmarks, sessions
and logs in the data folder ([assets A1 to A6](wiki/architecture/ov-arch-trust-boundaries.md#1-assets)).

**Who it protects against.** Mainly a malicious website in a tab, including its iframes, pop-ups, redirects and
downloads. Also a network attacker on HTTPS connections. Partly another program on the same Windows account (the
debugging port only) and a compromised dependency (known advisories only). Not an administrator or elevated malware.

**Trust zones.** The shell web view (Ferrum's own UI) is trusted; every tab web view shows untrusted web content and
has no bridge to Ferrum's commands ([trust boundaries](wiki/architecture/ov-arch-trust-boundaries.md),
[isolation model](wiki/architecture/ov-arch-isolation-model.md), [adr-0029](wiki/decisions/adr-0029-profile-route-raw-com-tab-controllers.md)).
Each site gets its own WebView2 profile ([adr-0010](wiki/decisions/adr-0010-isolation-webview2-profiles.md)). Raw
WebView2 calls stay in one audited module with written unsafe invariants
([adr-0019](wiki/decisions/adr-0019-raw-webview2-com-boundary.md)). Navigation posture: open web with a blocklist that
ships empty; plain `http` pages load with a "not secure" bar
([adr-0015](wiki/decisions/adr-0015-navigation-posture-open-blocklist.md)).

### Where trust changes

Every edge between components that crosses a trust boundary (from the component pages), its control and its test.
"not enforced" means Ferrum makes no claim there.

| Edge | From → to (kind) | Control | Test |
|---|---|---|---|
| E01 | comp-app-shell → comp-webview2-runtime (webview2-com) | Shell view shows only Ferrum's own pages | SEC-12 |
| E02 | comp-app-shell → comp-windows-os (os-api) | Nothing goes to another app without the user's click | SEC-02 |
| E03 | comp-baseline-app → comp-webview2-runtime (webview2-com) | Benchmark tool only, never shipped | not enforced |
| E04 | comp-benchmark-harness → comp-competitor-browsers (process-spawn) | Fresh temporary profiles, no weakening flags | not enforced |
| E05 | comp-benchmark-harness → comp-competitor-browsers (cdp) | Loopback debugging port, benchmark runs only | not enforced |
| E06 | comp-benchmark-harness → comp-webview2-runtime (cdp) | Ferrum never opens the debugging port itself | SEC-11 |
| E07 | comp-benchmark-harness → comp-windows-os (os-api) | Ferrum never runs elevated | not enforced |
| E08 | comp-tab-content → comp-app-shell (tauri-ipc) | Tab views have no bridge; zero remote capabilities | SEC-03 |
| E09 | comp-tab-content → comp-webview2-runtime (webview2-com) | Every page request goes through the policy engine | SEC-01 |
| E10 | comp-telemetry → comp-windows-os (os-api) | Read-only counters on Ferrum's own processes | not enforced |
| E11 | comp-webview-manager → comp-webview2-runtime (webview2-com) | One audited raw-COM module; one profile per site | SEC-06 |
| E12 | comp-webview-manager → comp-webview2-runtime (cdp) | Measurement only, nothing injected in normal use | not enforced |
| E13 | comp-webview2-runtime → comp-webview-manager (webview2-com) | A handler for every event; unparsable addresses denied | SEC-08 |
| E14 | comp-webview2-runtime → comp-app-shell (webview2-com) | Only the shell view has a bridge | SEC-03 |
| E15 | comp-webview2-runtime → comp-tab-content (network) | No certificate bypass; browser protections as shipped | SEC-13 |

### Not enforced

Ferrum makes no claim about these:

- Plain HTTP pages are not protected from network attackers; Ferrum only shows a warning bar (owner's choice, Q-112).
- Process isolation between sites: per-site profiles separate storage, not processes. What stays shared is measured
  in P4 (task p4.7).
- Other programs running as the same Windows user can read Ferrum's data folder and, during benchmark runs, drive web
  views through the debugging port.
- Dependencies are checked for known advisories only.
- Renderer sandbox escapes, an administrator or elevated attacker, and a compromised WebView2 runtime.
- Benchmark tools (baseline app, harness, energy sampler, measurement scripts) are not hardened against the sites they
  load.
- SmartScreen when Windows switches it off, or when someone who can start programs as you sets
  `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS` to switch it off (the same limit as the debugging port below).

P4 (milestone M3, in progress) builds the controls marked "Planned" in the full threat model and their tests; until a
test passes, this file does not call a protection enforced.

## What the first version (M1, phase P2) does

Checked by the P2 task scripts (evidence: [wiki/raw/evidence/phase-p2-minimal-container/](wiki/raw/evidence/phase-p2-minimal-container/)):

- **No website can call Ferrum's commands.** Every command is declared and granted only to the shell web view; no
  capability has a `remote` section. The website view is a WebView2 controller Ferrum creates itself and has no Tauri
  bridge at all (check p2.3).
- **Address rules.** Only `https`, `http` and `about:blank` load. `http` addresses typed in the address bar are
  upgraded to `https` by default (P4 changes this to the owner's answer to Q-112: `http` loads as typed, with a
  "not secure" bar). `javascript:`, `data:`, `file:` and similar addresses are refused (task p2.5).
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

## Camera, microphone and more: Ferrum asks first

A website gets the camera, the microphone, your location, notifications or the clipboard only after you choose (P4 task
p4.20, owner answers Q-227 and Q-228, [adr-0034](wiki/decisions/adr-0034-permission-question-chrome-style.md)). Ferrum
holds the site's request and shows a bar under the toolbar, like Chrome: "example.com wants to use your camera" with
**Allow this time**, **Always allow on this site**, **Never allow** and **×**.

- **Allow this time** lasts while the tab stays on that site; it ends when the tab goes to another site, loads the same
  address again, or closes. **Always** and **Never** are saved in Ferrum's settings, where Settings shows and undoes
  them. Closing the bar three times in a row makes that site quiet for that kind for 7 days.
- No question, refused at once: plain `http` pages, a site with "Never", a quiet site, and a frame of another site
  that its page did not allow to ask (Chromium refuses that itself). A page can let a frame of another site ask (its
  `allow` attribute); WebView2 then reports the request as the page's own, so the question names the page's site, as in
  Chrome (owner answer Q-228).
- A private tab offers **Allow this time** and **Block** only, and saves nothing.
- Every other kind (sensors, MIDI, fonts, window placement and others) is refused unless allowed in the settings file.
- Ferrum's settings stay the authority: WebView2 keeps no answer of its own. The bar's site name is Ferrum's own text.
  Only Ferrum's shell can answer; a website cannot (tested). Refusals go into the security log.

Checked with harmless test pages; the camera and microphone were only ever refused, so they were never switched on
([check-p4.20](wiki/raw/evidence/phase-p4-security/check-p4.20.txt)).

## SmartScreen (Microsoft Defender SmartScreen) is on

Ferrum leaves Microsoft Defender SmartScreen on in every browser engine it starts (P4 task p4.18, owner answer Q-225).
Before p4.18 it was off: the library under Tauri switches it off by default, and Ferrum now sets the browser switches
itself without that part. SmartScreen warns about sites and downloads that Microsoft lists as phishing or malware.

**What it sends to Microsoft** (Microsoft's own description, collected in
[the SmartScreen research note](wiki/raw/research/smartscreen-webview2.md)):

- for a site on the list of very popular sites kept on your PC: nothing;
- for any other site: the address, some information about the site, an identifier unique to your device and your
  general location;
- when a download finishes: the file's hash, its name, where it came from and the device identifier.

Requests are encrypted (HTTPS). Microsoft says it uses the data only for its security services. Microsoft asks every
app that keeps SmartScreen on to tell its users this; this section is that notice. Windows can switch SmartScreen off
for all WebView2 apps ("SmartScreen for Microsoft Edge" in Windows Security); Ferrum then has no SmartScreen either.

Checked: the browser engines of all three isolation modes run without the SmartScreen-off switch, and Microsoft's
demo phishing page is blocked (its tab is titled "Reported Unsafe Site: Navigation Blocked")
([check-p4.18](wiki/raw/evidence/phase-p4-security/check-p4.18.txt)). When SmartScreen blocks a page, Ferrum shows its own
message, "Unsafe site blocked: Microsoft Defender SmartScreen reported this site as unsafe", with no "Try again", and
writes the block to the security log (p4.19, [check-p4.19](wiki/raw/evidence/phase-p4-security/check-p4.19.txt)).
WebView2 does not say directly that SmartScreen blocked a page; Ferrum infers it from how the load failed, so another
program that cuts a page off after the server answered could, in principle, be shown as a SmartScreen block.

For a downloaded program (for example a `.exe`), Ferrum lets WebView2's own download pop-up show, because SmartScreen
asks there whether to keep an unknown or dangerous program; until you answer, the download waits (Ferrum's download
list shows it as running, with its program warning).

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

## Running every security test

`pwsh -NoProfile -File scripts/security-suite.ps1` runs all of Ferrum's security tests in one go (P4 task p4.11): the
security engine's tests, the self-test where a website tries every way into the app, the live tests for the ten areas of
security testing (blocked sites, links to other apps, app commands, cross-site reads, permissions, separate site data,
downloads, redirects, malformed addresses, crash recovery), the audit log and SmartScreen, and the release build scan.
Which test covers which area: [security testing plan](wiki/quality/qual-security-testing-plan.md#5-traceability).
Result: [security-suite](wiki/raw/evidence/phase-p4-security/security-suite.20261015-1234.txt).

## Rules Ferrum keeps

No weakening of WebView2/Chromium security, certificate validation or OAuth restrictions, not even for
benchmarks ([CLAUDE.md](CLAUDE.md) §6). No secrets, tokens or browser profiles in git.
