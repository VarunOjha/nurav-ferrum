# RAW SOURCE — Owner picks the browser UI design (session s01, 2026-10-10)

> Immutable raw source. Transcribed by Claude on 2026-10-10. Follows
> `2026-10-10-s01-browser-ui-design-request.md` and `2026-10-10-s01-browser-ui-design-answers-1.md`.

## 1. What the owner saw

Design canvas "Ferrum Browser UI": https://claude.ai/artifact/YTbBgjDsSJyuNPk8hk3wra, three options, each light and dark,
tabs across the top in all of them:
- A: Ferrum panel on the right (memory per tab, CPU, sleeping tabs, blocked sites, network log with "Open log folder").
- B: status bar along the bottom that opens a drawer.
- C: one toolbar button next to the address bar that opens a pop-over card.
Calm warm-grey look, rounded tabs and address bar, one rust-orange accent; IBM Plex Sans. All numbers, sites and log
lines on the canvas are sample values; nothing is measured.

## 2. The owner's words (verbatim, Claude Code chat)

> I like Option A, let's go with it now. Can we add it to the interactive plan document

## 3. Claude's note

"The interactive plan document" = the read-only plan portal (`interactive_plan/`). The design goes into the
Architecture view's Application group, and the choice is recorded as an owner decision (ADR).
