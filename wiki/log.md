---
id: log
type: log
title: "Wiki log (append-only)"
status: active
updated: 2026-10-09
sources: []
related: [schema, index]
approvable: false
---

# Wiki log

Append-only, chronological (SCHEMA §12). New entries go at the end; existing entries are never edited. Last five entries: `grep "^## \[" wiki/log.md | tail -5` (Git Bash). The s01 entries below were written by the integrator at the end of the multi-agent run, because log.md did not exist while the areas were drafted.

## [2026-10-08] ingest | Raw sources: master prompt and owner scoping decisions

- session: s01
- sources: [raw/00-master-prompt.md, raw/01-scoping-decisions.md]
- result: master prompt stored verbatim; owner answers Q1-Q14, owner directives 1-9 and the observed environment recorded (raw/01 records the owner's words verbatim-in-substance). Both files are immutable.

## [2026-10-08] ingest | Research note research-llm-wiki-pattern

- session: s01
- pages: [research-llm-wiki-pattern]
- sources: [raw/research/llm-wiki-pattern.md]
- result: Karpathy's LLM Wiki gist summarised with VERIFIED/UNCERTAIN/PROPOSAL labels; basis of adr-0002 and SCHEMA

## [2026-10-08] ingest | Research note research-tauri-webview2-capabilities

- session: s01
- pages: [research-tauri-webview2-capabilities]
- sources: [raw/research/tauri-webview2-capabilities.md]
- result: Tauri 2 / wry / WebView2 capability check; source of risk-r01 to r03, r06 to r10 and adr-0010 CONTRADICTION

## [2026-10-08] ingest | Research note research-measurement-methodology

- session: s01
- pages: [research-measurement-methodology]
- sources: [raw/research/measurement-methodology.md]
- result: Windows measurement methodology for Chromium browsers vs WebView2 apps; source of metrics, fairness protocol and adr-0009 CONTRADICTION

## [2026-10-08] ingest | Research note research-nextjs-stack

- session: s01
- pages: [research-nextjs-stack]
- sources: [raw/research/nextjs-stack.md]
- result: Next.js stack versions and setup for the plan app (registry snapshot 2026-10-08)

## [2026-10-08] ingest | Research note research-related-work-seed

- session: s01
- pages: [research-related-work-seed]
- sources: [raw/research/related-work-seed.md]
- result: Seed list of related work with Crossref/full-text verification status; no novelty claimed

## [2026-10-08] schema | SCHEMA.md and CLAUDE.md drafted

- session: s01
- pages: [schema]
- sources: [raw/research/llm-wiki-pattern.md, raw/00-master-prompt.md, raw/01-scoping-decisions.md]
- result: wiki/SCHEMA.md written with status review (not approved); root CLAUDE.md written as the session bootstrap

## [2026-10-08] plan | Operations and overview area drafted (multi-agent)

- session: s01
- pages: [ops-approval-workflow, ops-environment-setup, ops-git-conventions, ops-handoff-template, ops-multi-agent-workflow, ops-resume-after-interruption, ops-session-protocol, ops-wiki-maintenance, glossary, ov-open-questions, ov-project, status-live]
- result: 12 pages written by the area agent in its owned paths. Also wrote root CLAUDE.md, STATUS.md, README.md and AI_USAGE.md.

## [2026-10-08] plan | Architecture area drafted (multi-agent)

- session: s01
- pages: [comp-app-shell, comp-baseline-app, comp-benchmark-harness, comp-competitor-browsers, comp-core, comp-interactive-plan, comp-network-logger, comp-research-analysis, comp-resource-manager, comp-security-engine, comp-tab-content, comp-telemetry, comp-webview-manager, comp-webview2-runtime, comp-windows-os, ov-arch-configuration, ov-arch-crate-graph, ov-arch-data-flows, ov-arch-isolation-model, ov-arch-lifecycle-state-machine, ov-arch-repo-layout, ov-arch-system-overview, ov-arch-trust-boundaries, ov-arch-webview2-integration]
- result: 24 pages written by the area agent in its owned paths. Added component ids comp-tab-content, comp-windows-os and comp-competitor-browsers as modelling nodes.

## [2026-10-08] plan | Phases area drafted (multi-agent)

- session: s01
- pages: [phase-p0-planning, phase-p1-foundation, phase-p2-minimal-container, phase-p3-tabs-sessions, phase-p4-security, phase-p5-telemetry, phase-p6-benchmark-harness, phase-p7-lifecycle, phase-p8-research-paper]
- result: 9 pages written by the area agent in its owned paths. Phase pages P0 to P8 with tasks pN.M, test gates and exit criteria.

## [2026-10-08] plan | Decisions area drafted (multi-agent)

- session: s01
- pages: [adr-0001, adr-0002, adr-0003, adr-0004, adr-0005, adr-0006, adr-0007, adr-0008, adr-0009, adr-0010, adr-0011, adr-0012, adr-0013, adr-0014, adr-0015, adr-0016, adr-0017, adr-0018, adr-0019]
- result: 19 pages written by the area agent in its owned paths. adr-0001 to adr-0016 recorded as owner decisions from raw/01; adr-0017 to adr-0019 proposed by Claude.

## [2026-10-08] plan | Risks area drafted (multi-agent)

- session: s01
- pages: [ov-risk-register, risk-r01, risk-r02, risk-r03, risk-r04, risk-r05, risk-r06, risk-r07, risk-r08, risk-r09, risk-r10, risk-r11, risk-r12, risk-r13, risk-r14, risk-r15, risk-r16, risk-r17, risk-r18, risk-r19, risk-r20, risk-r21, risk-r22, risk-r23, risk-r24, risk-r25]
- result: 26 pages written by the area agent in its owned paths. risk-r01 to risk-r06 from raw/01 plus newly identified risk-r07 to risk-r25.

## [2026-10-08] plan | Research area drafted (multi-agent)

- session: s01
- pages: [exp-baseline-footprint, exp-energy, exp-isolation-overhead, exp-lifecycle-policies, exp-navigation, exp-reliability, exp-rendering, exp-security-overhead, exp-startup, hyp-01, hyp-02, hyp-03, hyp-04, hyp-05, hyp-06, hyp-07, hyp-08, hyp-09, hyp-10, hyp-11, hyp-12, hyp-13, hyp-14, hyp-15, metric-canvas-throughput, metric-cpu-package-energy, metric-crash-count, metric-frame-interval, metric-frame-miss-rate, metric-lifecycle-transitions, metric-loaf-blocking, metric-memory-growth-slope, metric-nav-failure-rate, metric-nav-latency, metric-objective-j, metric-peak-tree-private-commit, metric-policy-eval-latency, metric-process-count, metric-recovery-time, metric-restore-latency, metric-restore-success-rate, metric-safety-violations, metric-startup-fcp, metric-startup-lcp, metric-startup-window-visible, metric-tree-cpu-cycles, metric-tree-cpu-time, metric-tree-private-commit, metric-tree-private-working-set, metric-tree-working-set, metric-wall-energy, ov-research-configurations, ov-research-experiment-log, ov-research-fairness-protocol, ov-research-objective-function, ov-research-paper-plan, ov-research-plan, ov-research-related-work-seed, ov-research-statistical-analysis-plan, ov-research-threats-to-validity, ov-research-traceability, ov-research-workload-catalog, rq-01, rq-02, rq-03, rq-04, rq-05, rq-06, rq-07, wl-canvas-webgl, wl-continuous-scroll, wl-frequent-nav, wl-large-dom, wl-many-background, wl-multi-active, wl-public-supplementary, wl-security-nav-mix, wl-session-churn, wl-spa-js-heavy, wl-static-info, wl-video-playback]
- result: 81 pages written by the area agent in its owned paths. Research questions, hypotheses, experiments, metrics, workloads and narrative pages. No measurements exist.

## [2026-10-08] plan | Quality area drafted (multi-agent)

- session: s01
- pages: [qual-ci-plan, qual-definition-of-done, qual-phase-gate-checklist, qual-security-testing-plan, qual-testing-strategy]
- result: 5 pages written by the area agent in its owned paths.

## [2026-10-08] plan | Interactive-plan area drafted (multi-agent)

- session: s01
- pages: [ip-approvals-api, ip-build-plan, ip-data-contract, ip-routes-and-views, ip-spec, ip-testing, ip-wiki-lint]
- result: 7 pages written by the area agent in its owned paths. Specification of the plan app only; interactive_plan/ itself is not built.

## [2026-10-08] plan | Multi-agent review of all areas

- session: s01
- result: review agents read every area and raised 52 issues in total (count reported by the orchestrating workflow; the per-lens breakdown was not passed to the integrator). Area agents then applied fixes in their owned paths; individual dispositions are not recorded here.

## [2026-10-08] plan | Completeness critic pass

- session: s01
- result: a completeness critic raised 23 gaps (high, medium and low) covering SCHEMA, index/log, the open-questions register, approval waves, plan-app pages, ADR authority, phase pages P1/P2/P4/P7, lint tooling, raw manifest, resume rules, STATUS and repo layout. Dispositions are in the next two entries and in STATUS.md.

## [2026-10-08] schema | SCHEMA amendment batch (integration)

- session: s01
- pages: [schema]
- result: applied in SCHEMA.md and mirrored in CLAUDE.md: handoff file name handoff-YYYY-MM-DD-sNN.md (Q-004); overview allowed in research/ and risks/ (Q-207 default); type status for STATUS.md; research-note basename exemption; connects [] rule; registry (comp-tab-content, comp-windows-os, comp-competitor-browsers; adr-0019, next adr-0020; risks to r25, next r26); §9.6 RESUME equal to CLAUDE.md §1; §9.7 P0 bootstrap exception, CONTRADICTION and ungated-Q rules; §9.1.1 contradicting an accepted ADR; §3.1 open/sealed bench runs and MANIFEST.sha256 from p0.8; §9.3 LOG-FORMAT, Q-FORMAT, Q-BLOCK-UNGATED, PHASE-DONE-NO-EXIT, TS lint normative; §9.5 bookkeeping commit; §10.2 bootstrap_hash for CLAUDE.md; §10.4(b) covers only quoted owner choice; §11 raw ids.
- stales: [schema] (no approvals exist yet, so nothing is actually stale)

## [2026-10-08] ingest | Evidence: WebView2 runtime registry version

- session: s01
- pages: [phase-p1-foundation, ops-environment-setup]
- sources: [raw/evidence/phase-p0-planning/env-webview2-pv.txt]
- result: reg query of the EdgeUpdate client key returned pv 154.0.4258.62, matching raw/01; the `UNVERIFIED` tag on the key path in phase-p1-foundation was removed and p1.2 re-reads the value.

## [2026-10-08] plan | Integration: completeness gaps addressed

- session: s01
- pages: [ov-open-questions, ops-approval-workflow, qual-phase-gate-checklist, phase-p0-planning, phase-p1-foundation, phase-p2-minimal-container, phase-p3-tabs-sessions, phase-p4-security, phase-p5-telemetry, phase-p6-benchmark-harness, phase-p7-lifecycle, phase-p8-research-paper, adr-0001, adr-0002, adr-0003, adr-0004, adr-0005, adr-0006, adr-0007, adr-0008, adr-0009, adr-0010, adr-0011, adr-0012, adr-0013, adr-0014, adr-0015, adr-0016, adr-0018, ip-build-plan, ip-spec, ip-approvals-api, ip-data-contract, ip-routes-and-views, ip-testing, ops-wiki-maintenance, ops-resume-after-interruption, ops-session-protocol, ops-handoff-template, ops-environment-setup, ov-arch-repo-layout, comp-interactive-plan, ov-project, ov-research-plan, exp-baseline-footprint, exp-energy, exp-navigation, exp-reliability, exp-rendering, exp-security-overhead, exp-isolation-overhead, risk-r01, risk-r02, risk-r03, risk-r04, risk-r05, risk-r06, ov-risk-register, qual-definition-of-done]
- result: register reconciled (Q-101 answered by directives 2 and 4; Q-109 moved to P2; Q-107/Q-123 drop risk ids; Q-202 also gates P2; Q-208 to Q-217 added from writers' questions); approval waves added (ops-approval-workflow §8); case-(b) ADRs split into quoted owner decision and Claude elaboration; plan-app snapshot diff, bootstrap hash, fail-closed Q parsing, Node 24-only gate and lint stop conditions specified; P1 gains cargo-deny install, --locked, Windows PowerShell, p1.17 Tauri CLI pins, Job Object attribution check, adr-0019 and comp-windows-os; P2 gains adr-0019, Q-202 criterion, ADRs-from-p1.9 rule, Rust fixture server; P4 allowlist cases; P7 task p7.14 (campaign C2b); risk spikes assigned (r01 p1.6, r02 p1.5, r03 p1.7, r04 p6.9, r05 p5.2, r06 p1.8) and risk-r07+ added to owner phases; repo layout adds spikes/, tools/, plan/snapshots/; MANIFEST.sha256 moved to p0.8.
- stales: [] (no approvals exist yet)

## [2026-10-08] plan | Integration: index.md created

- session: s01
- pages: [index]
- result: catalogue of every non-raw page plus raw sources, grouped per SCHEMA §11.

## [2026-10-08] lint | Integration lint over the whole wiki

- session: s01
- pages: [index, log, status-live]
- result: 0 errors, 0 warnings. Throwaway PyYAML-based lint (session scratchpad) over 191 files with frontmatter (184 wiki pages, 5 raw research notes, index, STATUS.md) plus 3 raw files without frontmatter. Checked FILE-ENCODING, frontmatter parse, FM-MISSING, FM-ENUM, FM-TYPE-DIR, ID-PATTERN, ID-DUP, REF-DANGLING (frontmatter ids, connects.to, risk spike task ids, phase ids inside `UNVERIFIED[...]` tags, relative body links), REF-RECIPROCAL, TRUST-EDGE, ADR-CHAIN (structural), ADR-SECTIONS, PHASE-ORDER (unique order and task ids, depends_on DAG acyclic), UNV-NOPHASE, INDEX-MISSING and §11 line format, LOG-FORMAT, Q-FORMAT, Q-BLOCK-UNGATED, ORPHAN. The quick lint embedded in ops-wiki-maintenance §5 also reports 0 errors. Not checked here (left for p0.8): UNV-PASTDUE, INT-NUMBER-NOSRC, CONTRADICTION reading pass, SCHEMA-SPLIT semantic pass, RAW-IMMUTABLE (no git history and no manifest yet), STALE-UPDATED (no commits), APPROVAL-STALE (no approvals file).
- next: p0.8 manual lint evidence and MANIFEST.sha256; then ask the owner Approval Wave 0 and Q-104 (see STATUS.md)

## [2026-10-08] ingest | Owner answers, Approval Wave 0 (s01)

- session: s01
- pages: [ov-open-questions, adr-0005, adr-0011, ops-git-conventions, ops-session-protocol, ops-environment-setup, ops-approval-workflow, index, status-live]
- sources: [raw/owner/2026-10-08-s01-wave0.md]
- result: Q-006 (yes, app appends approval log entries), Q-007 (no reset-to-pending), Q-102 (stay on Node 24 LTS), Q-103 (mermaid 12.x exact pin, fallback 11.17.2), Q-104 (local commits yes, one per verified task, never push) and Q-210 (yes to @vitest/coverage-v8 exact pin and playwright chromium download) set to answered with quotes and the source path. Chat approval of the seven ip-* pages and adr-0016 recorded as Approval Wave 0 (ops-approval-workflow §8); those pages were not edited, so the content the owner approved is unchanged. adr-0011, ops-git-conventions and ops-session-protocol now state that local commits are authorised. ops-environment-setup records Node v24.20.0 installed by Claude on the owner's authorisation and not on the default PATH of the Claude Code Bash shell (workaround: prepend /c/Program Files/nodejs). The standing directive "Feel free to run install." contradicts accepted adr-0005 (owner runs winget): CONTRADICTION blockquote added below its Decision section and new Q-218 (blocking phase-p1-foundation) registered per SCHEMA §9.1.1; the ADR's decision text is unchanged. Raw file added to index.md (it had been committed without an index line). Q-216 stays open, so the quick lint runs from the scratchpad.
- stales: [adr-0005, adr-0011, ops-git-conventions, ops-session-protocol, ops-environment-setup, ops-approval-workflow] (no approvals.json exists yet, so nothing is actually stale)

## [2026-10-08] lint | p0.8 manual lint over the whole wiki + raw manifest

- session: s01
- pages: [ov-arch-data-flows, ops-git-conventions, glossary, ov-open-questions, ops-environment-setup, index, status-live]
- sources: [raw/evidence/phase-p0-planning/wiki-lint-manual.md]
- result: 0 errors, 33 warnings. Quick lint (ops-wiki-maintenance §5, scratchpad copy; Q-216 open) 191 files, 0 errors; integration lint (PyYAML) 0 errors, 0 warnings; manual checks UNV-PASTDUE 0, STALE-UPDATED 0, RAW-IMMUTABLE 0 (9 raw files, one commit each), HYP-NO-DATA 0, PHASE-DONE-NO-EXIT 0, ADR-CHAIN 0, FM-UNKNOWN-KEY 0, SCHEMA-SPLIT 0, APPROVAL-STALE n/a (no approvals.json). Warnings and dispositions: INT-NUMBER-NOSRC 23 (all planned thresholds or parameters, accepted); CONTRADICTION 3 (adr-0005/Q-218 new, adr-0009, adr-0010; all registered, accepted); UNV-MIRROR 7 remaining (phase pages keep claims in frontmatter, ov-arch-configuration tag in a fenced example; accepted) after fixing 4 pages. Reading-pass findings left for the Wave 1 revision: ip-build-plan IP-0 step 3 and phase-p0-planning p0.9 say the owner installed Node (Claude did, on authorisation; Q-218), ip-wiki-lint §3 says P1 owns the manifest format (SCHEMA §3.1 wins). Index lines added for raw/owner/2026-10-08-s01-wave0.md and the evidence file. MANIFEST.sha256 created: sha256 at lint time (9 lines) 238187b62c3e9d53d2df7ac188ad31b6c63c99367806a0220556bb46ee890129; after appending the evidence line (10 lines) 326c7577aaccd8a015bb979da0c36c39e68a3ecfa294a92cf1298860aa7b4874.
- stales: [ov-arch-data-flows, ops-git-conventions, ops-environment-setup] (no approvals.json exists, so nothing is actually stale)
- next: p0.9 / IP-0: record node -v, npm -v, git --version as raw/evidence/phase-p0-planning/interactive-plan/IP-0-toolchain.txt
- commit: 04b27b9

## [2026-10-08] code | p0.9 (IP-0 preconditions): toolchain recorded, Node gate passed

- session: s01
- pages: [ov-open-questions, status-live]
- sources: [raw/evidence/phase-p0-planning/interactive-plan/IP-0-toolchain.txt, raw/owner/2026-10-08-s01-wave0.md]
- result: IP-0 preconditions 0-2 hold (p0.8 lint clean, Wave 0 transcribed, Q-006/Q-007/Q-103/Q-210 answered). With PATH prefixed by /c/Program Files/nodejs: node -v v24.20.0, npm -v 11.19.0, git --version 2.52.0.windows.1; gate (major 24 and >= 24.15) PASS, exit 0. Evidence appended to MANIFEST.sha256 (11 lines, verify 0 problems). Adding the evidence file makes the quick lint report 1 INDEX-MISSING error, because SCHEMA §11 index ids must be lower case and the mandated name is IP-0-toolchain; registered as Q-219 (lint semantics, owner decides) and not worked around. Build paused before IP-1 per the ip-build-plan stop condition on SCHEMA ambiguities that change lint semantics.
- next: owner answers Q-219, then p0.10 / IP-1 (scaffold + spikes)
- commit: 1cfc2d5

## [2026-10-08] ingest | Owner answers Q-216, Q-218, Q-219 (wave 0b, s01)

- session: s01
- pages: [ov-open-questions, adr-0005, ops-environment-setup, phase-p1-foundation, phase-p0-planning, phase-p8-research-paper, adr-0006, adr-0009, adr-0011, adr-0017, qual-ci-plan, risk-r20, ops-approval-workflow, ops-wiki-maintenance, ip-wiki-lint, index]
- sources: [raw/owner/2026-10-08-s01-wave0b.md]
- result: Q-216 (commit the lint and approval-check scripts under tools/), Q-218 (Claude runs all toolchain installs incl. MSVC Build Tools; owner clicks UAC; kernel drivers need separate approval; adr-0005 superseded) and Q-219 (index lists evidence folders, not files) set to answered with quotes and the source path. Raw file appended to MANIFEST.sha256 and listed in index.md. The adr-0005 CONTRADICTION blockquote is resolved (rewritten as "Resolved contradiction", decision text unchanged). Pages that said the owner runs installs now cite adr-0021. adr-0016 and ip-build-plan (chat-approved, Wave 0) still list adr-0005 in related and quote the owner's Q13 wording; they were deliberately not edited, to keep the Wave 0 approval intact (a superseded ADR is still a valid reference).
- stales: [adr-0005, ops-environment-setup, phase-p1-foundation, phase-p0-planning, phase-p8-research-paper, adr-0006, adr-0009, adr-0011, adr-0017, qual-ci-plan, risk-r20, ops-approval-workflow, ops-wiki-maintenance, ip-wiki-lint] (no approvals.json exists, so nothing is actually stale; this stales approval of ip-wiki-lint, chat-approved in Wave 0, edited under SCHEMA §10.4 rule 2)
- commit: a68667b

## [2026-10-08] decide | adr-0020 (index lists evidence folders) and adr-0021 (Claude runs toolchain installs, supersedes adr-0005)

- session: s01
- pages: [adr-0020, adr-0021, adr-0005, phase-p1-foundation, ops-approval-workflow, index]
- sources: [raw/owner/2026-10-08-s01-wave0b.md]
- result: adr-0020 and adr-0021 created with decided_by owner and status accepted under SCHEMA §10.4 rule 3(b) (verbatim owner decision quoted; Claude elaboration binding only once APPROVED in the plan app). adr-0021 supersedes adr-0005, which is set to superseded with superseded_by adr-0021. phase-p1-foundation decisions now list adr-0021 instead of adr-0005 (Wave 2 table in ops-approval-workflow §8 updated likewise); Q-218 no longer holds P1 entry. Next free ADR id adr-0022.
- stales: [adr-0005, phase-p1-foundation, ops-approval-workflow] (no approvals.json exists, so nothing is actually stale)
- commit: a68667b

## [2026-10-08] schema | SCHEMA §11 raw evidence/bench folders (adr-0020), §8 registry, §9.3 tools/ fallback; CLAUDE.md

- session: s01
- pages: [schema, ip-wiki-lint, ops-wiki-maintenance]
- sources: [raw/owner/2026-10-08-s01-wave0b.md]
- result: SCHEMA §11: files under raw/evidence/ and raw/bench/ are no longer listed individually; each first-level folder (raw/evidence/<phase-id>/, raw/bench/<run-id>/) gets one index line, label = folder path relative to wiki/raw/, lower-cased, non-[a-z0-9.-] characters replaced by -, no trailing -; link = folder path with trailing slash; a file directly in raw/evidence/ or raw/bench/ is INDEX-MISSING; raw top-level, raw/owner/, raw/research/ and raw/assets/ files are still listed per file. The §11 line regex is unchanged. §9.3 INDEX-MISSING row and the fallback lint location (tools/quick_lint.py) updated; §8 registry adr-0001…adr-0021, next free adr-0022. CLAUDE.md §1 step 3 and §5 point to tools/approvals_check.py and tools/quick_lint.py; §9 and §11 state that toolchain installs are pre-authorised (adr-0021) while kernel drivers still need the owner. ip-wiki-lint INDEX-MISSING and the ops-wiki-maintenance §5 quick lint implement the same rule. Index: per-file lines for env-webview2-pv and wiki-lint-manual replaced by the folder line evidence-phase-p0-planning.
- stales: [schema, ip-wiki-lint, ops-wiki-maintenance] (schema also via the CLAUDE.md bootstrap_hash; this stales approval of ip-wiki-lint; no approvals.json exists, so nothing is actually stale)
- commit: a68667b

## [2026-10-08] lint | tools/ committed (Q-216); quick lint over the whole wiki after the wave-0b ingest

- session: s01
- pages: [ops-wiki-maintenance, ops-approval-workflow, index]
- sources: [raw/evidence/phase-p0-planning/tools-wave0b-check.txt]
- result: 0 errors, 0 warnings. tools/quick_lint.py (byte-identical to the ops-wiki-maintenance §5 block) reports 193 files checked, 0 errors; the IP-0-toolchain INDEX-MISSING error of the p0.9 entry is gone. tools/approvals_check.py (byte-identical to the ops-approval-workflow §4 block) adds the SCHEMA §10.2 bootstrap_hash check, fail-closed Q-FORMAT and the §9.7 step 4 CONTRADICTION-registration rule; on the real wiki it reports no Q-FORMAT errors, BOOTSTRAP for phase-p0-planning and BLOCKED for phase-p1-foundation (nothing approved; Q-106, Q-110, Q-207, Q-211 open; adr-0010 CONTRADICTION registered via Q-107). python -m unittest discover -s tools -p "test_*.py": 27 tests OK (fixtures in temp dirs; the hash vectors of ip-data-contract §7 all match; the real plan/approvals.json stayed absent). The test output contains ResourceWarning lines from the SCHEMA §10.2 reference's unclosed open() (harmless; the reference is kept verbatim). MANIFEST.sha256 now 13 lines, verify 0 problems, sha256 30491b184cc8bdea744ff96ce359209b4e02293c53f0a3bf7ed0d7c06a1124de.
- next: p0.10 / IP-1 of ip-build-plan (scaffold + spikes)
- commit: a68667b

## [2026-10-08] code | p0.10 (IP-1 scaffold + spikes): interactive_plan/ scaffolded, stack pinned, S1-S3 pass

- session: s01
- pages: [ip-build-plan, ip-spec, ip-testing, status-live]
- sources: [raw/evidence/phase-p0-planning/interactive-plan/IP-1-scaffold.txt, raw/evidence/phase-p0-planning/interactive-plan/IP-1-spikes.txt]
- result: create-next-app@16.4.0 with the full ip-spec §7 flag set ran non-interactively (CI=1) in the repo path with a space, exit 0, no flag rejected. Every ip-spec §7 package pinned exactly (all resolvable on the registry); npm install had no peer-dependency errors, no --force/--legacy-peer-deps. Exact patches recorded at install: eslint 9.39.5 (npm marks it deprecated; it is the maintenance tag), @types/node 24.19.1 (generator emitted ^20), @types/react and @types/react-dom 19.3.0, vite 8.3.4 through the vitest/plugin-react peers. Q-210: @vitest/coverage-v8 5.0.3 and npx playwright install chromium (Chrome for Testing 156.0.8078.4). Added .nvmrc 24.20.0, engines ">=24.15 <27", next.config.ts turbopack.root = app dir, the ip-testing §0 scripts plus dev:local/start:local (127.0.0.1:3417); test, lint:wiki and test:e2e have no config yet (IP-2, IP-5, IP-6). Deviation: typecheck is "next typegen && tsc --noEmit", because "tsc --noEmit" alone failed on a clean .next (TS2304 LayoutProps, a type Next generates). Spikes under next start and next dev: S1 PASS (route handler read ../wiki/SCHEMA.md and wrote, read back and deleted ../plan/.spike-* per request; plan/ absent before and after, approvals.json never existed); S2 PASS (mermaid 12.1.0, strict/dagre/classic, 3 nodes rendered in headless Chromium, 0 errors, 0 external requests; no 11.17.2 fallback); S3 PASS (only listener 127.0.0.1:3417; 127.0.0.1 and localhost 200; LAN 192.168.1.237 and vEthernet 172.27.64.1 refused). Spike code deleted. Gate npm run typecheck && npm run lint && npm run build exit 0. Repo .gitignore already had every step 6 entry, not edited. npm audit: 7 (2 low via katex in mermaid, 5 high in dev tooling), not fixed (only fix is audit fix --force). The settled `UNVERIFIED` tags in ip-spec, ip-build-plan and ip-testing are converted to evidence citations in IP-10 (pages are Wave 0 chat-approved, not edited now). MANIFEST.sha256 15 lines, verify 0 problems, sha256 21a490c89e47d48dac3ca4c8ef35ec0475f96f7327d58dc2537928420786766f. Quick lint 193 files, 0 errors; tool tests 27 OK.
- next: p0.11 / IP-2 of ip-build-plan (lib/config.ts, lib/wiki loader + zod schemas, fixtures, vitest.config.mts)
- commit: 2c997fa

## [2026-10-08] correct | p0.10 code entry: tag keyword put in backticks (lint UNV-NOPHASE)

- session: s01
- result: The "[2026-10-08] code | p0.10 (IP-1 scaffold + spikes)" entry, committed in 28f6e4a, contained the §7.1 tag keyword without backticks (in the sentence on settled tags in ip-spec, ip-build-plan and ip-testing), which tools/quick_lint.py reports as 1 UNV-NOPHASE error. The keyword in that entry was put in backticks, as in the 2026-10-08 webview2 evidence entry; no other character of the entry changed. This edits an existing entry, against SCHEMA §12 (append-only). It was done so the wiki stays at 0 lint errors (IP-9/IP-10 require it), and it is reported to the owner. tools/quick_lint.py exits 0 even when it reports errors, so its printed counts have to be read; that is how the error slipped into 28f6e4a.
- commit: 28f6e4a

## [2026-10-08] code | p0.11 (IP-2 wiki loader + zod schemas + fixtures): implemented, gate STOPPED on real-wiki `sources` errors

- session: s01
- pages: [ip-build-plan, ip-data-contract, ip-testing, status-live]
- sources: [raw/evidence/phase-p0-planning/interactive-plan/IP-2-tests.20261008-2358.txt]
- result: Wrote interactive_plan/lib/config.ts, lib/wiki/{findings,frontmatter,schemas,load,links,log,openQuestions,status}.ts, vitest.config.mts, tests/unit (9 files, 467 tests) and fixtures tests/fixtures/mini-wiki (one clean page of every type, ids adr-09xx/risk-r9x/rq-9x; quick_lint on a copy: 0 errors), tests/fixtures/broken-wiki (each file named after the codes it triggers) and tests/fixtures/status/STATUS.md. Added github-slugger 2.0.0 as an exact direct dependency (already in the lockfile through rehype-slug) for heading anchors; the slug algorithm agrees with all 81 heading anchors written in the real wiki. npm run typecheck exit 0, npm run lint exit 0, npm run test 466 passed / 1 failed. Schema-sync against the real SCHEMA.md passes (§5.1 types, §6 status enums incl. §6.16, §6.2 kinds, §8 regexes, §12 log regex/ops/keys, §7.1 tag regex, §9.3 severities). The failure is the p0.11 verify item "real wiki/ reports zero FM-* errors": 4 FM-MISSING on `sources` entries, all outside wiki/interactive-plan/: risk-r15, risk-r22 and risk-r24 list `SCHEMA.md`; the immutable raw note raw/research/tauri-webview2-capabilities.md has a free-text entry. ip-data-contract §4 (Source = `raw/` or `https://`) is stricter than the SCHEMA §5.1 wording ("paths relative to wiki/ (raw/...)"), and SCHEMA §5 scopes the common rules to pages outside raw/. That is a lint-semantics ambiguity, so the step stopped (ip-build-plan stop conditions) and is not committed; question for the owner/integrator in the STATUS Blockers table. Failed run saved under the dated name; MANIFEST.sha256 now 16 lines, sha256 2097fd3daf3408c62027ec31c850f7281c874ac9d897a691251378f643875541. Quick lint 193 files, 0 errors; tool tests OK. plan/approvals.json still absent; the real-wiki test asserts it, SCHEMA.md and STATUS.md are unchanged by loading.
- next: owner/integrator answers the `sources` question; then finish p0.11 (re-run the gate, save IP-2-tests.txt, commit [p0.11])

## [2026-10-09] ingest | Owner answers on IP-1/IP-2 technical questions + delegation policy (wave 0c, s01)

- session: s01
- pages: [schema, ip-data-contract, ip-wiki-lint, ip-testing, ip-spec, ip-build-plan, ip-approvals-api, ip-routes-and-views, adr-0016, ops-wiki-maintenance, phase-p0-planning, ov-open-questions, index, status-live]
- sources: [raw/owner/2026-10-09-s01-wave0c.md]
- result: Raw file appended to MANIFEST.sha256 and listed in index.md. The ten accepted resolutions applied: (1) `sources` entries are an https:// URL or any wiki-relative path, existence checked by REF-DANGLING (SCHEMA §5.1 and §9.3 row, ip-data-contract §4, ip-wiki-lint §2, loader); (2) raw research notes exempt from the format rule, `sources` only a list of strings (SCHEMA §6.13, loader); (3) the real-wiki loader test moved from tests/unit (npm test) to tests/lint (npm run lint:wiki, so still in verify) with a new vitest.lint.config.mts (ip-testing §0 and §2, ip-wiki-lint §1, ip-spec §8, ip-build-plan IP-2/IP-5); (4) github-slugger 2.0.0 stays an exact direct dependency (ip-spec §7); (5) nothing further; (6) tools/quick_lint.py exits 1 when it reports errors, ops-wiki-maintenance §5 block changed identically, tools/test_quick_lint.py checks the exit status of every run plus a new test (28 tool tests OK); (7) ip-testing §0 typecheck = `next typegen && tsc --noEmit`, also on phase-p0-planning's automated gate list; (8) npm audit acceptance recorded in ip-spec §7 with a recheck at the P0 exit; (9) nothing; (10) adr-0016, ip-build-plan and ip-spec no longer state that the owner installs Node (adr-0016 keeps the verbatim Q13 quote with a note; related adr-0005 replaced by adr-0021). The sources question had only been raised in the STATUS Blockers table; it is now registered as Q-220, answered (register: 11 answered). Integrity tags settled by evidence and turned into citations: ip-spec (fs under Turbopack, S1), ip-approvals-api (loopback bind, S3; fs writes to ../plan, S1), ip-routes-and-views (mermaid dynamic import, S2), ip-build-plan (create-next-app flags and peer resolution, IP-1-scaffold.txt; winget gave Node 24.20.0, raw/owner/2026-10-08-s01-wave0.md + IP-0-toolchain.txt), adr-0016 (scaffold, peer resolution, fs, mermaid; the atomic-rename claim kept and narrowed, checked in IP-4), ip-data-contract (yaml dates stay strings, IP-2-tests.txt); ip-testing's toolchain claim narrowed to the jsdom part (IP-6). Kept with reason: perf targets (IP-9), rename retry (IP-4), latin1 round-trip (IP-3), xyflow keyboard and no-raw-HTML (IP-6/IP-8), Playwright temp dirs (IP-6), vitest-as-lint-runner (IP-5). The pages risk-r15, risk-r22, risk-r24 and the raw note were not changed.
- stales: [schema, ip-data-contract, ip-wiki-lint, ip-testing, ip-spec, ip-build-plan, ip-approvals-api, ip-routes-and-views, adr-0016, ops-wiki-maintenance, phase-p0-planning] (no approvals.json exists, so nothing is actually stale; this stales the Wave 0 chat approval of the seven ip-* pages and adr-0016, which the owner re-approves in the app after IP-10 anyway, wave 0c item 10)
- commit: ac54768

## [2026-10-09] schema | SCHEMA §5.1/§6.13/§9.3: `sources` format and existence (wave 0c items 1-2); delegated details decided

- session: s01
- pages: [schema, ip-data-contract, ip-wiki-lint, ov-open-questions]
- sources: [raw/owner/2026-10-09-s01-wave0c.md]
- result: §5.1 `sources`: each entry is an absolute https:// URL or a path relative to wiki/ (any wiki file, e.g. SCHEMA.md). Details decided by Claude under the delegation policy, reviewable in the app: a path has no leading `/`, no `..`, `.` or empty segment, no backslash, no whitespace and no `:` (so http:// and drive letters are rejected), an optional `#anchor` is allowed; a malformed entry is FM-MISSING (zod), a well-formed path to a missing file is REF-DANGLING (§9.3 row extended); raw research notes (§6.13) need only a list of strings. CLAUDE.md does not restate §5.1, so it is unchanged. The plan app parser changed in the same change set (§15): lib/wiki/schemas.ts isWikiRelativePath/isSourceEntry/sourcePath, the research-note schema, unit tests for 13 rejected forms, and a real-wiki check that all 574 path entries exist. quick_lint.py's exit status follows the summary error count even when a filter argument hides the error lines (decided; documented in ops-wiki-maintenance §5). No hash, approval-state or other lint semantics changed.
- stales: [schema] (no approvals.json exists, so nothing is actually stale)
- commit: ac54768

## [2026-10-09] code | p0.11 (IP-2 wiki loader + zod schemas + fixtures): gate PASS after the wave 0c answers

- session: s01
- pages: [ip-build-plan, ip-data-contract, ip-testing, status-live]
- sources: [raw/evidence/phase-p0-planning/interactive-plan/IP-2-tests.txt, raw/owner/2026-10-09-s01-wave0c.md]
- result: Continued the 2026-10-08 IP-2 work (entry "p0.11 ... gate STOPPED on real-wiki `sources` errors"). Changes since: the Source rule of SCHEMA §5.1 as amended, research notes exempt, the real-wiki loader test moved to tests/lint/real-wiki-loader.test.ts under vitest.lint.config.mts with a new sources-existence check. Gate (IP-2-tests.txt, node v24.20.0): npm run test 8 files, 477 passed, exit 0; npm run lint:wiki 1 file, 6 passed, exit 0 (real wiki: 199 files, 193 ids, 0 loader findings, 574 sources path entries all exist, 81 heading anchors agree, 0 body links to missing files); npm run typecheck exit 0; npm run lint exit 0; quick lint 193 files, 0 errors, exit 0; tool tests 28 OK. plan/approvals.json absent before and after (the lint-suite test also fingerprints SCHEMA.md and STATUS.md). The failed 2026-10-08 run stays as IP-2-tests.20261008-2358.txt (history). MANIFEST.sha256 now 18 lines. Observation for the owner: `sha256sum -c` reports IP-0-toolchain.txt FAILED, because its working-tree copy holds one CR (from `node -v` output) that git normalised away on commit 1cfc2d5; the MANIFEST line matches the committed blob (git show HEAD:… | sha256sum = 4cf5fc50…), so the record is intact; not changed here (raw file, not created in this step).
- next: p0.12 / IP-3 of ip-build-plan (lib/approvals/hash.ts, state.ts, lib/wiki/gates.ts; Python cross-check must pass)
- commit: ac54768

## [2026-10-09] decide | IP-3 delegated details: bootstrap_hash fail-closed, entry-gate step 4, model/diff placement, new hash vectors

- session: s01
- pages: [ip-data-contract, ip-testing, ip-build-plan, ops-approval-workflow]
- sources: [raw/owner/2026-10-09-s01-wave0c.md, raw/evidence/phase-p0-planning/interactive-plan/IP-3-tests.txt]
- result: Decided by Claude under the wave 0c delegation policy (tooling/consistency; no SCHEMA semantics changed, the owner can overturn any of it in the app). (1) `bootstrap_hash`: a stored hash with root CLAUDE.md missing is STALE (fail closed); a `schema` record without `bootstrap_hash` is judged on the page hashes; rejected/changes-requested win over the check (ip-data-contract §6.2). tools/approvals_check.py changed the same way (it skipped the check when CLAUDE.md was missing), with a new tool test and the embedded copy in ops-approval-workflow §4 updated. (2) ip-data-contract §8.3 lacked SCHEMA §9.7 step 4 (unregistered CONTRADICTION blockquotes); added, since SCHEMA wins (§3.4); also `details[]` per item, a `phase-exists` item for an unknown id, and the P0 bootstrap exception reported as `bootstrapException` with overall ok, as `approvals_check.py --gate` does. (3) The §8.1 zod schemas live in lib/approvals/model.ts (shared by state/gates now and store.ts in IP-4). (4) ip-testing §1.3 snapshot diff: the pure diff is tested in IP-3 with a test-written snapshot; writing it on approval and never overwriting it moved to the store tests (§1.4). (5) Five more hash vectors v11-v15 (mixed EOL, CR before CRLF, CRLF volatile-only change, tab/empty/case/indent look-alikes, second fence in the body) computed with the SCHEMA §10.2 Python block extracted from SCHEMA.md; the same run re-confirmed v01-v10 unchanged; tools/test_approvals_check.py now expects 15 vectors. (6) ip-testing §0: `npm test` may also read the §7 vector block of ip-data-contract (besides SCHEMA.md). (7) `IP3_REQUIRE_PYTHON=1` makes a missing python fail instead of skip; the IP-3 gate sets it. The latin1 round-trip `UNVERIFIED[phase-p0-planning]` claim of ip-data-contract §6.1 is settled by IP-3-tests.txt and turned into a citation.
- stales: [ip-data-contract, ip-testing, ip-build-plan, ops-approval-workflow] (no approvals.json exists, so nothing is actually stale; the Wave 0 chat approval of the ip-* pages is re-done in the app after IP-10)
- commit: 5536d5f

## [2026-10-09] code | p0.12 (IP-3 hashes + effective state + entry gates): gate PASS incl. the Python cross-check

- session: s01
- pages: [ip-data-contract, ip-testing, ip-build-plan, ops-approval-workflow, status-live]
- sources: [raw/evidence/phase-p0-planning/interactive-plan/IP-3-tests.txt]
- result: Wrote interactive_plan/lib/approvals/hash.ts (normalizeEol, hashes, HashError NO_CLOSING_FENCE, tryHashes, contentHash, hashFile), model.ts (approvals.json zod), state.ts (effectiveState incl. bootstrap_hash, countsAsApproved, describeApproval moved/orphaned, stateOf), diff.ts (LCS line diff), lib/wiki/gates.ts (entryGate SCHEMA §9.7 steps 1-4, dependencySet, contradictions); the loader now fills contentHash/scopeHash and WikiIndex.bootstrapHash (the IP-2 placeholder test "hashes stay null" replaced by a test that they equal hashes() of the file bytes). Tests: hash.vectors (v01-v15 read from ip-data-contract §7; Python block extracted from SCHEMA.md run on all 15 vectors, the missing-fence case and 401 generated inputs: all agree; 1,000-case normalizeEol property test; all 256 latin1 bytes), state (SCHEMA §10.3 truth table, #exit/unhashable/moved/orphaned, bootstrap rows, temp-copy integration APPROVED -> APPROVED_VOLATILE_DRIFT -> STALE, CLAUDE.md change -> schema STALE), gates (dependency not done, exit not approved, STALE ADR, blocking open Q, Q-FORMAT fail closed, unregistered/registered CONTRADICTION, all green, bootstrap exception), diff (two edited lines reported exactly). Gate (IP-3-tests.txt, node v24.20.0, Python 3.12.10): IP3_REQUIRE_PYTHON=1 npm run test 12 files, 571 passed, exit 0; npm run lint:wiki 6 passed, exit 0; typecheck exit 0; eslint exit 0; quick lint 193 files 0 errors exit 0; tool tests 29 OK. plan/approvals.json absent before and after; every test writes approvals only under a temp dir and asserts the real file's fingerprint is unchanged. MANIFEST.sha256 now 19 lines (IP-0-toolchain.txt still reports the known working-tree CR mismatch, see the p0.11 entry).
- next: p0.14 / IP-4 of ip-build-plan (lib/approvals/store.ts, lock.ts, guard, app/api/approvals/route.ts; ip-testing §1.4-§1.5, cross-process test 3 runs)
- commit: 5536d5f

## [2026-10-09] decide | IP-4 delegated details: seen_bootstrap_hash, lock scope, rename retry budget, GET details, fake clock

- session: s01
- pages: [ip-approvals-api, ip-data-contract, ip-testing, ip-build-plan]
- sources: [raw/owner/2026-10-09-s01-wave0c.md, raw/evidence/phase-p0-planning/interactive-plan/IP-4-tests.txt]
- result: Decided by Claude under the wave 0c delegation policy (tooling/consistency; no SCHEMA semantics changed; the owner can overturn any of it in the app). (1) The POST body gains optional `seen_bootstrap_hash`, required for key `schema` and rejected (400) for other keys, because ip-data-contract §6.2 already said the schema POST sends it while the ip-approvals-api body was `.strict()` without it; a stale value gives 409 PAGE_CHANGED, a missing CLAUDE.md 422 UNHASHABLE (fail closed). (2) Steps 1-3 (guard, read-only, body validation) run before the lock, steps 4-10 inside it, so a refused request never creates plan/ or the lock file. (3) Rename retry: ip-approvals-api's "retried up to 5 times with 20/40/80/160/320 ms backoff" (6 attempts) wins over ip-testing's "five failures → WRITE_FAILED"; the test plan now says six failures → WRITE_FAILED. A first cut with 5 attempts failed under full-suite load in a cross-process run with a reader re-reading approvals.json every ~1 ms (Windows refuses a rename over an open file with EPERM). Also added: the app's own approvals reads (GET) take the same in-process mutex as writes, with no lock file, so the GET stays side-effect free. (4) The cross-process test (4 writers x 10 submits) gained a concurrent reader process (every 20 ms; all 40 must succeed) and a stress variant (every ~1 ms) that allows explicit WRITE_FAILED/LOCK_TIMEOUT refusals. Its strict assertions are: no torn read; the file holds exactly the submissions reported as successful, each once; no leftovers; one log entry per success. (5) LOCK_TIMEOUT/stale-lock tests use an injected fake clock instead of vitest fake timers. (6) The lock file holds `{pid, started_at, nonce}`; release removes only one's own lock; a stale lock is renamed aside and linked back if it was replaced meanwhile. (7) UNHASHABLE for a page cannot occur once its frontmatter parsed (same fence rule), so it stays a defensive check, reached in tests via an injected hash function. (8) The body size limit gives 400 BAD_REQUEST. GET counts are over the filtered items; a page with `approvable: true` but invalid frontmatter is listed as INVALID; the phase filter matches the phase page and pages whose `phase` field is that id. The log title is `<key> <status>`, with `"` and `\` escaped in the comment. (9) Module split: errors, file (read/serialise), view (GET), guard, logAppend, time, api (adapter); route.ts only binds api.ts to getConfig(). (10) .gitignore: lock stale-aside files, snapshot temp files, `__pycache__/`. The `unverified` claim in ip-approvals-api (Windows rename can fail transiently with EPERM/EBUSY/EACCES while another process holds the file open) is settled by IP-4-tests.txt (EPERM observed and recovered by the retry) and turned into a citation.
- stales: [ip-approvals-api, ip-data-contract, ip-testing, ip-build-plan] (no approvals.json exists, so nothing is actually stale; the Wave 0 chat approval of the ip-* pages is re-done in the app after IP-10)
- commit: 6cc1a07

## [2026-10-09] code | p0.14 (IP-4 approvals store + API route): gate PASS, cross-process test green 3 more times in a row

- session: s01
- pages: [ip-approvals-api, ip-data-contract, ip-testing, ip-build-plan, status-live]
- sources: [raw/evidence/phase-p0-planning/interactive-plan/IP-4-tests.txt]
- result: Wrote interactive_plan/lib/approvals/store.ts, lock.ts, guard.ts, logAppend.ts, view.ts, file.ts, errors.ts, time.ts, api.ts and app/api/approvals/route.ts (GET/POST only, runtime nodejs, force-dynamic, no CORS, no OPTIONS). Tests (ip-testing §1.4/§1.5): store.test.ts 34 (first write, snapshots incl. never-overwrite and `__exit`, history byte-stable, PAGE_CHANGED, invalid file untouched, 50 parallel submits, cross-process 4 node child processes x 10 submits with a reader + stress variant, crash before rename, rename retry, stale lock, LOCK_TIMEOUT, serialisation, log append/LOG_MISSING), guard.test.ts (header matrix), route.test.ts (all 14 §2.2 codes with their HTTP status, PLAN_READONLY, GET view/filters/orphans/INVALID, route exports and env binding). Gate (IP-4-tests.txt, node v24.20.0, Python 3.12.10): IP3_REQUIRE_PYTHON=1 npm run test 15 files, 670 passed, exit 0; the two cross-process tests 3 more times in a row, 2 passed each, exit 0 (the spec'd test recorded all 40 submits every run, EPERM rename retries recovered; the stress variant saw 0-2 explicit WRITE_FAILED per run and no torn read); npm run lint:wiki 6 passed (577 sources entries exist); typecheck exit 0; eslint exit 0; quick lint 193 files 0 errors; tool tests 29 OK. plan/approvals.json absent before and after; every test asserts the real file's fingerprint is unchanged. MANIFEST.sha256 now 20 lines (IP-0-toolchain.txt still shows the known working-tree CR mismatch).
- next: p0.13 / IP-5 of ip-build-plan (lib/lint/ rules of ip-wiki-lint §2/§2.1/§3, tests/lint/wiki-lint.test.ts, lint:wiki:json and gate scripts; evidence IP-5-lint.json, IP-5-gate.txt)
- commit: 6cc1a07
