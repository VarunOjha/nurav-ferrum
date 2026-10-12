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
| 2 | Try **every shortcut** while typing inside a page: Ctrl+T, Ctrl+W, Ctrl+Tab, Ctrl+Shift+Tab, Ctrl+Shift+T, Ctrl+1 to Ctrl+9, Ctrl+L, Alt+Left, Alt+Right, F5, Ctrl+Shift+S, Ctrl+Comma. | Each does its job, and the page does not react to it. | |
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

Notes for the reviewer:

- Each site keeps its own cookies now (per-site profiles), so sites you signed in to during P2 (one shared profile) ask
  you to sign in again once.
- A link that opens a new window opens a new tab; some sign-in pop-ups of non-Google sites may not finish (known
  limitation, P4).
- Ferrum's log is `ferrum.jsonl` in `%LOCALAPPDATA%\dev.ferrum.desktop\logs`; it records sites as scheme and host only.
