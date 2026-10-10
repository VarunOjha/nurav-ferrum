---
id: comp-interactive-plan
type: component
title: "Interactive plan app (Next.js, planning tooling, not shipped)"
status: implemented
updated: 2026-10-09
last_verified_commit: 3eaa641
sources:
  - raw/01-scoping-decisions.md
  - raw/research/nextjs-stack.md
  - raw/research/llm-wiki-pattern.md
related: [ov-arch-data-flows, ov-arch-repo-layout, ov-arch-trust-boundaries, ov-arch-system-overview, adr-0001, adr-0002, adr-0016, phase-p0-planning, ip-data-contract, adr-0023, adr-0024, adr-0026]
approvable: true
path: interactive_plan/
crate: null
trust_level: trusted
phase_introduced: phase-p0-planning
shipped: false
unsafe_code: false
responsibilities:
  - "Show the plan to the owner in plain language: a read-only portal that renders only the portal JSON in plan/portal/ (adr-0024), never the wiki pages themselves"
  - "Validate every portal file against plan/portal/schema/ with zod schemas generated from those JSON Schemas (scripts/gen-portal-schemas.mjs; a test keeps them in step and PowerShell Test-Json referees)"
  - "Make every id clickable: a reference popup shows its refs.json explainer, related ids open in the same popup"
  - "Show approval state read-only from plan/approvals.json; never write it (the owner approves in Claude Code and Claude records, adr-0023)"
  - "Serve on 127.0.0.1 only; refuse non-loopback Host headers and every method other than GET and HEAD; no external requests (fonts self-hosted)"
  - "Run the normative wiki check (npm run lint:wiki) and the phase entry-gate report (npm run gate); these read wiki/ but are command-line tools, not portal pages"
interfaces:
  - "GET pages: Overview (/), Roadmap, Architecture, Decisions, Research, Questions, Log (server components reading ../plan/portal/*.json)"
  - "npm run lint:wiki, npm run gate (wiki check and entry-gate report, command line)"
connects: []
---

# comp-interactive-plan

> **Rebuilt in task p0.17 (portal v2), in progress:** the owner approves in Claude Code and Claude records approvals
> ([adr-0023](../../decisions/adr-0023-approvals-in-claude-code-portal-read-only.md)); the app is now a read-only
> portal that reads only plain-language JSON ([adr-0024](../../decisions/adr-0024-portal-reads-plain-language-json.md)).
> Done (2026-10-09, step "portal-data-shell"): the wiki browser, search, lint view, approvals inbox, approve bar and
> the `POST /api/approvals` route were removed (their code stays in git history); the data layer, the shell of the
> approved Main mockup, the reference popup, the Overview and the phase popup exist. Next: the Roadmap, Architecture
> (four groups, [adr-0026](../../decisions/adr-0026-architecture-four-groups.md)), Decisions, Research, Questions and
> Log views, which show a placeholder until then. The responsibilities and interfaces above describe the new portal;
> the text below about graphs and the approvals file describes v1 and is kept as history.

Planning tooling for owner review (adr-0016; [Next.js note](../../raw/research/nextjs-stack.md)). It is **not part of Ferrum** and has **no runtime edge** to any Ferrum component, so `connects` is empty. Its interaction with the repo is file I/O only: it reads `wiki/**` and writes `plan/approvals.json` ([data flows §6](../ov-arch-data-flows.md)).

**Why `connects` stays empty (deliberate isolated node).** The `file-io` edge kind connects two components, but what the plan app reads and writes is not produced by any component: `wiki/**` is written by Claude and the owner, and `plan/approvals.json` is written by the plan app itself. Modelling an edge to, say, comp-research-analysis or comp-core would claim a dependency that does not exist. The app therefore renders as an isolated node in the architecture graph, and its file dependencies are documented here and in [data flows §6](../ov-arch-data-flows.md) instead. Proposed convention (needs a matching line in SCHEMA §6.2, which is outside this page's area): an empty `connects` is allowed only for a component with `shipped: false` that has no component-to-component dependency, and lint should not flag it.

**Graph data contract (for this architecture area).** The architecture graph is built **only** from component frontmatter:

- nodes = component pages: `id`, `title`, `trust_level`, `status`, `phase_introduced`, `shipped`;
- edges = `connects` entries `{to, label, kind, crosses_trust_boundary}`.

Several edges may join the same pair of nodes with different `kind`s. Trust-boundary edges render dashed. Grouping by `trust_level` gives the trusted / untrusted / external swimlanes.

It is built in phase-p0-planning (tasks p0.10–p0.16), per the owner directive "first the interactive plan comes together". The timing question Q-101 is answered by owner directives 2 and 4 in [raw/01-scoping-decisions.md](../../raw/01-scoping-decisions.md); the build starts after Approval Wave 0 ([ops-approval-workflow §8](../../operations/ops-approval-workflow.md#8-approval-waves)).

**Implemented (2026-10-09).** Build steps IP-0 to IP-10 of [ip-build-plan](../../interactive-plan/ip-build-plan.md) are done; `npm run verify` passed in one run at commit `3eaa641` (the /architecture edge-label fix that closed the last open review issue), evidence [IP-10-arch-labels-fix.txt](../../raw/evidence/phase-p0-planning/interactive-plan/IP-10-arch-labels-fix.txt). Responsibilities, interfaces and `connects` are unchanged by the build.
