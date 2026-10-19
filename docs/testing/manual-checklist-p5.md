# Manual checklist for the end of P5 (measurement)

The automated checks cover what a robot can judge. These checks need a person browsing real websites. The owner does
them on the **release build the P5 gate made** at the end-of-phase review. Claude copies the answers, in the owner's
words, into `wiki/raw/evidence/phase-p5-telemetry/manual-checklist.md` (the phase page's gate list).

**Before you start:** close your own Ferrum (the one started from `target\release`). The new build uses the same data
folder, so the two cannot run at the same time. Your tabs, history and bookmarks carry over. **One-way step:** when this
build saves Settings, the settings file gains two new sections (`[telemetry]` and `[network_log]`). Your old Ferrum
does not know them: it would set the file aside as unreadable and start with the standard settings (your file is kept
next to it as `config.toml.broken-…`). So after this check, keep using the new build (or a new release build). Then
start the gate's build from the repo folder:

```powershell
& ".\target\gate-release\release\ferrum-desktop.exe"
```

## From the P5 plan

| # | What to do | What should happen | Result (yes / no + note) |
|---|---|---|---|
| 1 | Open **Settings** (⚙ or Ctrl+Comma). Look at **Measuring and network log**. | Both switches are off; both "days" fields say 14; the screen says changes apply at the next start. | |
| 2 | Tick both switches, set the measuring days to **7**, **Save**. Close Ferrum and start it again (the command above). Open Settings again. | "Saved"; after the restart both are ticked and the measuring days say 7. | |
| 3 | Browse normally for about 15 minutes: a few sites you use, a search, a video or a site you are signed in to if you like. | Ferrum behaves as before (logging does not get in the way). | |
| 4 | In Settings, click **Open the network log folder**. Open the newest folder, then a `netlog.0000.jsonl` file in Notepad. Read some lines. | One line per request: time, tab, site, full address, method, result, kind (document, image, script ...), size and `allowed` or `blocked:…`. **No** cookies, passwords, form contents, page text or headers. Full addresses can contain codes after "?" (your choice, Q-114). | |
| 5 | Click **Open the measuring folder**. | One file per start of Ferrum (names start with the date and time). The file of the running start ends in `.part`; it gets its final name when Ferrum closes. | |
| 6 | Untick both switches, **Save**, restart Ferrum, browse a little, then look into both folders again. | No new network log folder and no new measuring file after this start. | |

## Owed from earlier phases (do them now if you like; otherwise they move on again)

| # | What to do | What should happen | Result |
|---|---|---|---|
| 7 | Click into a web page, press **Alt+Tab** to another window and back, then type (for example in a search box). | The typing goes into the page without clicking it first (P2 fix; item 5 of the P3 checklist). | |
| 8 | **Download a program** you trust (for example an installer from its maker's site), then in File Explorer right-click it, **Properties**. | Microsoft's download pop-up appears first (Keep). In Properties, the General tab shows a "This file came from another computer…" security note (Mark-of-the-Web). | |

When you are done, tell Claude the results in your own words (yes / no and anything odd), item by item. Afterwards
keep using this build (see "One-way step" above).
