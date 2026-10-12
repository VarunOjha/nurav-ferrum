---
id: adr-0028
type: decision
title: "Browser look: tabs on top, Ferrum panel on the right"
status: accepted
updated: 2026-10-11
sources:
  - raw/owner/2026-10-10-s01-browser-ui-design-request.md
  - raw/owner/2026-10-10-s01-browser-ui-design-answers-1.md
  - raw/owner/2026-10-10-s01-browser-ui-choice.md
  - raw/evidence/phase-p0-planning/browser-ui/option-a.dc.html
related: [adr-0006, adr-0007, adr-0008, adr-0015, adr-0026, comp-app-shell, comp-tab-content, comp-resource-manager, comp-telemetry, comp-network-logger, comp-security-engine, phase-p2-minimal-container, phase-p3-tabs-sessions, phase-p4-security, phase-p5-telemetry, phase-p7-lifecycle, phase-p1-foundation, ov-open-questions]
approvable: true
date: 2026-10-10
decided_by: owner
supersedes: []
options:
  - "A. Tabs on top, Ferrum panel docked on the right (memory, CPU, sleeping tabs, blocked sites, network log)"
  - "B. Tabs on top, slim status bar along the bottom that opens a drawer"
  - "C. Tabs on top, one toolbar button next to the address bar that opens a pop-over card"
phase: phase-p0-planning
tags: [ui, shell, design, browser-controls]
unverified:
  - claim: "Per-tab memory and CPU can be read for the Ferrum panel"
    verify_in: phase-p5-telemetry
  - claim: "A custom title bar with tabs in it resizes reliably under Tauri on Windows 11 (issue #12207)"
    verify_in: phase-p3-tabs-sessions
---

# ADR-0028: Browser look: tabs on top, Ferrum panel on the right

## Context

The Architecture view showed what the browser is made of, but not how it looks. The owner asked for a design,
in light and dark mode, with several options, taking some inspiration from the Comet browser by Perplexity
([raw/owner/2026-10-10-s01-browser-ui-design-request.md](../raw/owner/2026-10-10-s01-browser-ui-design-request.md)).

Comet is built around an AI assistant side panel. Ferrum's plan has no AI assistant. In round 1 the owner chose
"Ferrum's own panel" for that space (memory and CPU per tab, sleeping tabs, blocked sites, network-call log), tabs
across the top, and asked to see options for how the panel appears
([raw/owner/2026-10-10-s01-browser-ui-design-answers-1.md](../raw/owner/2026-10-10-s01-browser-ui-design-answers-1.md)).

Claude drew three options on a Claude design canvas, each in light and dark, all with tabs on top:
<https://claude.ai/artifact/YTbBgjDsSJyuNPk8hk3wra> (private to the owner). These are mockups only: no Ferrum
application code exists (P0). Every number, site and log line on the canvas is a **sample value**; nothing is measured.

## Options considered

| Option | Good | Bad |
|---|---|---|
| A. **Ferrum panel docked on the right** | Everything Ferrum knows about your tabs is visible at a glance; closest to Comet's side-panel layout, which the owner named as inspiration | Takes about 352 px of width from the website while it is open |
| B. Slim status bar along the bottom, opens a drawer | Website keeps almost the full window | Details are one click away; a drawer covers part of the page |
| C. One toolbar button with a pop-over card | Least screen space; the familiar extension-button pattern | Information is hidden until clicked; little room for the network log |

## Decision

### Owner decision (verbatim)

From [raw/owner/2026-10-10-s01-browser-ui-choice.md](../raw/owner/2026-10-10-s01-browser-ui-choice.md):

> I like Option A, let's go with it now. Can we add it to the interactive plan document

This quoted choice of option A is what `decided_by: owner` and `status: accepted` cover (SCHEMA §10.4 rule 3(b)).
The frozen record of option A is the design file
[raw/evidence/phase-p0-planning/browser-ui/option-a.dc.html](../raw/evidence/phase-p0-planning/browser-ui/option-a.dc.html)
(light mode as drawn; dark mode is the same file with its `dark` switch on; both colour sets are inside the file).

### Claude elaboration (binding only once the owner APPROVES this ADR)

Option A, as drawn, has these parts, top to bottom and left to right:

- **Tab strip across the top.** Rounded tabs with the site icon and title; Windows 11 window buttons (minimise,
  maximise, close) at the right end. A sleeping tab shows a moon and greyed text.
- **Toolbar.** Back, forward, reload; a rounded address bar ("pill") with a lock for a secure site; a shield
  button with a badge counting what was blocked on this page; a button that shows or hides the Ferrum panel; a menu.
- **Website area.** The active tab's website fills the middle (its own child web view, [adr-0007](adr-0007-child-webviews.md)).
- **Ferrum panel on the right** (about 352 px wide), titled "Ferrum":
  - three stat cards: memory of all tabs, CPU, number of sleeping tabs;
  - **TABS · MEMORY**: one bar per tab with its state: *Active*, *Idle · goes to sleep in N min*, or *Sleeping*;
  - **BLOCKED ON THIS PAGE**: the sites the blocklist stopped ([adr-0015](adr-0015-navigation-posture-open-blocklist.md));
  - **NETWORK LOG · THIS TAB**: method, address, status and size per request, with the note
    "Addresses and sizes only, never page content" and an "Open log folder" button
    ([adr-0008](adr-0008-network-logging-metadata-jsonl.md)).
- **Look.** Calm warm-grey surfaces, one rust-orange accent, rounded corners, IBM Plex Sans for text and
  IBM Plex Mono for numbers and log lines. Light and dark mode.
- **No AI assistant.** The panel is Ferrum's own information, not a chat.

Claude's proposals for building it (also binding only once the owner approves this ADR):

- **Empty sections until their data exists.** Until the phase that feeds a panel section lands (see Consequences),
  that section stays empty or hidden.
- **Fonts bundled with the app.** The IBM Plex fonts would be bundled locally rather than loaded from the web,
  because the shell is meant to load no remote resources under a strict content security policy
  ([adr-0006](adr-0006-shell-ui-vanilla-ts-vite.md)); the strict policy works, fonts loaded from the app's own files
  included (`font-src 'self'`; verified in P2, [check-p2.3](../raw/evidence/phase-p2-minimal-container/check-p2.3.txt)). P2 does not bundle the fonts yet. The design file loads the fonts from Google Fonts only because it is a mockup.

## Consequences

### Positive

- The owner and every later phase share one picture of the browser. The Architecture view's Application group
  links to it ([adr-0026](adr-0026-architecture-four-groups.md)).
- The panel puts Ferrum's research purpose (memory, sleeping tabs, blocking, network log) in front of the user.

### Negative

- **Width.** The panel takes about 352 px from the website while open. The panel toggle hides it. Under the
  child web view model, shell parts never overlap the website area ([comp-app-shell](../architecture/components/comp-app-shell.md)),
  so the website area shrinks instead.
- **The panel's content depends on later phases.** Memory and CPU per tab come from measurement (P5,
  [comp-telemetry](../architecture/components/comp-telemetry.md)); the blocked list and shield count from the
  blocklist (P4, [comp-security-engine](../architecture/components/comp-security-engine.md)); the network log from
  P5 ([comp-network-logger](../architecture/components/comp-network-logger.md)); sleeping tabs and "goes to sleep
  in N min" from tab lifecycle (P7, [comp-resource-manager](../architecture/components/comp-resource-manager.md)).
  Whether per-tab memory and CPU can be read at all is UNVERIFIED[phase-p5-telemetry].
- **Tabs in the title bar need a custom title bar.** Option A as drawn puts the tabs in the window's top bar, next
  to the Windows 11 window buttons. That needs a custom title bar, which the shell's design notes
  ([comp-app-shell](../architecture/components/comp-app-shell.md)) advise against at first, because of a known
  resize problem (Tauri issue #12207, UNVERIFIED[phase-p3-tabs-sessions]; re-targeted in P1: spike S1 used the normal Windows title bar, so the custom-title-bar case was not tested; it belongs with the title-bar question Q-125 before P3). Until it is checked, the early shell
  may show the normal Windows title bar above the tab strip. Open question
  [Q-125](../overview/ov-open-questions.md#q-125-tabs-in-the-windows-top-bar-custom-title-bar-or-the-normal-windows-title-bar-first)
  asks the owner which way to go.
- **Network log stays metadata only** ([adr-0008](adr-0008-network-logging-metadata-jsonl.md)): addresses, method,
  status and size, never page content. Whether full addresses are shown or partly hidden follows the open question
  on address redaction in that decision (Q-114).
- **Numbers on the design are samples.** No Ferrum code exists yet; nothing on the canvas is measured.
- The shell UI stays vanilla TypeScript ([adr-0006](adr-0006-shell-ui-vanilla-ts-vite.md)).

## Verification / evidence

- Owner's words: the three raw files listed in `sources`.
- Frozen design: [raw/evidence/phase-p0-planning/browser-ui/option-a.dc.html](../raw/evidence/phase-p0-planning/browser-ui/option-a.dc.html)
  (byte-for-byte copy of the canvas source of option A, 2026-10-10; mask check: no private values). It is the
  source text only: it needs the design canvas's runtime script (`support.js`, not frozen) to draw, so opened on its
  own it shows nothing, but its palettes and content can be read in the file.
- Design canvas (all three options, light and dark): <https://claude.ai/artifact/YTbBgjDsSJyuNPk8hk3wra>.
- When the shell is built (P2 onward), its screenshots are compared with this design by the owner at each phase review.
