# RAW SOURCE — Owner's design answers for the new feature set (session s02, 2026-10-12)

> Immutable raw source. Transcribed by Claude on 2026-10-12. Owner answers given in Claude Code chat through the
> question tool, one question at a time, in order. The owner's selection is recorded exactly as chosen; the option
> descriptions are Claude's wording shown with the question.
> Follows: [2026-10-12-s02-feature-set-request.md](2026-10-12-s02-feature-set-request.md).

## 1. Context

The feature set plan was committed (`d28179a`): tasks p3.17 to p3.23 on the P3 page and adr-0032 (proposed). Task p3.17
asks the owner the design questions one at a time, then shows options on a Claude design canvas. The plan itself is
not yet approved.

## 2. Answers (verbatim selections)

| # | Question (as asked) | Owner's selection | Option description shown |
|---|---|---|---|
| 1 | Design question 1 of about 6: what overall feel should Ferrum have? | **Dark and metallic** | Dark first, iron and graphite tones (Ferrum means iron) with an orange glow. Techy look. |
| 2 | Question 2: you chose dark and metallic. How should light mode work? | **Follow Windows (Recommended)** | Ferrum follows the Windows light or dark setting. Dark is the main design, and a matching light version is drawn too. |
| 3 | Question 3: when you type in the address bar, how should the suggestions look? | **Grouped list (Recommended)** | A drop-down list in groups: Open tabs, Bookmarks, History. Each row has the site icon, title and address; matched words are highlighted. |
| 4 | Question 4: where should your bookmarks live? | **Bar + sidebar (Recommended)** | A slim bookmarks bar under the address bar for favourites (can be hidden), and the full list with folders in the sidebar. |
| 5 | Question 5: what should a new, empty tab show? | **Search + favourites (Recommended)** | A big address/search box in the middle, your bookmarks bar favourites as tiles, and your most visited sites. Fast to start from. |
| 6 | Question 6: which direction for the logo? (I'll draw 2 or 3 versions of your choice on the canvas.) | **Iron element tile (Recommended)** | Ferrum is Latin for iron: a periodic-table style tile reading "Fe" with 26, in brushed graphite with an orange edge. Fits the metallic look. |
| 7 | Last question (7): which comfort touches do you want? Pick any. (several allowed) | **Bookmark shortcuts, Compact / roomy switch, Subtle motion, Accent colour choice** (all four) | Ctrl+D bookmarks the page, Ctrl+Shift+B shows or hides the bookmarks bar, Ctrl+Shift+O opens all bookmarks in the sidebar; a density setting, compact or roomy; short, gentle animations, off when Windows' "reduce animations" is on; orange accent by default, another accent (blue, green, violet) in Settings. |

## 3. Meaning recorded by Claude

- Design direction for the canvas: dark and metallic as the main design, with a matching light version; Ferrum
  follows the Windows setting.
- This changes the look recorded in adr-0028 (calm warm-grey surfaces, rust-orange accent, light and dark). The layout
  of adr-0028 (tabs on top, toolbar, Ferrum panel on the right) is not questioned by these answers. The new look is
  recorded in a new ADR once the owner picks from the canvas.
- Address-bar suggestions grouped (open tabs, bookmarks, history). Bookmarks bar for favourites plus the full list in
  the sidebar. The bookmarks bar shows favourites only; folders live in the sidebar, because a drop-down over the page
  would be hidden under it (z-order constraint, issue 15682).
- New-tab page: search box, favourites tiles, most visited sites.
- Logo: an iron element tile ("Fe", 26), brushed graphite with an orange edge; 2 or 3 versions on the canvas.
- Comfort touches: all four.
- These are design answers, not the approval of the feature set plan or of adr-0032.
