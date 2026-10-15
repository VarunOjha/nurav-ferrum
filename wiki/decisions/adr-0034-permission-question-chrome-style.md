---
id: adr-0034
type: decision
title: "Sites ask before using the camera, microphone, location, notifications or clipboard (Chrome-style question)"
status: accepted
updated: 2026-10-15
sources:
  - raw/owner/2026-10-15-s07-q227-permission-question-chrome-style.md
related: [adr-0015, phase-p4-security, comp-security-engine, comp-webview-manager, comp-app-shell, qual-security-testing-plan]
approvable: true
date: 2026-10-15
decided_by: owner
supersedes: []
options:
  - "A. Keep: refuse silently unless the site is ticked in Settings"
  - "B. Refuse, but show a notice bar that points to Settings"
  - "C1. Chrome-style question: Allow this time, Always allow on this site, Never allow"
  - "C2. Simpler question: Allow or Block, both remembered"
  - "C3. Question every time, nothing remembered by the question"
phase: phase-p4-security
tags: [security, permissions, privacy, ui]
unverified:
  - claim: "A WebView2 PermissionRequested event can be held open (deferral) while the shell asks the user, and answered later with Allow or Deny"
    verify_in: phase-p4-security
  - claim: "WebView2 reports the asking frame's origin in the PermissionRequested arguments, so a request from another site's frame can be told apart from the page's own"
    verify_in: phase-p4-security
---

# ADR-0034: Sites ask before using the camera, microphone, location, notifications or clipboard

## Context

Task p4.5 built [adr-0015](adr-0015-navigation-posture-open-blocklist.md) rule 7: every permission is "denied by
default, with per-site grants stored in Ferrum settings". Task p4.17 added the Settings boxes for those grants. A site
that asks for the camera is therefore refused **without any message**; the user must know to open Settings first. A
video-call site simply fails.

After the P4 summary the owner asked "I will not get prompted for audio, camera permissions?" and then "Can we change
and make it like Chrome please". Claude offered three ways to ask (C1 to C3 below).

This ADR keeps adr-0015 rule 7 as it stands: nothing is allowed until the user chooses, and Ferrum's settings, not the
WebView2 profile, remember the choice. It adds a second way to make a per-site grant: answering a question.

## Options considered

| Option | Good | Bad |
|---|---|---|
| A. Keep (silent refusal) | Nothing can be clicked by mistake | Sites fail with no reason shown |
| B. Notice bar to Settings | The reason is visible | Still two steps for every site |
| **C1. Chrome-style question** | Familiar; "just this once" exists; remembered choices are editable in Settings | More states to build and test |
| C2. Allow / Block, remembered | Fewer buttons | No "just this once" |
| C3. Ask every time | Most private | Video-call sites ask on every visit |

## Decision

### Owner decision (verbatim)

From [raw/owner/2026-10-15-s07-q227-permission-question-chrome-style.md](../raw/owner/2026-10-15-s07-q227-permission-question-chrome-style.md),
answering Q-227:

> Chrome-style (Recommended)

The option the owner chose reads: "Bar under the toolbar: "site.com wants to use your camera" with Allow this time,
Always allow on this site, Never allow. Choices are saved in Ferrum Settings and can be changed there. Plain http
pages and frames from another site inside a page are still refused without asking. Closing the question 3 times on a
site stops it asking for a week."

The quoted choice is what `decided_by: owner` and `status: accepted` cover (SCHEMA §10.4 rule 3(b)).

### Claude elaboration (binding only once the owner APPROVES this ADR)

**Which requests get a question.** Only these five kinds: camera, microphone, location, notifications, clipboard read.
Every other kind Ferrum knows (sensors, several automatic downloads, files, autoplay, local fonts, MIDI, window
placement) and every kind it does not know stays as today: refused unless ticked in Settings, no question.

**When there is no question (refused at once, logged as today).**

- The page is not an `https:` page with a site (plain `http:` including `localhost`, `data:`, `file:`, ...).
- The asking frame belongs to a different site than the tab's page (compared by registrable domain, the same key the
  per-site profiles use).
- The site has "Never allow" for that kind in Settings.
- The site closed the question 3 times in a row for that kind; it is quiet for 7 days from the third close.

A site with "Always allow" for that kind gets it without a question (as p4.5 does today).

**The question.** A bar between the toolbar and the page of the asking tab, in the Graphite look: the site's name (the
registrable domain, never text from the page) and what it wants ("wants to use your camera"). Camera and microphone
asked together become one bar ("camera and microphone"). Buttons: **Allow this time**, **Always allow on this site**,
**Never allow**, and **×** (close).

| Answer | Effect now | Remembered |
|---|---|---|
| Allow this time | Allowed | No. Lasts while the tab stays on that site; ends when the tab leaves the site, reloads or closes |
| Always allow on this site | Allowed | Yes: the kind is ticked for the site in Settings |
| Never allow | Refused | Yes: saved as "never" for the site in Settings |
| × (close) | Refused | Only the count towards the 7-day quiet time |

The request waits for the answer. If the tab navigates to another page, reloads or closes first, the request is
refused. The bar shows only on its own tab; switching tabs hides it and switching back shows it again. A question from
a background tab never moves focus.

**Private tabs.** The bar offers **Allow this time** and **Block** only. Nothing is saved, so a private tab leaves no
permission behind.

**Settings.** Each site's row keeps today's boxes (ticked = always allow) and gains a "never" state per kind, so the
user can see and undo every remembered answer. The 7-day quiet times are kept with the site settings and are cleared
when the user changes that site's permissions.

**Unchanged.** Ferrum's settings stay the authority: WebView2 still keeps no answer in its profile (SavesInProfile
false), so a change in Settings counts at the next request. Every request and its answer (including "asked",
"allowed once", "always", "never", "closed", "quiet") goes into the security log, without page content.

**Tests.** The live tests may click every button, but only with kinds that do not switch on hardware: notifications and
the clipboard for the "allow" paths. The camera and microphone are tested only on the refusal paths (Never allow, close,
http page, other-site frame), so a test never switches on the real camera or microphone (the owner's standing rule).

## Consequences

- Sites such as video calls work after one click, as in Chrome.
- More ways to say yes means more to test: task p4.20 adds the question, its tests and the Settings "never" state before
  the P4 exit gate. The P4 test item "permission default deny" still holds: no answer, close, "Never allow" and every
  no-question case refuse.
- A user can click "Always allow" by mistake. Mitigation: the site's name is Ferrum's own text, and Settings shows and
  undoes every remembered answer.
- The owner's manual check 3 changes from "confirm the default deny" to "see the question; check Never and Allow this
  time".

## Links

- Builds on: [adr-0015](adr-0015-navigation-posture-open-blocklist.md) rule 7 (default deny, grants in Ferrum's settings).
- Built in: [phase-p4-security](../phases/phase-p4-security.md) task p4.20.
- Touches: [comp-security-engine](../architecture/components/comp-security-engine.md),
  [comp-webview-manager](../architecture/components/comp-webview-manager.md),
  [comp-app-shell](../architecture/components/comp-app-shell.md),
  [qual-security-testing-plan](../quality/qual-security-testing-plan.md).
