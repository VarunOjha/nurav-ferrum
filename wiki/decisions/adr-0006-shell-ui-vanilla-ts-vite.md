---
id: adr-0006
type: decision
title: "Shell UI stack is vanilla TypeScript + Vite"
status: accepted
updated: 2026-10-11
sources:
  - raw/01-scoping-decisions.md
  - raw/research/tauri-webview2-capabilities.md
  - raw/research/nextjs-stack.md
related: [adr-0007, adr-0005, adr-0021, adr-0015, phase-p1-foundation, phase-p2-minimal-container, phase-p3-tabs-sessions, comp-app-shell, comp-security-engine]
approvable: true
date: 2026-10-08
decided_by: owner
supersedes: []
options:
  - "Vanilla TypeScript + Vite"
  - "React (or another component framework) + Vite"
  - "Rust-to-WASM UI framework"
phase: phase-p0-planning
tags: [ui, shell, frontend]
unverified: []
---

# ADR-0006: The shell UI stack is vanilla TypeScript + Vite

## Context

The shell is Ferrum's trusted UI: tab strip, address bar, navigation buttons, settings, and later the sidebar ([raw/00-master-prompt.md](../raw/00-master-prompt.md) §4 "Application Shell"). It runs in its own **trusted** WebView, separate from the untrusted tab WebViews ([ADR-0007](adr-0007-child-webviews.md)).

Scoping question Q3 asked for the shell UI stack. The owner chose **"Vanilla TypeScript + Vite"** ([raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md)).

Constraints from research ([raw/research/tauri-webview2-capabilities.md](../raw/research/tauri-webview2-capabilities.md) §2–§3):

- Child tab WebViews draw **above** the shell WebView (tauri issue #15682, an open `unstable`-flag issue). Shell DOM elements such as dropdowns, menus and autocomplete popups **cannot overlap the tab area**.
- The Tauri IPC bridge is injected into every WebView. Only the shell should be authorised, through a capability that targets webview label `shell`.

## Options considered

| Option | Pros | Cons |
|---|---|---|
| A. **Vanilla TS + Vite** | Smallest dependency and attack surface for the trusted WebView. Small bundle, which keeps the shell's own memory overhead low and matters for the benchmarks. No framework runtime to audit | More manual DOM and state code. Fewer ready-made components. Testing needs a little more setup |
| B. React, Svelte or Solid + Vite | Productive and well known (React is used in the plan app, [ADR-0016](adr-0016-interactive-plan-nextjs.md)) | Adds a framework runtime to the trusted context and to Ferrum's measured memory. Not the owner's choice |
| C. Rust→WASM UI (e.g. Leptos or Yew) | One language | Larger WASM payload. Immature tooling for this use. Not the owner's choice |

## Decision

### Owner decision (verbatim)

As recorded in [raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md), scoping answer Q3 (that file records the owner's words verbatim-in-substance):

> Q3 Shell UI stack: **Vanilla TypeScript + Vite**

This quoted choice is what `decided_by: owner` and `status: accepted` cover (SCHEMA §10.4 rule 3(b)).

### Claude elaboration (binding only once the owner APPROVES this ADR)

Everything below in this section is Claude's elaboration of the owner's choice. Under SCHEMA §10.4 it binds implementation only after the owner approves this ADR (given in Claude Code and recorded in `plan/approvals.json`, adr-0023); until then it is a proposal.

**Option A.** The shell frontend is vanilla TypeScript, bundled by Vite and served as Tauri local content in the WebView labelled `shell`.

Design rules that follow from the research:

1. Shell chrome **never overlaps tab bounds**. Popups (address-bar suggestions, menus) either live inside the shell strip or temporarily resize or hide the active tab WebView. This is a UX constraint driven by tauri #15682.
2. The shell calls Rust only through explicitly permitted commands, under the app ACL manifest and a capability targeted at the `shell` webview label.
3. Minimal runtime dependencies. Any npm runtime dependency added to the shell needs a short justification on the `comp-app-shell` page.

## Consequences

### Positive

- The trusted context stays small and auditable, which helps `comp-security-engine`'s threat model.
- The shell's memory footprint is a clean, small part of `cfg-ferrum-*` measurements.

### Negative

- UI work is slower than with a component framework. Keyboard shortcuts, tab drag and accessibility must be written by hand.
- The no-overlap rule constrains the UX (for example, no floating menus over page content).
- The exact Vite version is chosen when P1 scaffolds. P1 did not use the `create-tauri-app` template (spikes are hand-written so no unpinned template enters the evidence, p1.17). A hand-written vanilla TypeScript + Vite frontend (vite 8.3.4, typescript 7.0.2) worked with tauri 2.12.3 in spike S1 ([pins](../raw/evidence/phase-p1-foundation/toolchain-tauri.txt), [spike S1 results](../raw/evidence/phase-p1-foundation/spike-s1/auto-1.json)).

### Follow-ups

- P1: scaffold the shell frontend and pin exact versions.
- P2: configure a strict CSP for the shell. Done: the shell runs under it with the bridge working (verified in P2,
  [check-p2.3](../raw/evidence/phase-p2-minimal-container/check-p2.3.txt); the policy is in `apps/desktop/src-tauri/tauri.conf.json`).
- Unit tests for shell logic (URL parsing in the address bar, tab state reducer) use a lightweight TS test runner. The runner is chosen in P1.

### Related risks and phases

- Risks: `risk-r02` (the multi-webview `unstable` flag, which causes the z-order constraint).
- Phases: `phase-p1-foundation`, `phase-p2-minimal-container`, `phase-p3-tabs-sessions`; component `comp-app-shell`.

## Verification / evidence

- Owner answer Q3: [raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md).
- Z-order and IPC facts: [raw/research/tauri-webview2-capabilities.md](../raw/research/tauri-webview2-capabilities.md) §2–§3.
- P2 manual check: open the address-bar suggestions while a page is loaded in the tab and confirm that nothing is hidden behind the tab WebView.
