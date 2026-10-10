---
name: wiki-to-portal
description: Translate a changed wiki page (anything under wiki/, plus STATUS.md) into its plain-language JSON record in plan/portal/, the only thing the owner's read-only plan portal shows (adr-0024). Use it in the SAME edit as every wiki or STATUS.md change, before ending the turn, then run pwsh tools/portal-sync-check.ps1 until it is clean.
when_to_use: After editing, creating or removing any wiki page, appending to wiki/log.md, editing wiki/overview/ov-open-questions.md or STATUS.md; when the Stop hook or tools/portal-sync-check.ps1 reports STALE, MISSING, UNCOVERED, ORPHAN, BAD-SHAPE, UNKNOWN-REF or MISSING-SCRIPT; when asked to "update the portal" or "write the portal JSON".
allowed-tools: Bash(pwsh tools/portal-sync-check.ps1*)
---

# Wiki → portal JSON (plain language)

The wiki is Claude's working memory. The owner reads the **portal**, and the portal reads only the
JSON in `plan/portal/`. Each wiki change → Claude rewrites the matching JSON in plain words **in the
same edit** → the owner never sees stale or jargon-heavy text. Design note:
[wiki/operations/ops-portal-pipeline.md](../../../wiki/operations/ops-portal-pipeline.md).

The owner's comprehension is the project's bottleneck. Every string you write here is for a smart
non-specialist who does not remember internal ids. Write for him, not for Claude.

## Hard rules

1. **Same edit.** A wiki change and its JSON change land together (same turn, same commit). Never end a
   turn with `pwsh tools/portal-sync-check.ps1` reporting STALE, MISSING or UNCOVERED for pages you touched.
2. **Re-translate, never re-stamp.** Only set `source.content_hash` after you have re-read the page and
   rewritten the record from it. Copying a new hash onto an old record hides a real change.
3. **The wiki wins.** If JSON and wiki disagree, the JSON is wrong. Never add a fact that is not in the
   page (no new numbers, versions, claims or results). Keep the page's `UNVERIFIED` caveats as plain
   words ("not checked yet; checked in P1").
4. **Never** write JSON from `wiki/raw/` files directly, and never edit raw files.
5. Every id you write anywhere in portal text must have an explainer in `refs.json` (step 5).
6. Run the checker before ending the turn (step 7).

## Steps

1. **Find the records.** Look up the page in the table below. One page can feed several records
   (a phase page feeds `phases/<id>.json` **and** its row in `roadmap.json`).
2. **Read the page** (frontmatter and body) as it is now.
3. **Write or rewrite the record(s)** in plain language (style guide below), following the field
   guide. Keep the JSON 2-space indented, UTF-8, no BOM, one final newline.
4. **Stamp the source.** `pwsh tools/portal-sync-check.ps1 -Hash <repo-relative path>` prints the
   SCHEMA §10.2 content hash; put it in `source: {wiki_path, content_hash}`. `wiki_path` is
   repo-relative with forward slashes (`wiki/decisions/adr-0007-child-webviews.md`, `STATUS.md`).
   Do this **last**, after the final edit to the page (any later page edit makes the record STALE again).
5. **Update refs.json.** Every id that appears in any text you wrote (bare like `adr-0007`, `P1`, `Q-221`,
   `p1.3`, a commit sha, or as a link `[words](ref:id)`) needs an entry in `refs.json`:
   `{id, kind, title, summary (1-3 plain sentences), status, related}`. Add `aliases` for short forms
   (the phase `phase-p1-foundation` has alias `P1`). If the page's own title or status changed, update its
   refs entry too.
6. **Removed or renamed page** → delete its record (the checker reports ORPHAN otherwise) and update the
   refs entry (`status: "Replaced"` or remove it if nothing mentions it any more).
7. **Check.** `pwsh tools/portal-sync-check.ps1` → must print `portal-sync: clean`. Fix every line it
   reports; each message says what to do.

## Which page goes where

| Wiki page | Portal file | Record |
|---|---|---|
| `STATUS.md` | `overview.json` | the whole file (one source) |
| `wiki/phases/phase-*.md` | `phases/<phase-id>.json` and `roadmap.json` | the whole phase file; one row in `roadmap.phases` |
| `wiki/decisions/adr-*.md` | `decisions.json` | one item in `items` |
| `wiki/risks/risk-*.md` | `risks.json` | one item in `items` |
| `wiki/research/questions/rq-*.md` | `research.json` | one item in `questions` |
| `wiki/research/hypotheses/hyp-*.md` | `research.json` | one item in `hypotheses` |
| `wiki/research/experiments/exp-*.md` | `research.json` | one item in `experiments` |
| `wiki/research/metrics/metric-*.md` | `research.json` | one item in `metrics` |
| `wiki/research/workloads/wl-*.md` | `research.json` | one item in `workloads` |
| `wiki/architecture/components/comp-*.md` | `architecture.json` | one item in `components` (+ its layer/group lists) |
| `wiki/overview/ov-open-questions.md` | `questions.json` | the whole file; one item per `## Q-NNN` section |
| `wiki/log.md` | `log.json` | the whole file; every `## [date] op \| title` heading listed in some entry's `covers` |
| anything else (ov-*, qual-*, ops-*, ip-*, glossary, handoffs, SCHEMA, index) | — | no record; give it a `refs.json` entry (kind `page` or `term`) only if portal text mentions it |

The machine-readable version of this table is `plan/portal/pipeline.json`. If you add a page type that
the owner should see, add a rule there, a schema field, and a row here, in the same edit.

## Field guide

Shapes are enforced by `plan/portal/schema/*.schema.json` (shared pieces in `common.schema.json`).
Limits: `title` ≤ 80 characters, `summary` ≤ 360 (1-3 sentences), task `title` ≤ 70, `one_line_goal`
≤ 90. Fields named `chain` (and `test_gate.explanation`, architecture `flow`) must contain `→`.

- **Phase** (`phases/<id>.json`): `short` = `P0`…`P8`. `title` = the plain phase name ("First working
  app", not "Minimal container"). `one_line_goal` = what is true when it is done. `status` maps
  planned → "Not started", ready → "Ready to start", in-progress → "In progress", gate-review →
  "Waiting for your review", done → "Done", blocked → "Blocked". `progress` = tasks done / total, from
  STATUS.md and the log (the phase page does not store progress). `step_order` = 3-8 short labels in the
  order the work happens. `tasks[]` = one per page task: `title` (short, crisp), `chain`
  (cause → action → why it matters), `check` (how we know it is done, plain), `script`
  (`scripts/verify/<task-id>-<slug>.ps1`, or `null` until that script exists). `test_gate.explanation` =
  a thought chain of the whole gate; `rows[]` = `{check, proves}`; `script` =
  `scripts/gates/<short-lowercase>-gate.ps1` (e.g. `scripts/gates/p1-gate.ps1`) or `null` until it exists.
  Things every phase shares (one commit per task, plain log entry, owner review at the end) go **once**
  in `roadmap.json` `same_in_every_phase`, never in the phase file.
- **Roadmap row**: `id`, `short`, `name`, `one_line_goal` (same words as the phase file), `status`,
  `tasks_done`, `tasks_total` (`null` while the phase has no task list yet), `source` = the phase page.
- **Decision**: `number` = the ADR number as an integer; `title` = the decision itself in plain words
  ("One window, many web views"); `summary` = what it means in practice; `why` = the main reason;
  `catch` = the main downside or open risk (or `null`); `status` "Proposed" | "Accepted" | "Replaced" |
  "Rejected"; `decided_by` "you" (`decided_by: owner`) or "claude" (`claude-proposed`); `replaced_by`.
- **Risk**: `likelihood`/`impact` copied from the page (1-5); `mitigation` = what we do about it;
  `phase` = owner_phase; `status` open → "Open", mitigating → "Being reduced", resolved → "Resolved",
  realized → "Happened", tolerated → "Accepted".
- **Research items**: `status` in plain words; hypotheses carry `prediction` (plain), experiments
  `phase`, metrics `unit`, questions the `question` itself.
- **Component**: `group` per adr-0026 (application, benchmark, testing, research, or planning for the
  plan portal itself); `layer` = the layer id it sits in (Application group only, else `null`);
  `connects[]` = `{to, what}` with `what` in plain words ("asks it whether a site is allowed").
  Keep `layers[].components` and `groups[].components` in step with the components' `layer`/`group`.
- **Questions** (`questions.json`): one item per `## Q-NNN`: `asked`, `question` (one plain sentence
  ending in "?"), `why_it_matters`, `status` open | answered | withdrawn, `answer` (plain summary of the
  owner's words, or `null`), `answered_on`, `blocks` (phase ids it holds; `[]` if none).
- **Log** (`log.json`): one entry per piece of work the owner would recognise; it may group several wiki
  log entries (list each exact heading in `covers`). `title` = what happened ("You reviewed portal v1 —
  redesign started"); `done` = what was done; `next` = what happens next (or `null`);
  `decisions[]` = `{what, by: "you"|"claude"}`; `approvals[]` = `{what, status}`; `commit` = the short sha or
  `null` (the sha needs a `refs.json` entry of kind `commit`).
- **Overview** (`overview.json`, from STATUS.md): `where_we_are[]` = 3-6 rows `{item, state}`;
  `next_action` in the owner's four-part format (below); `questions_for_you` = count of open questions
  and up to 5 of the most pressing.

### The four-part next action (owner's rule)

When the owner has to run something, `next_action` has exactly these parts:

1. `where_we_are` — a small table: 2-5 rows of `{item, state}`.
2. `why` — why it has to run and what it will do, in one short paragraph.
3. `script` — **one** PowerShell 7 script (`path`), with `parts[]` = `{code, explains}` explaining each
   part in plain words. If nothing has to run: `who: "claude"`, `script: null`, and `why` says
   "Nothing to run; Claude continues with …".
4. `tell_claude` — the exact words to type back in Claude Code afterwards ("Gate passed", or "paste the
   red line").

## Plain-language style guide

| Rule | Bad | Good |
|---|---|---|
| Short, crisp; one idea per sentence | "Integrator request: IP-10 step 3 follow-up per ip-build-plan; lint:wiki 0 errors, 34 warnings dispositioned." | "Finished the plan app and checked the wiki: no errors." |
| No unexplained internal ids or section refs | "Blocked on Q-221 per §10.4 (adr-0027)." | "Waiting for your answer on [rewriting old commits](ref:Q-221) before the first upload." |
| Thought chain for tasks: cause → action → why it matters | "Implement multi-webview spike (p1.3)." | "Tauri's multi-view feature is experimental → build a throwaway test → if it is unstable we change the design before P2, not after." |
| Say who acts: "you" (owner) or "Claude" | "Owner approval required for Wave 1 keys." | "You approve the planning pages in Claude Code; Claude records it." |
| Words, not jargon; explain a term once | "CDP attach to WebView2 via remote-debugging-port fails." | "The test robot cannot connect to the web view yet (it uses a debugging channel that is switched off)." |
| Plain checks, not commands | "check: `npm run verify` exit 0" | "check: all automatic tests pass in one run" |
| Status in words | "status: gate-review" | "Waiting for your review" |
| No invented facts; keep caveats | "Ferrum uses 40% less memory." (no data) | "Goal: use less memory than Chrome. Not measured yet (P6)." |
| Dates as the owner reads them in the UI; ISO in `date` fields | "2026-10-09T14:03" in a sentence | `"date": "2026-10-09"`, and "9 Oct" in prose |

Ids in prose: prefer a link with words, `[one window, many web views](ref:adr-0007)`. The portal turns
it into a clickable popup that shows the refs entry. A bare id is allowed only where an id column is
expected (task id, phase short name `P1`), and it still needs a refs entry.

Words the checker treats as ids (and so must be explained or avoided in prose): `phase-p…`, `P0`-`P8`,
`p1.3`, `adr-0007`, `risk-r02`, `rq-01`, `hyp-01`, `exp-…`, `metric-…`, `wl-…`, `cfg-…`, `comp-…`,
`ov-…`, `qual-…`, `ops-…`, `ip-…`, `handoff-…`, `Q-221`, `IP-9`, and 7-40 character hex words (commit
shas). Write "metric based" instead of "metric-based" to avoid a false alarm.

## The safety net

- `pwsh tools/portal-sync-check.ps1` — shape, freshness, coverage, refs, scripts. Exit 0 = clean.
- Stop hook (`.claude/settings.json`) runs the same check in hook mode at the end of every turn. It is
  **off** until the file `plan/portal/.hook-enabled` exists (switched on once all JSON is fresh). When on
  and something is wrong, the turn does not end: the hook's message lists the problems; fix them with
  this skill. It never blocks twice in a row (`stop_hook_active`).
- Tests: `pwsh tools/test-portal-sync-check.ps1` (fixture in `tools/fixtures/portal-sync/clean/` is a
  small example of correct JSON for every file).
