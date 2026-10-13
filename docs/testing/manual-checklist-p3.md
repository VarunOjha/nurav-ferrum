# Manual checklist for the end of P3 (tabs and sessions)

The automated checks cover what a robot can judge. These checks need a person and real websites. The owner does them
on the **release build** at the end-of-phase review. Claude copies the answers, in the owner's words, into
`wiki/raw/evidence/phase-p3-tabs-sessions/manual-checklist.md` (the phase page's gate list).

Start the release build from the repo folder:

```powershell
& ".\target\release\ferrum-desktop.exe"
```

## From the P3 plan

| # | What to do | What should happen | Result (yes / no + note) |
|---|---|---|---|
| 1 | Use Ferrum for a working session with **at least eight tabs** on several sites (mail, docs, news, video...). | Tabs open, switch and close normally; nothing freezes; pages look right. Note anything odd. | |
| 2 | Try **every shortcut** while typing inside a page: Ctrl+T, Ctrl+W, Ctrl+F4, Ctrl+Shift+T, Ctrl+Tab, Ctrl+Page Down, Ctrl+Shift+Tab, Ctrl+Page Up, Ctrl+1 to Ctrl+9, Ctrl+L, Alt+D, F6, Alt+Left, Alt+Right, F5, Ctrl+R, Ctrl+Shift+S, Ctrl+Comma, Ctrl+D, Ctrl+Shift+B, Ctrl+Shift+O (the same list as the shortcut table in the README). | Each does its job, and the page does not react to it. | |
| 3 | With several tabs open, end Ferrum from **Task Manager** (Details, ferrum-desktop.exe, End task). Start it again. | The tabs come back (each opens its last page; its back history is not kept). | |
| 4 | **Download a file** from a real site (for example a PDF). | It lands in your Downloads folder (or the folder in Settings) and the bar under the toolbar says "Done". | |

## Carried over from the P2 checklist (not reported in round 1)

| # | What to do | What should happen | Result |
|---|---|---|---|
| 5 | Click into a page, **Alt+Tab** to another app and back, then type. | The typing goes into the page without clicking it first. | |
| 6 | Click a **mail link**, then **Open** on the bar. | Your mail app opens with that address. | |
| 7 | Sign in to a site that is not Google, **close Ferrum** (the X) and start it again. | You are still signed in. | |

## New in P3 (look and feel)

| # | What to do | What should happen | Result |
|---|---|---|---|
| 8 | In a tab on one site, click a link to **another site**. | A bar asks "Open <site> in its own profile? ..."; Continue moves the tab, Cancel stays. | |
| 9 | Open **Settings** (⚙ or Ctrl+Comma): add a start-up site, save, restart Ferrum with "Reopen the tabs from last time" unticked. | The start-up site opens; Settings still shows it. | |
| 10 | Open the **sidebar** (☰ or Ctrl+Shift+S): pick a tab, search the history, pick an entry. | The page moves right to make room; the choices work. | |

## Fixes from your first review (task p3.16)

| # | What to do | What should happen | Result |
|---|---|---|---|
| 11 | On a site that opens a file (for example a PDF) **in a new window**, start that download. | The file lands in Downloads and the bar says "Done"; the extra tab closes by itself; no "could not be loaded" page. | |
| 12 | Open a few well-known sites in tabs. | Each tab shows the **site's icon** next to its title (also in the sidebar). | |
| 13 | Look at the **taskbar** and at **Task Manager** (Processes tab, "Apps"). | The split-tile icon is easy to see; Task Manager lists Ferrum's own process as **Ferrum**. The page processes may show as a separate "WebView2 Manager" group instead of inside Ferrum's group: a known WebView2 issue (open question Q-223). | |

## The new small feature set (tasks p3.17 to p3.23)

| # | What to do | What should happen | Result |
|---|---|---|---|
| 14 | Look at Ferrum in **dark** and in **light** (Windows Settings, Personalisation, Colours, "Choose your mode"). | The Graphite look you picked, following Windows; the **split-tile logo** on the taskbar and in Task Manager. | |
| 15 | Open **Settings**, Appearance: try another **accent colour** and **Compact**, then go back. | The look changes at once, and stays after a restart. | |
| 16 | Open a **new tab** (Ctrl+T). | The new-tab page: the logo, a search box, your favourites and most visited pages. | |
| 17 | On a page, click the **star** (or Ctrl+D); rename it, put it in a folder; Ctrl+Shift+B hides and shows the bookmarks bar. | The bookmark appears in the bar or in its folder in the sidebar (Ctrl+Shift+O); clicking it opens the page. | |
| 18 | In the address bar, type a **few letters of a page you visited** earlier. | Suggestions in groups (open tabs, bookmarks, history); arrows and Enter open one; Esc closes the list; the page is never hidden under the list. | |
| 19 | Sidebar, **Backup and restore**: make a backup with a passphrase. Then (on this PC is fine) **Look inside** with a wrong passphrase, then the right one, and **Merge**. | The wrong passphrase is refused; the right one shows what is inside; after Merge nothing is lost or doubled. | |
| 20 | Your existing **history** from before this update. | Still there (carried over once into the new database). | |

Notes for the reviewer:

- Each site keeps its own cookies now (per-site profiles), so sites you signed in to during P2 (one shared profile) ask
  you to sign in again once.
- A link that opens a new window opens a new tab; some sign-in pop-ups of non-Google sites may not finish (known
  limitation, P4).
- Ferrum's log is `ferrum.jsonl` in `%LOCALAPPDATA%\dev.ferrum.desktop\logs`; it records sites as scheme and host only.
