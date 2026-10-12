# P2 manual checklist — owner's results, round 1 (2026-10-12)

> Raw evidence. Written by Claude on 2026-10-12 in session s02 from the owner's chat message, transcribed verbatim in
> [raw/owner/2026-10-12-s02-p2-checklist-and-p3-autoapproval.md](../../owner/2026-10-12-s02-p2-checklist-and-p3-autoapproval.md).
> Checklist: `docs/testing/manual-checklist-p2.md`. Build tried: `target/release/ferrum-desktop.exe`, built by Claude on
> 2026-10-12 from commit 4f9fbd5 (`npm run build`, then `npm run tauri -- build --no-bundle`, exit 0).
> The "Result" column quotes or closely follows the owner's words; "Follow-up" is Claude's.

| # | Check | Result (owner) | Follow-up |
|---|---|---|---|
| 1 | Five HTTPS sites, back/forward/refresh | Yes: "GitHub, Wikipedia, YouTube, BBC News worked very well"; scrolling on Amazon.com "also worked very well". | None. |
| 2 | Mail link asks first; Open starts the mail app | Partly: the bar shows when a mail link is clicked, but "the visibility of that at the top is very low", "a faint looking button that says open or cancel probably". Whether Open starts the mail app was not reported. | Cause: the bar used two undefined colour tokens, so in dark mode it was light text on a light background. Fixed in c899c22 (theme colours; smoke test checks contrast of at least 4.5:1 in light and dark mode). The Open-starts-mail part waits for the owner's next feedback round. |
| 3 | Signed in after closing and reopening Ferrum | Partly: logged in to GitHub, and the login was kept when moving to another site. Closing and reopening was not reported. | Cookies surviving a restart are covered by the p2.11 smoke test (keep-cookies). The owner's restart check waits for the next round. |
| 4 | Offline: error panel, then "Try again" works | Yes, with a finding: with Wi-Fi off, Ferrum stayed on the old page with no visible sign of waiting for about 20 seconds, then showed the panel; "a little glitchy, but ... essentially the functionality is working". | Cause: the loading line was 2 px, and pressing Enter cleared "Loading…" at once. Fixed in c899c22 (moving 3 px accent line, accent "Loading…" kept; smoke test checks both). The roughly 20-second wait is WebView2's own and is not shortened. |
| 5 | Alt+Tab back, typing reaches the page | Not reported. | Stays open; moved to the P3 keyboard checks (claim retargeted to phase-p3-tabs-sessions). |

Owner's question in the same message: "we have no options for tabs, right? And that is by design" — yes: P2 has one view;
tabs are P3.
