---
id: comp-interactive-plan
type: component
title: "Plan portal (Next.js, read-only, planning tooling, not shipped)"
status: implemented
updated: 2026-10-11
last_verified_commit: ef5dcc5
sources:
  - raw/01-scoping-decisions.md
  - raw/research/nextjs-stack.md
  - raw/research/llm-wiki-pattern.md
  - raw/owner/2026-10-09-s01-portal-v2-decisions.md
  - raw/evidence/phase-p0-planning/portal-v2/portal-verify.txt
related: [ov-arch-data-flows, ov-arch-repo-layout, ov-arch-trust-boundaries, ov-arch-system-overview, adr-0001, adr-0002, adr-0016, phase-p0-planning, ip-data-contract, ip-spec, ip-routes-and-views, ip-testing, adr-0023, adr-0024, adr-0026]
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
  - "Make every id clickable: a reference popup shows its refs.json explainer, related ids open in the same popup; a phase id also opens the whole phase popup. Popups show titles and the short names the owner knows ('Decision 19'), never internal slugs"
  - "Show the seven tabs of the approved mockups: Overview, Roadmap (stages and one row per phase), Architecture (layered diagram of the Rust app and the four groups), Decisions (and risks), Research, Questions and Log, each item in a popup"
  - "Show, read-only, the text of each PowerShell check script that the portal JSON names (adr-0024 elaboration), so the owner can read a script before running it; nothing else under scripts/ is served"
  - "Show approval state read-only from plan/approvals.json; never write it (the owner approves in Claude Code and Claude records, adr-0023)"
  - "Serve on 127.0.0.1 only; refuse non-loopback Host headers and every method other than GET and HEAD; no external requests (fonts self-hosted)"
  - "Run the normative wiki check (npm run lint:wiki) and the phase entry-gate report (npm run gate); these read wiki/ but are command-line tools, not portal pages"
interfaces:
  - "GET pages: Overview (/), Roadmap, Architecture, Decisions, Research, Questions, Log (server components reading ../plan/portal/*.json)"
  - "pwsh -NoProfile -File scripts/start-portal.ps1 (owner start: finds Node, installs packages once, checks the port, builds, starts on 127.0.0.1:3417 and opens the browser)"
  - "GET /api/script?path=<repo-relative .ps1> (text/plain, read-only): 200 with the script text only for a script named in a portal JSON script field and inside scripts/, at most 256 KB; 404 with a plain message otherwise"
  - "npm run lint:wiki, npm run gate (wiki check and entry-gate report, command line)"
connects: []
---

# comp-interactive-plan

Planning tooling for owner review. It is **not part of Ferrum** and has **no runtime edge** to any Ferrum component,
so `connects` is empty. It is the **read-only plan portal** (portal v2, task p0.17): it renders only the
plain-language JSON in `plan/portal/` that Claude writes from the wiki
([adr-0024](../../decisions/adr-0024-portal-reads-plain-language-json.md)), shows approval labels from
`plan/approvals.json`, and shows the text of the check scripts the JSON names. It writes nothing; the owner approves
in Claude Code and Claude records approvals
([adr-0023](../../decisions/adr-0023-approvals-in-claude-code-portal-read-only.md)). The specification is
[ip-spec](../../interactive-plan/ip-spec.md), with the tabs and popups in
[ip-routes-and-views](../../interactive-plan/ip-routes-and-views.md), the data in
[ip-data-contract](../../interactive-plan/ip-data-contract.md) and the tests in
[ip-testing](../../interactive-plan/ip-testing.md).

**Why `connects` stays empty (deliberate isolated node).** What the portal reads (the portal JSON, the approvals file,
the check scripts) is written by Claude, not produced by any Ferrum component. An edge to a component would claim a
dependency that does not exist. In the Architecture tab it appears only as the planning-tooling footnote
([adr-0026](../../decisions/adr-0026-architecture-four-groups.md)).

**History.** v1 (build steps IP-0 to IP-10 of [ip-build-plan](../../interactive-plan/ip-build-plan.md), retired) was a
wiki browser with search, a lint page, an approvals inbox and an approve API, verified at commit `3eaa641`. After the
owner's feedback that it was too technical, task p0.17 rebuilt it as this portal (2026-10-09): rules, wiki-to-portal
pipeline, portal text, check scripts, data layer and shell (`673cbdc`), the six other tabs (`dfe164f`), and a final
review.

**Verified (2026-10-09).** `npm run verify` passed in one run at `46fb685` (all seven tabs). The final review then
fixed five visual defects found by comparing screenshots with the mockups, added `scripts/start-portal.ps1`, and
passed `npm run verify`, the portal check, the P0 gate and the wiki checks again
([portal-verify.txt](../../raw/evidence/phase-p0-planning/portal-v2/portal-verify.txt)).
