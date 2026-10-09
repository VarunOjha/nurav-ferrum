---
id: schema
type: schema
title: "Ferrum wiki schema (constitution of the LLM-maintained wiki)"
status: review
updated: 2026-10-08
sources:
  - raw/research/llm-wiki-pattern.md
  - raw/00-master-prompt.md
  - raw/01-scoping-decisions.md
  - raw/owner/2026-10-08-s01-wave0b.md
related: [adr-0001, adr-0002, adr-0003, adr-0014, adr-0016, adr-0020, comp-interactive-plan]
approvable: true
---

# Ferrum wiki schema

This file is the **constitution** of the Ferrum wiki. Every session, human or LLM, follows it. Where a rule says **MUST**, a check (the lint tool, the plan app, or Claude doing a manual lint) can test it mechanically. A rule that says **SHOULD** is guidance.

Status of this document: `review`. The amendment batch of 2026-10-08 is applied, and so is the §11 change of adr-0020 (index lists evidence and bench folders; see `log.md`). The owner has not yet approved it (approval key `schema` in `plan/approvals.json`). Until it is approved, it is the working convention for P0 only.

---

## 1. Purpose

1. Give a project that spans **many sessions and many days** a persistent memory that builds up over time. Any fresh session with no recall MUST be able to resume correctly from files alone. See [§9 Operations](#9-operations): RESUME and HANDOFF.
2. Make every plan item, design decision, risk, research claim and test gate **addressable by id**, **owner-approvable**, and **traceable**. The traceability chain runs: research question → hypothesis → experiment → workload/metric → raw data → analysis → conclusion (master prompt §13).
3. Enforce research integrity mechanically. No fabricated facts, versions, API capabilities, measurements or citations. Every unsourced technical claim carries a parseable `UNVERIFIED[...]` tag (§7).
4. Feed the interactive plan app (`interactive_plan/`, `comp-interactive-plan`). The app **reads `wiki/` directly** (frontmatter + markdown) and does not copy its content, so the visualisation cannot drift from the wiki.

## 2. Origin: Karpathy's LLM Wiki pattern, and what is ours

Source: [raw/research/llm-wiki-pattern.md](raw/research/llm-wiki-pattern.md). That note summarises Karpathy's gist "LLM Wiki" (https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f, accessed 2026-10-08).

| Element | Origin |
|---|---|
| Three layers: immutable raw sources / LLM-maintained wiki / schema | **Gist** (VERIFIED in note §3) |
| Operations INGEST, QUERY, LINT | **Gist** (VERIFIED in note §4) |
| `index.md` catalogue by category; `log.md` append-only with prefix `## [YYYY-MM-DD] op \| Title` | **Gist** (VERIFIED in note §5) |
| YAML frontmatter on pages | Gist mentions Dataview over YAML frontmatter as an optional tip. Making it mandatory is **ours** |
| DECIDE, HANDOFF, RESUME, PHASE-GATE, CODE operations; ADRs; owner approvals with content hashes; `UNVERIFIED[...]` tags; STATUS.md | **Ferrum extensions**. These are not part of the gist |

The gist names `CLAUDE.md` as the schema file for Claude Code. Ferrum splits the schema layer into two files:

- `CLAUDE.md` (repo root) is the short **bootstrap**. Claude Code loads it automatically. It holds the integrity rules and the RESUME procedure, and it points here.
- `wiki/SCHEMA.md` (this file) holds the **full** conventions.

Together they form the schema layer. If the two conflict, this file wins, and the conflict is a lint error.

Divergence to note: in the gist the LLM owns the wiki outright. In Ferrum the LLM still *writes* every wiki page, but **owner approval** (§10) gates which pages are binding for implementation.

---

## 3. The three layers

### 3.1 Raw sources: `wiki/raw/` (IMMUTABLE)

- A raw file is **never edited, renamed or deleted** once it is created. This applies to every agent and every session. A correction is made by adding a *new* raw file that references the old one.
- Claude MAY **create** new raw files only of these kinds:
  - fetched-source research notes (`raw/research/`)
  - verbatim or verbatim-in-substance transcriptions of owner answers (`raw/owner/`)
  - benchmark run outputs (`raw/bench/`)
  - test-gate evidence (`raw/evidence/`)
  - downloaded assets (`raw/assets/`)
- A raw file is the **source of truth** for its content. Wiki pages cite raw files in `sources`.
- Raw files are exempt from the wiki frontmatter rules (§5), with one exception: research notes carry the reduced frontmatter of the `research-note` type (§6.13).
- **Benchmark runs (open vs sealed).** A run folder `raw/bench/<run-id>/` is *open* until it contains a file named `SEALED`. While it is open, new files and new `segment-NN/` subfolders MAY be added to it (for example when an interrupted campaign resumes, adr-0003 rule 5). Files already written are never changed, in an open run or a sealed one. Once `SEALED` exists, nothing is added.
- Lint check `RAW-IMMUTABLE`: a raw file whose git history shows any modification after its first commit is an **error**. Before git history exists, compare against the hash manifest `wiki/raw/MANIFEST.sha256`.
- **Manifest (`wiki/raw/MANIFEST.sha256`).** Created in task p0.8 (moved forward from P1 so that the P0 raw sources have tamper evidence before the first commit). Format: one line per raw file, `<64 lowercase hex sha256>  <path relative to wiki/raw/, forward slashes>` (two spaces), hash taken over the LF-normalised bytes (§10.2 `N`). The manifest does not list itself. It is **append-only**: a new raw file adds a line in the same edit, and existing lines are never changed. It is the one file under `wiki/raw/` that is appended to rather than immutable. Each lint evidence file records the manifest's own sha256.

### 3.2 Wiki pages: `wiki/**` except `wiki/raw/` (LLM-maintained)

- Claude writes and maintains these pages. The owner reads them, comments on them and approves them through the plan app. The owner MAY edit them, but every edit, whoever makes it, is logged.
- A wiki page states facts **only** with a citation to a raw source or another wiki page, or with an `UNVERIFIED[...]` tag (§7).

### 3.3 Schema: `wiki/SCHEMA.md` + `CLAUDE.md`

- Owner and Claude co-evolve the schema. Every change gets a `schema` log entry.
- Because the schema is approvable, any edit makes its approval stale (§10).

### 3.4 Non-wiki artefacts

- **Code** (`apps/`, `crates/`, `benchmarks/`, …) is not a raw source and not a wiki page. It is the thing the wiki describes.
- **Root summary files** (§4.2) are human-facing views generated from the wiki.
- **`plan/approvals.json`** is the owner's approval record (§10).

**Precedence when sources disagree:** raw sources > accepted ADRs > this schema > other wiki pages > root summary files > interactive-plan rendering. Any disagreement found is a lint finding (§9.3).

---

## 4. Directory layout

### 4.1 `wiki/`

```text
wiki/
├── SCHEMA.md                     # this file (id: schema)
├── index.md                      # catalogue of every page (id: index)        §11
├── log.md                        # append-only chronological log (id: log)    §12
├── raw/                          # IMMUTABLE sources                          §3.1
│   ├── 00-master-prompt.md
│   ├── 01-scoping-decisions.md
│   ├── research/                 # research-note files (verified fetched sources)
│   ├── owner/                    # YYYY-MM-DD-<slug>.md owner answers/approvals, verbatim
│   ├── evidence/<phase-id>/      # test-gate evidence (logs, reports, screenshots)
│   ├── bench/<run-id>/           # benchmark raw outputs (never edited, never cherry-picked)
│   └── assets/                   # downloaded images/files referenced by notes
├── overview/                     # type overview, glossary; open-questions page
├── architecture/                 # type overview (architecture narrative, trust boundaries)
│   └── components/               # type component  (comp-*.md)
├── phases/                       # type phase      (phase-p*.md)
├── decisions/                    # type decision   (adr-NNNN*.md)
├── risks/                        # type risk       (risk-rNN*.md)
├── research/
│   ├── questions/                # type research-question (rq-*.md)
│   ├── hypotheses/               # type hypothesis        (hyp-*.md)
│   ├── experiments/              # type experiment        (exp-*.md)
│   ├── metrics/                  # type metric            (metric-*.md)
│   └── workloads/                # type workload          (wl-*.md)
├── quality/                      # type quality (test strategy, test gates, security test plan)
├── operations/                   # type operations (resume/handoff protocol, toolchain, git workflow)
│   └── handoffs/                 # type handoff (handoff-YYYY-MM-DD-sNN.md)
└── interactive-plan/             # type overview|operations: the plan app's data contract & views
```

A page's type MUST match its directory. The allowed `type` values per directory are: the directory types above; `overview` anywhere under `overview/`, `architecture/` and `interactive-plan/`; `overview` directly in `research/` (narrative pages `ov-research-*`) and directly in `risks/` (`ov-risk-register`) (amendment 2026-10-08, Q-207); and `glossary` only at `overview/glossary.md`. `wiki/SCHEMA.md`, `wiki/index.md` and `wiki/log.md` carry types `schema`, `index` and `log`; root `STATUS.md` carries type `status`.

### 4.2 Repository root (outside `wiki/`)

| File | Role | Frontmatter |
|---|---|---|
| `CLAUDE.md` | Session bootstrap: integrity rules, RESUME steps, pointer to this schema. Covered by the `schema` approval through `bootstrap_hash` (§10.2) | none required |
| `STATUS.md` | **Live state + exact next action**. It is updated after every completed task and at HANDOFF | REQUIRED, see §6.16 |
| `README.md`, `PLAN.md`, `ARCHITECTURE.md`, `RESEARCH_PLAN.md`, `AI_USAGE.md` | Human-facing summaries. Each MUST link to its canonical wiki pages, and the wiki wins on conflict | none (GitHub renders frontmatter badly) |
| `plan/approvals.json` | Owner approvals (§10). Written **only** by the plan app on an owner action | n/a (JSON) |
| `interactive_plan/` | Next.js plan app (`comp-interactive-plan`, not shipped with Ferrum) | n/a |

---

## 5. Frontmatter: common rules

Every wiki page (all of §4.1 except `raw/`) MUST start at byte 0 with a YAML frontmatter block. The block opens with a line that is exactly `---` and closes with the next line that is exactly `---`.

**File encoding rules (MUST):** UTF-8 with no BOM. The file ends with exactly one `\n`. Git may check files out with CRLF; hashing normalises line endings (§10.2).

**YAML subset (MUST)**, so the plan app and the lint tool can parse it simply:

- block-style mappings and lists (inline `[]` and `[a, b]` are allowed for lists of scalars)
- no anchors, aliases, tags or multi-document streams
- booleans are lowercase `true`/`false`
- dates are unquoted `YYYY-MM-DD`
- a string containing `: `, ` #`, a leading `[`/`{`, or `|` MUST be double-quoted
- the volatile keys `status`, `updated` and `last_verified_commit` MUST be top-level single-line scalars (this is needed for the scope hash, §10.2)

### 5.1 Fields required on every page

| Field | Type | Rule |
|---|---|---|
| `id` | string | Matches the type's id pattern (§8). Unique across the whole wiki, raw research notes included. The basename (without `.md`) MUST equal `id` or start with `id` + `-`. Exceptions: `wiki/SCHEMA.md` (id `schema`), root `STATUS.md` (id `status-live`), and raw research notes, whose basename MAY equal the id without its `research-` prefix (e.g. id `research-llm-wiki-pattern` in `raw/research/llm-wiki-pattern.md`) |
| `type` | enum | `overview, component, phase, decision, risk, research-question, hypothesis, experiment, metric, workload, quality, operations, handoff, glossary, index, log, schema, status`. (`status` only for the singleton root `STATUS.md`, §6.16; `research-note` is raw-only, §6.13) |
| `title` | string | Human title. Quoted if it contains `:` |
| `status` | enum | One of the values allowed for the type (§6) |
| `updated` | date | Date of the last content edit. Not in the future. Not older than the file's last git commit date |
| `sources` | list of strings | Paths **relative to `wiki/`** (`raw/…`) or absolute `https://` URLs. Use `[]` only when the page is pure planning with no factual claims |
| `related` | list of ids | Every entry MUST resolve to an existing id. Order is not significant |
| `approvable` | bool | `true` means the plan app shows Approve / Request changes, and the page takes part in the gates (§10) |

### 5.2 Fields optional on every page

| Field | Type | Meaning |
|---|---|---|
| `phase` | phase id | The phase that owns or produces this page |
| `tags` | list of strings | Lowercase kebab-case; free-form |
| `unverified` | list of `{claim, verify_in}` | Structured mirror of inline `UNVERIFIED[...]` tags (§7). `verify_in` is a phase id |
| `superseded_by` | id | Set when this page is replaced. The page keeps existing |
| `aliases` | list of strings | Alternative names, used by the glossary and search |
| `last_verified_commit` | 40-hex or 7+-hex git sha | Last commit at which Claude confirmed the page against the code. Volatile |

Unknown keys are allowed, but lint warns about them (`FM-UNKNOWN-KEY`). Before adding a new key, add it to this schema (DECIDE or `schema` log entry).

### 5.3 Default `approvable` by type

`true`: schema, overview (architecture pages), component, phase, decision, risk, research-question, hypothesis, experiment, metric, workload, quality.
`false`: index, log, handoff, glossary, operations (unless the page defines a protocol the owner must sign off, such as the resume protocol).

These are defaults. The value in the frontmatter is what counts.

---

## 6. Page types

Each type below lists **its additional REQUIRED fields** (on top of §5.1), its OPTIONAL fields and its `status` enum. Lists of ids MUST resolve (lint `REF-DANGLING`).

### 6.1 `overview`

Project overview, vision, architecture narrative, trust-boundary map, open questions, roadmap.

- id: `ov-<slug>`
- status: `draft | review | approved | outdated`
- REQUIRED extra: none
- OPTIONAL: `audience: owner|claude|both`
- Body SHOULD contain at least one mermaid diagram when it describes structure

The open-questions page is `ov-open-questions` at `overview/ov-open-questions.md`. It holds one `##` section per question: `## Q-<NNN> <title>`, with `asked:` date, `blocking:` [ids], `status: open|answered|withdrawn`, and the answer link into `raw/owner/`.

### 6.2 `component`

Each logical component gets one page: a Ferrum crate or app, an external runtime, or tooling.

- id: `comp-<slug>`, location `architecture/components/`
- status: `planned | in-progress | implemented | verified | deprecated`

| Field | Req | Type / enum |
|---|---|---|
| `path` | REQ | Repo-relative path (e.g. `crates/security/`). Use `null` for external components |
| `crate` | REQ | Cargo crate name, or `null` (not Rust, or external) |
| `trust_level` | REQ | `trusted` (Ferrum's own privileged code) \| `untrusted` (code that renders or executes remote web content) \| `external` (third-party runtime, e.g. WebView2) |
| `phase_introduced` | REQ | phase id |
| `responsibilities` | REQ | List of strings (one responsibility per item; trace to master prompt §4 where applicable) |
| `connects` | REQ | List of `{to, label, kind, crosses_trust_boundary}`. MAY be `[]` only when the component initiates no interaction with any other component (a leaf library, an external runtime or system modelled only as a target, or stand-alone tooling); the body then says so. `to`: component id. `label`: short string. `kind`: `rust-api \| tauri-ipc \| tauri-event \| webview2-com \| cdp \| process-spawn \| file-io \| network \| os-api \| data-export`. `crosses_trust_boundary`: bool. Edges are directed (from this component to `to`) |
| `interfaces` | OPT | List of strings (public API / command names) |
| `shipped` | OPT | Bool; `false` for `comp-interactive-plan`, `comp-baseline-app` and harness tooling |
| `unsafe_code` | OPT | Bool; `true` requires a body section `## Unsafe invariants` (master prompt §15) |
| `external_version` | OPT | Observed version string, which MUST cite a source (e.g. a raw environment record) |
| `last_verified_commit` | OPT (REQUIRED once `status ≥ implemented`) | git sha |

Consistency rules:

- An edge with `crosses_trust_boundary: true` MUST connect components whose `trust_level` differ. The reverse also holds: an edge whose endpoints' trust levels differ MUST be marked `true`.
- From P1 onward, lint checks that `path` exists in the repo when `status ≥ in-progress`.

### 6.3 `phase`

The phase ids are fixed by the registry (§8).

- status: `planned | ready | in-progress | gate-review | done | blocked`. `ready` means the entry gate has passed (§9.6). `gate-review` means the exit evidence is complete and waiting for the owner.

| Field | Req | Type |
|---|---|---|
| `milestone` | REQ | `M1`…`M7` or `null` (P0, P1 have none) |
| `order` | REQ | Integer 0–8. Unique. Equals the N in `phase-pN-…` |
| `depends_on` | REQ | List of phase ids, each with a lower `order` (no cycles) |
| `est_sessions` | REQ | Integer ≥ 1. A planning estimate, not a measurement |
| `entry_criteria` | REQ | List of strings |
| `deliverables` | REQ | List of strings |
| `tasks` | REQ | List of `{id, title, verify}`. `id` = `pN.M` (e.g. `p2.3`), unique within the wiki. `verify`: how completion is checked (a command, a test name or an observable condition) |
| `test_gate` | REQ | `{automated: [..], manual: [..], evidence: [..]}`. `automated`: commands or test-suite names that MUST pass. `manual`: owner-performed checks. `evidence`: paths under `raw/evidence/<phase-id>/` that MUST exist at the exit gate |
| `exit_criteria` | REQ | List of strings |
| `risks` | REQ | List of risk ids (may be `[]`) |
| `decisions` | REQ | List of ADR ids this phase depends on (may be `[]`) |
| `experiments` | REQ | List of experiment ids (may be `[]`) |
| `components` | OPT | List of component ids touched |

Task progress is **not** stored on the phase page. It goes in `STATUS.md`, the `log.md` `code` entries and handoffs. This keeps the scope hash stable (§10.2).

### 6.4 `decision` (ADR)

- id: `adr-NNNN` (4 digits), file `decisions/adr-NNNN-<slug>.md`
- status: `proposed | accepted | superseded | rejected`

| Field | Req | Type |
|---|---|---|
| `date` | REQ | Date the decision was proposed or taken |
| `decided_by` | REQ | `owner` (the owner chose it; the source cites a raw file recording that) \| `claude-proposed` (needs owner approval to become accepted) |
| `supersedes` | REQ | List of ADR ids (`[]` if none) |
| `superseded_by` | OPT | ADR id (REQUIRED when `status: superseded`) |
| `options` | OPT | List of strings (option names; detail goes in the body) |

The body MUST have these sections, in order: `## Context`, `## Options considered`, `## Decision`, `## Consequences`, `## Verification / evidence`.

### 6.5 `risk`

- id: `risk-rNN` (two or more digits; new risks from `risk-r07`)
- status: `open | mitigating | resolved | realized | tolerated`

| Field | Req | Type |
|---|---|---|
| `likelihood` | REQ | Integer 1–5 (1 = rare, 5 = almost certain) |
| `impact` | REQ | Integer 1–5 (1 = negligible, 5 = blocks a milestone or invalidates research) |
| `mitigation` | REQ | String |
| `spike` | REQ | Task id (`pN.M`) of the de-risking spike, or `null` |
| `owner_phase` | REQ | Phase id responsible for resolving it |
| `trigger` | OPT | Observable early-warning sign |
| `fallback` | OPT | Plan B if the risk is realised |

Score = likelihood × impact. Lint derives it. If the score is stored, it MUST match.

### 6.6 `research-question`

- id: `rq-NN`
- status: `open | investigating | answered | dropped`
- REQUIRED extra: `question` (string), `hypotheses` (list of hyp ids, may be `[]` while drafting)
- OPTIONAL: `paper_section` (string)

### 6.7 `hypothesis`

- id: `hyp-NN`
- status: `draft | preregistered | testing | supported | not-supported | inconclusive | withdrawn`

| Field | Req | Type |
|---|---|---|
| `rq` | REQ | rq id (reciprocal: that rq lists this hypothesis) |
| `prediction` | REQ | String: directional, falsifiable |
| `null_hypothesis` | REQ | String |
| `metrics` | REQ | List of metric ids |
| `experiments` | REQ | List of experiment ids (reciprocal with `experiment.hypotheses`) |
| `practical_threshold` | OPT | String: the smallest effect that counts as practically meaningful (master prompt §10) |

`supported`, `not-supported` and `inconclusive` are allowed only when an experiment with `status: analyzed` links `results_ref` into `raw/bench/`.

### 6.8 `experiment`

- id: `exp-<slug>`. The initial families are fixed by the registry (§8).
- status: `designed | ready | running | complete | analyzed | aborted`

| Field | Req | Type |
|---|---|---|
| `hypotheses` | REQ | List of hyp ids |
| `workloads` | REQ | List of workload ids |
| `configurations` | REQ | List of configuration ids: `cfg-chrome, cfg-edge, cfg-tauri-baseline, cfg-ferrum-nolifecycle, cfg-ferrum-adaptive` (master prompt §8 A–E), plus `cfg-<slug>` additions defined in the body |
| `metrics` | REQ | List of metric ids |
| `trials` | REQ | `{target: int, warmup: int, order: randomized\|counterbalanced}` (master prompt §10 target ≥ 30 where practical) |
| `analysis` | REQ | String naming the statistical method (e.g. bootstrap CI of median difference) |
| `phase` | REQ | Phase id that runs it |
| `results_ref` | OPT (REQUIRED when `status ∈ {complete, analyzed}`) | List of `raw/bench/<run-id>/` paths |
| `fairness_controls` | OPT | List of strings (viewport, cache, network, extensions, throttling, hardware) |

### 6.9 `metric`

- id: `metric-<slug>`
- status: `proposed | defined | validated | retired`

| Field | Req | Type |
|---|---|---|
| `unit` | REQ | e.g. `bytes`, `ms`, `J`, `%cpu`, `count` |
| `definition` | REQ | String |
| `boundary_start` | REQ | Exact event that starts the measurement (or `n/a` for point samples) |
| `boundary_end` | REQ | Exact event that ends it (or `n/a`) |
| `method` | REQ | How it is sampled or aggregated (incl. process-tree attribution rules) |
| `tool` | REQ | API or tool name. Capabilities not backed by a source carry `UNVERIFIED[...]` |
| `normalization` | REQ | String (`none` allowed) |
| `support` | REQ | `supported` (verified working on the benchmark machine; cite evidence) \| `unsupported` (verified not measurable; never estimated) \| `unverified` |

### 6.10 `workload`

- id: `wl-<slug>`
- status: `proposed | implemented | validated | retired`

| Field | Req | Type |
|---|---|---|
| `workload_kind` | REQ | `synthetic-local \| public-real-world` |
| `master_prompt_ref` | REQ | Integer 1–10 (master prompt §9 list item) or `null` |
| `parameters` | REQ | Mapping of parameter → value (e.g. `{duration_s: 60, tabs: 10}`) |
| `fixture_path` | REQ | Repo path (e.g. `benchmarks/workloads/<slug>/`) or URL for public-real-world |
| `equivalence_check` | OPT | String: how equivalence across browsers is validated |

### 6.11 `quality` (test-gate / quality pages)

Test strategy, per-phase gate rationale, security test plan, CI policy.

- id: `qual-<slug>`
- status: `draft | active | retired`
- REQUIRED extra: `scope` (list of phase ids, or `[all]`), `test_kinds` (list from `unit | integration | e2e | security | benchmark-validation | build | lint | manual | ci`), `tooling` (list of strings)

### 6.12 `operations`

Resume/handoff protocol, toolchain setup, git workflow, lint procedure, plan-app usage.

- id: `ops-<slug>`. Pages under `wiki/interactive-plan/` use `ip-<slug>`.
- status: `draft | active | retired`
- REQUIRED extra: `audience` (`claude | owner | both`), `trigger` (string: when to use the procedure)

### 6.13 `research-note` (raw only: `wiki/raw/research/`)

- id: `research-<slug>`
- REQUIRED: `id, type, title, updated, sources`. No `status` or `approvable`, because raw files are immutable.
- The body MUST give the access date for every URL and label each claim VERIFIED / UNCERTAIN / PROPOSAL, following `research-llm-wiki-pattern`.
- Being raw, it is never edited. A newer finding goes in a new note that references the old one.

### 6.14 `glossary`

- id: `glossary` (single page `overview/glossary.md`)
- status: `draft | active`
- Body: one `### <Term>` per entry, with the definition and a source or link

### 6.15 `handoff`

- id: `handoff-YYYY-MM-DD-sNN`, file `operations/handoffs/handoff-YYYY-MM-DD-sNN.md` (the file name starts with the id, §5.1; amendment 2026-10-08, Q-004)
- status: `final | partial` (`partial` = written early as a checkpoint)
- REQUIRED extra:
  - `session` (`sNN`)
  - `phase` (phase id)
  - `next_action` (string: the exact next command or step)
  - `uncommitted` (list of repo paths, `[]` if clean)
  - `open_questions` (list of `Q-NNN`)
- Body sections: `## Done`, `## In progress`, `## Next`, `## Blockers`, `## Notes for next session`

### 6.16 Special singletons

| File | id | type | Extra REQUIRED fields | status enum |
|---|---|---|---|---|
| `wiki/index.md` | `index` | `index` | none | `active` |
| `wiki/log.md` | `log` | `log` | none | `active` |
| `wiki/SCHEMA.md` | `schema` | `schema` | none | `draft \| review \| approved` |
| `STATUS.md` (root) | `status-live` | `status` | `session` (sNN), `current_phase` (phase id), `current_task` (`pN.M` or `null`), `next_action` (string), `blocked_on` (list of ids / `Q-NNN`), `last_handoff` (handoff id or `null`) | `active \| blocked \| awaiting-owner` |

`STATUS.md` keeps `sources`/`related`/`approvable` (`approvable: false`) for uniformity.

---

## 7. Integrity tagging (machine-checkable)

1. **UNVERIFIED tag.** Write any technical claim (API capability, version compatibility, performance expectation, tool behaviour) that is not backed by a cited raw source as:
   `UNVERIFIED[phase-pN-<slug>]` immediately before or after the claim. The phase id names the phase in which the claim will be verified.
   - Regex: `UNVERIFIED\[(phase-p[0-8]-[a-z0-9-]+)\]`
   - A bare `UNVERIFIED` with no bracket is a lint error (`UNV-NOPHASE`) outside `raw/`, fenced code blocks and this file's rule text.
   - The structured mirror is the `unverified:` frontmatter list. Lint warns when a tag and the list disagree.
2. **Past-due claims.** An `UNVERIFIED[P]` tag where phase `P` has `status: done`, or where `P.order` < the order of the current phase in `STATUS.md`, is a lint **error** (`UNV-PASTDUE`). Fix it by verifying the claim (cite new evidence), re-targeting it with a logged reason, or deleting it.
3. **No results without data.** A page stating a measured value (a number with a unit presented as an observation) MUST link a `raw/bench/` or `raw/evidence/` file. Until P5/P6 deliver data, **no page contains performance results**. Lint heuristic `INT-NUMBER-NOSRC` warns on such numbers in `type: experiment|metric|hypothesis|overview` pages without a raw link in the same paragraph.
4. **Citations.** Academic references live only in research notes or literature pages that cite a fetched source. Never invent authors, DOIs, venues or novelty.
5. **Versions.** Version numbers MUST cite a raw environment record (e.g. `raw/01-scoping-decisions.md`) or official documentation captured in a research note.

---

## 8. Id conventions

- **Character set:** lowercase `[a-z0-9-]`, starting with the type prefix. Ids are **permanent**: never reuse or rename one. To replace a page, mark it superseded or retired.

| Type | Pattern (regex) | Registry / examples |
|---|---|---|
| phase | `^phase-p[0-8]-[a-z0-9-]+$` | Fixed: `phase-p0-planning`, `phase-p1-foundation`, `phase-p2-minimal-container`, `phase-p3-tabs-sessions`, `phase-p4-security`, `phase-p5-telemetry`, `phase-p6-benchmark-harness`, `phase-p7-lifecycle`, `phase-p8-research-paper` |
| task (inside phase) | `^p[0-8]\.[0-9]+$` | `p1.4` |
| component | `^comp-[a-z0-9-]+$` | Fixed: `comp-app-shell, comp-webview-manager, comp-security-engine, comp-resource-manager, comp-telemetry, comp-network-logger, comp-core, comp-benchmark-harness, comp-research-analysis, comp-baseline-app, comp-webview2-runtime, comp-interactive-plan`. Modelling nodes added by the architecture area (2026-10-08): `comp-tab-content` (untrusted web content), `comp-windows-os` and `comp-competitor-browsers` (external) |
| decision | `^adr-[0-9]{4}$` | `adr-0001` … `adr-0021` registered; next free `adr-0022` (always confirm with `ls wiki/decisions/adr-*.md`, sorted, last entry) |
| risk | `^risk-r[0-9]{2,}$` | `risk-r01` … `risk-r25` registered; next free `risk-r26` |
| research-question | `^rq-[0-9]{2,}$` | `rq-01` |
| hypothesis | `^hyp-[0-9]{2,}$` | `hyp-01` |
| experiment | `^exp-[a-z0-9-]+$` | Fixed families: `exp-baseline-footprint, exp-startup, exp-navigation, exp-rendering, exp-energy, exp-reliability, exp-security-overhead, exp-lifecycle-policies, exp-isolation-overhead` |
| metric | `^metric-[a-z0-9-]+$` | `metric-private-bytes` |
| workload | `^wl-[a-z0-9-]+$` | `wl-static-info` |
| configuration (not a page) | `^cfg-[a-z0-9-]+$` | see §6.8 |
| overview | `^ov-[a-z0-9-]+$` | `ov-project`, `ov-open-questions` |
| quality | `^qual-[a-z0-9-]+$` | `qual-test-strategy` |
| operations | `^ops-[a-z0-9-]+$` / `^ip-[a-z0-9-]+$` | `ops-resume-protocol`, `ip-data-contract` |
| handoff | `^handoff-[0-9]{4}-[0-9]{2}-[0-9]{2}-s[0-9]{2,}$` | `handoff-2026-10-08-s01` |
| research-note | `^research-[a-z0-9-]+$` | `research-llm-wiki-pattern` |
| open question (section, not page) | `^Q-[0-9]{3}$` | `Q-001` |
| singletons | `index, log, schema, glossary, status-live` | — |

A new id is added only by the writer who owns that area. Adding one also adds its line to `index.md`.

---

## 9. Operations

Every operation ends with a `log.md` entry (§12). The ops marked *(gist)* come from Karpathy's pattern. The others are Ferrum extensions.

### 9.1 INGEST *(gist)*: a new raw source arrives

1. Save it under `wiki/raw/…`: a research note (with access dates and VERIFIED/UNCERTAIN labels), an owner answer transcribed as `raw/owner/YYYY-MM-DD-<slug>.md`, bench output, or evidence.
2. Read it and list the affected pages: grep `index.md` and the frontmatter `related`/`sources` for the topic. One source may touch 10–15 pages.
3. Update each affected page by adding the source to `sources`, editing the body and bumping `updated`. Resolve or flag `UNVERIFIED` tags the source settles.
4. Where the source contradicts a page, add a `> **CONTRADICTION:** …` blockquote on that page and a `Q-NNN` in `ov-open-questions`. Never silently overwrite.
5. Update `index.md` for new pages.
6. Log `ingest`.
7. Note that edits to approved pages make their approvals stale (§10). List those page ids in the log entry.

#### 9.1.1 A source contradicts an accepted ADR

1. Add a `> **CONTRADICTION:** …` blockquote to the ADR (below its Decision section) citing the new source and naming a new `Q-NNN` in `ov-open-questions`, whose `blocking` lists the phases whose entry must wait for the resolution.
2. Do **not** edit the accepted ADR's decision text. Resolve by DECIDE (§9.4): a new ADR that `supersedes` the old one, accepted only under §10.4.
3. Until the question is answered, it holds the gates in its `blocking` list. A CONTRADICTION blockquote that names no `Q-NNN` blocks the entry gate of every phase whose dependency set contains the page (§9.7 step 4).

### 9.2 QUERY *(gist)*: answer a question from the wiki

1. Read `index.md` first, then drill into the pages it points to. Answer with citations as relative links to pages and raw files.
2. If the answer is valuable (a comparison, analysis or synthesis), file it back as a new page of the fitting type, add it to `index.md`, and log `query`.

### 9.3 LINT *(gist + Ferrum checks)*

Run at the end of every session (inside HANDOFF), at every phase gate, and after any bulk edit. **Normative tool:** `npm run lint:wiki` in `interactive_plan/` once plan-app step IP-5 has passed ([ip-wiki-lint](interactive-plan/ip-wiki-lint.md)). Before that, and as a fallback, Claude runs the stdlib Python quick lint `tools/quick_lint.py` (its text is embedded in [ops-wiki-maintenance §5](operations/ops-wiki-maintenance.md#5-lint); Q-216) plus the manual checks listed there, and records the results in the `lint` log entry. P1 task p1.10 extends the TS lint with the git-backed rules; it does not build a second linter.

| Code | Severity | Check |
|---|---|---|
| `FM-MISSING` | error | Frontmatter absent, or a required field (§5.1 + §6) missing |
| `FM-ENUM` | error | `type`, `status` or another enum field has a value outside its enum |
| `FM-TYPE-DIR` | error | `type` does not match its directory (§4.1) |
| `FM-UNKNOWN-KEY` | warn | Key not defined in this schema |
| `FILE-ENCODING` | error | BOM present, or the file does not end in exactly one `\n` |
| `ID-PATTERN` | error | id does not match its type pattern (§8), or the basename does not start with the id |
| `ID-DUP` | error | Same id in two files |
| `REF-DANGLING` | error | An id in `related`, `depends_on`, `risks`, `decisions`, `experiments`, `connects.to`, `rq`, `hypotheses`, `metrics`, `workloads`, `supersedes`, `superseded_by`, `phase`, `owner_phase`, `phase_introduced` does not resolve; or a relative body link points to a missing file |
| `REF-RECIPROCAL` | error | rq↔hyp or hyp↔exp lists disagree |
| `ORPHAN` | warn | A page (other than singletons) has no inbound reference from any other page's frontmatter or body |
| `INDEX-MISSING` | error | A page or raw file is missing from `index.md`, or the index lists a missing page or folder; raw evidence and bench files are checked per folder (§11, adr-0020) |
| `STALE-UPDATED` | warn | `updated` is older than the file's last git commit date (`git log -1 --format=%cs -- <file>`); error if `updated` is in the future |
| `ADR-CHAIN` | error | ADR with `status: superseded` has no `superseded_by`; A `supersedes` B but B is not `superseded`; `accepted` ADR without approval (§10.4) |
| `PHASE-ORDER` | error | `depends_on` cycle, or a dependency with order ≥ the phase's own order; duplicate `order`; duplicate task id |
| `TRUST-EDGE` | error | `crosses_trust_boundary` is inconsistent with the endpoints' `trust_level` |
| `UNV-NOPHASE` | error | Bare `UNVERIFIED` tag (§7.1) |
| `UNV-PASTDUE` | error | `UNVERIFIED[P]` where P is done or already passed (§7.2) |
| `INT-NUMBER-NOSRC` | warn | Measured-looking number without a raw link (§7.3) |
| `HYP-NO-DATA` | error | Hypothesis with a verdict status but no analyzed experiment with `results_ref` |
| `RAW-IMMUTABLE` | error | Raw file modified after creation (§3.1) |
| `APPROVAL-STALE` | info (warn when the page belongs to the current/next phase's dependency set) | Approval whose hash no longer matches (§10.3) |
| `CONTRADICTION` | warn | Open `> **CONTRADICTION:**` blockquotes. Also, as a semantic pass (LLM review, not regex): claims that disagree between pages, or with an accepted ADR or a raw source |
| `SCHEMA-SPLIT` | error | `CLAUDE.md` restates a rule differently from this file |
| `LOG-FORMAT` | error | A `log.md` heading does not match the §12 regex, entries are out of date order, or a body bullet uses a key outside §12 |
| `Q-FORMAT` | error | An `ov-open-questions` section lacks `- status:` or has an unparsable `- blocking:` list. The checker then treats that question as **open and blocking every phase** (fail closed) |
| `Q-BLOCK-UNGATED` | warn | A `Q-NNN` `blocking` id is in no phase's dependency set (e.g. a risk id), so it gates nothing; list the phase id instead |
| `PHASE-DONE-NO-EXIT` | warn | A phase has `status: done` but key `<phase-id>#exit` is not APPROVED |

[ip-wiki-lint](interactive-plan/ip-wiki-lint.md) proposes further codes derived from MUST rules in this file (e.g. `ADR-SECTIONS`, `FM-YAML-SUBSET`). Until they are added to this table they report as **warn** only.

A lint run is **clean** when it reports zero errors. Warnings are listed in the log entry, each with a disposition.

### 9.4 DECIDE *(extension)*: make or change a decision

1. Create `decisions/adr-NNNN-<slug>.md` using the next free number, with `status: proposed` and `decided_by: claude-proposed`. Use `decided_by: owner` only when a raw file records the owner's choice.
2. To supersede an older ADR, fill in the new ADR's `supersedes` list. Mark the old ADR `status: superseded` with `superseded_by` set only once the new one is accepted.
3. Update every page that lists the old ADR (`decisions`, `related`) and every page whose content the decision changes. Those edits stale their approvals, and that is intended.
4. Add the new ADR to `index.md`. Log `decide`. If the owner needs to choose, add a `Q-NNN`.
5. An ADR moves to `accepted` only under §10.4.

### 9.5 HANDOFF *(extension)*: end of session, or the context running low

The project assumes sessions **will** be interrupted without warning.

- **Continuous checkpointing (MUST):** after every completed task (`pN.M`), update `STATUS.md` (frontmatter + "Next action") and append a `code` or relevant log entry. A session cut off abruptly then loses at most one task.
- **Bookkeeping commit** (once local commits are authorised, adr-0011): after the task commit, make a second commit `docs(status): checkpoint pN.M [pN.M]` containing **only** `STATUS.md`, `wiki/log.md` and (if changed) `wiki/index.md`. No amend.
- **Full handoff:** run it when work stops, when the owner asks, or when the context is judged near its limit. Write it early rather than late.
  1. Run LINT (or the quickest subset if the context is short: FM-*, ID-*, REF-DANGLING, INDEX-MISSING).
  2. Write `operations/handoffs/handoff-YYYY-MM-DD-sNN.md` (§6.15).
  3. Update `STATUS.md`: `session`, `current_phase`, `current_task`, `next_action` (a literal command or step), `blocked_on`, `last_handoff`, `updated`.
  4. Append a `handoff` log entry.
  5. If the owner has authorised local commits (adr-0011), commit. **Claude never pushes.** Otherwise list the uncommitted paths in the handoff.

### 9.6 RESUME *(extension)*: first actions of every new session

This is the normative order. `CLAUDE.md` §1 restates it step for step; any difference is `SCHEMA-SPLIT`.

0. Read this file (at least §5–§10) unless already read this session. (`CLAUDE.md` is auto-loaded.)
1. Read `STATUS.md`: current phase, `next_action`, the **In-flight** section, blockers.
2. Run `grep "^## \[" wiki/log.md | tail -5` (Git Bash) and read those entries. If `wiki/log.md` does not exist, P0 integration (p0.7) was interrupted: skip this step and follow the STATUS In-flight recovery command.
3. Read `plan/approvals.json` (a missing file means every page is PENDING) and compute effective states (§10.3).
4. Read the handoff named in `STATUS.md` `last_handoff`, else the newest file in `operations/handoffs/`.
5. Read `wiki/index.md` (if it is missing, same rule as step 2).
6. Read the current phase page.
7. Reconcile with git: `git status --short`, `git log --oneline -5`, `git stash list`. `STATUS.md`, `wiki/log.md` and `wiki/index.md` are bookkeeping paths and do not by themselves make the tree dirty. If git and STATUS disagree, trust git plus the log, fix STATUS and log `resume` with the discrepancy.
8. If task files are dirty, In-flight is non-empty, `.git/index.lock` exists, or a stash named `interrupted …` exists, follow `ops-resume-after-interruption` before anything else.
9. Assign the new session id `s(NN+1)`, update `STATUS.md` `session`, and log `resume`.
10. Run the PHASE-GATE entry checks (§9.7) for the current phase before any implementation work, including the P0 bootstrap exception stated there.

**Context compaction within a session** (the transcript was summarised but the session did not end): keep the same session id; re-read the STATUS In-flight section and the last log entries before the next action.

### 9.7 PHASE-GATE *(extension)*

**Entry gate.** This check runs before *any* implementation task of phase P, and again at the start of every session that continues P.

1. Every phase in `P.depends_on` has `status: done`, and its exit approval is APPROVED (§10.3).
2. The **dependency set** of P has an effective approval of APPROVED (§10.3: content-hash match, or scope-hash match). The set is:
   - P's own page
   - each ADR in `P.decisions`
   - each component with `phase_introduced: P` or listed in `P.components`
   - each experiment in `P.experiments`
   - `schema`
3. No `Q-NNN` that blocks an id in the dependency set is open. Only ids in some phase's dependency set can gate: a question about a risk, metric or other page lists the phase id it must hold, not the risk id (`Q-BLOCK-UNGATED`).
4. No open `> **CONTRADICTION:**` blockquote on a page in the dependency set is *unregistered*. A blockquote that names a `Q-NNN` is registered: that question's `blocking` list alone decides which gates it holds (so a contradiction that a spike in this phase must resolve can deliberately gate a later phase). A blockquote naming no `Q-NNN` blocks this gate (§9.1.1).
5. If all four hold, set P's `status: ready` (or `in-progress` when starting) and log `gate | <phase-id> entry passed`. If any fails, do not implement. Log `gate | <phase-id> entry BLOCKED: <ids>`, set `STATUS.md` `blocked_on`, and ask the owner.

**P0 bootstrap exception.** `phase-p0-planning` has no approval-based entry gate. Its authority is the owner directives in `raw/01-scoping-decisions.md`. Approvals cannot exist before the plan app does. Building `interactive_plan/` (tasks p0.9–p0.16) requires only the owner's chat approval of the `ip-*` pages and adr-0016 (Approval Wave 0; Q-101 itself is answered by directives 2 and 4), transcribed to `wiki/raw/owner/` (ip-build-plan IP-0). Ferrum application code stays forbidden. (Same rule as `CLAUDE.md` §1 step 10.)

**Exit gate (milestone review, adr-0014):**

1. Every `test_gate.automated` item was executed **in this repo state** and passed. Each output is saved under `raw/evidence/<phase-id>/`. Never claim a pass that was not observed.
2. Every `test_gate.evidence` path exists.
3. `test_gate.manual` items are recorded as performed by the owner (a `raw/owner/` file, or the exit approval comment).
4. LINT is clean, and no `UNV-PASTDUE` targets P.
5. Set `status: gate-review` and log `gate | <phase-id> exit ready for review`.
6. The owner approves key `<phase-id>#exit` in the plan app. Then set `status: done` and log `gate | <phase-id> exit approved`.

### 9.8 CODE *(extension)*

Any code change that alters behaviour or interfaces:

- updates the matching component page in the **same commit** (responsibilities, connects, interfaces, `last_verified_commit`)
- appends a `code` log entry naming the task id

Whether a pre-commit hook or CI can enforce this is `UNVERIFIED[phase-p1-foundation]`.

---

## 10. Approvals: `plan/approvals.json`

### 10.1 File format

```json
{
  "schema_version": 1,
  "approvals": {
    "phase-p1-foundation": {
      "status": "approved",
      "comment": "OK, but keep spike p1.4 time-boxed",
      "timestamp": "2026-10-09T14:03:12+05:30",
      "path": "wiki/phases/phase-p1-foundation.md",
      "content_hash": "sha256:<64 lowercase hex>",
      "scope_hash": "sha256:<64 lowercase hex>",
      "approved_by": "owner",
      "history": [
        { "status": "changes-requested", "comment": "...", "timestamp": "...", "content_hash": "sha256:...", "scope_hash": "sha256:..." }
      ]
    },
    "phase-p1-foundation#exit": { "...": "same shape; path = the phase page" }
  }
}
```

- **Keys** are page ids, or `<phase-id>#exit` for milestone exit reviews. Every key MUST resolve to a page with `approvable: true` (the `#exit` form needs a phase page).
- `status` enum: `approved | changes-requested | rejected`. A missing key means **PENDING**.
- `timestamp` is ISO 8601 with offset. `path` is repo-relative with forward slashes.
- **Writer:** only the plan app, on an explicit owner click. Each new decision moves the previous top-level record into `history`, which is append-only.
- **Claude MUST NOT write or edit `approvals.json`.** That includes "recording" an approval the owner gave in chat. If the owner approves in chat, Claude transcribes it to `raw/owner/` and asks the owner to click Approve in the plan app, or the owner explicitly instructs a manual entry. Claude reads the file at every gate.
- Each approval-change event the app records also gets an `approval` log entry: written by the plan app if it supports that, otherwise by Claude at the next RESUME when it notices the change.

### 10.2 Hashes

Normalisation `N(bytes)`: replace every `\r\n` with `\n`, then every remaining `\r` with `\n`. No other changes (no trimming, no Unicode normalisation).

- **`content_hash`** = `"sha256:" + hex(sha256(N(file bytes)))`. This is the normative hash.
- **`scope_hash`** = the same, computed after deleting from `N(file bytes)`, **inside the frontmatter block only**, every line matching `^(status|updated|last_verified_commit)[ \t]*:.*\n`.
  - Only these three *volatile* keys are excluded.
  - Purpose: lifecycle bookkeeping (an ADR flipping to `accepted`, a phase flipping to `in-progress`) does not invalidate the owner's approval of the *content*.

Reference implementation (Python 3, available on the machine per `raw/01-scoping-decisions.md`):

```python
import hashlib, re, sys
b = open(sys.argv[1], 'rb').read().replace(b'\r\n', b'\n').replace(b'\r', b'\n')
content = hashlib.sha256(b).hexdigest()
s = b
if b.startswith(b'---\n'):
    end = b.index(b'\n---\n', 3) + 1            # start of closing fence line
    fm = re.sub(rb'(?m)^(status|updated|last_verified_commit)[ \t]*:.*\n', b'', b[:end])
    s = fm + b[end:]
scope = hashlib.sha256(s).hexdigest()
print('sha256:' + content, 'sha256:' + scope)
```

The plan app (TypeScript) MUST produce identical results. A shared test vector set belongs in `wiki/interactive-plan/` (`ip-data-contract`).

- **`bootstrap_hash`** (only on the `schema` approval record) = `content_hash` of root `CLAUDE.md`. `CLAUDE.md` is half of the schema layer (§3.3) but has no frontmatter, so it is approved together with `schema`. If the current `CLAUDE.md` hash differs from the stored `bootstrap_hash`, the `schema` approval is **STALE** (scope-hash drift does not apply to it). The plan app renders `CLAUDE.md` on the schema page. `SCHEMA-SPLIT` remains the semantic check.

### 10.3 Effective approval state (computed, never stored)

| Condition | State | Counts as approved for gates? |
|---|---|---|
| No key | `PENDING` | no |
| `status: rejected` | `REJECTED` | no |
| `status: changes-requested` | `CHANGES_REQUESTED` | no |
| `approved` and current `content_hash` equals stored | `APPROVED` | yes |
| `approved`, content differs, current `scope_hash` equals stored | `APPROVED_VOLATILE_DRIFT` (UI shows "approved – bookkeeping changed") | yes |
| `approved`, scope hash differs too | `STALE` | **no** |
| Page file missing or `approvable: false` | `INVALID` | no (lint error) |

### 10.4 Rules

1. **Any edit after approval** that changes the scope hash makes the approval **STALE**. The page must be re-approved **before any implementation that depends on it**: the page itself, every phase whose dependency set (§9.7) contains it, and every task in an in-progress phase that touches it. Claude stops those tasks, sets `STATUS.md` `blocked_on`, logs `gate | <id> approval stale`, and asks the owner.
2. Claude MAY still edit an approved page during planning. Making it STALE is legitimate. It MUST say so in the log entry ("stales approval of …").
3. An ADR may be set to `status: accepted` only if one of these holds:
   - (a) its approval state is APPROVED or APPROVED_VOLATILE_DRIFT
   - (b) `decided_by: owner` and `sources` cites a raw file recording the owner's choice (e.g. adr-0004…adr-0016 from `raw/01-scoping-decisions.md`)

   Case (b) ADRs are still `approvable: true`, so the owner can confirm or overturn them in the plan app. Case (b) acceptance covers **only the owner's choice as quoted** in the ADR's `### Owner decision (verbatim)` subsection. Every rule Claude elaborated (the `### Claude elaboration` subsection) becomes binding only under case (a), that is once the ADR is APPROVED in the plan app.
4. `rejected` on an ADR means: set its status to `rejected`, then DECIDE again. `changes-requested` means: revise the page (which produces a new hash) and ask again.
5. A page's frontmatter `status: approved` (overview, schema) MUST NOT be set unless the effective state is APPROVED or APPROVED_VOLATILE_DRIFT.

---

## 11. `index.md` format

- Frontmatter per §6.16, then one `##` heading per category, in this order: `Overview`, `Architecture`, `Components`, `Phases`, `Decisions`, `Risks`, `Research questions`, `Hypotheses`, `Experiments`, `Metrics`, `Workloads`, `Quality`, `Operations`, `Handoffs`, `Interactive plan`, `Raw sources`.
- One line per page. The line MUST match this regex:
  `^- \[([a-z0-9.-]+)\]\(([^)]+)\) \| ([a-z-]+) \| (.+?) \| (.+)$`
  The groups are: id, relative path from `wiki/`, status, title, one-line summary. Raw files show status `raw`. A raw file without frontmatter (e.g. `raw/00-master-prompt.md`) is listed under `Raw sources` with id = its basename without `.md` (e.g. `00-master-prompt`); a raw research note uses its frontmatter id. Ids of this form are index labels only, not page ids.
- **Raw evidence and bench files are listed per folder, not per file** (adr-0020, owner answer Q-219). Files under `raw/evidence/` and `raw/bench/` get no line of their own. Instead each **first-level folder** below them (`raw/evidence/<phase-id>/`, `raw/bench/<run-id>/`) that contains at least one file, directly or in a subfolder, has one line under `Raw sources`. Its label is the folder path relative to `wiki/raw/`, lower-cased, with `/` and every other character outside `[a-z0-9.-]` replaced by `-` and no trailing `-`; its link is the folder path with a trailing slash; its status is `raw`.
  Example: `- [evidence-phase-p0-planning](raw/evidence/phase-p0-planning/) | raw | Evidence folder: phase-p0-planning | P0 test-gate evidence`
  A file placed directly in `raw/evidence/` or `raw/bench/` (outside any folder) is an `INDEX-MISSING` error. Raw files at the `raw/` top level and under `raw/owner/`, `raw/research/` and `raw/assets/` are still listed one per file.
  Example: `- [adr-0007](decisions/adr-0007-child-webviews.md) | proposed | Child WebViews in one window | Trusted shell + one untrusted child WebView per tab (Tauri unstable multi-webview)`
- Neither the title nor the summary may contain ` | `. Sort order within a category: by `order` for phases, numerically for numbered ids, alphabetically otherwise.
- `index.md` is updated in the same edit that creates, renames the title of, or changes the status of a page.

## 12. `log.md` format (append-only)

- Frontmatter per §6.16, then entries in chronological order. **New entries are appended at the end. Existing entries are never edited or deleted.** A correction is a new `correct` entry that references the earlier one by date and title.
- Heading (follows the gist's convention exactly):
  `## [YYYY-MM-DD] <op> | <title>`
  Regex: `^## \[(\d{4}-\d{2}-\d{2})\] (ingest|query|lint|decide|handoff|resume|gate|code|approval|schema|correct|plan) \| (.+)$`
  - `plan` = creating or editing planning pages that is not covered by another op.
  - `schema` = a change to this file or to CLAUDE.md.
  - `approval` = an approval change observed in approvals.json.
- Body: bullet lines with these keys, each optional but in this order: `- session: sNN`, `- pages: [ids]`, `- sources: [paths]`, `- result: …`, `- stales: [ids]`, `- next: …`, `- commit: <sha>`.
- The last 5 entries: `grep "^## \[" wiki/log.md | tail -5` (Git Bash).

## 13. Link conventions

- **Frontmatter** refers to pages **by id only**, never by path.
- **Body** links are **relative markdown links** that render on GitHub, e.g. `[ADR-0007](../decisions/adr-0007-child-webviews.md)`, `[master prompt §8](../raw/00-master-prompt.md)`. Anchors are allowed. Wiki-links (`[[id]]`) are **not** used.
- Code is linked by relative path from the page to the repo file (e.g. `../../../crates/security/src/lib.rs`), optionally with a commit sha in the text. Links to code are not citations for facts *about external APIs*. Those need research notes.
- External URLs appear only in `sources` and in research notes. Pages cite the research note, not the URL directly, unless the page is the note.

## 14. Mermaid usage

- Diagrams go in fenced ` ```mermaid ` blocks in page bodies. Supported starters: `flowchart`, `sequenceDiagram`, `stateDiagram-v2`, `gantt`, `classDiagram`, `erDiagram`.
- Node identifiers use `[A-Za-z0-9_]` only: take the page id and replace `-` with `_` (e.g. `comp_app_shell["App shell"]`), so ids stay greppable and the plan app can map nodes back to pages.
- No `click` directives, HTML labels or `%%{init}%%` theme overrides. The plan app renders with a strict security level.
- Diagrams illustrate. They are **never the sole source** of a fact: every edge in an architecture diagram MUST also exist as a `connects` entry, and lint MAY check this. Mark trust-boundary crossings with a dashed edge `-.->` and the label `TB`.
- Keep diagrams to roughly 30 nodes or fewer. Split larger ones.
- The lifecycle state machine (master prompt §5 Phase 4: ACTIVE, BACKGROUND, IDLE, DISCARD_CANDIDATE, DISCARDED, RESTORING) uses `stateDiagram-v2` with those exact state names.

## 15. Changing this schema

Propose the change, then edit this file and `CLAUDE.md` consistently. Bump `updated` and log `schema`. The change stales the `schema` approval, so the owner must re-approve before the next phase entry gate (`schema` is in every dependency set). A schema change that renames fields or enums MUST also update the plan app parser and every affected page in the same change set.
