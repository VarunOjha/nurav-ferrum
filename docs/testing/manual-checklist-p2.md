# Manual checklist for the end of P2 (first working app)

The automated checks cover what a robot can judge. These five checks need a person and real websites. The owner does
them on the **release build** at the end-of-phase review. Claude copies the answers, in the owner's words, into
`wiki/raw/evidence/phase-p2-minimal-container/manual-checklist.md` (the phase page's gate list).

Start the release build from the repo folder:

```powershell
& ".\target\release\ferrum-desktop.exe"
```

| # | What to do | What should happen | Result (yes / no + note) |
|---|---|---|---|
| 1 | Visit five HTTPS sites of your choice by typing them in the address bar (no Google sign-in). On each, use back, forward and refresh. | Each site loads; the lock shows; back, forward and refresh work like in a browser. | |
| 2 | Click a mail link (`mailto`), for example on a contact page. | A bar asks "Open this link outside Ferrum?". Cancel opens nothing. Open starts your mail app with that address. | |
| 3 | Sign in to one site that is **not** Google. Close Ferrum and start it again. | You are still signed in. | |
| 4 | Disconnect the network (Wi-Fi off or cable out), then open a site. Reconnect and press "Try again". | Ferrum shows its own error panel ("could not be loaded"). After reconnecting, "Try again" loads the site. | |
| 5 | Click into a page, switch to another app with Alt+Tab, and Alt+Tab back. Type something. | The typing goes into the page without clicking it first (the known issue from P1, fixed in P2). | |

Notes for the reviewer:

- The release build has no developer tools (F12 does nothing): that is intended (task p2.12).
- A Google sign-in shows a bar "Google sign-in must open in your normal browser" with "Open in browser": that is
  intended (task p2.13, the owner's answer to question 109). Please do not use Google sign-in for check 3.
- Ferrum's log is `ferrum.jsonl` in `%LOCALAPPDATA%\dev.ferrum.desktop\logs`. It records sites as scheme and host
  only.
