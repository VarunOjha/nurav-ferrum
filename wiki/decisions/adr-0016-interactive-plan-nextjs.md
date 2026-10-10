---
id: adr-0016
type: decision
title: "Interactive plan = local Next.js app reading wiki/ directly; approvals persisted to plan/approvals.json"
status: superseded
updated: 2026-10-09
sources:
  - raw/01-scoping-decisions.md
  - raw/research/nextjs-stack.md
  - raw/research/llm-wiki-pattern.md
  - raw/owner/2026-10-08-s01-wave0.md
  - raw/owner/2026-10-09-s01-wave0c.md
related: [adr-0001, adr-0002, adr-0021, adr-0014, adr-0023, adr-0024, schema, phase-p0-planning, comp-interactive-plan]
approvable: true
date: 2026-10-08
decided_by: owner
supersedes: []
superseded_by: adr-0023
options:
  - "Next.js app in interactive_plan/ reading wiki/ at runtime; approvals via local API route to plan/approvals.json"
  - "Static site generated from the wiki; approvals given in chat"
  - "Approvals stored in browser localStorage"
phase: phase-p0-planning
tags: [interactive-plan, nextjs, approvals, tooling]
unverified:
  - claim: "The atomic temp-file-then-rename write of ../plan/approvals.json works under next dev and next start (plain fs reads and writes outside the root were verified by IP-1 spike S1)"
    verify_in: phase-p0-planning
---

# ADR-0016: The interactive plan is a local Next.js app that reads wiki/ directly; approvals go to plan/approvals.json

> **Superseded on 2026-10-09 by [ADR-0023](adr-0023-approvals-in-claude-code-portal-read-only.md).** The owner now approves in
> Claude Code and Claude records the approval; the plan portal is read-only (no approve buttons, no write API) and
> reads only plain-language JSON ([ADR-0024](adr-0024-portal-reads-plain-language-json.md)), not `wiki/` directly.
> Still in force through ADR-0023: a local Next.js app in `interactive_plan/`, served on 127.0.0.1 only, with the stack
> pins below as the starting point. The text below is kept unchanged as the record of the original decision.

## Context

The owner directed (directives 2 and 4, Q13, Q14 in [raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md)):

- "Create folder called `interactive_plan`. In this folder set up a Next.js application. Put architecture, plan, project plan + milestones and visualize this whole thing."
- "First the interactive plan comes together. I then approve everything else."
- Q13: **"Owner installs Node LTS now"**. (Overtaken: on the owner's later authorisation Claude installed Node 24.20.0 ([raw/owner/2026-10-08-s01-wave0.md](../raw/owner/2026-10-08-s01-wave0.md)), and Claude now runs all toolchain installs ([adr-0021](adr-0021-claude-runs-toolchain-installs.md), which supersedes adr-0005).)
- Q14: **"Approve in UI, persisted to repo (`plan/approvals.json`, git-tracked, via local Next.js API route)"**.

The LLM-wiki research recommends that the app **read `wiki/` directly** rather than copy its content, so the visualisation cannot drift ([raw/research/llm-wiki-pattern.md](../raw/research/llm-wiki-pattern.md) §6.4).

Stack research ([raw/research/nextjs-stack.md](../raw/research/nextjs-stack.md), all registry facts VERIFIED 2026-10-08):

- **Versions.** next 16.4.0, react 19.3.0, tailwindcss 4.3.3, @xyflow/react 12.12.0, mermaid 12.1.0, zod 4.6.5, yaml 2.9.1, vitest 5.0.3, @playwright/test 1.64.0.
- **Do not take `@latest` for TypeScript or ESLint.** eslint-config-next 16.4.0 pulls typescript-eslint, whose peer range excludes TypeScript 7. Its React, import and jsx-a11y plugins declare ESLint ≤ 9. create-next-app itself writes `typescript ^5` and `eslint ^9` (§1.1).
- **Tailwind plugin.** With Tailwind + Turbopack the generator uses `@tailwindcss/turbopack`, not `@tailwindcss/postcss` (§3.1).
- **Out-of-root files.** Turbopack does not resolve modules outside the project root, so wiki files must be read at runtime with `fs`, not imported (§3.5).
- **Next 16 changes.** `next lint` was removed. Route params are async. A lockfile prevents two `next dev` or `next build` processes on one project (§3.2).
- **Testing.** Vitest cannot test async Server Components, so logic belongs in pure TS modules (§3.6).
- **Mermaid 12** is a new breaking major, with ELK as the default layout. 11.17.2 is the mature alternative (§4).
- **Node.** v26 becomes LTS on 2026-10-28 (§2).

## Options considered

| Option | Pros | Cons |
|---|---|---|
| A. **Next.js app in `interactive_plan/` reading `../wiki` at runtime; approvals via a local API route that writes `plan/approvals.json`** | Owner's choice. Always current, with no copy step. Approvals are git-tracked and auditable. Interactive graphs | A Node toolchain and a web app to maintain. The write path needs hardening (loopback only, validation, atomic write) |
| B. Static site generated from the wiki; approvals in chat | No server | Approvals not machine-readable. A regeneration step means drift. Not the owner's choice |
| C. Approvals in browser localStorage | Trivial | Not in the repo, so invisible to Claude and lost on browser reset. Violates Q14 |

## Decision

### Owner decision (verbatim)

As recorded in [raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md), owner directive 2 and scoping answers Q13, Q14 (that file records the owner's words verbatim-in-substance):

> 2. "Create folder called `interactive_plan`. In this folder set up a Next.js application. Put architecture, plan, project plan + milestones and visualize this whole thing."  
> Q13 Node for the plan app: **Owner installs Node LTS now**  
> Q14 Approvals mechanism in plan app: **Approve in UI, persisted to repo** (`plan/approvals.json`, git-tracked, via local Next.js API route)

This quoted choice is what `decided_by: owner` and `status: accepted` cover (SCHEMA §10.4 rule 3(b)). The quote is kept verbatim; who installs Node is no longer part of this decision (see [adr-0021](adr-0021-claude-runs-toolchain-installs.md); owner answer 2026-10-09, [wave 0c](../raw/owner/2026-10-09-s01-wave0c.md) item 10).

### Claude elaboration (binding only once this ADR is APPROVED in the plan app)

Everything below in this section is Claude's elaboration of the owner's choice. Under SCHEMA §10.4 it binds implementation only after the owner approves this ADR in the plan app; until then it is a proposal.

**Option A.** `comp-interactive-plan` (planning tooling, `shipped: false`):

1. **Stack** (exact pins, per the research recommendation):
   - Node 24 LTS, with `engines` `>=24.15 <27` and `.nvmrc`;
   - next 16.4.0, react and react-dom 19.3.0, App Router, Turbopack, **no** Cache Components, **no** React Compiler, **no** agent feedback;
   - typescript **5.9.3**; eslint **9.39.x** with eslint-config-next 16.4.0;
   - tailwindcss 4.3.3 with @tailwindcss/turbopack 4.3.3;
   - @xyflow/react 12.12.0 with @dagrejs/dagre 3.1.1 for the graphs;
   - react-markdown, remark-gfm and rehype-slug, plus a client-side Mermaid component (major version per open question Q-103);
   - `yaml` plus a small frontmatter splitter, instead of the unmaintained gray-matter;
   - zod for validating frontmatter and API bodies.

   Scaffold command, untested until run:

   ```text
   npx create-next-app@16.4.0 interactive_plan --ts --tailwind --eslint --app --turbopack --import-alias "@/*" --use-npm --disable-git --no-cache-components --no-agent-feedback --no-react-compiler
   ```

   It ran unchanged on Windows in the repo path containing a space, and dependency resolution with TypeScript 5.9.3 and ESLint 9.39.5 had no peer-dependency errors (IP-1, [IP-1-scaffold.txt](../raw/evidence/phase-p0-planning/interactive-plan/IP-1-scaffold.txt)).
2. **Reads.** The app reads `wiki/**` and `plan/approvals.json` with `fs` at request time, from server components and route handlers. It never imports them as modules. `turbopack.root` is set explicitly to `interactive_plan/`. Runtime reads and writes outside the root work under `next dev` and `next start` (IP-1 spike S1, [IP-1-spikes.txt](../raw/evidence/phase-p0-planning/interactive-plan/IP-1-spikes.txt)).
3. **Writes.** `app/api/approvals/route.ts` (runtime `nodejs`):
   - validates the request with zod and accepts only ids whose page has `approvable: true`;
   - computes `content_hash` and `scope_hash` exactly as SCHEMA §10.2 specifies, checked against shared test vectors;
   - moves the previous decision into `history`;
   - writes atomically (temp file, then rename; that the rename works under both servers is UNVERIFIED[phase-p0-planning], checked in IP-4);
   - is served only on `127.0.0.1` (`next start -H 127.0.0.1`) and rejects non-loopback hosts.
4. **Only the app writes `plan/approvals.json`.** **Claude never writes it** ([SCHEMA §10.1](../SCHEMA.md#101-file-format)).
5. **Tests.** Unit tests (Vitest) cover the parsers, the hashing and the graph builders. E2E tests (Playwright against `next build && next start`) point at a temporary data folder via an environment variable (for example `PLAN_DATA_DIR`), so tests never mutate the real approvals file.
6. **Timing.** The app is built **within P0**, because the owner approves everything else through it. That makes its own build the last P0 deliverable before the P0 exit review. This is settled by owner directives 2 and 4 ([raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md)), so Q-101 in [ov-open-questions](../overview/ov-open-questions.md) is answered by those directives, not open.

## Consequences

### Positive

- The owner gets one place to see the architecture graph, the phase DAG and Gantt, the ADRs, risks, research traceability and status, and to approve them.
- Approvals carry content hashes, so later edits are detected (`STALE`), while bookkeeping-only edits do not invalidate them (`APPROVED_VOLATILE_DRIFT`, SCHEMA §10.3).

### Negative

- Writing the app is code inside P0. It is planning tooling, not Ferrum, but it still needs tests and evidence. The P0 "no application code" rule applies to Ferrum, not to the plan app.
- **Node major drift.** After 2026-10-28, `OpenJS.NodeJS.LTS` may resolve to v26. The `engines` range permits it, but this has not been tested. Q-102 is answered: stay on Node 24 LTS; Node 24.20.0 is installed and pinned in `.nvmrc` ([IP-0-toolchain.txt](../raw/evidence/phase-p0-planning/interactive-plan/IP-0-toolchain.txt)); a move to 26 needs its own ADR.
- **Mermaid choice.** Mermaid 12 is new. Q-103 is answered: 12.x pinned exactly (12.1.0), fallback 11.17.2 recorded as a `decide` log entry if rendering problems appear. Mermaid 12.1.0 rendered in a React 19.3 client component under Next 16.4 with `layout: dagre`, `look: classic`, `securityLevel: strict` (IP-1 spike S2, [IP-1-spikes.txt](../raw/evidence/phase-p0-planning/interactive-plan/IP-1-spikes.txt)); E2E rendering tests follow in IP-6.
- **Lockfile clash.** The repo will later contain other Node projects (Playwright benchmark scripts). Multiple lockfiles may confuse root inference, which the explicit `turbopack.root` mitigates.

### Follow-ups

- Run the five checks in [raw/research/nextjs-stack.md](../raw/research/nextjs-stack.md) §6 while building the app, and record the results under `wiki/raw/evidence/phase-p0-planning/`.
- Publish hash test vectors on the `ip-*` data-contract page (owned by the interactive-plan area).

### Related risks and phases

- `phase-p0-planning`; `comp-interactive-plan`. Supports every gate ([ADR-0014](adr-0014-milestone-review-checkpoints.md)).

## Verification / evidence

- Owner answers: [raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md) (directives 2 and 4, Q13, Q14).
- Stack facts: [raw/research/nextjs-stack.md](../raw/research/nextjs-stack.md).
- Required evidence:
  - `npm run lint`, unit-test and E2E outputs;
  - hash parity: the TypeScript implementation equals the Python reference on the test vectors;
  - an approve → edit → STALE round-trip in E2E.
