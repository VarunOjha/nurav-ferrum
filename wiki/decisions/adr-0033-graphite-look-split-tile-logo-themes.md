---
id: adr-0033
type: decision
title: "Feature set look: Graphite (dark and metallic, follows Windows), split-tile logo, themes as swappable data"
status: accepted
updated: 2026-10-12
sources:
  - raw/owner/2026-10-12-s02-feature-set-request.md
  - raw/owner/2026-10-12-s02-feature-set-design-answers.md
  - raw/owner/2026-10-12-s02-feature-set-design-pick.md
  - raw/evidence/phase-p3-tabs-sessions/design/look-a-graphite.dc.html
  - raw/evidence/phase-p3-tabs-sessions/design/logos-4-to-9.dc.html
  - raw/evidence/phase-p3-tabs-sessions/design/canvas.json
related: [adr-0028, adr-0006, adr-0032, phase-p3-tabs-sessions, comp-app-shell]
approvable: true
date: 2026-10-12
decided_by: owner
supersedes: []
options:
  - "A. Graphite: neutral brushed grey, orange accent; tabs on top, bookmarks bar, sidebar on the left"
  - "B. Forge: near-black with an orange glow (same layout)"
  - "C. Steel: cool blue-grey (same layout)"
  - "D. Library panel on the right, Comet-style"
  - "E. Tabs down the left side"
  - "F. Search-first new tab, Comet-style"
phase: phase-p3-tabs-sessions
tags: [ui, shell, design, look-and-feel, themes, logo]
unverified:
  - claim: "WebView2 child views cannot be given rounded corners, so the page area stays a plain rectangle"
    verify_in: phase-p3-tabs-sessions
---

# ADR-0033: Feature set look: Graphite, split-tile logo, themes as swappable data

## Context

The owner asked for a refreshed look and logo with the feature set, "fun to use and ergonomic", and answered seven
design questions one at a time
([raw/owner/2026-10-12-s02-feature-set-design-answers.md](../raw/owner/2026-10-12-s02-feature-set-design-answers.md)):
dark and metallic; follow Windows light and dark; grouped address-bar suggestions; bookmarks bar plus sidebar; a new
tab with search and favourites; an "Fe" element-tile logo; and all four comfort touches (bookmark shortcuts, compact or
roomy density, gentle motion, accent colour choice).

Claude drew the options on a private Claude design canvas, <https://claude.ai/artifact/LaQHpDxGjzdqLuH8FQ7BFW>:
looks A to C, then on request layouts D to F (cues from the Comet browser as described in public reviews) and logos 1
to 9. Every site, title and number on the canvas is a sample value.

[adr-0028](adr-0028-browser-look-tabs-top-ferrum-panel.md) (10 Oct) set the layout (tabs on top, toolbar, website,
Ferrum panel on the right) and a calm warm-grey look with one rust-orange accent.

## Options considered

| Option | Good | Bad |
|---|---|---|
| **A. Graphite** | Neutral, calm for long days; metallic without being loud; keeps adr-0028's layout | Less character than B |
| B. Forge | Most "forged iron"; orange glow on active parts | Glow can tire the eye; near-black is harsh in light rooms |
| C. Steel | Cool, technical | Blue-grey fights the orange accent |
| D. Library panel on the right | Comet-like; history and bookmarks beside the page | Takes width from the page; no bookmarks bar as drawn |
| E. Tabs down the left | Good with many tabs | Changes adr-0028's tabs-on-top layout |
| F. Search-first new tab | Fast start from search | The owner had already chosen search plus favourites |

Logos: 1 graphite with an orange edge, 2 orange tile, 3 glowing letters, 4 two-tone monogram, 5 full element tile,
6 hex nut, 7 ingot, **8 split tile**, 9 coin.

## Decision

### Owner decision (verbatim)

From [raw/owner/2026-10-12-s02-feature-set-design-pick.md](../raw/owner/2026-10-12-s02-feature-set-design-pick.md):

> Well, A graphite, but 8 split title for icon for now

> When you structure the layout + theme, let's do so in a way that the future can have multiple themes. Like themes can be configured in the future is all

and the seven design answers in
[raw/owner/2026-10-12-s02-feature-set-design-answers.md](../raw/owner/2026-10-12-s02-feature-set-design-answers.md).

The quoted choices are what `decided_by: owner` and `status: accepted` cover (SCHEMA §10.4 rule 3(b)): look A with
Graphite colours; logo 8, the split tile, "for now"; themes that can be configured in the future.

### Claude elaboration (binding only once the owner APPROVES this ADR)

**Look (frozen as [look-a-graphite.dc.html](../raw/evidence/phase-p3-tabs-sessions/design/look-a-graphite.dc.html), its
default settings: Graphite, dark, typing).**

- Layout as adr-0028 and the canvas: the normal Windows title bar, tabs on top, a toolbar with the address bar (star for
  bookmarks), a slim bookmarks bar (favourites only, hideable with Ctrl+Shift+B), the sidebar on the left (Tabs,
  Bookmarks with folders, History, and "Backup and restore…"), the website area, and adr-0028's Ferrum panel on the
  right when it is opened. The bookmarks bar has no drop-down folders, because a list over the page would be hidden
  under it (issue 15682); folders live in the sidebar.
- Grouped suggestions under the address bar: Open tabs, Bookmarks, History; matched letters in the accent colour;
  keyboard hints along the bottom. p3.20 decides how the list stays visible above the page.
- New tab: Fe logo, a large search box, favourites tiles, most visited.
- Graphite colours: dark (ground `#141619`, surfaces `#1D2024` / `#24282C`, borders `#383D43`, text `#E9ECEF`, muted
  `#A2A9B1`) and light (ground `#F2F3F4`, surfaces `#E4E6E8` / `#FFFFFF`, borders `#C9CED3`, text `#1A1D20`, muted
  `#59616A`), with a faint brushed texture on the tab strip. Accent orange `#F97316` in dark, `#C2410C` in light (for
  contrast). IBM Plex Sans and Mono, bundled with the app (adr-0028).
- The canvas draws the page area with rounded corners in some layouts; whether a WebView2 child view can be rounded is
  UNVERIFIED[phase-p3-tabs-sessions]. If not, the page area stays a plain rectangle.

**Logo 8, split tile (frozen in [logos-4-to-9.dc.html](../raw/evidence/phase-p3-tabs-sessions/design/logos-4-to-9.dc.html)).**
A rounded square cut on the diagonal, orange top-left and graphite bottom-right, with "Fe": the F dark on orange, the e
light on graphite. It replaces p3.16's orange "F" icon in the program, window and taskbar. Because the owner said
"for now", the logo is one SVG source (`icons/app-icon.svg`) from which all sizes are generated, so a later change is
one file.

**Themes as swappable data (the owner's request for future themes).**

- **A theme is data, not code.** Each theme is one record of named design tokens: ground, surfaces, borders, text,
  muted text, selection, accent, accent-on-light, texture, shadow and glow, for light and dark. The shell's styles use
  only these token names (CSS custom properties); no colour is written anywhere else. Layout, spacing and fonts are
  separate tokens, so a theme cannot break the layout.
- **Built in now:** Graphite (the only theme in this feature set). Accent colour (orange, blue, green, violet) and
  density (roomy, compact) are user settings applied on top of any theme. Light or dark follows Windows.
- **Ready for later:** adding Forge or Steel is adding a token record and a name in Settings; no shell code changes. A
  theme picker in Settings comes when a second theme exists.
- **User-made themes later, safely:** if themes are ever loaded from files, Ferrum reads only the known token names and
  accepts only colour values and the few allowed texture or shadow forms; anything else is refused. A theme file can
  never carry CSS, script or web addresses, and the shell's content security policy stays as it is (adr-0006).
- Settings store the theme name, accent and density in the versioned settings file (p3.4), so a later theme change
  needs no migration.

## Consequences

### Positive

- Ferrum gets the dark, metallic, comfortable look the owner chose, with a logo that is easy to spot in the taskbar.
- New themes later are data plus one Settings entry, with no shell rewrite.

### Negative

- This changes adr-0028's colours (calm warm grey). adr-0028's layout and panel stay. adr-0028 is not edited (that
  would stale its approval); this ADR records the change and points back to it.
- Every shell colour must go through tokens, which p3.22 checks (a test fails on any colour written outside the theme
  file).
- Gentle motion is not visible on a still canvas; p3.22 keeps it short and turns it off when Windows' "reduce
  animations" setting is on.

## Verification / evidence

- Owner's words: the three raw files in `sources`.
- Frozen design, byte-for-byte copies of the canvas source on 2026-10-12 (mask check: no private values; they need the
  canvas runtime to draw, like adr-0028's frozen file):
  [look-a-graphite.dc.html](../raw/evidence/phase-p3-tabs-sessions/design/look-a-graphite.dc.html) (all looks; Graphite
  is its default), [logos-4-to-9.dc.html](../raw/evidence/phase-p3-tabs-sessions/design/logos-4-to-9.dc.html) (logo 8 is
  `split`), [canvas.json](../raw/evidence/phase-p3-tabs-sessions/design/canvas.json) (the canvas index).
- Design canvas: <https://claude.ai/artifact/LaQHpDxGjzdqLuH8FQ7BFW> (private to the owner).
- When built: p3.22's light and dark screenshots compared with the frozen design by the owner; its token test.
