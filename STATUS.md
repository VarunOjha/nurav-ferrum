---
id: status-live
type: status
title: "Ferrum live status and next action"
status: active
updated: 2026-10-14
sources:
  - raw/01-scoping-decisions.md
  - raw/research/nextjs-stack.md
  - raw/owner/2026-10-08-s01-wave0b.md
  - raw/owner/2026-10-09-s01-wave0c.md
  - raw/owner/2026-10-09-s01-plan-app-feedback.md
  - raw/owner/2026-10-09-s01-portal-v2-decisions.md
  - raw/owner/2026-10-10-s01-q008-and-pause.md
  - raw/owner/2026-10-11-s01-wave1-answers-and-p0-signoff.md
  - raw/owner/2026-10-11-s01-wave2-pages-approval.md
  - raw/owner/2026-10-11-s02-p1-go-ahead.md
  - raw/owner/2026-10-11-s02-p1-signoff.md
  - raw/owner/2026-10-11-s02-p2-go-ahead.md
  - raw/owner/2026-10-11-s02-wave3-and-p2-questions.md
  - raw/owner/2026-10-13-s03-p3-signoff-and-p4-go.md
  - raw/owner/2026-10-13-s03-p4-questions.md
  - raw/owner/2026-10-13-s03-p4-pages-approval.md
  - raw/owner/2026-10-13-s03-security-engine-reapproval.md
  - raw/owner/2026-10-13-s03-p4-3-components-reapproval.md
  - raw/owner/2026-10-13-s03-manifest-order-slip.md
  - raw/owner/2026-10-13-s03-q224-link-types.md
  - raw/owner/2026-10-13-s03-p4-4-components-reapproval.md
  - raw/owner/2026-10-13-s04-p4-5-components-reapproval.md
  - raw/owner/2026-10-13-s04-p4-6-components-reapproval.md
  - raw/owner/2026-10-13-s04-p4-7-components-reapproval.md
  - raw/owner/2026-10-13-s04-p4-8-app-shell-reapproval.md
  - raw/owner/2026-10-13-s04-p4-9-components-reapproval.md
  - raw/owner/2026-10-13-s05-p4-10-components-reapproval.md
related: [ops-portal-pipeline, adr-0023, adr-0024, adr-0025, adr-0026, adr-0027, phase-p0-planning, phase-p1-foundation, ops-approval-workflow, ip-build-plan, ops-session-protocol, ops-resume-after-interruption, ops-environment-setup, ops-multi-agent-workflow, ops-wiki-maintenance, ov-open-questions, schema]
approvable: false
session: s06
current_phase: phase-p4-security
current_task: p4.15
next_action: "p4.15 (isolation modes selectable by configuration: shared profile, profile per site, user data folder per site), per wiki/phases/phase-p4-security.md; write the STATUS In-flight record first; verify with pwsh -NoProfile -File scripts/verify/p4.15-selectable-isolation-modes.ps1. Remaining after it: p4.16, p4.17, p4.11, p4.12, p4.13, then the exit gate p4.14; stop after the exit gate (no P5 work). Known: lint:wiki reports one RAW-IMMUTABLE error (commit ff7292e MANIFEST order), fixed in the history rewrite before the first push (Q-221). Owed from P3: end-check rerun (pwsh -NoProfile -File scripts/gates/p3-gate.ps1 -SaveEvidence, about 35 minutes, PC quiet), checklist items 1 to 20 with the owner's Ferrum notes, history cleanup (Q-221) and the owner's push (Q-105)."
blocked_on: []
last_handoff: handoff-2026-10-13-s04
---

# STATUS — live state (read this first every session)

> Updated after every completed task and at every handoff (SCHEMA §9.5). If git disagrees with this
> file, trust git + `wiki/log.md` and fix this file ([resume procedure](wiki/operations/ops-resume-after-interruption.md)).
> `sources`/`related` paths in the frontmatter are relative to `wiki/` (SCHEMA §5.1).

## Current phase

**phase-p4-security — IN PROGRESS (session s03, entry passed 2026-10-13).** Owner's words of 2026-10-13
([raw/owner/2026-10-13-s03-p3-signoff-and-p4-go.md](wiki/raw/owner/2026-10-13-s03-p3-signoff-and-p4-go.md)):
"Sign off now, check later" and "P4 only, then pause". **Stop after P4's exit gate:** P5 waits for the owner.
Standing rule: no kill commands and no deleting of things Claude did not create without asking.

P0 to P3 are done and signed off (P3 on 2026-10-13, before the end-check rerun on the self-scan fixes; that rerun and
manual checklist items 1 to 20 are still owed).

## Done this session (s03)

- Session start; owner skips the trial notes for now (notes come later, handled as fixes).
- P3: seven stale pages re-approved; P3 signed off (`phase-p3-tabs-sessions#exit`); status done.
- P4 go-ahead (P4 only, then pause). Q-112 (HTTP allowed with a warning bar), Q-113 (blocklist ships empty) and Q-212
  (settings in one app) answered; adr-0015 updated; five P4 pages approved; P4 entry gate passed.
- Alt+Tab focus check (deferred at the P3 sign-off) moved to the P4 hand checks; five keys re-approved (`2f9b541`).
- p4.1 done (`ff7292e`): threat model (15 boundary edges, 26 threats, not-enforced list) in the security testing plan and SECURITY.md; check PASS.
- p4.2 done (`56cd05d`): navigation policy engine in `crates/security`, 24 tests, 100 percent coverage; comp-security-engine re-approved by the owner.
- p4.3 done (`1323b3d`): every page load, redirect step, frame and pop-up passes the engine; blocked and allowed sites lists in settings (version 3, HTTP warning default); shell view limited to Ferrum's own pages; check PASS, smoke 85 passed. Four component pages re-approved by the owner; the MANIFEST order slip (ff7292e) is fixed in the history rewrite before the first push (owner's choice).
- Q-224 answered before p4.4: any link type to other apps may be offered, always with a click; Claude proposes a sourced list of always-refused risky types for the owner's review.
- p4.4 done (`b957705`): four abused link types always refused, optional list of allowed types, every request and click checked; check PASS. Three component pages re-approved by the owner.
- Session s04 (same chat, after the s03 handoff): p4.5 done (`17af021`): every permission refused unless granted per site; check PASS. Four component pages re-approved by the owner.
- p4.6 done (`a341b0a`): safe download names, program warning, nothing opens a download; check PASS. Two component pages re-approved by the owner.
- p4.7 done (`f525169`): isolation proven by tests (storage per profile, clearing one site, private tabs, process inventory); check PASS; full smoke 100 passed. Three component pages re-approved by the owner.
- p4.8 done (`55dcb6f`): websites cannot reach Ferrum's controls or pages, tested; check PASS; full smoke 105 passed. comp-app-shell re-approved by the owner.
- p4.9 done (`5027ee1`): security audit log (six fields, origin only, rotation), required by every security test; older address-bar race fixed; check PASS; full smoke 106 passed. Two component pages re-approved by the owner. Process slip: no write-ahead In-flight record was written for p4.7 (logged).
- Session s05 (same chat, after the s04 handoff): p4.10 done (`ea16ba1`): a crashed tab is marked and covered with Reload; other tabs and the shell keep working; a browser-engine failure restarts Ferrum with its tabs; check PASS; full smoke 109 passed. Two component pages re-approved by the owner.

## Done this session (s02)

- Session start; go-ahead transcribed; P1 entry gate passed; `phase-p1-foundation` set to in-progress.
- p1.1 done (`29b7d81`): toolchain recorded ([toolchain.txt](wiki/raw/evidence/phase-p1-foundation/toolchain.txt), [toolchain-details.txt](wiki/raw/evidence/phase-p1-foundation/toolchain-details.txt)); cargo-deny 0.20.2 installed; cargo uses the MSVC linker.
- p1.2 done (`c0142a5`): machine inventory saved ([environment.md](wiki/raw/evidence/phase-p1-foundation/environment.md)); Q-116 and Q-122 still open for the owner.
- p1.3 done (`e4a193a`): ignore rules, `.gitattributes`, LICENSE-MIT, LICENSE-APACHE, README licence section.
- p1.4 done (`de68d66`): Cargo workspace with six library stubs, rust-toolchain 1.99.0, section-12 folders; build/test/fmt/clippy clean.
- p1.17 done (`135d6cc`): spikes pinned to tauri 2.12.3, @tauri-apps/cli 2.12.2, @tauri-apps/api 2.12.3, vite 8.3.4, typescript 7.0.2.
- p1.5 automatic part (`331e3f6`): spike S1 built; all automatic checks pass; sync deadlock reproduced; Job Object holds all WebView2 processes. Owner hand checks pending.
- p1.7 done (`3e30f93`): spike S3 raw COM, every call S_OK; one webview2-com and one windows version; unsafe invariants drafted.
- p1.8 done (`c4dfd4d`): spike S4, one Playwright harness drives S1, Chrome for Testing and Edge over CDP; hidden tabs give no paint or screenshot.
- p1.6 done (`f7004a9`, fix `809cd3c`): spike S2, route (c) per-site profiles in one browser process with isolated cookies; route (d) works with a browser per site; (a) unreleased, (b) not run.
- p1.10 done (`60c7d03`): git-backed lint rules re-confirmed (13 tests, 0 wiki errors, 106 fingerprints match).
- p1.12 done (`04d9f8c`): deny.toml, cargo deny ok; npm audit dispositioned; new question Q-222 (MPL-2.0 licence, blocks P2).
- p1.13 done (`3b24c12`): SECURITY.md, BENCHMARKING.md, REPRODUCIBILITY.md, docs/README.md; AI_USAGE.md updated.
- p1.15 hook committed (`898fd14`): warns on code without its page; clone test passes; SCHEMA §9.8 tag closed at the exit gate.
- p1.11 committed (`5b6113c`): ci.yml and scripts/ci-local.ps1; local run 14 of 14 PASS; owner pushes or defers GitHub.
- p1.14 done (`058ca1a`): literature protocol, reading log, batch 1 (4 primary sources).
- p1.9 proposals committed (`82fe00a`): adr-0029, adr-0030, adr-0031 proposed; risks r01, r02, r03, r05, r06 updated; P2 revised. Owner decides.
- Owner batch recorded ([raw/owner/2026-10-11-s02-p1-design-and-questions.md](wiki/raw/owner/2026-10-11-s02-p1-design-and-questions.md)): adr-0029, adr-0030, adr-0031 approved and accepted; Q-107, Q-116, Q-122, Q-222 answered; GitHub deferred. p1.9 and p1.11 done.
- P1 exit preparation: every P1-targeted claim closed on 25 pages except four that wait for the S1 hand check; 8 approvals stale by design (re-approval with the sign-off).
- p1.15 done (`b570056`): hook check PASS 2 of 2 after the SCHEMA §9.8 update.
- p1.5 done (`af70134`): S1 report with hand checks; Alt+Tab focus is a known issue (fix in P2); last P1 claims closed.
- Owner re-approved the 9 pages changed by the claim closures ([raw/owner/2026-10-11-s02-p1-reapproval.md](wiki/raw/owner/2026-10-11-s02-p1-reapproval.md)); entry gate PASS.
- p1.16: P1 gate run (`314f849`): all automatic checks pass; phase-p1-foundation set to gate-review; waiting for the owner's sign-off.
- P1 signed off by the owner; phase-p1-foundation done; handoff [handoff-2026-10-11-s02](wiki/operations/handoffs/handoff-2026-10-11-s02.md) written.
- P2 go-ahead recorded; four P2 dependency pages aligned with adr-0029 before Approval Wave 3.
- P2 entry passed: Wave 3 approved; Q-109, Q-202, Q-214 answered; phase-p2-minimal-container in progress.
- p2.1 done (`e007c71`): fixture server over HTTPS, name-constrained dev CA installed (owner confirmed), 7 tests, curl probe.
- p2.2 done (`2c96d06`): app skeleton with the shell toolbar; release build and window check PASS.
- p2.3 done (`196e66a`): bridge locked to the shell; IPC refusal self-test PASS.
- p2.4 done (`a69fa57`): settings model (TOML, adr-0015 validation), 9 tests.
- p2.5 done (`d3ad7ee`): address-bar normalisation, 36 cases, one real bug fixed.
- p2.6 done (`2c9d89f`): content web view (adr-0029) with events to the shell; nav and ipc self-tests PASS; the Ferrum-created view has no bridge.
- p2.7 done (`094b0b7`): back/forward/refresh smoke test; smoke robot; app_quit, shell_layout, data_dir applied.
- p2.8 done (`2c6b247`): loading and error states, shell-drawn error panel, smoke tests green.
- p2.9 done (`e1b725e`): redirects smoke-tested; final-address bug fixed.
- p2.10 done (`f21caba`): new windows per setting; links to other apps ask first; smoke suite 20 passed.
- p2.11 done (`573153c`): cookies persist across a restart; smoke suite 21 passed.
- p2.12 done (`083561b`): DevTools only in debug builds, checked by key presses in release and debug.
- p2.13 done (`e8bc194`): Google sign-in bar, classifier with unit tests, smoke suite 25 passed.
- p2.14 done (`9df1157`): JSON-lines logs, typed errors, crash records; smoke suite 25 passed.
- p2.15 done (`6ed6c9a`): whole smoke suite in one command (25 passed); manual checklist written.
- p2.16 done (`a586e34`): docs updated; three part pages implemented (approvals now outdated, re-approval at exit).
- p2.17 done (`3b057f0`): literature batch 2 (eight labelled sources); seed snippet corrected.
- p2.18 in progress (`a742955`, `c8a4349`): shell checks, real gate, claims closed; waiting for the owner review.
- p2.18 owner checklist round 1 (`c899c22`): link bar readable in dark mode, loading signal visible; ten P2 pages and the P3 plan approved by the owner's directive; Q-111, Q-125, Q-209 answered.
- P2 gate PASS on 5c2af31 (evidence `72cbef4`, 27 PASS); phase-p2-minimal-container#exit recorded by the owner's directive; P2 done.
- P3 entry passed (2026-10-12); phase-p3-tabs-sessions in progress.
- p3.1 done (`ac0361b`): tab model in crates/core with random-sequence tests; check PASS.
- p3.2 done (`7c4b532`): one view per tab, tab commands, first tab strip; shell stacking fixed; smoke 27 passed; check PASS.
- p3.3 done (`86f1717`): shortcuts in shell and pages via WebView2 accelerator keys; smoke 36 passed; check PASS.
- p3.4 done (`719adb4`): versioned settings file, atomic save, migration, start-up tabs; smoke 39 passed; check PASS.
- p3.5 done (`9113016`): tabs saved and restored after exit or crash; smoke 43 passed; check PASS.
- p3.6 done (`0293deb`): per-site profiles (psl), per-site settings, ask before a tab changes site; smoke 48 passed; check PASS.
- p3.7 done (`3d6fa8a`): local, searchable, clearable history; back/forward per tab; smoke 51 passed; check PASS.
- p3.8 done (`f742b15`): downloads with progress, completion and failure; start-up address race fixed; smoke 55 passed; check PASS.
- p3.9 done (`a35aac5`): shell responsive with a busy tab; check PASS.
- p3.10 done (`83a754d`): freeze guard (code scan, stress test, review checklist); check PASS.
- p3.14 done (`0b1bd6a`): settings screen; host-side checks and atomic save; check PASS.
- p3.15 done (0bb71c9): sidebar with tabs and history; check PASS.
- p3.11 done (`ebc79ca`): P3 suite in one command (45 Rust, 36 app tests); P2 regression group 26 passed; check PASS.
- p3.12 done (0ce0e38): literature batch 3 (eight sources; seed open points F3, G1, G2 closed); check PASS.
- p3.13 part 1 (`6ab7667`): P3 docs, manual checklist, real P3 gate; P3 claims closed or re-targeted.
- P3 gate PASS on d363adf (evidence `e1cee54`, 24 PASS); phase-p3-tabs-sessions gate-review; handoff written; STOPPED for the owner's review.
- p3.16 done (80dc946): owner review fixes (download tab, site icons, app icon); check PASS.
- p3.18 done (0108da1): local SQLite store; history.json imported once; check PASS.
- p3.19 done (38e294f): bookmarks (star, bar, editor, sidebar folders, shortcuts); check PASS.
- p3.20 done (d03784b): address-bar search of the past; check PASS.
- p3.21 done (00715eb): encrypted backup and import; check PASS.
- p3.22 done (2a5ca43): Graphite look, themes as data, new-tab page, split-tile logo; check PASS.
- p3.23 done (0761cb2): feature set in the P3 suite and gate; checklist items 14 to 20; check PASS. p3.17 done (design recorded; check PASS).

## Done this session (s01)

- Scoping Q&A with the owner recorded in [wiki/raw/01-scoping-decisions.md](wiki/raw/01-scoping-decisions.md);
  master prompt stored verbatim in [wiki/raw/00-master-prompt.md](wiki/raw/00-master-prompt.md).
- `git init -b main` performed; the owner authorised local commits (Q-104, 2026-10-08); first commits
  `496f69d` (planning wiki, schema, raw sources) and `48c90d8` (`.gitattributes`, LF endings).
- Five research notes in `wiki/raw/research/`; schema layer (`wiki/SCHEMA.md`, `CLAUDE.md`, this file).
- Multi-agent drafting of every wiki area (p0.4–p0.7), a review pass (52 issues raised, fixed by the
  area agents) and a completeness critic pass (23 gaps).
- Integration (p0.7, finished): SCHEMA amendment batch applied; open-questions register reconciled
  (Q-101 answered by directives 2 and 4; Q-208–Q-217 added); approval waves defined
  ([ops-approval-workflow §8](wiki/operations/ops-approval-workflow.md#8-approval-waves)); phase, ADR,
  risk, research and plan-app pages fixed; [wiki/index.md](wiki/index.md) and [wiki/log.md](wiki/log.md)
  created; integration lint (PyYAML-based, scratchpad) reports **0 errors, 0 warnings** over 191 files
  with frontmatter plus 3 raw files without it, and the quick lint embedded in ops-wiki-maintenance §5 also
  reports 0 errors. Details: the last entries of `wiki/log.md`.
- New raw evidence: [env-webview2-pv.txt](wiki/raw/evidence/phase-p0-planning/env-webview2-pv.txt)
  (WebView2 runtime `pv` 154.0.4258.62).
- Ingest of the Wave 0 owner answers ([raw/owner/2026-10-08-s01-wave0.md](wiki/raw/owner/2026-10-08-s01-wave0.md)):
  Q-006, Q-007, Q-102, Q-103, Q-104, Q-210 answered; new Q-218 (CONTRADICTION on adr-0005, installs).
- p0.9 / IP-0 done (commit `1cfc2d5`): Node v24.20.0, npm 11.19.0, git 2.52.0.windows.1; gate PASS
  ([IP-0-toolchain.txt](wiki/raw/evidence/phase-p0-planning/interactive-plan/IP-0-toolchain.txt)).
- p0.10 / IP-1 done (commit `2c997fa`): `interactive_plan/` scaffolded with create-next-app 16.4.0, the ip-spec §7
  stack pinned exactly (no peer errors), coverage-v8 + Playwright Chromium installed (Q-210); spikes S1 (fs outside the
  root), S2 (mermaid 12.1.0) and S3 (127.0.0.1-only bind) pass under `next start` and `next dev`; gate typecheck + lint +
  build green ([IP-1-scaffold.txt](wiki/raw/evidence/phase-p0-planning/interactive-plan/IP-1-scaffold.txt),
  [IP-1-spikes.txt](wiki/raw/evidence/phase-p0-planning/interactive-plan/IP-1-spikes.txt)).
- Wave 0b ingested (commit `a68667b`, [raw/owner/2026-10-08-s01-wave0b.md](wiki/raw/owner/2026-10-08-s01-wave0b.md)):
  Q-216 (scripts committed as `tools/quick_lint.py` and `tools/approvals_check.py` with stdlib tests),
  Q-218 ([adr-0021](wiki/decisions/adr-0021-claude-runs-toolchain-installs.md): Claude runs all toolchain
  installs, owner clicks UAC, drivers need separate approval; supersedes adr-0005) and Q-219
  ([adr-0020](wiki/decisions/adr-0020-index-lists-evidence-folders.md): index lists evidence/bench folders;
  SCHEMA §11 changed). Quick lint 0 errors, 27 tool tests OK
  ([tools-wave0b-check.txt](wiki/raw/evidence/phase-p0-planning/tools-wave0b-check.txt)).
- Wave 0c ingested (2026-10-09, [raw/owner/2026-10-09-s01-wave0c.md](wiki/raw/owner/2026-10-09-s01-wave0c.md)): `sources`
  may be any wiki-relative path or https URL (SCHEMA §5.1, Q-220), raw research notes exempt, real-wiki loader test in
  `npm run lint:wiki`, `tools/quick_lint.py` exits 1 on errors, typecheck = `next typegen && tsc --noEmit`, npm audit
  accepted until the P0 exit recheck, stale "owner installs Node" wording removed from adr-0016/ip-build-plan/ip-spec;
  IP-1-settled tags turned into evidence citations. Standing delegation policy: Claude decides tooling/schema/lint
  consistency questions and logs them; scope, product behaviour, security posture, methodology, cost and deletion
  still go to the owner.
- p0.11 / IP-2 done: `lib/config.ts`, `lib/wiki/*` loader + zod schemas, fixtures, 477 unit tests + 6 real-wiki tests
  green, typecheck + eslint exit 0 ([IP-2-tests.txt](wiki/raw/evidence/phase-p0-planning/interactive-plan/IP-2-tests.txt)).
- p0.12 / IP-3 done: `lib/approvals/{hash,model,state,diff}.ts` and `lib/wiki/gates.ts`; loader fills content/scope/bootstrap
  hashes; hash vectors v01-v15 (v11-v15 new, computed by the SCHEMA §10.2 Python block) and the Python cross-check (15 vectors +
  401 generated inputs) agree; 571 unit tests, lint:wiki, typecheck, eslint, quick lint and 29 tool tests green
  ([IP-3-tests.txt](wiki/raw/evidence/phase-p0-planning/interactive-plan/IP-3-tests.txt)). Delegated details in the `decide` log entry
  of 2026-10-09 (bootstrap_hash fail-closed, also in tools/approvals_check.py; entry-gate step 4 added to ip-data-contract §8.3).
- p0.14 / IP-4 done (commit `6cc1a07`): `lib/approvals/{store,lock,guard,logAppend,view,file,errors,time,api}.ts` and
  `app/api/approvals/route.ts`; 670 unit tests incl. the store, guard and route suites (every ip-approvals-api §2.2 code reached);
  the cross-process test (4 node processes x 10 submits + a concurrent reader) green in the full run and 3 more times in a row;
  lint:wiki, typecheck, eslint, quick lint, 29 tool tests green; plan/approvals.json untouched
  ([IP-4-tests.txt](wiki/raw/evidence/phase-p0-planning/interactive-plan/IP-4-tests.txt)). Windows refuses a rename over an open
  file (EPERM, observed); the retry budget is 6 attempts (20-320 ms backoff). Delegated details in the IP-4 `decide` log entry.
- p0.13 / IP-5 done (commit `19b5a95`, wording fix `84ba8ff`): `lib/lint/` (all ip-wiki-lint §2/§2.1 rules, SCHEMA §9.3
  Q-BLOCK-UNGATED and PHASE-DONE-NO-EXIT, git-backed STALE-UPDATED and RAW-IMMUTABLE), `npm run lint:wiki`, `lint:wiki:json`
  and `gate`; golden rule tests, git tests on a temp repository, Python parity; 701 unit tests, typecheck, eslint, quick lint,
  29 tool tests green. Real wiki: 0 errors, 34 warnings with dispositions in the IP-5 `lint` log entry
  ([IP-5-gate.txt](wiki/raw/evidence/phase-p0-planning/interactive-plan/IP-5-gate.txt),
  [IP-5-lint.json](wiki/raw/evidence/phase-p0-planning/interactive-plan/IP-5-lint.json)). Delegated details in the IP-5 `decide`
  log entry (tags in inline code count, log.md exempt from UNV-PASTDUE/MIRROR, vitest reporter settings).
- p0.13 / IP-6 done (commit `ad521cc`): app shell (top bar, banners, three-state theme toggle with pre-paint script, light/dark
  tokens, system fonts), `Markdown` (raw HTML shown as text) and `Mermaid` (strict, re-themed, page-linked nodes), `/wiki`,
  `/wiki/[[...path]]`, `/go/[id]`, `/search`, `/log`, 404 with close matches; 773 unit/component tests, Playwright
  wiki/log/theme/views 44 passed against a temp copy under a path with a space, typecheck, eslint, lint:wiki (0 errors),
  quick lint, 29 tool tests green ([IP-6-tests.txt](wiki/raw/evidence/phase-p0-planning/interactive-plan/IP-6-tests.txt)).
  Delegated details in the IP-6 `decide` log entry (ApproveBar tests move to IP-7, E2E overlay fixture, /go targets).
  Integrator item: a `;` in a sequence-diagram message on `ov-arch-data-flows` breaks that mermaid diagram (see the entry).
- p0.15 / IP-7 done (commit `a462a9f`): dashboard `/`, `/approvals` inbox (tabs, current wave, grouping by phase, review mode
  j/k, orphans, no bulk approve), `/phases/[id]` (entry gate, tasks, test gate evidence ✓/✗, page and exit approve bars), the
  `ApproveBar` client component (also on approvable `/wiki` pages) and `/lint`; 801 unit/component tests, Playwright 71 passed
  incl. dashboard, approval-flow, approval-race and exit-approval, guard: real approvals.json absent and log.md/STATUS.md unchanged;
  typecheck, eslint, lint:wiki (0 errors), quick lint, 29 tool tests green
  ([IP-7-tests.txt](wiki/raw/evidence/phase-p0-planning/interactive-plan/IP-7-tests.txt)). Delegated details in the IP-7 `decide`
  log entry (eligible exit keys, Stale tab, wave/grouping rules, evidence paths, E2E isolation).
- p0.13 / IP-8 done (commit `4fa5ea5`): `/architecture` (xyflow component graph in trust-level lanes, TB edges marked,
  TRUST-EDGE red, side panel, edge table), `/roadmap` (phase DAG + critical path, SVG timeline in sessions, per-phase table),
  `/decisions` + `/decisions/[id]`, `/risks` (heatmap table + sortable register), `/research` (traceability graph, gaps, rq filter,
  nested list); ADR ids now open `/decisions/<id>`; all nav entries enabled; 827 unit tests (24 graph tests), Playwright 100
  passed, guard unchanged; lint:wiki 0 errors (new real-wiki graph test: 9 phases, 49 sessions)
  ([IP-8-tests.txt](wiki/raw/evidence/phase-p0-planning/interactive-plan/IP-8-tests.txt)). The first gate run exposed a Windows
  lock race in the IP-4 store (raw EPERM on `.approvals.lock`); fixed (busy-retry until LOCK_TIMEOUT) and re-run green. Delegated
  details in the IP-8 `decide` log entry. Integrator item: `exp-reliability` has `trials.target` 10 (< 30).
- p0.16 / IP-9 done (commit `0e5282e`): `a11y.spec.ts` (landmarks, one h1, skip link, named controls on 16 routes; keyboard-only approve bar,
  graph nodes, theme), `security.spec.ts` (guard refusals, a second `PLAN_READONLY=1` server on 3419, loopback-only bind probe
  with a control listener: 13 non-loopback addresses refused), coverage thresholds enforced in `vitest.config.mts`, `npm run perf`;
  `npm run verify` green in one run (830 unit, lint:wiki 0 errors, 131 E2E) and `npm run test:coverage` thresholds met
  ([IP-9-verify.txt](wiki/raw/evidence/phase-p0-planning/interactive-plan/IP-9-verify.txt),
  [playwright-report.zip](wiki/raw/evidence/phase-p0-planning/interactive-plan/playwright-report.zip)). Timing on the real wiki
  (app evidence only, [IP-9-perf.txt](wiki/raw/evidence/phase-p0-planning/interactive-plan/IP-9-perf.txt)): warm medians
  27-178 ms, under the 500 ms target; the first request (about 2.2 s) and requests after the 10 s lint memo expires (1.0-1.4 s)
  miss it (owner question in the IP-9 log entries). Delegated details in the IP-9 `decide` log entry.
- p0.16 / IP-9 review fixes done (commit `6a78a78`): 26 reviewer findings, 25 fixed and 1 environmental (no change). Every
  route sends `X-Frame-Options: DENY` and a same-origin CSP and refuses a non-loopback `Host` (`proxy.ts`); server scripts run
  `scripts/serve.mjs` (127.0.0.1, `PLAN_PORT`); CLAUDE.md shown on the schema page, STATUS "Next action" section on the
  dashboard, inbox diffs; APPROVAL-INVALID is a lint error (SCHEMA §9.3,
  [adr-0022](wiki/decisions/adr-0022-approval-invalid-is-a-lint-error.md), claude-proposed), ADR-CHAIN/PHASE-ORDER/MERMAID-RULES
  tightened, approvals_check `#exit` fix; graph, mermaid, phone-width and log fixes; `npm run verify` exit 0 (869 unit,
  lint:wiki 0 errors, 143 E2E), coverage thresholds met
  ([IP-9-review-fixes.txt](wiki/raw/evidence/phase-p0-planning/interactive-plan/IP-9-review-fixes.txt)). Details: the IP-9
  review `decide`, `schema` and `code` log entries.
- p0.16 / IP-10 done (commit `6118d32`): `interactive_plan/README.md` (start `npm run dev:local` -> http://127.0.0.1:3417, scripts table, environment
  variables, approvals rule, spec links, known issues); the seven `ip-*` pages `status: active`; the ip-spec §5 perf tag kept with a
  logged reason and an IP-9-perf.txt citation; final `npm run lint:wiki` 0 errors, 34 warnings, 2 info
  ([IP-10-final-lint.json](wiki/raw/evidence/phase-p0-planning/interactive-plan/IP-10-final-lint.json)); handoff
  [handoff-2026-10-09-s01](wiki/operations/handoffs/handoff-2026-10-09-s01.md). Details: the IP-10 log entries.
- p0.16 / IP-10 follow-up done (commits `3eaa641`, `62e5936`): `/architecture` edge-label overlap fixed (canvas chips of at most 24
  characters placed with no chip/chip or chip/node overlap, full text of the active component's edges in a list beside the graph,
  dagre reserves chip space); new `architecture-real.spec` on a read-only real-wiki server (3420) asserts no overlaps on hover of
  WebView manager and that the list names all its edges; `npm run verify` exit 0 in one run (873 unit, lint:wiki 0 errors, 144 E2E)
  ([IP-10-arch-labels-fix.txt](wiki/raw/evidence/phase-p0-planning/interactive-plan/IP-10-arch-labels-fix.txt));
  `comp-interactive-plan` implemented with `last_verified_commit` `3eaa641`; ip-spec §5 cold-request misses accepted as a local-tool
  limitation; IP-0-toolchain.txt and IP-9-review-fixes.txt working copies restored from git (MANIFEST 33/33 under SCHEMA N).
- p0.17 step "rules" done (commit `5d33859`): the owner's portal-v2 decisions are now written rules. Approvals are given in
  Claude Code and recorded by Claude with fingerprints ([adr-0023](wiki/decisions/adr-0023-approvals-in-claude-code-portal-read-only.md),
  supersedes adr-0016; `tools/approvals_record.py`); the portal is read-only and will read plain-language JSON
  ([adr-0024](wiki/decisions/adr-0024-portal-reads-plain-language-json.md)); check scripts are PowerShell 7
  ([adr-0025](wiki/decisions/adr-0025-check-scripts-powershell-7.md)); architecture in four groups
  ([adr-0026](wiki/decisions/adr-0026-architecture-four-groups.md)); real machine values masked
  ([adr-0027](wiki/decisions/adr-0027-mask-sensitive-values.md), `tools/mask.ps1`, gitignored `.env.local-map`). 16 committed
  evidence files masked as a sanctioned raw edit. Checks: quick lint 0 errors, lint:wiki 0 errors, mask scan 0 unmasked
  ([p0.17-rules-checks.txt](wiki/raw/evidence/phase-p0-planning/p0.17-rules-checks.txt)).
- p0.17 step "pipeline" done (commit `8d89329`): wiki changes now have a plain-language JSON copy for the portal, kept in
  step by three layers ([ops-portal-pipeline](wiki/operations/ops-portal-pipeline.md), adr-0024): the repo skill
  `.claude/skills/wiki-to-portal/` (how to translate, plain-language style guide), shapes in `plan/portal/schema/` with rules
  in `plan/portal/pipeline.json`, the checker `pwsh tools/portal-sync-check.ps1` (outdated, missing, badly shaped or
  unexplained-id text), and a Stop hook in `.claude/settings.json`, **installed switched off** until
  `plan/portal/.hook-enabled` exists. Check-script folders: `scripts/verify/`, `scripts/gates/`. Checks: 20 checker tests pass,
  quick lint 0 errors, lint:wiki 0 errors, mask scan 0 unmasked
  ([p0.17-pipeline-checks.txt](wiki/raw/evidence/phase-p0-planning/p0.17-pipeline-checks.txt)).
- p0.17 step "content" done (commit `ed8b89c`): the plain-language portal text exists for every page. One file per portal tab in
  `plan/portal/` (overview, roadmap, 9 phase files, decisions, risks, research, architecture, questions, log) plus
  `refs.json` with 374 explainers so every id opens a popup; written by six parallel writers, merged and read through
  once as the owner would. Check-script fields stay empty (`null`) until the scripts exist. Stale approval wording fixed
  on phase-p0-planning, phase-p1-foundation, risk-r22 and adr-0001 (approvals are given in Claude Code, adr-0023).
  The end-of-turn check is **switched on** (`plan/portal/.hook-enabled`). Checks: portal check clean, quick lint 0 errors,
  lint:wiki 0 errors, mask scan 0 unmasked
  ([p0.17-content-checks.txt](wiki/raw/evidence/phase-p0-planning/p0.17-content-checks.txt)).
- p0.17 step "scripts" done (commit `adc3651`): a PowerShell 7 check script for every task (`scripts/verify/`, 141) and
  every phase gate (`scripts/gates/`, 9), a shared module (`scripts/lib/Ferrum.Check.psm1`: PASS, FAIL, WAIT, TODO, YOURS;
  exit 0/1/2; masked evidence), `scripts/run-all-checks.ps1 -Phase P<N>` and `scripts/test-check-scripts.ps1`. P0 and P1
  scripts are real, P2-P8 are drafts ("not ready until P<n>"); the phase JSON names every script
  ([ops-portal-pipeline §7](wiki/operations/ops-portal-pipeline.md#7-check-scripts-written-in-task-p017-2026-10-09)).
  Checks: P0 gate PASS in one run (262 s); P1 gate FAIL as expected before P1 (p1.1 passes every installed tool and
  fails only on cargo-deny and the unsaved toolchain record); script test PASS; portal check clean; lint:wiki 0 errors;
  mask scan 0 unmasked ([p0.17-scripts-checks.txt](wiki/raw/evidence/phase-p0-planning/p0.17-scripts-checks.txt)).
- p0.17 step "portal-data-shell" done (commit `673cbdc`): `interactive_plan/` is now the **read-only portal**. The wiki browser, search,
  lint view, approvals inbox, approve bar and `POST /api/approvals` are removed (git history keeps them); the wiki check
  (`npm run lint:wiki`, `npm run gate`) stays as a command-line tool. New: zod schemas generated from
  `plan/portal/schema/` (a test keeps them in step; PowerShell Test-Json agrees on every case), the Layout-A shell of the
  Main mockup with self-hosted IBM Plex fonts, one reference popup for every id, the Overview and the phase popup; the
  six other tabs show a placeholder until the next step. Every route refuses non-loopback Hosts and any method other than
  GET and HEAD. Checks: `npm run verify` exit 0 (708 unit, 28 browser tests), P0 gate PASS, portal check clean, mask scan
  0 unmasked ([p0.17-portal-shell-checks.txt](wiki/raw/evidence/phase-p0-planning/p0.17-portal-shell-checks.txt)).
- p0.17 step "portal-views" done (commit `dfe164f`): the six remaining tabs of the read-only portal follow the approved mockups. Roadmap
  (three stages, one compact row per phase, "Same in every phase"), Architecture (layered diagram of the Rust app built
  from plain boxes, four-group switcher, part cards with what each talks to), Decisions (popup per decision, replaced ones
  muted, plus the risks highest first), Research (short sections, popup per item), Questions (open first) and Log (done,
  next, decisions, approvals, commit; filter). The phase popups now live in the layout, so every tab and every phase id
  opens them; a script popup shows the real check script through `GET /api/script`, which serves only scripts the
  portal JSON names (adr-0024 elaboration). Checks: `npm run verify` exit 0 (727 unit, 69 browser tests including axe
  on every tab in both themes), P0 gate, portal check clean, mask scan 0 unmasked
  ([p0.17-portal-views-checks.txt](wiki/raw/evidence/phase-p0-planning/p0.17-portal-views-checks.txt)).
- p0.17 step "portal-verify" done (commit `ef5dcc5`): final review of portal v2. Screenshots of every tab and popup at 1440 and 390 pixels
  were compared with the mockups and five visual defects fixed (duplicate chip, punctuation wrapping, architecture card
  names, glance cards, phone-width task table and gate header). New `scripts/start-portal.ps1` starts the portal in one
  step (README explains it). The `ip-*` pages and comp-interactive-plan now describe v2; `ip-approvals-api` and
  `ip-build-plan` are retired history (not approvable). Checks: `npm run verify` exit 0, P0 gate PASS, portal check
  clean, quick lint and lint:wiki 0 errors, mask scan 0 unmasked
  ([portal-verify.txt](wiki/raw/evidence/phase-p0-planning/portal-v2/portal-verify.txt)).
- p0.17 step "fix" done (commit `10c7829`, review fixes for portal v2): 30 review findings checked, 29 fixed, 1 rejected (withdrawn
  questions already link to their replacement). One "Questions for you" list (the four first-wave questions) drives the
  Overview row, the list and the tab badge; every task has a state; popups show titles and short names, never internal
  slugs; a decision shows one plain standing; parts that are not ours say "Used from"; Architecture follows the mockup
  (diagram plus "How to read this", connections in each part's popup); the Overview's start script opens in the script
  popup. The portal check now also compares copies with their records (MISMATCH) and takes about 2.3 s; every check
  script ends its header with a "For Claude" field and uses plain words before it. Q-008 corrected (the accessibility
  checker was added before the owner answered). Checks: `npm run verify` exit 0, P0 gate PASS, portal check clean, mask scan 0
  unmasked ([review-fixes.txt](wiki/raw/evidence/phase-p0-planning/portal-v2/review-fixes.txt)). Details: the log entries of this step.
- p0.17 step "handoff" done (commit `3991339`): the end-of-turn check (Stop hook) is on and proven: it passes on the clean repo and blocks (exit 2)
  when STATUS changes without its portal text. CLAUDE.md now opens with §0 "Working with the owner" (plain words, thought
  chains, the four-part format for anything he runs, he works in Claude Code only, how to start the portal), and §7/§8 say
  wiki edit ⇒ portal edit and approvals given in chat are recorded by Claude. Handoff
  [handoff-2026-10-09-s01](wiki/operations/handoffs/handoff-2026-10-09-s01.md) rewritten for portal v2. Checks: P0 gate PASS,
  portal check clean, quick lint and lint:wiki 0 errors, mask scan 0 unmasked
  ([handoff-checks.txt](wiki/raw/evidence/phase-p0-planning/portal-v2/handoff-checks.txt)).
- p0.17 step "q008-pause" done (commit `bc72c17`, 2026-10-10): the owner's chat words are ingested
  ([raw/owner/2026-10-10-s01-q008-and-pause.md](wiki/raw/owner/2026-10-10-s01-q008-and-pause.md)). Q-008 answered: keep
  the accessibility checker (after asking why: "Okay, lets add."). Standing directive: "Make sure to pause when completing
  the planning phase and before building the next phase". The pause rule is now in CLAUDE.md §1, SCHEMA §9.7 (exit-gate
  step 7), ops-session-protocol, adr-0014, the P0 exit task and the P1 entry criteria: when a phase's gate passes Claude
  stops, reports and waits for the owner's sign-off **and** an explicit go-ahead before any work of the next phase.
- 2026-10-11: owner answered Q-207, Q-004, Q-005, Q-108, Q-106, Q-110, Q-211; approved Waves 1 and 2 (30 keys);
  P0 gate run 1 failed on one unreadable MANIFEST line (fixed by appending), run 2 passed on `b5f7d40`; P0 signed off
  and set to done; Claude paused before P1 (owner: "don't start phase 1").
- 2026-10-11 P0 finish-up (commits `5de4b44`, `1b4ad02`; owner: "update everything well", P1 in a fresh session): the full wiki check
  showed 12 errors that appear only once P0 is done; fixed (`current_task` null; eight past-due planning claims closed with
  evidence or withdrawn; risk-r22 line endings checked: [r22-eol-check.txt](wiki/raw/evidence/phase-p0-planning/r22-eol-check.txt)).
  The planning page edit staled its approval and sign-off; the owner re-approved both
  ([raw/owner/2026-10-11-s01-p0-finishup-reapproval.md](wiki/raw/owner/2026-10-11-s01-p0-finishup-reapproval.md)).
- p0.8 done (commit `04b27b9`): quick lint + integration lint 0 errors; manual checks and dispositions in
  [wiki-lint-manual.md](wiki/raw/evidence/phase-p0-planning/wiki-lint-manual.md);
  [wiki/raw/MANIFEST.sha256](wiki/raw/MANIFEST.sha256) created.

## In-flight

> Write-ahead record. Filled **before** a task touches files; cleared after it is verified and
> committed. Non-empty on session start = the previous session was interrupted mid-task.
> `STATUS.md`, `wiki/log.md` and `wiki/index.md` are bookkeeping paths and are implicitly touched.

- task: p4.15 (session s06)
- intent: a third isolation mode, `isolation.mode = "per-site-udf"` (cfg-ferrum-udf-per-site): each site's profile gets its own WebView2 user data folder and environment (its own browser process group), created by Ferrum with the same environment options as Tauri's (wry 0.57 defaults copied, so the modes stay comparable); empty and private tabs stay in Tauri's environment. The mode is read at start (a change applies after a restart; an unknown value is refused). Site data clearing, process inventory and crash reload work per environment. Live test: the same two-site storage fixture per mode (cookie, localStorage, IndexedDB), read through the tab title because CDP reaches only the main browser; browser-process count per mode to raw/evidence/phase-p4-security/isolation-modes.md; any mode that fails is recorded with its error. New question: wry's default arguments turn SmartScreen off (found while reading wry; owner's decision).
- paths: crates/core/src/{config.rs,profiles.rs}; crates/webview-manager/src/webview2.rs; apps/desktop/src-tauri/src/{content.rs,main.rs,settings.rs}; apps/desktop/src-tauri/Cargo.toml; crates/webview-manager/Cargo.toml; apps/desktop/src/main.ts; tests/fixtures/server/src/lib.rs; apps/desktop/tests/smoke/{isolation-modes.spec.ts,ferrum.ts}; scripts/verify/p4.15-selectable-isolation-modes.ps1; wiki/architecture/components/{comp-webview-manager,comp-app-shell,comp-core}.md; wiki/architecture/{ov-arch-configuration,ov-arch-isolation-model}.md; wiki/quality/qual-security-testing-plan.md; wiki/overview/ov-open-questions.md; wiki/raw/evidence/phase-p4-security/; plan/portal/{architecture,questions,phases/phase-p4-security,roadmap,refs}.json
- rollback: git checkout -- <paths>; delete the new spec and evidence files

## Blockers

| Blocker | Effect | Who | State (2026-10-08) |
|---|---|---|---|
| Owner answers to Approval Wave 0 (`ip-*` pages + adr-0016 approved in chat; Q-006, Q-007, Q-103, Q-210; Q-102 Node line) | Blocked building `interactive_plan/` (p0.9–p0.16) | Owner (chat) | **Resolved 2026-10-08**: transcribed in [wiki/raw/owner/2026-10-08-s01-wave0.md](wiki/raw/owner/2026-10-08-s01-wave0.md) and ingested |
| Node.js on PATH | Needed to scaffold/run `interactive_plan/` | Claude (workaround) | Node v24.20.0 is installed in `C:\Program Files\nodejs` but is **not on the default PATH** of the Claude Code Bash shell. Workaround: start every Bash call with `export PATH="/c/Program Files/nodejs:$PATH"`. Not blocking |
| Local commits (Q-104) | Recovery relied on STATUS + log only | Owner | **Resolved 2026-10-08**: yes, one local commit per verified task, never push |
| Who runs toolchain installs (Q-218; CONTRADICTION on adr-0005) | Held P1 entry | Owner | **Resolved 2026-10-08**: Claude runs all toolchain installs (adr-0021 supersedes adr-0005) |
| Index ids for upper-case evidence names (Q-219) | Quick lint reported 1 INDEX-MISSING error (IP-0-toolchain); paused the build before IP-1 | Owner | **Resolved 2026-10-08**: index lists evidence folders (adr-0020); quick lint 0 errors |
| `sources` format on the real wiki (found by the IP-2 loader) | Holds p0.11 / IP-2: the real-wiki loader test reports 4 FM-MISSING errors | Owner / integrator | **Resolved 2026-10-09** (wave 0c items 1-3, Q-220): any wiki-relative path or https URL; raw research notes exempt; IP-2 gate passed |
| Rust (rustup/cargo), MSVC Build Tools | Needed by P1 toolchain tasks; do not block P0 | Claude runs winget, owner clicks UAC (adr-0021) | **Installed** (observed 2026-10-09: Rust 1.99.0 stable-msvc, VS Build Tools 2022 17.14); versions are recorded as evidence in p1.1. cargo-deny not installed yet |
| Owner approvals | Every phase entry gate | Owner (in Claude Code), recorded by Claude (adr-0023) | **Waves 1 and 2 approved 2026-10-11** (30 keys) plus the P0 sign-off; all 31 APPROVED in `plan/approvals.json` (planning page and sign-off re-approved after the finish-up edit); Wave 3 is asked before P2 |
| **First push to GitHub** | Old commits still contain the real IP addresses and user-folder path that were masked on 2026-10-09 | Owner ([Q-221](wiki/overview/ov-open-questions.md#q-221-rewrite-git-history-before-the-first-push-to-remove-real-machine-values)) | Open — **blocks the first push**: Claude asks the owner to approve a history rewrite before anything is pushed (adr-0027) |

Exact install and verification commands: [wiki/operations/ops-environment-setup.md](wiki/operations/ops-environment-setup.md).

## Open questions

[ov-open-questions](wiki/overview/ov-open-questions.md): **19 open**, answered include (Q-112, Q-113, Q-212 on 2026-10-13; Q-111, Q-125, Q-209 on 2026-10-12; Q-109, Q-202, Q-214 on 2026-10-11; Q-107, Q-116, Q-122 and Q-222 on 2026-10-11 in session s02; Q-004, Q-005, Q-006, Q-007,
Q-008, Q-101, Q-102, Q-103, Q-104, Q-106, Q-108, Q-110, Q-207, Q-210, Q-211, Q-216, Q-218, Q-219, Q-220), 3 withdrawn (Q-001–Q-003).
Answer them by wave, not all at once, in Claude Code ([ops-approval-workflow §8](wiki/operations/ops-approval-workflow.md#8-approval-waves)):

- **Wave 0 (before the plan app):** done 2026-10-08 ([raw/owner/2026-10-08-s01-wave0.md](wiki/raw/owner/2026-10-08-s01-wave0.md)).
- **Wave 1 (P0 exit):** done 2026-10-11 ([raw/owner/2026-10-11-s01-wave1-answers-and-p0-signoff.md](wiki/raw/owner/2026-10-11-s01-wave1-answers-and-p0-signoff.md)).
- **Wave 2 (P1 entry):** done 2026-10-11 ([raw/owner/2026-10-11-s01-wave2-answers.md](wiki/raw/owner/2026-10-11-s01-wave2-answers.md)).
- **Wave 3 (P2 entry, later):** Q-109, Q-202, Q-214. Q-125 (title bar) any time before P3. Q-221 before the first push.
- Later waves: see the "Summary by gate" table on the register.

## Next action

**1. Where we are**

| Item | State |
|---|---|
| Phase 3 | Done and signed off; end check rerun still owed |
| Phase 4 (security) | 10 of 17 tasks done; p4.15 (isolation modes) in progress |
| Your Ferrum notes | Whenever you are ready |

**2. Why, and what it does.** Nothing to run; Claude continues with P4, task by task, and stops for your review when P4 is done.

**3. The script:** none now.

**4. What to tell Claude:** your Ferrum notes at any time, and "Quiet now" when you can leave the PC for about 35 minutes.

## Pending owner approvals

Approval Waves 1 and 2 are approved (2026-10-11, 30 keys, recorded with `tools/approvals_record.py`; `python tools/approvals_check.py`
shows each APPROVED). Next is Wave 3 (the P2 dependency set), asked when the owner wants to move towards P2. The keys, wave by wave, are in
[ops-approval-workflow §8](wiki/operations/ops-approval-workflow.md#8-approval-waves). Pages outside every phase dependency set (risks,
metrics, workloads, hypotheses, research questions, narrative pages) never gate a phase and can be reviewed later.

## Last updated

2026-10-14, session s06 (P4 continues after the PC shut down overnight; session s05 ended without a handoff, nothing lost). Last handoff: [handoff-2026-10-13-s04](wiki/operations/handoffs/handoff-2026-10-13-s04.md).
