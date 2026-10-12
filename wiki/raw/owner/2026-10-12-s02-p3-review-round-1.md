# RAW SOURCE — Owner's first P3 review feedback (session s02, 2026-10-12)

> Immutable raw source. Transcribed by Claude on 2026-10-12. Owner messages verbatim (Claude Code chat), in order.
> Follows: [2026-10-12-s02-p3-autoapproval-keys.md](2026-10-12-s02-p3-autoapproval-keys.md).

## 1. Context

P3 was built and its gate passed (evidence `e1cee54`). Claude stopped for the owner's review and opened the release build
(`scripts/open-ferrum.ps1`) at the owner's request ("Start ferrum"), then listed the ten items of
`docs/testing/manual-checklist-p3.md` at the owner's request ("List those items here").

## 2. Owner's message (verbatim)

> Yea, been using. Download fails. Most websites and tabs are looking to be working fine. However, download doesn't work. Also, the icon we, the favicon, doesn't display the favicon of sites. The icon on the icon tray is faint, translucent and barely visible in any way. This could a design lift for sure. And on the task manager, I don't see any Ferrum. I only WebView2 Manager. I think we ought to fix that please

## 3. Meaning recorded by Claude

- This is review feedback, not the item-by-item checklist answer and not a sign-off. P3 stays in gate-review.
- Four findings the owner asks to fix ("I think we ought to fix that please"):
  1. **Download fails.** Claude's check of Ferrum's own log and the Downloads folder (2026-10-12): the owner's download
     (a 1 059 188-byte PDF that a site opened in a new window) was saved complete in the Downloads folder, but the new
     tab it opened showed Ferrum's "could not be loaded" panel (WebView2 web error status 9), so it looked failed.
  2. **No site icons (favicons)** in the tabs.
  3. **The app icon** (taskbar / tray) is faint and barely visible: a design lift is wanted.
  4. **Task Manager** shows no "Ferrum", only "WebView2 Manager". Claude's check (2026-10-12): `ferrum-desktop.exe`
     (file description "Ferrum") runs and is the parent of its WebView2 processes; the app icon is a plain dark square.
- "Most websites and tabs are looking to be working fine" is the owner's overall impression of checklist item 1.
- Claude builds the fixes as a P3 review task; the owner's other answers (checklist items, re-approvals, sign-off) are
  still open.
