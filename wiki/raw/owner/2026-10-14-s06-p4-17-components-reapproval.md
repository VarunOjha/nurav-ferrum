# RAW SOURCE — Owner re-approves two component pages after p4.17 (session s06, 2026-10-14)

> Immutable raw source. Transcribed by Claude on 2026-10-14. Owner answer verbatim (Claude Code chat, AskUserQuestion).
> Follows: [2026-10-14-s06-p4-16-reapproval-and-mishap.md](2026-10-14-s06-p4-16-reapproval-and-mishap.md).

## 1. Context

Task p4.17 (commit cb7286c) updated comp-app-shell and comp-security-engine in the same commit as the code, which
staled their approvals; both are in the P4 dependency set, so p4.18 waited.

## 2. The question

"p4.17 changed two part pages. Browser controls: the settings screen now has blocked sites, per-site permission tick
boxes and a 'Clear data' button per site, and plain-HTTP pages show a 'not secure' bar. Security policy: the screen now
edits its lists. Tests set everything in the screen, restart Ferrum, and confirm it is kept and enforced; websites
still cannot reach these settings. Re-approve both?"

Options offered: "Re-approve both (Recommended)" ("Claude records it and continues with p4.18: switching SmartScreen
back on, starting with the research note.") and "Show me the changes first".

## 3. The owner's answer (verbatim)

> Re-approve both (Recommended)

## 4. Meaning recorded by Claude

Approved as the pages stand at transcription: comp-app-shell, comp-security-engine. P4 continues with p4.18.
