# RAW SOURCE — Owner chooses to fix the self-test's use of the real data folder first (session s07, 2026-10-14)

> Immutable raw source. Transcribed by Claude on 2026-10-14. Owner answer verbatim (Claude Code chat, AskUserQuestion).

## 1. Context

During p4.18, before running anything, Claude found that Ferrum's built-in self-test (environment variable
FERRUM_SELFTEST; used by the checks of p2.3, p2.6, p4.8 and p4.17 through scripts/lib/Ferrum.SelfTest.ps1, and by
p2.12 and p2.14) starts Ferrum without its own settings file or data folder, so it uses the owner's real settings file
and real WebView2 data folder. The p4.17 check ran it at about 15:00 on 2026-10-14 while the owner's own Ferrum
(pid 384) was open. Tabs, history and bookmarks are not written in self-test mode (kept in memory). Claude had not
checked the data folder for actual changes. Claude stopped and reported before fixing.

## 2. The question

"The built-in self-test uses your real Ferrum settings and browser data (today's p4.17 check probably did, while your
Ferrum was open). What should Claude do?"

Options offered: "Fix it first (Recommended)" ("A small separate fix: the self-test gets its own throwaway settings and
data folder, like the live tests, and refuses to start without them. Committed on its own, then p4.18 continues."),
"Avoid it, fix later" and "Check my data first".

## 3. The owner's answer (verbatim)

> Fix it first (Recommended)

## 4. Meaning recorded by Claude

Before p4.18 continues: every self-test start gets its own throwaway settings file and data folder, and Ferrum refuses
to run a self-test without them. Committed on its own. The owner did not ask for his data folder to be inspected.
