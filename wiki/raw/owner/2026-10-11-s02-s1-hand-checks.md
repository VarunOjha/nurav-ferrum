# RAW SOURCE — Owner's hand checks of spike S1 (session s02, 2026-10-11 14:16)

> Immutable raw source. Transcribed by Claude on 2026-10-11. Owner words verbatim (Claude Code chat).
> Claude ran `spikes/s1-multiwebview/run-manual.ps1` at the owner's request ("Run it for me I will check"); the owner used the window.
> Follows: [2026-10-11-s02-p1-design-and-questions.md](2026-10-11-s02-p1-design-and-questions.md).

## 1. First report (verbatim)

> So, CTRL +A,C,V,Z works. Resize works, maximize and minimize works. ALT + Tab is not changing b/w tab1 , tab2, tab3, I mean clicking them does , alt tab switches between other apps I have in windows is all. Assess and factor it in

Claude's reply in short: Alt+Tab switches Windows apps by design (tab switching inside an app is Ctrl+Tab, not built in the
spike); the check is whether, after Alt+Tab away and back without clicking, typing reaches the page (Tauri issue 13466).

## 2. Second report (verbatim)

> Not able to alt back, I have to click the ferrum window to select and then type xyz works. Might as well, mark this is known issue to fix more later for now anyways ?

## 3. Meaning recorded by Claude

- Text-editing shortcuts in a tab (Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+Z): PASS (issue 9257 not seen).
- Resize, maximise, minimise: PASS.
- Keyboard focus after Alt+Tab: FAIL. Returning to the window with Alt+Tab did not let typing reach the tab; after a click on
  the window, typing works (issue 13466 seen on this machine).
- Owner decision: mark it as a known issue to fix later; it does not block P1.
