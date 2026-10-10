---
id: ip-wiki-lint
type: operations
title: "Wiki check (npm run lint:wiki) and gate report, command line"
status: active
updated: 2026-10-09
sources:
  - raw/research/llm-wiki-pattern.md
  - raw/research/nextjs-stack.md
  - raw/owner/2026-10-08-s01-wave0b.md
  - raw/owner/2026-10-09-s01-wave0c.md
  - raw/owner/2026-10-09-s01-plan-app-feedback.md
related: [ip-spec, ip-data-contract, ip-testing, ip-build-plan, ip-routes-and-views, schema, adr-0002, adr-0003, comp-interactive-plan, phase-p1-foundation, adr-0020, adr-0022]
approvable: true
phase: phase-p0-planning
audience: both
trigger: "Run after any wiki edit, at every HANDOFF, at every phase gate and at RESUME; read before changing lint rules or after a SCHEMA.md change"
tags: [interactive-plan, lint, wiki, integrity]
---

# Wiki lint and gate report

Karpathy's pattern includes a periodic **lint** pass over the wiki: contradictions, outdated claims, orphan pages, missing pages and links, data gaps ([raw/research/llm-wiki-pattern.md](../raw/research/llm-wiki-pattern.md)). [SCHEMA.md](../SCHEMA.md) §9.3 turns that into a table of mechanical checks. This page specifies the **machine implementation** of that table inside the plan app. It is available to every future session as one command:

```text
cd interactive_plan
npm run lint:wiki            # human-readable report, fails (exit != 0) on any error
npm run lint:wiki:json       # same, plus JSON report at interactive_plan/.lint/wiki-lint.json
npm run gate                 # entry-gate checklist of STATUS.current_phase (or GATE_PHASE), §4
```

> **Portal v2 (task p0.17, 2026-10-09):** this check is now **command line only**. The owner said he does not need a
> lint page ([owner feedback](../raw/owner/2026-10-09-s01-plan-app-feedback.md)), so the v1 `/lint` page and the
> per-page findings banners were removed with the wiki browser; the engine, the rules and the commands above are
> unchanged. The P0 gate script runs `npm run lint:wiki` once and shares the result with the task check scripts
> ([ip-testing](ip-testing.md)).

SCHEMA §9.3 makes `npm run lint:wiki` the normative lint tool once IP-5 has passed. Before that, and as a fallback, `tools/quick_lint.py` runs with the manual checks. IP-5 also implemented the git-backed rules (§3), which SCHEMA §9.3 assigns to P1 task p1.10. p1.10 therefore has nothing left to add for them; it is left to the integrator to narrow p1.10 (noted in the IP-5 log entry).

## 1. Mechanism

- **Engine:** `lib/lint/` holds pure TS rules over the `WikiIndex` ([ip-data-contract](ip-data-contract.md) §4.1), plus two optional git-backed rules (§3). Each rule is `{ code, severity, run(ctx): Finding[] }`. A `Finding` is `{ code, severity: 'error'|'warn'|'info', path, id?, line?, message, hint? }`.
- **Runner:** a vitest suite, `tests/lint/wiki-lint.test.ts`, under a dedicated config `vitest.lint.config.mts` (environment `node`, include `tests/lint/**`, except the gate report of §4). The config and the first member of the suite, the real-wiki loader test `tests/lint/real-wiki-loader.test.ts`, exist since IP-2 (wave 0c item 3: tests that read the real wiki run under `lint:wiki`, not `npm test`). This avoids adding a TS script runner. Verified in IP-5: vitest 5 runs the suite and prints the report, provided the config sets `reporters: ["default"]` and `silent: false`. When stdout is not a TTY, vitest 5 otherwise picks a minimal reporter that hides the console output of passing tests ([IP-5-gate.txt](../raw/evidence/phase-p0-planning/interactive-plan/IP-5-gate.txt)).
- **npm scripts:**
  - `"lint:wiki": "vitest run --config vitest.lint.config.mts"`
  - `"lint:wiki:json": "node scripts/with-env.mjs WIKI_LINT_JSON=1 -- vitest run --config vitest.lint.config.mts"`. `scripts/with-env.mjs` is a small cross-platform env shim (it sets the variables and runs the package's bin with the same node), so `cross-env` is not needed (decided in IP-5).
  - `"gate": "vitest run --config vitest.gate.config.mts"` (§4).
- **Output:**
  - Findings are sorted by severity, then path, then line, one per line: `ERROR REF-DANGLING wiki/phases/phase-p3-tabs-sessions.md:12  related → adr-0099 does not resolve`.
  - The summary line is `lint: N errors, M warnings, K info (pages: P)`.
  - The suite fails if `errors > 0`. With `WIKI_LINT_STRICT=1` it also fails on warnings.
- **Inputs:** `PLAN_WIKI_DIR`, `PLAN_STATUS_FILE`, `PLAN_DATA_DIR` and `PLAN_REPO_ROOT` ([ip-spec](ip-spec.md) §6). The defaults point at the real repo. Tests point them at fixtures. The lint reads `approvals.json` (a missing file means every key is PENDING) and never writes it. The suite checks that `approvals.json`, `SCHEMA.md`, `STATUS.md`, `index.md` and `log.md` are unchanged after the run.
- **JSON report:** `WIKI_LINT_JSON=1` writes `{schema_version, generated_at, today, wiki_dir, git, approvals_file, node, summary, clean, counts_by_code, rules, findings}` to `WIKI_LINT_OUT` (relative to `interactive_plan/`), default `.lint/wiki-lint.json`.
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
| `REF-DANGLING` | error | Any reference field ([ip-data-contract](ip-data-contract.md) §4.2) that does not resolve (`blocked_on` may also name a registered `Q-NNN`); task refs (`spike`, `current_task`) that match no phase task; an integrity tag or `unverified[].verify_in` naming a phase id that is not a phase page; `sources` path entries (any wiki-relative path, e.g. `raw/…` or `SCHEMA.md`; not URLs, not on raw research notes) that do not exist (SCHEMA §5.1; owner answer 2026-10-09, [wave 0c](../raw/owner/2026-10-09-s01-wave0c.md) items 1 and 2); relative body links (outside fenced code) to missing files or missing heading anchors (anchors via the `rehype-slug` slug algorithm on target headings). `index.md` lines are checked by `INDEX-MISSING` only, so a broken line is reported once |
| `REF-RECIPROCAL` | error | `rq.hypotheses` ↔ `hyp.rq`; `hyp.experiments` ↔ `exp.hypotheses` |
| `ORPHAN` | warn | No inbound reference from another page's frontmatter, `sources` or body. Links from `index.md` and `log.md` do **not** count, since everything is in the index. Singletons and `STATUS.md` are exempt |
| `INDEX-MISSING` | error | A page is not listed in `index.md`, an index line points at a missing file or folder, or a line fails the SCHEMA §11 regex. The status column must equal the page's `status` (or `raw`). Raw files: those at the `raw/` top level and under `raw/owner/`, `raw/research/` and `raw/assets/` each need their own line; files under `raw/evidence/` and `raw/bench/` are **not** listed individually; instead each first-level folder (`raw/evidence/<phase-id>/`, `raw/bench/<run-id>/`) containing a file needs one line whose label is the folder path relative to `wiki/raw/`, lower-cased, non-`[a-z0-9.-]` characters (including `/`) replaced by `-`, no trailing `-` (SCHEMA §11, [adr-0020](../decisions/adr-0020-index-lists-evidence-folders.md)); a file directly in `raw/evidence/` or `raw/bench/` is an error. A page counts as listed when a line's link resolves to its file, and the label must be its id. A page whose frontmatter has no parsable id (`FM-MISSING`) needs no line. Missing raw files and folders are reported on `wiki/index.md`, missing pages on the page |
| `STALE-UPDATED` | warn / error | warn when `updated` < `git log -1 --format=%cs -- <file>`; **error** when `updated` > today (local date) |
| `ADR-CHAIN` | error | `superseded` without `superseded_by`; an **accepted** A supersedes B but B is not superseded (SCHEMA §9.4 step 2 marks B only once A is accepted, so a proposed A is not an error; decided in IP-5); `accepted` without (approval counts-as-approved **or** `decided_by: owner` with a `raw/` source), per SCHEMA §10.4.3; `accepted` while the approval state is `REJECTED` or `CHANGES_REQUESTED`, whatever `decided_by` says (§10.4.4: case (b) only covers an ADR the owner has not overturned in the app; PENDING and STALE keep it; IP-9 review, [adr-0022](../decisions/adr-0022-approval-invalid-is-a-lint-error.md)) |
| `PHASE-ORDER` | error | A cycle in `depends_on` (every phase in a strongly connected component of size > 1 or with a self-loop, `lib/wiki/cycles.ts`, shared with the roadmap; a plain DFS missed phases that reach the cycle only through a finished node, IP-9 review), a `depends_on` id that resolves to a page that is not a phase (SCHEMA §6.3; it would read as an INVALID `#exit` key in the entry gate), a dependency whose order ≥ own order, a duplicate `order`, `order` not equal to N in `phase-pN-…`, or a duplicate task id across all phases |
| `TRUST-EDGE` | error | `crosses_trust_boundary` differs from (`trust_level(from)` ≠ `trust_level(to)`) |
| `UNV-NOPHASE` | error | The SCHEMA §7.1 tag keyword (uppercase, case-sensitive) not immediately followed by a bracketed phase id that matches the §7.1 regex, in page bodies outside fenced code blocks and outside inline code spans (a keyword in backticks quotes the syntax, as in `tools/quick_lint.py`; decided in IP-5). Exempt: `raw/`, and the rule text inside `SCHEMA.md` §7 |
| `UNV-PASTDUE` | error | An inline integrity tag naming phase P, or a frontmatter `unverified[].verify_in = P`, where P has `status: done` or `P.order < order(STATUS.current_phase)`. A well-formed tag inside inline code counts, because SCHEMA §7.1 exempts only fenced code. `log.md` is exempt: it is append-only, so the tags its entries quote can never be edited (decided in IP-5) |
| `INT-NUMBER-NOSRC` | warn | In bodies of `experiment, metric, hypothesis, overview` pages: a paragraph containing a number + unit (`ms, s, %, MB, MiB, GB, GiB, KB, KiB, J, mJ, W, fps`) with no link into `raw/bench/` or `raw/evidence/` in the same paragraph. This is a heuristic, and every warning needs a disposition in the `lint` log entry |
| `HYP-NO-DATA` | error | A hypothesis with status `supported / not-supported / inconclusive` that has no linked experiment with `status: analyzed` and a non-empty `results_ref` |
| `RAW-IMMUTABLE` | error | See §3 |
| `APPROVAL-STALE` | info / warn | An approval in state `STALE`. It is warn when the page is in the dependency set of `STATUS.current_phase` or of its direct successors |
| `CONTRADICTION` | warn | A line matching `^> \*\*CONTRADICTION:\*\*` (an open contradiction marker); the message says which `Q-NNN` registers it. The semantic pass stays an LLM task, and the report always reminds the session to do it (one `info` line) |
| `SCHEMA-SPLIT` | info | Not mechanically checkable (SCHEMA §9.3 lists it as an error of the manual check). The report always prints the reminder "compare CLAUDE.md rules with SCHEMA.md (manual)" |
| `LOG-FORMAT` | error | A `log.md` line starting `## [` that fails the SCHEMA §12 heading regex, entries out of date order, or a top-level `- key:` bullet with a key outside §12 (reported by the loader, [ip-data-contract](ip-data-contract.md) §5.2) |
| `Q-FORMAT` | error | An `ov-open-questions` section without exactly one valid `- status:` line or with an unparsable `- blocking:` list, or a duplicate `Q-NNN`; treated as open and blocking every phase (loader, [ip-data-contract](ip-data-contract.md) §5.3) |
| `Q-BLOCK-UNGATED` | warn | An **open** question's `blocking` id is in no phase's dependency set (SCHEMA §9.7 step 3), so it gates nothing. Answered and withdrawn questions are not checked |
| `PHASE-DONE-NO-EXIT` | warn | A phase with `status: done` whose `<phase-id>#exit` approval does not count as approved |
| `APPROVAL-INVALID` | error | SCHEMA §10.3: an approvals key whose page is missing or not approvable, or a `#exit` key on a non-phase page; an invalid or unreadable `approvals.json` is one finding on the file. Adopted into the SCHEMA §9.3 table as an **error** by [adr-0022](../decisions/adr-0022-approval-invalid-is-a-lint-error.md) (IP-9 review; it was a §2.1 warn before, which contradicted §10.3 "lint error") |

### 2.1 Additional checks derived from MUST rules elsewhere in SCHEMA

SCHEMA does not list these codes in §9.3, but each enforces an explicit SCHEMA MUST. They are **proposed** as additions to the §9.3 table. Until the schema adopts them, they report as **warn**, so they cannot block a gate on their own. That decision belongs to the schema owner.

| Code | SCHEMA rule |
|---|---|
| `FM-VOLATILE` | §5: `status`, `updated` and `last_verified_commit` must be top-level single-line scalars |
| `FM-YAML-SUBSET` | §5: no anchors, aliases, tags or multi-document streams |
| `ADR-SECTIONS` | §6.4: the body has `## Context`, `## Options considered`, `## Decision`, `## Consequences` and `## Verification / evidence`, in order |
| `HANDOFF-SECTIONS` | §6.15: the body has `## Done`, `## In progress`, `## Next`, `## Blockers` and `## Notes for next session` |
| `COMP-UNSAFE` | §6.2: `unsafe_code: true` requires `## Unsafe invariants` |
| `COMP-LVC` | §6.2: `last_verified_commit` is required once `status ≥ implemented` (that is `implemented` or `verified`; decided in IP-5) |
| `EXP-RESULTS` | §6.8: `results_ref` is required when the status is `complete` or `analyzed` |
| `RISK-SCORE` | §6.5: a stored score must equal L × I |
| `STATUS-APPROVED` | §10.4.5: an `overview` or `schema` page with `status: approved` but no counts-as-approved approval |
| `UNV-MIRROR` | §7.1: the set of phases in inline tags differs from the set in the frontmatter `unverified` list (`log.md` is exempt, as for `UNV-PASTDUE`) |
| `MERMAID-RULES` | §14: a `click` directive, `%%{init` or an HTML tag in a mermaid block (not class annotations such as `<<trait>>`), a flowchart or state diagram with more than 30 nodes (a heuristic count of node ids), or a `;` in the text of a `sequenceDiagram` line (mermaid ends a statement there, so the diagram does not parse; `#59;` entities are fine; added after the IP-9 review found `ov-arch-data-flows` unrenderable) |

Before IP-5, `LOG-FORMAT` was listed in this table. SCHEMA §9.3 lists it (and `Q-FORMAT`) as an error, so both are in the §2 table now.

## 3. Git-backed checks

These are the only rules that spawn a process (`git`, via `execFile` with a fixed argument list, cwd = repo root). They run in the lint CLI, **not** inside the web server's request path. The web server's lint (layout banner, `/lint`, per-page findings) builds its context with `{ git: false }` (`lib/server/data.ts`), so it never spawns git; this was confirmed and enforced in the IP-9 review (2026-10-09), when the server was found running git in the request path.

The git commands are batched (implemented in IP-5 in `lib/lint/git.ts`). git is used only when the repo root is the git top level, so a fixture wiki inside this repo is never judged by the repo's history.

- **`STALE-UPDATED`:** one `git log --format=%x00%cs --name-only -- wiki STATUS.md` gives the last commit date of every file, the same as `git log -1 --format=%cs -- <file>` per page. An `updated` older than that date is a warning. An `updated` later than today (local date) is an error, with or without git. With no git or no commits, the comparison is skipped, and an `info` line says so.
- **`RAW-IMMUTABLE`:**
  - One `git log -M --format=%x00%H --name-status --diff-filter=MRD -- wiki/raw` must list nothing: no modification, rename or deletion after the add commit. For M and D this gives the same result as `--follow` per file; a rename shows as R on the new path.
  - Uncommitted modifications to tracked raw files (`git status --porcelain=v1 --untracked-files=no -- wiki/raw`) are also errors.
  - `wiki/raw/MANIFEST.sha256` is append-only (SCHEMA §3.1). A change that only appends lines, in a commit or in the working tree, is allowed; any other change is an error.
  - **Sanctioned masking edits** (SCHEMA §3.1, adr-0027, added 2026-10-09): `tools/raw-sanctioned-edits.tsv` lists `<sha256 of the LF-normalised new content><TAB><path under wiki/raw/><TAB><authority>`. A modification (M) of a raw file whose resulting content, in that commit or in the working tree, has a listed hash is not reported; nor is a MANIFEST.sha256 change that only replaces the hash on a file's own line with a listed hash for that path (plus appended lines). Everything else is still an error (tests: `tests/unit/lint-git-sanctioned.test.ts`).
  - Without git history (no commit yet, or git unavailable), the rule falls back to `wiki/raw/MANIFEST.sha256` if present (format in SCHEMA §3.1: `<64 hex>  <path relative to wiki/raw/>`, hashed over LF-normalised bytes). A changed or missing file, or a malformed line, is an error.
  - With neither git history nor a manifest: info "RAW-IMMUTABLE not checkable yet".

## 4. Gate report (`npm run gate`)

The SCHEMA §9.6 RESUME step 7 and the §9.7 entry gate need a quick answer to "may I start phase P?". `tests/lint/gate-report.test.ts` (run by `npm run gate`) prints the `entryGate` checklist ([ip-data-contract](ip-data-contract.md) §8.3) for:

- the phase in `GATE_PHASE`, or
- `STATUS.current_phase` when `GATE_PHASE` is unset.

It also prints the effective approval state of every id in the dependency set. The suite **fails** when the gate is not passed, so its output can be pasted into the `gate` log entry. An invalid `approvals.json` fails the gate (fail closed), even under the P0 bootstrap exception. It only reads files. It never writes `approvals.json` or any page. It has its own config, `vitest.gate.config.mts`, so `npm run lint:wiki` does not run it.

```text
# Git Bash
GATE_PHASE=phase-p1-foundation npm run gate
# PowerShell
$env:GATE_PHASE='phase-p1-foundation'; npm run gate
```

## 5. Rule tests

Every rule has a golden test over `tests/fixtures/broken-wiki/`, a deliberately broken mini wiki where each file triggers exactly the findings named in its file name, for example `phases/phase-p1-broken-cycle--PHASE-ORDER.md` (raw files too: `raw/evidence/stray--INDEX-MISSING.txt`). Since IP-5 the fixture has an `index.md` and a hub page that links every other page, so `INDEX-MISSING` and `ORPHAN` fire only where a file name asks for them. The rules that need `approvals.json` or git are tested on temp copies with in-memory approvals and on a temporary git repository. There is also a clean fixture `tests/fixtures/mini-wiki/`, which must produce zero errors and zero warnings. See [ip-testing](ip-testing.md) §2.

## 6. Usage protocol for Claude sessions

1. After editing wiki pages: run `npm run lint:wiki`. Fix the errors. Record the warnings with a disposition in the `lint` log entry (SCHEMA §9.3).
2. At HANDOFF: run it again (or the quick subset if the context is short; SCHEMA §9.5).
3. At a phase gate: run `npm run lint:wiki:json` with `WIKI_LINT_OUT` pointing into `wiki/raw/evidence/<phase-id>/`, then run `npm run gate`.
4. If Node or the app is unavailable (for example on a fresh machine before `npm ci`), perform the checks manually as SCHEMA §9.3 describes and say so in the log.
