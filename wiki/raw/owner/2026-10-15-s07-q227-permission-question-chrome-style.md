# RAW SOURCE — Owner asks for a Chrome-style permission question (session s07, 2026-10-15)

> Immutable raw source. Transcribed by Claude on 2026-10-15. Owner words verbatim (Claude Code chat; the last answer
> through AskUserQuestion).
> Follows: [2026-10-15-s07-p4-19-phase-reapproval.md](2026-10-15-s07-p4-19-phase-reapproval.md).

## 1. Context

While waiting for the P4 exit-gate rerun, Claude summarised Phase 4. The owner asked:

> Wait, I will not get prompted for audio, camera permissions ?

Claude confirmed (code read: `crates/security/src/permissions.rs`, adr-0015 rule 7, task p4.5): a site's request for
the camera, microphone, location, notifications or the clipboard is refused without any message unless the site was
granted that kind in Settings (p4.17). Claude offered A (keep as is), B (a notice bar, still no question) and C (a
real "Allow / Block" question like Chrome, which needs a new decision and more security tests).

## 2. The owner's request (verbatim)

> Can we change and make it like Chrome please

## 3. The question

"How should Ferrum's new "Allow / Block" question for camera, microphone, location, notifications and clipboard
behave?"

Options offered:

- "Chrome-style (Recommended)": "Bar under the toolbar: "site.com wants to use your camera" with Allow this time,
  Always allow on this site, Never allow. Choices are saved in Ferrum Settings and can be changed there. Plain http
  pages and frames from another site inside a page are still refused without asking. Closing the question 3 times on a
  site stops it asking for a week."
- "Simpler: Allow / Block": "Same bar with only Allow and Block, both remembered for the site in Settings. Fewer
  buttons, but no "just this once"."
- "Ask every time": "Allow / Block each time, nothing remembered (except what you tick in Settings). Most private, but
  video-call sites ask on every visit."

## 4. The owner's answer (verbatim)

> Chrome-style (Recommended)

## 5. Meaning recorded by Claude

Registered as Q-227 (asked and answered the same turn). The owner chose the Chrome-style question with the rules quoted
in the first option. Claude elaborates the details in adr-0034 and plans the work as task p4.20 on the P4 page, before
the P4 exit gate. The elaboration binds only when the owner approves adr-0034 and the changed P4 page.
