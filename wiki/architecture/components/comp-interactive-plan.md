---
id: comp-interactive-plan
type: component
title: "Interactive plan app (Next.js, planning tooling, not shipped)"
status: planned
updated: 2026-10-08
sources:
  - raw/01-scoping-decisions.md
  - raw/research/nextjs-stack.md
  - raw/research/llm-wiki-pattern.md
related: [ov-arch-data-flows, ov-arch-repo-layout, ov-arch-trust-boundaries, ov-arch-system-overview, adr-0001, adr-0002, adr-0016, phase-p0-planning, ip-data-contract]
approvable: true
path: interactive_plan/
crate: null
trust_level: trusted
phase_introduced: phase-p0-planning
shipped: false
unsafe_code: false
responsibilities:
  - "Visualise the plan: architecture graph from component connects edges, phase dependency graph, milestones, risks, decisions, traceability (owner directive 2)"
  - "Read wiki/ frontmatter and markdown directly at runtime with fs; never copy wiki content (llm-wiki note recommendation)"
  - "Let the owner approve, request changes or reject approvable pages; persist to plan/approvals.json with content_hash and scope_hash (scoping Q14, adr-0016)"
  - "Compute effective approval states (PENDING, APPROVED, APPROVED_VOLATILE_DRIFT, STALE, CHANGES_REQUESTED, REJECTED, INVALID) per wiki SCHEMA section 10"
  - "Serve on 127.0.0.1 only; validate request bodies; write approvals atomically"
interfaces:
  - "GET pages and graphs (server components reading ../wiki)"
  - "POST /api/approvals (zod-validated, loopback only)"
connects: []
---

# comp-interactive-plan

Planning tooling for owner review (adr-0016; [Next.js note](../../raw/research/nextjs-stack.md)). It is **not part of Ferrum** and has **no runtime edge** to any Ferrum component, so `connects` is empty. Its interaction with the repo is file I/O only: it reads `wiki/**` and writes `plan/approvals.json` ([data flows §6](../ov-arch-data-flows.md)).

**Why `connects` stays empty (deliberate isolated node).** The `file-io` edge kind connects two components, but what the plan app reads and writes is not produced by any component: `wiki/**` is written by Claude and the owner, and `plan/approvals.json` is written by the plan app itself. Modelling an edge to, say, comp-research-analysis or comp-core would claim a dependency that does not exist. The app therefore renders as an isolated node in the architecture graph, and its file dependencies are documented here and in [data flows §6](../ov-arch-data-flows.md) instead. Proposed convention (needs a matching line in SCHEMA §6.2, which is outside this page's area): an empty `connects` is allowed only for a component with `shipped: false` that has no component-to-component dependency, and lint should not flag it.

**Graph data contract (for this architecture area).** The architecture graph is built **only** from component frontmatter:

- nodes = component pages: `id`, `title`, `trust_level`, `status`, `phase_introduced`, `shipped`;
- edges = `connects` entries `{to, label, kind, crosses_trust_boundary}`.

Several edges may join the same pair of nodes with different `kind`s. Trust-boundary edges render dashed. Grouping by `trust_level` gives the trusted / untrusted / external swimlanes.

It is built in phase-p0-planning (tasks p0.10–p0.16), per the owner directive "first the interactive plan comes together". The timing question Q-101 is answered by owner directives 2 and 4 in [raw/01-scoping-decisions.md](../../raw/01-scoping-decisions.md); the build starts after Approval Wave 0 ([ops-approval-workflow §8](../../operations/ops-approval-workflow.md#8-approval-waves)).
