---
id: ip-wiki-lint
type: operations
title: "Interactive plan app: wiki lint (npm run lint:wiki) and gate report"
status: draft
updated: 2026-10-09
sources:
  - raw/research/llm-wiki-pattern.md
  - raw/research/nextjs-stack.md
  - raw/owner/2026-10-08-s01-wave0b.md
  - raw/owner/2026-10-09-s01-wave0c.md
related: [ip-spec, ip-data-contract, ip-testing, ip-build-plan, ip-routes-and-views, schema, adr-0002, adr-0003, comp-interactive-plan, phase-p1-foundation, adr-0020]
approvable: true
phase: phase-p0-planning
audience: both
trigger: "Run after any wiki edit, at every HANDOFF, at every phase gate and at RESUME; read before changing lint rules or after a SCHEMA.md change"
tags: [interactive-plan, lint, wiki, integrity]
unverified:
  - claim: "Vitest 5 can run a lint suite under a dedicated config file and node environment and print a custom report"
    verify_in: phase-p0-planning
---

# Wiki lint and gate report

Karpathy's pattern includes a periodic **lint** pass over the wiki: contradictions, outdated claims, orphan pages, missing pages and links, data gaps ([raw/research/llm-wiki-pattern.md](../raw/research/llm-wiki-pattern.md)). [SCHEMA.md](../SCHEMA.md) §9.3 turns that into a table of mechanical checks. This page specifies the **machine implementation** of that table inside the plan app. It is available to every future session as one command:

```text
cd interactive_plan
npm run lint:wiki            # human-readable report, fails (exit != 0) on any error
npm run lint:wiki:json       # same, plus JSON report at interactive_plan/.lint/wiki-lint.json
```

The same engine powers the `/lint` page ([ip-routes-and-views](ip-routes-and-views.md) §3.12) and the per-page findings banners.

SCHEMA §9.3 says the lint script is "planned deliverable of `phase-p1-foundation`" and that Claude lints manually until then. If the plan app is built in P0 ([ip-spec](ip-spec.md) §9 item 4), this tool delivers it early. The P1 phase page should then reference `npm run lint:wiki` rather than plan a second linter. This is returned to the integrator as an open question.

## 1. Mechanism

- **Engine:** `lib/lint/` holds pure TS rules over the `WikiIndex` ([ip-data-contract](ip-data-contract.md) §4.1), plus two optional git-backed rules (§3). Each rule is `{ code, severity, run(ctx): Finding[] }`. A `Finding` is `{ code, severity: 'error'|'warn'|'info', path, id?, line?, message, hint? }`.
- **Runner:** a vitest suite, `tests/lint/wiki-lint.test.ts`, under a dedicated config `vitest.lint.config.mts` (environment `node`, include `tests/lint/**`). The config and the first member of the suite, the real-wiki loader test `tests/lint/real-wiki-loader.test.ts`, exist since IP-2 (wave 0c item 3: tests that read the real wiki run under `lint:wiki`, not `npm test`). This avoids adding a TS script runner. Whether vitest 5 behaves as needed is `UNVERIFIED[phase-p0-planning]` and is checked in IP-5 of [ip-build-plan](ip-build-plan.md). If it does not, the fallback is a compiled script step, decided then and logged.
- **npm scripts:**
  - `"lint:wiki": "vitest run --config vitest.lint.config.mts"`
  - `"lint:wiki:json": "cross-env WIKI_LINT_JSON=1 …"`. Better is a plain `node -e` env shim, so the extra dependency `cross-env` is not needed. The exact form is decided in IP-5.
- **Output:**
  - Findings are sorted by severity, then path, then line, one per line: `ERROR REF-DANGLING wiki/phases/phase-p3-tabs-sessions.md:12  related → adr-0099 does not resolve`.
  - The summary line is `lint: N errors, M warnings, K info (pages: P)`.
  - The suite fails if `errors > 0`. With `WIKI_LINT_STRICT=1` it also fails on warnings.
- **Inputs:** `PLAN_WIKI_DIR`, `PLAN_STATUS_FILE`, `PLAN_DATA_DIR` and `PLAN_REPO_ROOT` ([ip-spec](ip-spec.md) §6). The defaults point at the real repo. Tests point them at fixtures.
- **Evidence:** at a phase gate, Claude saves the JSON report (with `WIKI_LINT_OUT=../wiki/raw/evidence/<phase-id>/wiki-lint.json`) as evidence that "LINT is clean" (SCHEMA §9.7 exit step 4).

## 2. Rules (SCHEMA §9.3 codes)

| Code | Sev. | Implementation |
|---|---|---|
| `FM-MISSING` | error | No frontmatter, no closing fence, a YAML parse error, or a zod "required" issue (§5.1 + §6 per type) |
| `FM-ENUM` | error | A zod enum issue on `type`, `status` or another enum field |
| `FM-TYPE-DIR` | error | `type` is not allowed for the page's directory (SCHEMA §4.1 table, encoded as a constant) |
| `FM-UNKNOWN-KEY` | warn | A key outside the type's schema (from zod `passthrough` extras) |
| `FILE-ENCODING` | error | A leading `EF BB BF`, or a file that does not end in exactly one `\n` (zero, or `\n\n`) |
| `ID-PATTERN` | error | The id fails its type regex (SCHEMA §8), or the basename is not `id` or `id-*` |
| `ID-DUP` | error | `WikiIndex.duplicates` is non-empty. Research-note ids are included |
| `REF-DANGLING` | error | Any reference field ([ip-data-contract](ip-data-contract.md) §4.2) that does not resolve; task refs (`spike`, `current_task`) that match no phase task; `sources` path entries (any wiki-relative path, e.g. `raw/…` or `SCHEMA.md`; not URLs, not on raw research notes) that do not exist (SCHEMA §5.1; owner answer 2026-10-09, [wave 0c](../raw/owner/2026-10-09-s01-wave0c.md) items 1 and 2); relative body links (outside fenced code) to missing files or missing heading anchors (anchors via the `rehype-slug` slug algorithm on target headings) |
| `REF-RECIPROCAL` | error | `rq.hypotheses` ↔ `hyp.rq`; `hyp.experiments` ↔ `exp.hypotheses` |
| `ORPHAN` | warn | No inbound reference from another page's frontmatter or body. Links from `index.md` and `log.md` do **not** count, since everything is in the index. Singletons are exempt |
| `INDEX-MISSING` | error | A page is not listed in `index.md`, an index line points at a missing file or folder, or a line fails the SCHEMA §11 regex. The status column must equal the page's `status` (or `raw`). Raw files: those at the `raw/` top level and under `raw/owner/`, `raw/research/` and `raw/assets/` each need their own line; files under `raw/evidence/` and `raw/bench/` are **not** listed individually; instead each first-level folder (`raw/evidence/<phase-id>/`, `raw/bench/<run-id>/`) containing a file needs one line whose label is the folder path relative to `wiki/raw/`, lower-cased, non-`[a-z0-9.-]` characters (including `/`) replaced by `-`, no trailing `-` (SCHEMA §11, [adr-0020](../decisions/adr-0020-index-lists-evidence-folders.md)); a file directly in `raw/evidence/` or `raw/bench/` is an error |
| `STALE-UPDATED` | warn / error | warn when `updated` < `git log -1 --format=%cs -- <file>`; **error** when `updated` > today (local date) |
| `ADR-CHAIN` | error | `superseded` without `superseded_by`; A supersedes B but B is not superseded; `accepted` without (approval counts-as-approved **or** `decided_by: owner` with a `raw/` source), per SCHEMA §10.4.3 |
| `PHASE-ORDER` | error | A cycle in `depends_on` (DFS), a dependency whose order ≥ own order, a duplicate `order`, `order` not equal to N in `phase-pN-…`, or a duplicate task id across all phases |
| `TRUST-EDGE` | error | `crosses_trust_boundary` differs from (`trust_level(from)` ≠ `trust_level(to)`) |
| `UNV-NOPHASE` | error | The SCHEMA §7.1 tag keyword (uppercase, case-sensitive) not immediately followed by a bracketed phase id that matches the §7.1 regex, in page bodies outside fenced code blocks. Exempt: `raw/`, and the rule text inside `SCHEMA.md` §7 |
| `UNV-PASTDUE` | error | An inline integrity tag naming phase P, or a frontmatter `unverified[].verify_in = P`, where P has `status: done` or `P.order < order(STATUS.current_phase)` |
| `INT-NUMBER-NOSRC` | warn | In bodies of `experiment, metric, hypothesis, overview` pages: a paragraph containing a number + unit (`ms, s, %, MB, MiB, GB, GiB, KB, KiB, J, mJ, W, fps`) with no link into `raw/bench/` or `raw/evidence/` in the same paragraph. This is a heuristic, and every warning needs a disposition in the `lint` log entry |
| `HYP-NO-DATA` | error | A hypothesis with status `supported / not-supported / inconclusive` that has no linked experiment with `status: analyzed` and a non-empty `results_ref` |
| `RAW-IMMUTABLE` | error | See §3 |
| `APPROVAL-STALE` | info / warn | An approval in state `STALE`. It is warn when the page is in the dependency set of `STATUS.current_phase` or of its direct successors |
| `CONTRADICTION` | warn | A line matching `^> \*\*CONTRADICTION:\*\*` (an open contradiction marker). The semantic pass stays an LLM task, and the report reminds the session to do it |
| `SCHEMA-SPLIT` | info | Not mechanically checkable. The report always prints the reminder "compare CLAUDE.md rules with SCHEMA.md (manual)" |

### 2.1 Additional checks derived from MUST rules elsewhere in SCHEMA

SCHEMA does not list these codes in §9.3, but each enforces an explicit SCHEMA MUST. They are **proposed** as additions to the §9.3 table. Until the schema adopts them, they report as **warn**, so they cannot block a gate on their own. That decision belongs to the schema owner.

| Code | SCHEMA rule |
|---|---|
| `FM-VOLATILE` | §5: `status`, `updated` and `last_verified_commit` must be top-level single-line scalars |
| `FM-YAML-SUBSET` | §5: no anchors, aliases, tags or multi-document streams |
| `ADR-SECTIONS` | §6.4: the body has `## Context`, `## Options considered`, `## Decision`, `## Consequences` and `## Verification / evidence`, in order |
| `HANDOFF-SECTIONS` | §6.15: the body has `## Done`, `## In progress`, `## Next`, `## Blockers` and `## Notes for next session` |
| `COMP-UNSAFE` | §6.2: `unsafe_code: true` requires `## Unsafe invariants` |
| `COMP-LVC` | §6.2: `last_verified_commit` is required once `status ≥ implemented` |
| `EXP-RESULTS` | §6.8: `results_ref` is required when the status is `complete` or `analyzed` |
| `RISK-SCORE` | §6.5: a stored score must equal L × I |
| `STATUS-APPROVED` | §10.4.5: an `overview` or `schema` page with `status: approved` but no counts-as-approved approval |
| `APPROVAL-INVALID` | §10.3: an approvals key whose page is missing or not approvable |
| `UNV-MIRROR` | §7.1: the set of phases in inline tags differs from the set in the frontmatter `unverified` list |
| `LOG-FORMAT` | §12: a `log.md` line starting `## [` that fails the heading regex, or entries out of chronological order |
| `MERMAID-RULES` | §14: a `click` directive, `%%{init` or an HTML label inside a mermaid block, or a diagram with more than 30 nodes |

## 3. Git-backed checks

These are the only rules that spawn a process (`git`, via `execFile` with a fixed argument list, cwd = repo root). They run in the lint CLI, **not** inside the web server's request path.

- **`STALE-UPDATED`:** `git log -1 --format=%cs -- <file>` for each page, batched. With no git or no commits: skipped, and an `info` line says so.
- **`RAW-IMMUTABLE`:**
  - For each file under `wiki/raw/`: `git log --format=%H --follow --diff-filter=MRD -- <file>` must be empty, i.e. no modification, rename or deletion after the add commit.
  - Uncommitted modifications to tracked raw files (`git status --porcelain -- wiki/raw`) are also errors.
  - Before any commit exists, the rule falls back to `wiki/raw/MANIFEST.sha256` if present. Each line is `<64 hex>  <path relative to wiki/raw/>`, hashed over LF-normalised bytes as in SCHEMA §10.2 `N()`. The manifest's exact format is owned by P1, which creates the file. This proposal is returned as an open question.
  - With neither git history nor a manifest: info "RAW-IMMUTABLE not checkable yet".

## 4. Gate report (`npm run gate`)

The SCHEMA §9.6 RESUME step 7 and the §9.7 entry gate need a quick answer to "may I start phase P?". `tests/lint/gate-report.test.ts` (run by `npm run gate`) prints the `entryGate` checklist ([ip-data-contract](ip-data-contract.md) §8.3) for:

- the phase in `GATE_PHASE`, or
- `STATUS.current_phase` when `GATE_PHASE` is unset.

It also prints the effective approval state of every id in the dependency set. The suite **fails** when the gate is not passed, so its output can be pasted into the `gate` log entry. It only reads files. It never writes `approvals.json` or any page.

```text
# Git Bash
GATE_PHASE=phase-p1-foundation npm run gate
# PowerShell
$env:GATE_PHASE='phase-p1-foundation'; npm run gate
```

## 5. Rule tests

Every rule has a golden test over `tests/fixtures/broken-wiki/`, a deliberately broken mini wiki where each file triggers exactly the findings named in its file name, for example `phases/phase-p2-cycle--PHASE-ORDER.md`. There is also a clean fixture `tests/fixtures/mini-wiki/`, which must produce zero errors. See [ip-testing](ip-testing.md) §2.

## 6. Usage protocol for Claude sessions

1. After editing wiki pages: run `npm run lint:wiki`. Fix the errors. Record the warnings with a disposition in the `lint` log entry (SCHEMA §9.3).
2. At HANDOFF: run it again (or the quick subset if the context is short; SCHEMA §9.5).
3. At a phase gate: run `npm run lint:wiki:json` with `WIKI_LINT_OUT` pointing into `wiki/raw/evidence/<phase-id>/`, then run `npm run gate`.
4. If Node or the app is unavailable (for example on a fresh machine before `npm ci`), perform the checks manually as SCHEMA §9.3 describes and say so in the log.
