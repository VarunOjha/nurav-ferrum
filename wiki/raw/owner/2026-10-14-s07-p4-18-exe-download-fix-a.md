# RAW SOURCE — Owner chooses fix A for program downloads held by SmartScreen (session s07, 2026-10-14)

> Immutable raw source. Transcribed by Claude on 2026-10-14. Owner answer verbatim (Claude Code chat, AskUserQuestion).
> Follows: [2026-10-14-s07-p4-18-exe-download-find-cause.md](2026-10-14-s07-p4-18-exe-download-find-cause.md).

## 1. Context

Claude's finding, reported in chat: with SmartScreen on, a program download (setup.exe from the local test server)
appears in the folder but WebView2 never reports it completed or interrupted (watched for 120 s, temporary diagnostic
test); the partial file is removed when Ferrum closes; other file types are not affected. Most likely reading (not
confirmed by a Microsoft page): SmartScreen waits for a "Keep or delete?" answer in WebView2's own download pop-up,
which Ferrum hides (Handled = true since p3.8). No WebView2 function was found that lets an app answer "Keep" itself.

## 2. The question

"SmartScreen holds every unknown program download, waiting for a "Keep or delete?" answer in WebView2's pop-up, which
Ferrum hides, so the download hangs. Which fix should Claude build?"

Options offered: "A: show pop-up for programs (Recommended)" ("For program files only, Ferrum lets WebView2's own
download pop-up show, so Microsoft's Keep/Delete question appears. Ferrum's list still tracks it. The tests are changed
to expect this; you check 'Keep' by hand once."), "B: Ferrum shows 'held'" and "C: commit as is, decide later".

## 3. The owner's answer (verbatim)

> A: show pop-up for programs (Recommended)

## 4. Meaning recorded by Claude

For program files only, Ferrum stops hiding WebView2's own download pop-up, so SmartScreen's question can appear;
Ferrum's download list keeps tracking the download and its warning. The automated tests are changed to expect this.
The owner checks "Keep" by hand once (a manual item).
