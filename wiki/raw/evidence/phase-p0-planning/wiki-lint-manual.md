# RAW EVIDENCE — p0.8 manual wiki lint (phase-p0-planning, session s01, 2026-10-08)

> Immutable raw evidence (SCHEMA §3.1). Written by Claude in task p0.8 from the outputs of commands run in
> this repo state (HEAD `48c90d8` plus the uncommitted p0.8 working-tree edits listed in the `lint` log
> entry of 2026-10-08). Run from the repo root in Git Bash, Python 3.12.10. Scripts were run from the
> session scratchpad (Q-216 is still open, so `tools/quick_lint.py` was not created).

## Result

**0 errors.** Warnings: 23 `INT-NUMBER-NOSRC` heuristic hits, 3 registered `CONTRADICTION` blockquotes and
7 `UNV-MIRROR` mismatches (SCHEMA §7.1 "lint warns"); each has a disposition below. p0.8 verify: met.

## Scripts and their sha256

| Script (scratchpad) | sha256 | What it is |
|---|---|---|
| `quick_lint.py` | `607c537ae29c1b000daa5263fc86f981350559b4163deae37a8eaeb3f00e65c2` | The python block of ops-wiki-maintenance §5, extracted byte for byte |
| `lint.py` | `8370eab460b40288466bfd4120b44d2ac46bd861fc86d3b801fca5eff3b8522f` | The p0.7 integration lint (PyYAML 6.0.3 from the scratchpad `pylib`) |
| `manual_checks.py` | `1617ea70fa92518aaa7b4c7c75d69f90f7cdd4031dd741ad7759af32efc8bd8c` | p0.8 helper: UNV-PASTDUE, INT-NUMBER-NOSRC heuristic, CONTRADICTION grep, STALE-UPDATED, RAW-IMMUTABLE, HYP-NO-DATA, PHASE-DONE-NO-EXIT, ADR-CHAIN accepted rule, FM-UNKNOWN-KEY |
| `mirror.py` | `98eac64e0d3b248c235586de2572d466b0edb63ce702667beecf44540430913a` | UNV-MIRROR (inline tag phases vs frontmatter `unverified` phases) |
| `manifest.py` | `b63953ab96e3f96d1a601649bfd6e05863fe9b5ececead5c8d4b11b09e600829` | Creates/verifies `wiki/raw/MANIFEST.sha256` (SCHEMA §3.1 / §10.2 `N`) |

## Raw outputs

`python quick_lint.py | tr -d '\r'`:

```text
191 files checked, 0 errors, 0 warnings
```

`PYTHONPATH=pylib python lint.py | tr -d '\r'`:

```text
191 files with frontmatter checked (+4 raw files without frontmatter), 0 errors, 0 warnings
```

`PYTHONPATH=pylib python manual_checks.py` (INFO lines):

```text
INFO               current phase phase-p0-planning order 0
INFO               UNVERIFIED tag counts: phase-p0-planning=23, phase-p0-planning (fm)=26, phase-p1-foundation=48, phase-p1-foundation (fm)=48, phase-p2-minimal-container=10, phase-p2-minimal-container (fm)=12, phase-p3-tabs-sessions=4, phase-p3-tabs-sessions (fm)=7, phase-p4-security=34, phase-p4-security (fm)=36, phase-p5-telemetry=27, phase-p5-telemetry (fm)=30, phase-p6-benchmark-harness=63, phase-p6-benchmark-harness (fm)=68, phase-p7-lifecycle=17, phase-p7-lifecycle (fm)=21, phase-p8-research-paper=7, phase-p8-research-paper (fm)=8
INFO               INT-NUMBER-NOSRC heuristic paragraphs: 23
INFO               raw ok: wiki/raw/00-master-prompt.md commits=['496f69d'] status=clean
INFO               raw ok: wiki/raw/01-scoping-decisions.md commits=['496f69d'] status=clean
INFO               raw ok: wiki/raw/evidence/phase-p0-planning/env-webview2-pv.txt commits=['496f69d'] status=clean
INFO               raw ok: wiki/raw/owner/2026-10-08-s01-wave0.md commits=['496f69d'] status=clean
INFO               raw ok: wiki/raw/research/llm-wiki-pattern.md commits=['496f69d'] status=clean
INFO               raw ok: wiki/raw/research/measurement-methodology.md commits=['496f69d'] status=clean
INFO               raw ok: wiki/raw/research/nextjs-stack.md commits=['496f69d'] status=clean
INFO               raw ok: wiki/raw/research/related-work-seed.md commits=['496f69d'] status=clean
INFO               raw ok: wiki/raw/research/tauri-webview2-capabilities.md commits=['496f69d'] status=clean
```

## Each SCHEMA §9.3 code

| Code | Checked by | Result |
|---|---|---|
| FM-MISSING | quick_lint, lint.py | 0 |
| FM-ENUM | quick_lint, lint.py | 0 |
| FM-TYPE-DIR | quick_lint, lint.py | 0 |
| FM-UNKNOWN-KEY | manual_checks.py (key name must appear in SCHEMA.md) | 0 |
| FILE-ENCODING | quick_lint, lint.py | 0 |
| ID-PATTERN | quick_lint, lint.py | 0 |
| ID-DUP | quick_lint, lint.py | 0 |
| REF-DANGLING | quick_lint, lint.py (frontmatter ids, connects.to, spike task ids, tag phase ids, body links) | 0 |
| REF-RECIPROCAL | lint.py (rq/hyp, hyp/exp) | 0 |
| ORPHAN | lint.py | 0 |
| INDEX-MISSING | quick_lint, lint.py (incl. §11 line format) | 0 (after adding the raw owner file `2026-10-08-s01-wave0` to index.md, see log) |
| STALE-UPDATED | manual_checks.py (`git log -1 --format=%cs` vs `updated`) | 0 |
| ADR-CHAIN | lint.py (structural) + manual_checks.py (accepted only with decided_by owner and a raw/ source) | 0 |
| PHASE-ORDER | lint.py (unique order and task ids, depends_on acyclic) | 0 |
| TRUST-EDGE | lint.py | 0 |
| UNV-NOPHASE | quick_lint, lint.py | 0 |
| UNV-PASTDUE | manual_checks.py; current phase phase-p0-planning (order 0, in-progress), so no phase is done or earlier | 0 |
| INT-NUMBER-NOSRC | manual_checks.py heuristic (ip-wiki-lint unit list) + reading | 23 warnings, see dispositions |
| HYP-NO-DATA | manual_checks.py (no hypothesis has a verdict status) | 0 |
| RAW-IMMUTABLE | manual_checks.py (`git log --follow`, `--diff-filter=MRD`, `git status`) + manifest | 0: each of the 9 raw files has exactly one commit (`496f69d`) and a clean status |
| APPROVAL-STALE | `plan/approvals.json` does not exist (every page PENDING) | not applicable |
| CONTRADICTION | manual_checks.py grep + reading pass | 3 open blockquotes, all registered; see dispositions |
| SCHEMA-SPLIT | reading: CLAUDE.md §1 vs SCHEMA §9.6 (steps 0–10), CLAUDE.md §2/§5 vs SCHEMA §9.5 | 0 |
| LOG-FORMAT | lint.py | 0 |
| Q-FORMAT | lint.py (incl. new Q-218) | 0 |
| Q-BLOCK-UNGATED | lint.py | 0 |
| PHASE-DONE-NO-EXIT | manual_checks.py (no phase is done) | 0 |
| UNV-MIRROR (§7.1 warn; ip-wiki-lint) | mirror.py | 7 warnings, see dispositions |

## Warnings and dispositions

**INT-NUMBER-NOSRC (23).** Every hit is a planned threshold, confidence level, sampling interval, timeout
or a power-analysis reference figure cited to a raw research note; none is presented as an observation.
Disposition: accepted, no change.

```text
INT-NUMBER-NOSRC   wiki/research/ov-research-statistical-analysis-plan.md: ['95%', '95%'] :: | Item | Choice | |---|---| | Primary statistic | Difference and ratio of medians of per-trial summaries (configuration vs comparator) | | CI | 95% bootstrap, *
INT-NUMBER-NOSRC   wiki/research/ov-research-statistical-analysis-plan.md: ['80%'] :: The measurement note gives a reference figure: with n = 30 per arm, a two-sided **independent two-sample** test at α = 0.05 with 80% power detects only standard
INT-NUMBER-NOSRC   wiki/research/experiments/exp-navigation.md: ['95%'] :: Per trial and scenario: median (and p95/p99 when the per-trial count permits) of navigation latency; across trials block-paired bootstrap CI of median ratio; no
INT-NUMBER-NOSRC   wiki/research/hypotheses/hyp-01-idle-memory-vs-browsers.md: ['10%'] :: | | | |---|---| | **Prediction (H1)** | On wl-static-info (idle window) and wl-multi-active, the median per-trial time-averaged tree private commit of cfg-ferru
INT-NUMBER-NOSRC   wiki/research/hypotheses/hyp-02-overhead-vs-tauri-baseline.md: ['20%', '95%'] :: | | | |---|---| | **Prediction (H1)** | The median idle tree private commit of cfg-ferrum-nolifecycle on wl-static-info exceeds that of cfg-tauri-baseline by le
INT-NUMBER-NOSRC   wiki/research/hypotheses/hyp-03-background-cpu-without-lifecycle.md: ['10%'] :: | | | |---|---| | **Prediction (H1)** | On wl-many-background, cfg-ferrum-nolifecycle accumulates more tree CPU time per minute during the background window tha
INT-NUMBER-NOSRC   wiki/research/hypotheses/hyp-04-startup-window-visible.md: ['10%', '50 ms'] :: | | | |---|---| | **Prediction (H1)** | In fresh-profile starts, the median T0-to-T1 (first window visible) latency of cfg-ferrum-nolifecycle is lower than that
INT-NUMBER-NOSRC   wiki/research/hypotheses/hyp-05-navigation-non-inferiority.md: ['10%'] :: | | | |---|---| | **Prediction (H1)** | For every navigation scenario of wl-frequent-nav, the median per-trial navigation latency of cfg-ferrum-nolifecycle is n
INT-NUMBER-NOSRC   wiki/research/hypotheses/hyp-06-rendering-non-inferiority.md: ['10%'] :: | | | |---|---| | **Prediction (H1)** | On wl-continuous-scroll and wl-canvas-webgl, the per-trial p95 frame presentation interval of cfg-ferrum-nolifecycle is 
INT-NUMBER-NOSRC   wiki/research/hypotheses/hyp-07-energy-per-workload.md: ['10%'] :: | | | |---|---| | **Prediction (H1)** | Where an energy metric passes its validation gate, cfg-ferrum-nolifecycle uses less energy per completed workload above 
INT-NUMBER-NOSRC   wiki/research/hypotheses/hyp-08-adaptive-reduces-memory.md: ['15%'] :: | | | |---|---| | **Prediction (H1)** | On wl-many-background, the median time-averaged tree private commit under cfg-ferrum-adaptive is lower than under cfg-fe
INT-NUMBER-NOSRC   wiki/research/hypotheses/hyp-10-adaptive-restore-latency.md: ['20%'] :: | | | |---|---| | **Prediction (H1)** | On wl-many-background, the per-trial p95 background-tab activation-to-ready latency under cfg-ferrum-adaptive is lower t
INT-NUMBER-NOSRC   wiki/research/hypotheses/hyp-11-lifecycle-safety.md: ['95%'] :: | | | |---|---| | **Prediction (H1)** | Across all confirmatory trials of cfg-ferrum-fixed-idle, cfg-ferrum-mempressure and cfg-ferrum-adaptive, the number of s
INT-NUMBER-NOSRC   wiki/research/hypotheses/hyp-12-security-overhead-small.md: ['1 ms', '5%', '1 ms', '5%'] :: | | | |---|---| | **Prediction (H1)** | The p95 policy evaluation latency is below 1 ms per decision. cfg-ferrum-nolifecycle's median navigation latency on wl-s
INT-NUMBER-NOSRC   wiki/research/hypotheses/hyp-13-profiles-cheaper-than-udfs.md: ['10%'] :: | | | |---|---| | **Prediction (H1)** | On wl-multi-active, varying the number of distinct sites, the marginal tree private commit per additional site is lower 
INT-NUMBER-NOSRC   wiki/research/hypotheses/hyp-14-memory-growth-non-inferior.md: ['10 MiB'] :: | | | |---|---| | **Prediction (H1)** | In the wl-frequent-nav soak, the per-trial memory growth slope of cfg-ferrum-nolifecycle exceeds that of cfg-edge and of
INT-NUMBER-NOSRC   wiki/research/hypotheses/hyp-15-restore-and-recovery.md: ['95%', '100%'] :: | | | |---|---| | **Prediction (H1)** | The lower bound of the exact 95% binomial CI of cfg-ferrum-nolifecycle's session restoration success rate on wl-session-
INT-NUMBER-NOSRC   wiki/research/metrics/metric-loaf-blocking.md: ['50 ms'] :: ## Notes - This is a responsiveness signal: it counts rendering updates delayed by more than 50 ms ([measurement note](../../raw/research/measurement-methodolog
INT-NUMBER-NOSRC   wiki/research/metrics/metric-memory-growth-slope.md: ['1 s'] :: **Method.** Sampled tree private commit (1 s, decimated to 1 min medians) regressed on time with Theil-Sen; one slope per trial.
INT-NUMBER-NOSRC   wiki/research/metrics/metric-nav-failure-rate.md: ['30 s'] :: **Boundaries.** Start: Navigation trigger issued by harness. End: Beacon received or timeout (proposed 30 s).
INT-NUMBER-NOSRC   wiki/research/metrics/metric-peak-tree-private-commit.md: ['1 s'] :: **Definition.** Maximum over the window of the summed tree private commit; preferred source is the Job Object PeakJobMemoryUsed when job membership is complete 
INT-NUMBER-NOSRC   wiki/research/metrics/metric-recovery-time.md: ['60 s'] :: **Method.** One measurement per induced crash; failures to recover within timeout (proposed 60 s) recorded as non-recovery.
INT-NUMBER-NOSRC   wiki/research/metrics/metric-tree-private-commit.md: ['1 s'] :: **Method.** Sample every 1 s (proposed). Process set S(t) follows the product's pre-registered attribution mode (ov-research-fairness-protocol rule 3): job-only
```

**CONTRADICTION (3).** All three name a `Q-NNN`, so they are registered (SCHEMA §9.7 step 4).
adr-0005 / Q-218 is new in this session (owner's standing install directive vs "Owner installs via winget").

```text
CONTRADICTION      wiki/decisions/adr-0005-owner-installs-toolchain-winget.md: registered=['Q-218'] :: a later owner directive widens who may install. In session s01 the owner said "Feel free to run install." (Cla
CONTRADICTION      wiki/decisions/adr-0009-benchmark-hardware-energy.md: registered=['Q-116', 'Q-122', 'Q-123'] :: research weakens the energy half of the owner's decision. The decision is **not** changed here, but how it is 
CONTRADICTION      wiki/decisions/adr-0010-isolation-webview2-profiles.md: registered=['Q-107'] :: the owner's choice is **not reachable through Tauri 2.12.1's public API today**. The decision stands, but how 
```

Reading pass (semantic), findings not fixed here, each with its disposition:

- `ip-build-plan` IP-0 step 3 says "Node was installed by the owner (Q13, adr-0005)"; the owner-answer file
  says Claude installed it on the owner's authorisation. Not edited, because the `ip-*` pages were approved
  in chat (Wave 0) as written; covered by Q-218 and to be fixed before the Wave 1 re-approval.
- `ip-wiki-lint` §3 says the manifest format "is owned by P1, which creates the file"; SCHEMA §3.1 (wins)
  moved the manifest to p0.8 with a fixed format. Same disposition as above (chat-approved page; SCHEMA wins).
- `phase-p0-planning` p0.9 title says "Owner installs Node LTS via winget"; same fact as the first bullet.
  Left as a task title; covered by Q-218.
- CLAUDE.md §9 lists installs among owner decisions; the standing directive widens this. CLAUDE.md is not
  edited (it would stale `schema` via `bootstrap_hash`); covered by Q-218.

**UNV-MIRROR (7).** Fixed in this task for ov-arch-data-flows, ops-git-conventions, glossary and
ov-open-questions (frontmatter `unverified` entries added). Remaining:

```text
UNV-MIRROR wiki/architecture/ov-arch-configuration.md: inline-only=[] fm-only=['phase-p7-lifecycle']
UNV-MIRROR wiki/phases/phase-p0-planning.md: inline-only=[] fm-only=['phase-p0-planning']
UNV-MIRROR wiki/phases/phase-p3-tabs-sessions.md: inline-only=[] fm-only=['phase-p3-tabs-sessions']
UNV-MIRROR wiki/phases/phase-p5-telemetry.md: inline-only=[] fm-only=['phase-p5-telemetry']
UNV-MIRROR wiki/phases/phase-p6-benchmark-harness.md: inline-only=[] fm-only=['phase-p6-benchmark-harness']
UNV-MIRROR wiki/phases/phase-p7-lifecycle.md: inline-only=[] fm-only=['phase-p7-lifecycle']
UNV-MIRROR wiki/phases/phase-p8-research-paper.md: inline-only=[] fm-only=['phase-p8-research-paper']
mirror mismatches: 7
```

Disposition: phase pages state these claims in frontmatter (tasks, `unverified`) rather than in body text;
ov-arch-configuration's only p7 tag sits inside a fenced TOML example. Accepted as warnings.

## Raw manifest (`wiki/raw/MANIFEST.sha256`)

Created in this task, 9 lines, verified by `manifest.py verify` (9 lines, 0 problems). Hashes are taken over
LF-normalised bytes (SCHEMA §10.2 `N`); these lines also record the sha256 of the p0.1 raw sources
(`00-master-prompt.md`, `01-scoping-decisions.md`), completing p0.1's verify.

```text
21a4bc5bd1f5ddd83b667b416e03479a5c6169c0e8a167df7c2485a34b71ba67  00-master-prompt.md
74e5d6d8fe43dbf1f774ccd46787311fe14c49bf211bfea88e8ea707f842d04c  01-scoping-decisions.md
777265ce56f284782e4271825797a3ec4b64180482931c62c12d935c218783a2  evidence/phase-p0-planning/env-webview2-pv.txt
c1e129f184915484803332803f41a0c5dae28f8cc04bf8a3ba6e7c6d05555ffe  owner/2026-10-08-s01-wave0.md
c3a2a9089fe442853a4786fe79cabf3932ff5b5e7effbacace10c3aac145e99a  research/llm-wiki-pattern.md
b39a6aa313746997ea6bf74cf27d963eb9ced146bece40470d843642d10f14dc  research/measurement-methodology.md
7b114f158718c95ea77cfb70fef815be3f980c4c9f7f1e3b669c057d73b8df3f  research/nextjs-stack.md
c4de79ac0a6d6cd1190fc2b7ff1fcfce14902cbf51b5a649f618b21c888830da  research/related-work-seed.md
6a7034259782eab7cca339290d09f971c4849c8cb8b0d43c4912a07785f2927c  research/tauri-webview2-capabilities.md
```

**Manifest sha256 at lint time** (9 lines, before this evidence file's own line was appended):
`238187b62c3e9d53d2df7ac188ad31b6c63c99367806a0220556bb46ee890129`. The line for this file is appended right after it is written (SCHEMA §3.1 append-only); the
post-append sha256 is recorded in the `lint` log entry.
