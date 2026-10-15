# RAW SOURCE — Owner asks Claude to fix the self-test probe's data folder and rerun (session s07, 2026-10-15)

> Immutable raw source. Transcribed by Claude on 2026-10-15. Owner answer verbatim (Claude Code chat, AskUserQuestion).

## 1. Context

The first run of the p4.11 security suite (2026-10-15 12:09) failed at the IPC self-test: its probe view (an extra
Tauri view that loads the stand-in website) was not created. Cause found by Claude: the self-test fix of 2026-10-14
(commit 3014814) gave the self-test its own settings and data folder, which the shell view uses, but the probe view
was built without a data folder, so it used the default one, the owner's real Ferrum data folder. In the p4.8 check of
2026-10-14 about 16:03 the probe most likely ran there next to the owner's open Ferrum; after p4.18 its browser
switches differ from the running Ferrum's, so WebView2 refused to create it there (2026-10-15 12:10). Whether anything
was written in the real folder was not checked. The evidence note selftest-own-folder.txt is true only for the shell
view. Tabs, history, bookmarks and the settings file are not written in self-test mode.

## 2. The question

"My self-test fix missed one part: its probe view (the stand-in website) still used your real Ferrum data folder
(yesterday about 16:03, and it was refused today). How should Claude go on?"

Options offered: "Fix it, then rerun (Recommended)" ("The probe view gets the self-test's throwaway folder too, and
Ferrum refuses a probe without one. Claude reruns the suite and corrects the wording that said the self-test stayed in
its own folder."), "Check my data folder first" and "Stop here for today".

## 3. The owner's answer (verbatim)

> Fix it, then rerun (Recommended)
