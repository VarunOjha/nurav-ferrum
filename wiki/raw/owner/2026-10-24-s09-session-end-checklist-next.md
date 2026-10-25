# RAW SOURCE — Owner ends session s09: the P5 hand checklist is his next action (session s09, 2026-10-24)

> Immutable raw source. Transcribed by Claude on 2026-10-24. Owner words verbatim (Claude Code chat).
> Follows: [2026-10-20-s09-claude-runs-p5-gate.md](2026-10-20-s09-claude-runs-p5-gate.md).

## 1. Context

In session s09 Claude ran the P5 gate twice in its own PowerShell window. Run 4 failed one test (an order-dependent
check, fixed in 8228edd); run 5 (a2cfae4) gave 22 PASS, no FAIL and the known Q-221 WAIT; evidence committed (a9cff00).
Claude then gave the owner the four-part instruction for the P5 hand checklist (section 3 below).

## 2. The owner's words (verbatim)

> Save the above as the last output and action on me, I have to move to another session and get back to this project
> in a few days, save and update documentations accordingly.

## 3. The last output, saved as the owner asked (Claude's message, as shown to him)

The P5 gate passed every automatic check: 22 PASS and no FAIL. The only open line is the expected wiki "WAIT" for the
history cleanup owed before the first upload.

1. Where we are

| Item | State |
|---|---|
| P5 (performance numbers and network logging) | All automatic checks passed |
| Left for P5 | Your hand checks, then your sign-off |
| After that | Claude pauses; P6 starts only when you say so |

2. Why this has to run, and what it does: a robot cannot judge whether the network log feels private, so the owner
checks it by hand. He switches on measuring and the network log in the new build, browses for about 15 minutes, then
looks at what was saved: one line per request (the address and the result), and no cookies, passwords, form contents or
page text. First: close his own Ferrum (both builds use the same data folder). One-way step: afterwards keep using the
new build; its settings file gets two new sections the old build cannot read.

3. The script (PowerShell 7):

```powershell
Set-Location "C:\Users\Varun Ojha\Documents\Projects\ferrum-rust-webclient"
& ".\target\gate-release\release\ferrum-desktop.exe"
```

Then follow `docs/testing/manual-checklist-p5.md`: items 1-2 settings switches (tick, 7 days, save, restart, check);
items 3-5 browse about 15 minutes, open the network log and measuring folders and look inside; item 6 untick both,
restart, browse: nothing new is saved; items 7-8 optional, owed from earlier phases (typing after Alt+Tab; the download
security note).

4. What to tell Claude afterwards: "Checklist: 1 yes, 2 yes, … (anything odd), and P5 is signed off" (or "not signed
off, because …").

## 4. Meaning recorded by Claude

- Session s09 ends with a handoff. The owner's next action is the P5 hand checklist above. The next session first asks
  him whether he has done it; if not, it gives him this four-part instruction again.
- Not a sign-off of P5 and not a go-ahead for P6.
- The renamed locked file `target/gate-release/release/ferrum-desktop.exe.locked-15808` is deleted after his next PC
  restart (cleanup he asked for in s08).
