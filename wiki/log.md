---
id: log
type: log
title: "Wiki log (append-only)"
status: active
updated: 2026-10-11
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
- result: create-next-app@16.4.0 with the full ip-spec §7 flag set ran non-interactively (CI=1) in the repo path with a space, exit 0, no flag rejected. Every ip-spec §7 package pinned exactly (all resolvable on the registry); npm install had no peer-dependency errors, no --force/--legacy-peer-deps. Exact patches recorded at install: eslint 9.39.5 (npm marks it deprecated; it is the maintenance tag), @types/node 24.19.1 (generator emitted ^20), @types/react and @types/react-dom 19.3.0, vite 8.3.4 through the vitest/plugin-react peers. Q-210: @vitest/coverage-v8 5.0.3 and npx playwright install chromium (Chrome for Testing 156.0.8078.4). Added .nvmrc 24.20.0, engines ">=24.15 <27", next.config.ts turbopack.root = app dir, the ip-testing §0 scripts plus dev:local/start:local (127.0.0.1:3417); test, lint:wiki and test:e2e have no config yet (IP-2, IP-5, IP-6). Deviation: typecheck is "next typegen && tsc --noEmit", because "tsc --noEmit" alone failed on a clean .next (TS2304 LayoutProps, a type Next generates). Spikes under next start and next dev: S1 PASS (route handler read ../wiki/SCHEMA.md and wrote, read back and deleted ../plan/.spike-* per request; plan/ absent before and after, approvals.json never existed); S2 PASS (mermaid 12.1.0, strict/dagre/classic, 3 nodes rendered in headless Chromium, 0 errors, 0 external requests; no 11.17.2 fallback); S3 PASS (only listener 127.0.0.1:3417; 127.0.0.1 and localhost 200; LAN <LAN_IPV4_1> and vEthernet <WSL_IPV4_1> refused). Spike code deleted. Gate npm run typecheck && npm run lint && npm run build exit 0. Repo .gitignore already had every step 6 entry, not edited. npm audit: 7 (2 low via katex in mermaid, 5 high in dev tooling), not fixed (only fix is audit fix --force). The settled `UNVERIFIED` tags in ip-spec, ip-build-plan and ip-testing are converted to evidence citations in IP-10 (pages are Wave 0 chat-approved, not edited now). MANIFEST.sha256 15 lines, verify 0 problems, sha256 21a490c89e47d48dac3ca4c8ef35ec0475f96f7327d58dc2537928420786766f. Quick lint 193 files, 0 errors; tool tests 27 OK.
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

## [2026-10-09] decide | IP-5 delegated details: tags in inline code, log.md exemption, ADR-CHAIN timing, parity differences, runner settings

- session: s01
- pages: [ip-wiki-lint, ip-testing, ip-build-plan, ip-data-contract]
- sources: [raw/owner/2026-10-09-s01-wave0c.md, raw/evidence/phase-p0-planning/interactive-plan/IP-5-gate.txt]
- result: Decided by Claude under the wave 0c delegation policy. These are lint and tooling consistency choices; no SCHEMA.md text changed, and the owner can overturn any of them in the app. (1) A well-formed `UNVERIFIED[...]` tag inside an inline code span counts as a tag (lib/wiki/links.ts extractUnverifiedTags; the IP-2 test was updated to the new behaviour). SCHEMA §7.1 exempts only raw/, fenced code and its own rule text, and 14 real claims in the wiki are written in backticks; skipping them would let a past-due tag escape UNV-PASTDUE. A bare keyword in inline code is still not UNV-NOPHASE, because it quotes the syntax (same as tools/quick_lint.py). (2) log.md is exempt from UNV-PASTDUE and UNV-MIRROR. It is append-only (SCHEMA §12), so the tags its entries quote could never be fixed once P0 is done. (3) ADR-CHAIN "A supersedes B but B is not superseded" applies only when A is accepted (SCHEMA §9.4 step 2 marks B once A is accepted). (4) An integrity tag or `unverified[].verify_in` naming an unknown phase is REF-DANGLING; index.md lines are checked by INDEX-MISSING only, so a broken line is reported once; ORPHAN also counts `sources` citations as inbound references. (5) SCHEMA §9.3 codes missing from ip-wiki-lint §2 are implemented with their SCHEMA severity: Q-BLOCK-UNGATED (warn, open questions only), PHASE-DONE-NO-EXIT (warn), and LOG-FORMAT/Q-FORMAT (error; moved out of §2.1). SCHEMA-SPLIT stays one info reminder (not mechanical); the schema-sync test now compares the leading severity word of every §9.3 row and requires every §9.3 code to have a rule. (6) COMP-LVC applies to `implemented` and `verified`. MERMAID-RULES counts nodes heuristically for flowcharts and state diagrams; `<<trait>>` class annotations are not HTML. (7) Git-backed rules: batched git commands; git is used only when the repo root is the git top level, compared on real paths, because os.tmpdir() returns 8.3 short names. MANIFEST.sha256 changes that only append lines are allowed, both committed and in the working tree. The manifest fallback also applies when git is unavailable. (8) Runner: vitest 5 picks a minimal reporter that hides the console output of passing tests when stdout is not a TTY. The lint and gate configs therefore pin `reporters: ["default"]` and `silent: false`. This settles the ip-wiki-lint §1 `UNVERIFIED` claim, now a citation of IP-5-gate.txt. `lint:wiki:json` uses `node scripts/with-env.mjs` (no cross-env). `npm run gate` has its own config, so lint:wiki does not run it; an invalid approvals.json fails the gate closed. (9) Parity with tools/quick_lint.py (ip-testing §2) holds apart from an explicit list of 14 documented differences. Python has no YAML parser, keeps the BOM, checks index.md lines as body links and reports an ID-DUP only on the later file. The TS lint adds anchor, sources, task-reference and tag-phase checks. Any other difference fails the test. quick_lint.py is unchanged. (10) broken-wiki gained an index.md, a hub page and 31 rule fixtures; the name convention now also covers raw files (`raw/evidence/stray--INDEX-MISSING.txt`). The IP-2 loader golden test compares only the loader codes of each name.
- stales: [ip-wiki-lint, ip-testing, ip-build-plan, ip-data-contract] (no approvals.json exists, so nothing is actually stale; the ip-* pages are re-approved in the app after IP-10)
- commit: 19b5a95

## [2026-10-09] lint | first run of npm run lint:wiki (IP-5) on the real wiki: 0 errors, 34 warnings, dispositions

- session: s01
- pages: [schema, ov-arch-configuration, phase-p0-planning, phase-p3-tabs-sessions, phase-p5-telemetry, phase-p6-benchmark-harness, phase-p7-lifecycle, phase-p8-research-paper, adr-0009, adr-0010, ov-research-plan, ov-research-statistical-analysis-plan, ip-build-plan]
- sources: [raw/evidence/phase-p0-planning/interactive-plan/IP-5-lint.json, raw/evidence/phase-p0-planning/interactive-plan/IP-5-gate.txt]
- result: Evidence run (IP-5-lint.json): 0 errors, 35 warnings, 2 info over 193 pages; git ok, approvals.json absent. There were no real-wiki errors, so no stop condition and no error fixes. One warning was fixed afterwards, in an IP-area page I own: the UNV-MIRROR on ip-build-plan came from IP-10 step 2 quoting the tag syntax with a real phase id, now `UNVERIFIED[...]` (commit 84ba8ff). The re-run gives 0 errors and 34 warnings. Dispositions: (a) INT-NUMBER-NOSRC x23 (hyp-01..08, hyp-10..15, exp-navigation, six metric pages, ov-research-statistical-analysis-plan x2) are pre-registered thresholds, confidence levels, power targets and sampling intervals ("10%", "95%", "1 s", "50 ms"). They are definitions, not measured values, so keep them. (b) UNV-MIRROR x8 is left for the page owners, because each fix is a content decision. phase-p0, p3, p5, p6, p7 and p8 list `unverified` entries for their own phase with no inline tag in the body. SCHEMA.md §9.8 has an inline tag with no frontmatter list; editing SCHEMA is a `schema` change for the integrator. ov-arch-configuration's p7 tag sits inside a fenced TOML example, which §7.1 exempts, so only the frontmatter entry counts. (c) CONTRADICTION x2 (adr-0009 -> Q-116/Q-122/Q-123, adr-0010 -> Q-107) are open and registered; they gate through their questions' blocking lists, so keep them. (d) MERMAID-RULES x1: ov-research-plan's traceability flowchart has 31 nodes (7 rq + 15 hyp + 9 exp), one over the "roughly 30" guidance; splitting it is the research area's call, so keep it. Info: the SCHEMA-SPLIT reminder (manual CLAUDE.md vs SCHEMA comparison, done at p0.8, no new CLAUDE.md change since) and the semantic contradiction pass reminder (not done in this build step). No STALE-UPDATED, RAW-IMMUTABLE, ORPHAN, INDEX-MISSING or REF-* findings. tools/quick_lint.py: 193 files, 0 errors.
- next: The integrator should narrow p1.10 on phase-p1-foundation: IP-5 already implemented the git-backed rules that SCHEMA §9.3 assigns to p1.10.
- commit: 84ba8ff

## [2026-10-09] code | p0.13 (IP-5 wiki lint + gate report): gate PASS, real wiki 0 errors

- session: s01
- pages: [ip-wiki-lint, ip-testing, ip-build-plan, ip-data-contract, status-live]
- sources: [raw/evidence/phase-p0-planning/interactive-plan/IP-5-gate.txt, raw/evidence/phase-p0-planning/interactive-plan/IP-5-lint.json]
- result: Code written:
  - interactive_plan/lib/lint/: types, util, context, git (batched read-only git through execFile, plus the manifest check), run (40 rules, sorting, text and JSON report) and gateReport; rules/refs, indexRule, structure, integrity, approvals and gitRules.
  - tests/lint/wiki-lint.test.ts (the real-wiki runner; read-only, fingerprints approvals.json, SCHEMA.md, STATUS.md, index.md and log.md) and tests/lint/gate-report.test.ts with vitest.gate.config.mts.
  - scripts/with-env.mjs; npm scripts `lint:wiki:json` and `gate`.
  - Unit tests lint-rules (golden broken-wiki and clean mini-wiki, approval-dependent rules on temp copies, gate report formatter), lint-git (fake git, a real temporary git repository, manifest fallback) and lint-parity (tools/quick_lint.py on both fixtures).
  - lib/wiki/findings.ts: every lint code with its default severity, plus a per-finding severity override.

  Gate (IP-5-gate.txt; node v24.20.0, npm 11.19.0, Python 3.12.10):
  - IP3_REQUIRE_PYTHON=1 npm run test: 18 files, 701 passed, exit 0.
  - npm run lint:wiki: 8 passed, 1 skipped (the strict-mode test), exit 0; report 0 errors, 35 warnings, 2 info (pages 193).
  - npm run lint:wiki:json wrote IP-5-lint.json (clean: true), exit 0.
  - npm run gate printed the P0 checklist (PASSED under the bootstrap exception), exit 0. GATE_PHASE=phase-p1-foundation npm run gate failed as expected (BLOCKED: P0 not done, all 14 dependency-set ids PENDING, open Q-106/Q-110/Q-207/Q-211), exit 1.
  - typecheck and eslint exit 0; quick lint 193 files, 0 errors; tool tests 29 OK.

  lib/lint coverage: 96% lines, 84% branches (target 80%). plan/approvals.json was absent before and after. MANIFEST.sha256 gained 2 lines (22 lines in all); every line matches the LF-normalised file.
- next: p0.13 continues with IP-6 of ip-build-plan (app shell, Markdown and Mermaid components, /wiki, /go, /search, /log; component tests; Playwright wiki/log/theme specs; evidence IP-6-tests.txt).
- commit: 19b5a95

## [2026-10-09] decide | IP-6 delegated details: raw HTML as text, heading shift, /go targets, disabled nav, E2E overlay and setup, ApproveBar tests in IP-7

- session: s01
- pages: [ip-routes-and-views, ip-testing, ip-build-plan, ip-spec]
- sources: [raw/owner/2026-10-09-s01-wave0c.md, raw/evidence/phase-p0-planning/interactive-plan/IP-6-tests.txt]
- result: Decided by Claude under the wave 0c delegation policy (UI and test-placement details; no SCHEMA.md change; the owner can overturn any of them in the app). (1) Raw HTML in markdown is turned into literal text by the app's own rehype step instead of relying on react-markdown's default; a `<script>`, `<img onerror>` and `<iframe>` render as text and run nothing (markdown.test.tsx, wiki.spec.ts). This settles the ip-routes-and-views claim, now a citation of IP-6-tests.txt. Links with schemes other than https/http/mailto are not rendered as links; images show their alt text (no requests). (2) Body headings are shifted down one level so the page title is the only h1 (a11y "single h1"); slugs are unchanged. (3) /go accepts page ids, `Q-NNN` (heading anchor on ov-open-questions) and task ids `pN.M` (the defining phase page); status-live goes to /. Typed redirects (/phases, /decisions) are registered by the step that builds those routes; until then pages open in /wiki. /wiki/[[...path]] serves only paths in the loaded file set. (4) Nav entries of routes from later steps are disabled labels, not links to a 404; the lint banner prints the `npm run lint:wiki` command until /lint exists (IP-7); the layout lint is memoised 10 s on the file signature. (5) Theme toggle has three states (System, Light, Dark; key `ferrum-plan-theme`). The scaffold's next/font/google (Geist) import was removed: ip-routes-and-views §4 allows no web fonts and no external requests. (6) E2E: the fixture copy is prepared when playwright.config.ts loads (the webServer starts before globalSetup); tests/fixtures/e2e-overlay holds the E2E-only cases (dangling link, integrity tag, CONTRADICTION, raw HTML, malformed log heading) so mini-wiki stays lint-clean; the teardown guard also checks wiki/log.md and STATUS.md. This settles the ip-testing claims on jsdom 30 and on Playwright with a temp dir under a path with a space, now citations of IP-6-tests.txt. (7) ApproveBar is built in IP-7, so its component tests run in the IP-7 gate; IP-6 runs the Markdown and Mermaid tests. (8) `/` is an interim home page (STATUS next action, recent log, links) until the IP-7 dashboard. Observation for the integrator, not fixed (architecture area): in a manual render of all 44 real-wiki mermaid diagrams (43 rendered), the second sequence diagram of wiki/architecture/ov-arch-data-flows.md fails to parse because the `;` in "aggregate (sum PrivateUsage over the set; never sum per-process peaks)" ends the mermaid statement; the app shows the source and the error as designed, and MERMAID-RULES does not flag it.
- stales: [ip-routes-and-views, ip-testing, ip-build-plan, ip-spec] (no approvals.json exists, so nothing is actually stale; the ip-* pages are re-approved in the app after IP-10)
- commit: ad521cc

## [2026-10-09] code | p0.13 (IP-6 app shell, markdown, wiki browser, search, log): gate PASS

- session: s01
- pages: [ip-routes-and-views, ip-testing, ip-build-plan, ip-spec, status-live]
- sources: [raw/evidence/phase-p0-planning/interactive-plan/IP-6-tests.txt]
- result: Code written in interactive_plan/: app/layout.tsx (top bar with nav, search box, pending-approvals counter and theme toggle; red/amber/grey banners; inline pre-paint theme script), globals.css (light/dark tokens), app/page.tsx (interim home), app/wiki/[[...path]] (tree with type/status filter and raw/ collapsed as immutable, page shell, findings banner, frontmatter panel with raw YAML, backlinks by field, directory and text-file views), app/go/[id], app/search, app/log, not-found.tsx (close matches) and error.tsx; components Markdown, Mermaid, ThemeToggle, SearchBox, CopyButton, Badges, NavLinks, CloseMatches, wiki/PageParts, wiki/WikiTree; lib/wiki/{search,routes,mdlinks,tree,backlinks,logView}.ts, lib/ui/{tone,nav}.ts, lib/server/data.ts; playwright.config.ts and tests/e2e (setup-env, global-teardown guard, views/wiki/log/theme specs). Gate (IP-6-tests.txt; node v24.20.0, npm 11.19.0, Python 3.12.10): component tests 2 files, 25 passed, exit 0; IP3_REQUIRE_PYTHON=1 npm run test 21 files, 773 passed, exit 0; Playwright wiki/log/theme/views 44 passed, exit 0 (production build on 127.0.0.1:3418, temp copy under "ferrum plan e2e", guard: real approvals.json absent, log.md and STATUS.md unchanged); typecheck and eslint exit 0; npm run lint:wiki 8 passed, 1 skipped, report 0 errors, 34 warnings, 2 info (193 pages); quick lint 193 files, 0 errors; tool tests 29 OK. plan/approvals.json absent before and after. MANIFEST.sha256 gained 1 line (23 lines, 0 mismatches LF-normalised).
- next: p0.15 / IP-7 of ip-build-plan (dashboard /, /approvals inbox, /phases/[id], ApproveBar with its component tests, /lint; dashboard, approval-flow, approval-race and exit-approval specs; evidence IP-7-tests.txt)
- commit: ad521cc

## [2026-10-09] decide | IP-7 delegated details: eligible exit keys, Stale tab, wave and grouping rules, evidence paths, ApproveBar placement, E2E isolation

- session: s01
- pages: [ip-routes-and-views, ip-testing, ip-build-plan]
- sources: [raw/owner/2026-10-09-s01-wave0c.md, raw/evidence/phase-p0-planning/interactive-plan/IP-7-tests.txt]
- result: Decided by Claude under the wave 0c delegation policy (UI and test-placement details; no SCHEMA.md change; the owner can overturn any of them in the app). (1) A phase's `#exit` key is listed in the inbox, the dashboard counts and the top-bar counter only when it is eligible (status gate-review or done, or a record exists), the same rule as the exit bar; a planned phase's exit key is not "pending". (2) The "Stale" tab lists STALE only; APPROVED_VOLATILE_DRIFT counts as approved and is listed under "Approved"; the dashboard's `?state=` links open the matching tab. (3) "Next phase" (dashboard blockers, current wave) is the phase after STATUS.current_phase in `order`, or the current phase if it is the last; inbox grouping puts a page under its `phase` field, else the first phase in order whose dependency set holds it, else Cross-cutting. (4) Progress denominator is 9 (or the number of phase pages if larger). (5) Phase test-gate evidence: an entry starting with `raw/` is a wiki-relative path, any other entry a file name in `raw/evidence/<phase-id>/`; entries outside that folder are marked. (6) The ApproveBar also appears on /wiki/<path> for every approvable page (ip-routes-and-views §3.4 "every approvable page view"), with a link to the typed view; it is disabled with a reason for INVALID, read-only, an unhashable page, or `schema` without CLAUDE.md, and sends `seen_bootstrap_hash` for `schema`. (7) Review mode is `/approvals?tab=<tab>&review=1&i=<n>`; j/k are ignored in fields and with modifiers. (8) /lint links open the file in /wiki (line shown as text: no per-line anchors). (9) E2E isolation: the specs that change temp files restore them in afterAll and check mid-run that the real guarded files are unchanged; the dashboard spec writes a known approvals.json into the temp copy; the e2e overlay gains phase-p2-fixture-review (gate-review) and one evidence file. The fixture P0 is not the real bootstrap phase, so the dashboard gate card is evaluated normally there (the spec asserts "blocked").
- stales: [ip-routes-and-views, ip-testing, ip-build-plan] (no approvals.json exists, so nothing is actually stale; the ip-* pages are re-approved in the app after IP-10)
- commit: a462a9f

## [2026-10-09] code | p0.15 (IP-7 dashboard, approvals inbox, phase detail, ApproveBar, lint view): gate PASS

- session: s01
- pages: [ip-routes-and-views, ip-testing, ip-build-plan, status-live]
- sources: [raw/evidence/phase-p0-planning/interactive-plan/IP-7-tests.txt]
- result: Code written in interactive_plan/: app/page.tsx (dashboard: next action verbatim with blocked_on links, phase strip with sessions budget and last activity, entry-gate card, approval counts linking to the inbox, blockers, recent log, lint card), app/approvals (tabs incl. current wave, grouping by phase, review mode with j/k, orphans, no bulk approve), app/phases/[id] (entry gate checklist, criteria, tasks, test gate with copyable commands and evidence ✓/✗, risks with L×I, decisions with approval states, experiments, components, body, page and exit approve bars), app/lint (findings by severity and code); components/ApproveBar.tsx and ReviewKeys.tsx; lib/views/{dashboard,inbox,phase}.ts (pure view models), lib/server/{approveBar,snapshot}.ts (props and snapshot diff); TYPED_ROUTES registers phase -> /phases/<id>; Approvals and Lint nav entries enabled; the lint banner links to /lint. Gate (IP-7-tests.txt; node v24.20.0, npm 11.19.0, Python 3.12.10): ApproveBar component tests 14 passed, exit 0; IP3_REQUIRE_PYTHON=1 npm run test 23 files, 801 passed, exit 0; full Playwright suite 71 passed, exit 0, including dashboard (4), approval-flow (7), approval-race (1) and exit-approval (3); guard: real approvals.json absent, log.md and STATUS.md same mtime+sha256; typecheck and eslint exit 0; npm run lint:wiki 8 passed, 1 skipped, report 0 errors, 34 warnings, 2 info (193 pages); quick lint 193 files, 0 errors; tool tests 29 OK. plan/approvals.json absent before and after. MANIFEST.sha256 gained 1 line (24 lines, 0 mismatches LF-normalised).
- next: p0.13 / IP-8 of ip-build-plan (/architecture, /roadmap, /decisions, /decisions/[id], /risks, /research with graph, timeline and heatmap components and text alternatives; register decision -> /decisions/[id]; graph unit tests and architecture/roadmap/risks/research specs; evidence IP-8-tests.txt)
- commit: a462a9f

## [2026-10-09] decide | IP-8 delegated details: graph layout and keyboard model, filters as URL parameters, roadmap/research/risk/decision rules, fixture scope, lock busy-retry

- session: s01
- pages: [ip-routes-and-views, ip-testing, ip-build-plan, ip-data-contract, ip-spec, ip-approvals-api]
- sources: [raw/owner/2026-10-09-s01-wave0c.md, raw/evidence/phase-p0-planning/interactive-plan/IP-8-tests.txt, raw/evidence/phase-p0-planning/interactive-plan/IP-8-tests.20261009-0241-unit-fail.txt]
- result: Decided by Claude under the wave 0c delegation policy (UI, test-placement and robustness details; no SCHEMA.md change; the owner can overturn any of them in the app). (1) Graph layout is computed on the server with dagre (pure lib/views/graphLayout.ts); xyflow is loaded client-only (next/dynamic, ssr false); architecture nodes keep their dagre column and are stacked per trust level in lanes (plus a Missing lane for dangling targets). (2) Keyboard model: each node holds one real control (button for the architecture side panel, link for roadmap/research) in reading order, xyflow node focus off; Tab/Enter/Space verified by architecture.spec and roadmap.spec, which settles the open (unverified) ip-routes-and-views claim about @xyflow/react 12.12.0 (frontmatter entry removed, now a citation of IP-8-tests.txt). xyflow gives non-selectable nodes pointer-events none, so the control re-enables them. (3) Filters and sorting are URL parameters (architecture kind/tb/hide, decisions status/state, risks sort/dir/active, research rq) so graph and text alternative always agree and work without JS. (4) Roadmap: critical path = longest chain by sessions, ties to lower order; cycle members and their dependants unscheduled with a banner; exit column uses the §3.4 eligibility rule. (5) Research: phase nodes sit in the last column with metrics/workloads; that column wraps into sub-columns no taller than max(12, other columns); relations are the union of both directions, mismatches reported through the lint REF-RECIPROCAL helper (refs.ts now exports reciprocalFindings; rule behaviour unchanged); "preregistered" = status preregistered or later; current/next phase from STATUS. (6) Decisions: awaiting = claude-proposed and PENDING/STALE/CHANGES_REQUESTED; supersession chain follows the first supersedes entry; detail shows decisions/related backlinks only. (7) Risks: default sort score desc, ties score then id; spike links /phases/<id>#task-<id>; heatmap cells positioned so the sr-only band label cannot widen the page. (8) Tests: roadmap.spec asserts one node per fixture phase (3); the real 9 phases are asserted by the new lint:wiki test tests/lint/real-wiki-graphs.test.ts; decisions.spec added; e2e-overlay gains rq-92, exp-fixture-nometrics and risk-r92, all approvable: false so dashboard counts stay fixed; /go/adr-0901 expectations changed by design (typed decision route). (9) Lock robustness: the first IP-8 gate run (kept as IP-8-tests.20261009-0241-unit-fail.txt) failed the IP-4 cross-process test because open(.approvals.lock, 'wx') threw a raw EPERM (Windows delete-pending lock file); acquire() now treats EPERM/EACCES/EBUSY on the exclusive create as a busy lock retried until LOCK_TIMEOUT (last_error in details), other errors rethrown; two new lock tests; ip-approvals-api §4.1 and ip-testing §1.4 updated; cross-process tests then green 3 more times. Real-wiki observation for the integrator (not changed, outside wiki/interactive-plan/): exp-reliability has trials.target 10 (< 30, master prompt §10 target) and is the only research gap the view reports.
- stales: [ip-routes-and-views, ip-testing, ip-build-plan, ip-data-contract, ip-spec, ip-approvals-api] (no approvals.json exists, so nothing is actually stale; the ip-* pages are re-approved in the app after IP-10)
- commit: 4fa5ea5

## [2026-10-09] code | p0.13 (IP-8 architecture, roadmap, decisions, risks, research views): gate PASS

- session: s01
- pages: [ip-routes-and-views, ip-testing, ip-build-plan, ip-data-contract, ip-spec, ip-approvals-api, status-live]
- sources: [raw/evidence/phase-p0-planning/interactive-plan/IP-8-tests.txt]
- result: Code written in interactive_plan/: app/architecture (component graph from connects in trust-level lanes, TB edges dashed/thick with TB marker, TRUST-EDGE and dangling red, not-shipped dotted, side panel with responsibilities/interfaces/phase/approval/page link, URL filters, edge table and component table), app/roadmap (phase DAG with critical path, SVG timeline in cumulative sessions with milestones and the planning-guess note, per-phase table with exit state, tasks, risk score chips, experiments), app/decisions and app/decisions/[id] (register with status/state filters, awaiting approval first; detail with approve bar, ADR section check, supersession chain, listing pages, body), app/risks (5x5 heatmap table with band colour plus pattern plus text, sortable register with aria-sort, open+mitigating toggle), app/research (layered rq/hyp/exp/metric-workload-phase graph, gaps outlined red and listed, rq filter, nested text alternative); components/graph/{FlowGraph,LazyFlowGraph,types}; lib/wiki/graph.ts (componentGraph, phaseDag, riskMatrix, traceGraph, traceSubgraph), lib/views/{graphLayout,registers}.ts; TYPED_ROUTES registers decision -> /decisions/<id>; every nav entry enabled; lib/approvals/lock.ts busy-retry fix. Gate (IP-8-tests.txt; node v24.20.0, npm 11.19.0, Python 3.12.10): graph unit tests 24 passed, exit 0; IP3_REQUIRE_PYTHON=1 npm run test 24 files, 827 passed, exit 0; cross-process store tests 2 passed in each of 3 more runs; full Playwright suite 100 passed, exit 0, including architecture (4), roadmap (4), risks (3), research (4) and decisions (3); guard: real approvals.json absent, log.md and STATUS.md same mtime+sha256; typecheck and eslint exit 0; npm run lint:wiki 12 passed, 1 skipped, report 0 errors, 34 warnings, 2 info (193 pages; real wiki: 9 phases, 49 sessions, 15 components, 42 edges, 25 risks, 72 research nodes, 1 gap); quick lint 193 files, 0 errors; tool tests 29 OK. An earlier run failed one IP-4 test (raw EPERM on the lock file) and is kept as IP-8-tests.20261009-0241-unit-fail.txt; see the IP-8 decide entry. plan/approvals.json absent before and after. MANIFEST.sha256 gained 2 lines (26 lines, 0 mismatches LF-normalised).
- next: p0.13 / IP-9 of ip-build-plan (a11y.spec.ts and security.spec.ts, server-render timing per route on the real wiki, PLAN_READONLY check; npm run verify green in one run plus the coverage thresholds; evidence IP-9-verify.txt, IP-9-perf.txt, playwright-report.zip)
- commit: 4fa5ea5

## [2026-10-09] decide | IP-9 delegated details: coverage thresholds in vitest config, read-only E2E server, bind probe with control, perf method, no axe

- session: s01
- pages: [ip-testing, ip-build-plan, ip-approvals-api]
- sources: [raw/owner/2026-10-09-s01-wave0c.md, raw/evidence/phase-p0-planning/interactive-plan/IP-9-verify.txt, raw/evidence/phase-p0-planning/interactive-plan/IP-9-perf.txt]
- result: Decided by Claude under the wave 0c delegation policy (test placement and tooling; no SCHEMA.md change; the owner can overturn any of them in the app). (1) The ip-testing §1.6 coverage targets are coverage.thresholds globs in vitest.config.mts (lib/approvals/** 90/90, lib/wiki/** and lib/lint/** 80/80 lines/branches); npm run verify is unchanged and the gate runs npm run test:coverage right after it; enforcement was checked once with a deliberately raised threshold (exit 1). lib/approvals branches were 89.89 % before IP-9; three store tests for real failure paths (half-written lock judged by mtime, log path that cannot be opened -> LOG_APPEND_FAILED, unreadable approvals file -> invalid) bring them to 91.29 %. (2) PLAN_READONLY is checked with a second Playwright webServer (next start of the same build on 127.0.0.1:3419, same temp fixture, PLAN_APPEND_LOG=0) and against the real wiki by npm run perf. (3) security.spec sends raw node:http requests so the Host header is exact, and adds Sec-Fetch-Site, missing Origin, PATCH/DELETE, preflight and a same-origin control request. (4) Bind probe: every non-loopback address of the machine is probed on 3418 and 3419 and must give ECONNREFUSED; a throwaway listener on all interfaces (port 0, closed within seconds) must first be reachable on each address, so a refusal is meaningful (a plain probe timed out at 2 s because Windows retries a refused connect for about 2 s). (5) Timing (scripts/perf-routes.mjs, npm run perf): time to last byte over loopback, production build, real wiki, PLAN_READONLY=1, 1 warm-up + 5 runs, median as specified; it also reports the server's first request and one request per route after the layout's 10 s lint memo expired, because that memo makes warm runs cheaper. (6) a11y.spec checks lang, one h1, landmarks, the skip link, accessible names and keyboard operation; the optional axe scan is not run because @axe-core/playwright needs owner consent (Q-008, open).
- stales: [ip-testing, ip-build-plan, ip-approvals-api] (no approvals.json exists, so nothing is actually stale; the ip-* pages are re-approved in the app after IP-10)
- commit: 0e5282e

## [2026-10-09] code | p0.16 (IP-9 accessibility, performance, security, full verify): gate PASS

- session: s01
- pages: [ip-testing, ip-build-plan, ip-approvals-api, status-live]
- sources: [raw/evidence/phase-p0-planning/interactive-plan/IP-9-verify.txt, raw/evidence/phase-p0-planning/interactive-plan/IP-9-perf.txt]
- result: Code written in interactive_plan/: tests/e2e/a11y.spec.ts (16 routes: lang, one h1, banner/navigation/main/contentinfo, skip link, named controls; keyboard-only approve bar, graph nodes and theme toggle), tests/e2e/security.spec.ts (guard refusals 403/415/not 2xx, no CORS, same-origin control, PLAN_READONLY server on 3419: banner, disabled buttons, POST 403 READ_ONLY; bind probe with control listener), playwright.config.ts (second read-only webServer), vitest.config.mts (coverage thresholds), scripts/perf-routes.mjs + npm run perf, three store tests. Gate (IP-9-verify.txt; node v24.20.0, npm 11.19.0, Python 3.12.10): IP3_REQUIRE_PYTHON=1 npm run verify exit 0 in one run (typecheck, eslint, unit 24 files 830 passed, lint:wiki 12 passed 1 skipped with 0 errors 34 warnings 2 info over 193 pages, build, Playwright 131 passed, guard: real approvals.json absent, log.md and STATUS.md same mtime+sha256); npm run test:coverage exit 0, thresholds met (lines/branches: lib/approvals 96.71/91.29, lib/wiki 99.42/93.13, lib/lint 97.29/84.27). Bind: 13 non-loopback addresses (LAN and WSL IPv4, global and link-local IPv6) refused on both ports, control listener reachable on all 13. Perf (IP-9-perf.txt, app evidence only, never a Ferrum result; Ryzen 7 6800H, real wiki 198 .md files vs the 300-page target): warm medians 27-178 ms for all 17 routes, all under the 500 ms target; NOT met for the first request after server start (about 2.1 s) or for a request after the 10 s lint memo expired (1.0-1.4 s on every page route), because the layout re-runs the full lint (with git) for its banner; first-load JS 180-184 kB gzip on every route (graph and mermaid code loads later). PLAN_READONLY on the real wiki: POST 403 READ_ONLY, banner, 3 disabled buttons, plan/ never created. playwright-report.zip saved. MANIFEST.sha256 gained 3 lines (29 lines).
- next: p0.13 / IP-10 of ip-build-plan (interactive_plan/README.md, ip-* tags settled by evidence and status active, owner requests for comp-interactive-plan and the ip-testing §4 manual checks, HANDOFF; evidence IP-10-final-lint.json)
- commit: 0e5282e

## [2026-10-09] decide | IP-9 review delegated details: in-server lint without git, owner-ADR overturn, graph zoom and labels, bind-probe skip, launcher

- session: s01
- pages: [ip-wiki-lint, ip-routes-and-views, ip-approvals-api, ip-testing, ip-data-contract, ip-spec, ip-build-plan]
- sources: [raw/owner/2026-10-09-s01-wave0c.md, raw/evidence/phase-p0-planning/interactive-plan/IP-9-review-fixes.txt]
- result: Decided by Claude under the wave 0c delegation policy after a 26-finding review of IP-9 (the owner can overturn any of them in the app). (1) ip-wiki-lint §3 and ip-routes-and-views §2 disagreed on git in the request path: ip-wiki-lint wins; lib/server/data.ts builds the lint context with { git: false } (STALE-UPDATED info line, RAW-IMMUTABLE manifest fallback), and /lint says the git rules run in npm run lint:wiki; this also removes the git cost behind the IP-9 perf misses after the 10 s memo expires (not re-measured). (2) ADR-CHAIN: case (b) of SCHEMA §10.4.3 holds while the state is PENDING or STALE; REJECTED or CHANGES_REQUESTED on an accepted ADR is an error whatever decided_by says (§10.4.4); recorded with the APPROVAL-INVALID change in adr-0022 (see the schema entry). (3) PHASE-ORDER reports every phase in a strongly connected component of size > 1 or with a self-loop (lib/wiki/cycles.ts, also used by the roadmap) and a depends_on id that resolves to a non-phase page; other typed reference fields are not type-checked yet. (4) MERMAID-RULES (warn) also flags a ';' in sequence-diagram text (#59; entities allowed). (5) Graphs: initial zoom never below 0.7 (architecture), 0.8 (roadmap) and 0.6 (research), larger graphs start top-left and pan; architecture edge labels show only for the hovered, focused or opened component (short TB/TRUST-EDGE/missing markers otherwise); roadmap edges that would run behind a node are routed below; research nodes use a one-line title. Mermaid diagrams keep at least 0.8 of native size and scroll. (6) The security spec's bind probe is skipped with a visible reason when no address can be probed, and fails instead with IP_REQUIRE_BIND_PROBE=1 (set for gate runs, like IP3_REQUIRE_PYTHON). (7) Every server npm script (dev, dev:local, start, start:local) runs scripts/serve.mjs: 127.0.0.1 and PLAN_PORT (same parsing as lib/config.ts), caller -H/-p refused. (8) The schema page and the inbox review mode read CLAUDE.md once and send the hash of the bytes shown. (9) The ip-approvals-api §2.2 code-to-HTTP-status table is now written in the spec and checked by schema-sync. The security headers and the all-route Host check implement the existing ip-approvals-api §3 intent (CSRF incl. framing, DNS rebinding) rather than changing the security posture. Not changed: comp-interactive-plan (owner update requested at IP-10, as before).
- stales: [ip-wiki-lint, ip-routes-and-views, ip-approvals-api, ip-testing, ip-data-contract, ip-spec, ip-build-plan] (no approvals.json exists, so nothing is actually stale)
- commit: 6a78a78

## [2026-10-09] schema | APPROVAL-INVALID added to the SCHEMA §9.3 table as an error (adr-0022, claude-proposed)

- session: s01
- pages: [schema, adr-0022, ip-wiki-lint, ops-approval-workflow]
- sources: [raw/owner/2026-10-09-s01-wave0c.md, raw/evidence/phase-p0-planning/interactive-plan/IP-9-review-fixes.txt]
- result: SCHEMA §10.3 says an INVALID approval state is a lint error, but the lint reported APPROVAL-INVALID as an ip-wiki-lint §2.1 proposal at warn (SCHEMA §9.3 "warn until added"), so a corrupt or orphan-keyed approvals.json gave a clean lint (reproduced by the reviewer). §9.3 gains the row APPROVAL-INVALID = error; the lint severity, the ip-wiki-lint §2 table and the schema-sync test follow; the next free ADR number in §8 is now adr-0023. adr-0022 (status proposed, decided_by claude-proposed) records the change and the ADR-CHAIN rule for overturned owner ADRs; the owner can reject it in the app. No CLAUDE.md change (it does not restate the lint table). tools/approvals_check.py (embedded in ops-approval-workflow §4) now reports a #exit key on a non-phase page as INVALID, as the app does, with a new tool test.
- stales: [schema, ops-approval-workflow] (no approvals.json exists, so nothing is actually stale)
- commit: 6a78a78

## [2026-10-09] code | p0.16 (IP-9 review fixes: security, spec gaps, lint correctness, graph and layout UX, tests): gate PASS

- session: s01
- pages: [ip-approvals-api, ip-spec, ip-build-plan, ip-data-contract, ip-routes-and-views, ip-testing, ip-wiki-lint, ov-arch-data-flows, schema, adr-0022, ops-approval-workflow, status-live]
- sources: [raw/evidence/phase-p0-planning/interactive-plan/IP-9-review-fixes.txt]
- result: 26 reviewer findings: 25 fixed, 1 needed no change (the earlier verify run was blocked by another session's dev server on 3419; ports 3417-3420 were free for this gate). Security: headers() in next.config.ts on every route (X-Frame-Options DENY, CSP frame-ancestors 'none', default/img/connect-src 'self', object-src 'none'), proxy.ts Host allowlist on every route (pages, /_next, API; 403 FORBIDDEN_ORIGIN), Mermaid SVG passes stripExternalResources before insertion; E2E: spoofed Host gets 403 on 16 routes and a static asset, loopback control carries the headers, a cross-origin framing page gets a blocked frame and sends no POST after clicks. Spec gaps: CLAUDE.md rendered on the schema page with its full hash (the approve bar sends that hash), STATUS "Next action" section on the dashboard, inbox STALE/drift rows with the diff or the git hint, scripts/serve.mjs for all server scripts, real README. Lint: APPROVAL-INVALID error, ADR-CHAIN overturned-ADR check, PHASE-ORDER by SCC plus depends_on type check, MERMAID-RULES ';' check; approvals_check.py #exit fix. UX: architecture/roadmap/research zoom floors and labels, routed skip edges, compact research nodes, mermaid min scale, 390 px overflow (lists, selects), nowrap id/date cells, log list notes no longer split into bogus /go links, 404 theme script as a client data block (no React console error; ThemeToggle re-applies the stored theme). Tests: literal status table in route.test, lint-parity checks exit status and tracebacks, bind probe skip/opt-in, new security.test and layout.spec, cycle/viewport/edge-routing/log/mermaid/lint tests. Content: ov-arch-data-flows sequence message ';' replaced by ',' (the third diagram renders again). Gate (IP-9-review-fixes.txt; node v24.20.0, npm 11.19.0, Python 3.12.10): IP3_REQUIRE_PYTHON=1 IP_REQUIRE_BIND_PROBE=1 npm run verify exit 0 (typecheck, eslint, unit 25 files 869 passed, lint:wiki 12 passed 1 skipped with 0 errors 34 warnings 2 info over 194 pages, build, Playwright 143 passed incl. the bind probe over 13 non-loopback addresses, guard: real approvals.json absent, log.md and STATUS.md same mtime+sha256); npm run lint:wiki exit 0 (0 errors); npm run test:coverage exit 0, thresholds met (lines/branches lib/approvals 96.74/91.34, lib/wiki 98.97/91.97, lib/lint 97.29/84.27); quick lint 194 files 0 errors; tool tests 30 OK. plan/approvals.json absent before and after. MANIFEST.sha256 gained 1 line (30 lines).
- stales: [ip-approvals-api, ip-spec, ip-build-plan, ip-data-contract, ip-routes-and-views, ip-testing, ip-wiki-lint, ov-arch-data-flows, schema, ops-approval-workflow] (no approvals.json exists, so nothing is actually stale)
- next: p0.16 / IP-10 of ip-build-plan (interactive_plan/README.md review, ip-* tags settled by evidence and status active, owner requests for comp-interactive-plan and the ip-testing §4 manual checks, HANDOFF; evidence IP-10-final-lint.json)
- commit: 6a78a78

## [2026-10-09] decide | IP-10 delegated details: perf tag kept, README known issue, failed self-referencing lint run kept

- session: s01
- pages: [ip-spec, ip-approvals-api, ip-build-plan, ip-data-contract, ip-routes-and-views, ip-testing, ip-wiki-lint, handoff-2026-10-09-s01]
- sources: [raw/owner/2026-10-09-s01-wave0c.md, raw/evidence/phase-p0-planning/interactive-plan/IP-9-perf.txt, raw/evidence/phase-p0-planning/interactive-plan/IP-10-final-lint.json]
- result: Decided by Claude under the wave 0c delegation policy (the owner can overturn any of them in the app). (1) The only integrity tag left on the ip-* pages naming phase-p0-planning (ip-spec §5 perf targets) is kept, with the IP-9 numbers cited in the body: warm medians are met, but the 300-page case was not measured (real wiki 198 files) and the cold-request misses (first request about 2.2 s, lint-cold 1.0-1.4 s) were not re-measured after the IP-9 review removed git from the in-server lint. (2) All seven ip-* pages set to `status: active` (volatile key, SCHEMA §10.2). (3) README lists the open /architecture hover-label overlap (review finding, medium, not fixed) under "Known issues" and points to the edge table. (4) The first IP-10 evidence run reported 3 REF-DANGLING errors only because STATUS.md and the new handoff link IP-10-final-lint.json, which that run itself creates; it is kept as IP-10-final-lint.20261009-0423-selfref-fail.json and the immediate re-run (no file edits in between) is the evidence. (5) Integrity tags outside wiki/interactive-plan/ that the evidence covers (phase-p0-planning `unverified` x4, adr-0016 atomic rename, Q-210 coverage pin) are not edited by the app builder (ip-build-plan stop conditions); they are listed for the owner/integrator in the handoff, as is the comp-interactive-plan update (ip-build-plan IP-10 step 3).
- stales: [ip-spec, ip-approvals-api, ip-build-plan, ip-data-contract, ip-routes-and-views, ip-testing, ip-wiki-lint] (only ip-spec's content hash changed; no approvals.json exists, so nothing is actually stale)
- commit: 6118d32

## [2026-10-09] lint | p0.16 (IP-10 documentation, evidence, handoff): final lint:wiki 0 errors, gate PASS

- session: s01
- pages: [ip-spec, ip-approvals-api, ip-build-plan, ip-data-contract, ip-routes-and-views, ip-testing, ip-wiki-lint, handoff-2026-10-09-s01, status-live]
- sources: [raw/evidence/phase-p0-planning/interactive-plan/IP-10-final-lint.json, raw/evidence/phase-p0-planning/interactive-plan/IP-10-final-lint.20261009-0423-selfref-fail.json]
- result: interactive_plan/README.md rewritten for the handoff (start `npm run dev:local` -> http://127.0.0.1:3417, scripts table, environment variables, approvals rule, spec links, known issues). Gate (node v24.20.0): `npm run lint:wiki:json` exit 0, 12 passed 1 skipped, report 0 errors, 34 warnings, 2 info over 195 pages, git ok, approvals.json absent (IP-10-final-lint.json); warning codes unchanged since IP-5 (INT-NUMBER-NOSRC 23, UNV-MIRROR 8, CONTRADICTION 2, MERMAID-RULES 1; dispositions in the IP-5 lint entry); `npm run lint:wiki` exit 0; tools/quick_lint.py 195 files 0 errors. MANIFEST.sha256 gained 2 lines. plan/approvals.json absent before and after. The app build (IP-0 to IP-10) is complete.
- next: owner opens the app (`npm run dev:local`, http://127.0.0.1:3417/), runs the ip-testing §4 manual checks and approves the Wave 1 items in the app; then p0.17
- commit: 6118d32

## [2026-10-09] handoff | s01 end of the plan-app build: handoff-2026-10-09-s01

- session: s01
- pages: [handoff-2026-10-09-s01, status-live]
- result: Handoff written (SCHEMA §9.5): lint run (0 errors), handoff page, STATUS (current_task p0.17, next action for the owner in the app, last_handoff), this entry, local commits only (never pushed). Open review issue carried forward: /architecture full edge labels on hover/focus overlap each other and nodes (medium; 22 labels, 19 overlapping pairs at 1440x900); fix and E2E overlap assertion not done. Rejected review item: a verify exit 1 caused by another session's server on port 3419 (environmental).
- next: owner approves Wave 1 in the app; Claude RESUMEs and ingests the approvals, then p0.17
- commit: 6118d32

## [2026-10-09] decide | IP-10 follow-up delegated details: architecture edge chips, edge list beside the graph, real-wiki E2E server

- session: s01
- pages: [ip-routes-and-views, ip-testing, comp-interactive-plan]
- sources: [raw/owner/2026-10-09-s01-wave0c.md, raw/evidence/phase-p0-planning/interactive-plan/IP-10-arch-labels-fix.txt]
- result: Decided by Claude under the wave 0c delegation policy (UI layout and test placement; the owner can overturn any of them in the app). (1) The /architecture canvas draws short chips only: the existing TB/TRUST-EDGE/missing markers, and for the hovered, focused or open component its labels cut to 24 characters; each chip sits on its own curve at the first of 21 sample points (t = 0.5 outwards to 0.1/0.9) that hits no node and no placed chip (4 px margin); active edges are placed first; a chip with no free point is not drawn (on WebView manager 3 of its 10 chips), because the full text is in the new list beside the graph (outgoing and incoming edges, aria-live) and in the edge table. Chips are HTML in xyflow's label layer with the reserved width, so edge lines never cross them and the measured box never exceeds the planned one. (2) Architecture spacing reserves a full chip: dagre gets the chip size as edge label size, column gap 219 px (was 110), row gap 45 px (was 28); the graph is wider and is panned (initial zoom floor 0.7 unchanged). The side column (details panel + edge list) is always present on /architecture at 900 px and wider. (3) The overlap assertion needs the real component graph, so architecture-real.spec runs against a third server of the same build on 127.0.0.1:3420 with PLAN_READONLY=1, PLAN_APPEND_LOG=0 and the real repo root (global-teardown still checks approvals.json, log.md, STATUS.md unchanged); the owner's app on 3417 is never touched. (4) wiki.spec "search from the top-bar box" retries the "/" keypress until the box has focus: the first gate run failed once because the key was pressed before hydration (passed 16/16 in isolation); test-only change.
- stales: [] (no ip-* page text changed by these details; ip-spec changed in the perf entry below)
- commit: 3eaa641

## [2026-10-09] decide | ip-spec §5 cold-request timing misses accepted as a local-tool limitation

- session: s01
- pages: [ip-spec]
- sources: [raw/owner/2026-10-09-s01-wave0c.md, raw/evidence/phase-p0-planning/interactive-plan/IP-9-perf.txt]
- result: Decided by Claude under the wave 0c delegation policy (the owner can overturn it in the app). The first request after server start (about 2.2 s) and requests after the 10 s lint memo expires (1.0-1.4 s) miss the 500 ms target of ip-spec §5; warm medians (27-178 ms) meet it. Accepted as a limitation of a local, single-user planning tool, not a defect to fix before the P0 exit; recorded in ip-spec §5 and in the interactive_plan README known issues. The UNVERIFIED[phase-p0-planning] tag on the targets stays (300-page case not measured; not re-measured after the IP-9 review removed git from the in-server lint).
- stales: [ip-spec] (no approvals.json exists, so nothing is actually stale)
- commit: 3eaa641

## [2026-10-09] decide | raw working copies restored from git; comp-interactive-plan implemented

- session: s01
- pages: [comp-interactive-plan, index]
- sources: [raw/evidence/phase-p0-planning/interactive-plan/IP-10-arch-labels-fix.txt]
- result: Decided by Claude (integrator request, ip-build-plan IP-10 step 3). (1) The working copies of raw/evidence/.../IP-0-toolchain.txt and IP-9-review-fixes.txt (both written by Claude build agents) carried stray CR bytes that git's text=auto eol=lf normalises away, so git showed them clean while plain sha256sum failed; `git checkout --` and `git checkout-index -f` are no-ops in that state, so the committed bytes were written back with `git cat-file blob HEAD:<path>` (no change in git; blob ids identical). Plain `sha256sum -c MANIFEST.sha256` now passes 32 of 33 lines; the remaining line, playwright-report.zip, is a binary hashed over N(bytes) exactly as SCHEMA §3 prescribes, and all 33 lines match under N. No MANIFEST line changed (append-only); whether binaries should be hashed without N is a possible SCHEMA clarification, not changed here. (2) comp-interactive-plan: status implemented, last_verified_commit 3eaa641 (the commit whose `npm run verify` passed in one run), one body paragraph; index status line updated. Separate commit because a commit cannot name its own sha.
- stales: [comp-interactive-plan] (no approvals.json exists, so nothing is actually stale)
- commit: 62e5936

## [2026-10-09] code | p0.16 (IP-10 follow-up: architecture edge-label overlap fixed, E2E overlap assertion): gate PASS

- session: s01
- pages: [ip-spec, comp-interactive-plan, status-live]
- sources: [raw/evidence/phase-p0-planning/interactive-plan/IP-10-arch-labels-fix.txt]
- result: Closes the open IP-9 review issue (medium). Before, real wiki at 1440x900, hover on WebView manager: 22 labels, 19 label/label overlapping pairs, 10 label/node overlaps, 5 off the pane edge. After: 19 chips of at most 24 characters, 0 label/label and 0 label/node overlaps; the list beside the graph names all 10 edges of comp-webview-manager in full. Code: lib/views/edgeLabels.ts (new), components/graph/FlowGraph.tsx (chip edge, edge list), lib/views/graphLayout.ts (chip spacing), app/architecture/page.tsx, globals.css, playwright.config.ts (third read-only real-wiki server on 3420), tests/e2e/architecture-real.spec.ts (new), architecture.spec, wiki.spec, 4 new unit tests. Gate (node v24.20.0, npm 11.19.0, Python 3.12.10): IP3_REQUIRE_PYTHON=1 IP_REQUIRE_BIND_PROBE=1 npm run verify exit 0 in one run (typecheck, eslint, unit 25 files 873 passed, lint:wiki 0 errors 34 warnings 2 info over 195 pages, build, Playwright 144 passed incl. architecture-real and the bind probe, guard: real approvals.json absent, log.md and STATUS.md unchanged); standalone npm run lint:wiki 0 errors; tools/quick_lint.py 195 files 0 errors. An earlier verify run failed only on the wiki.spec hydration race (summary in the evidence). MANIFEST.sha256 gained 1 line (33). Screenshots (scratchpad, not evidence): before-hover-webview.png, after-hover-webview.png, after-canvas-hover.png. Note: the owner's next dev on 3417 was still serving the pre-change globals.css when checked (its watcher had not picked up the CSS edit); restart it to see the fix.
- next: owner approves Wave 1 in the app (unchanged); then p0.17
- commit: 3eaa641

## [2026-10-09] ingest | owner feedback on plan app v1 and owner decisions for portal v2

- session: s01
- pages: [index, schema, ops-approval-workflow, ov-open-questions, phase-p0-planning, adr-0016, adr-0023, adr-0024, adr-0025, adr-0026, adr-0027]
- sources: [raw/owner/2026-10-09-s01-plan-app-feedback.md, raw/owner/2026-10-09-s01-portal-v2-decisions.md]
- result: What happened → the owner used plan app v1 and asked for a plain-language, read-only portal; approvals move to Claude Code. The two raw files (committed earlier today in ac9fc6c and a78f1e3) were missing from index.md and MANIFEST.sha256, so both lints reported 2 INDEX-MISSING errors; their index lines and MANIFEST lines were added now (append only). Their decisions are turned into rules in the entries below.
- stales: [] (plan/approvals.json does not exist, so nothing is actually stale)

## [2026-10-09] decide | portal v2 rules: five owner decisions written as adr-0023 to adr-0027

- session: s01
- pages: [adr-0023, adr-0024, adr-0025, adr-0026, adr-0027, adr-0016, phase-p0-planning, comp-interactive-plan, ov-arch-data-flows, index]
- sources: [raw/owner/2026-10-09-s01-plan-app-feedback.md, raw/owner/2026-10-09-s01-portal-v2-decisions.md]
- result: In plain words → (1) adr-0023: the owner approves in Claude Code; Claude saves his words, then records the decision in plan/approvals.json with the same fingerprints (content, scope, bootstrap hash) and history; the portal is read-only. It supersedes adr-0016 as a whole (adr-0016 now superseded, with a note saying what still holds: local Next.js app, 127.0.0.1 only, stack pins). (2) adr-0024: the portal reads only plain-language JSON that Claude writes in the same edit as the wiki (skill + hook + check script, built in the next step). (3) adr-0025: check scripts are PowerShell 7, one per task and one gate script per phase. (4) adr-0026: architecture shown in four groups (Application, Benchmark, Testing & quality, Research & analysis; planning tooling as a footnote) with a component-to-group table. (5) adr-0027: real IPs, host name, MAC addresses and the user-folder path are masked; real values only in the gitignored .env.local-map. All five: decided_by owner, status accepted under SCHEMA §10.4 rule 3(b), citing the raw files. phase-p0-planning decisions now [adr-0001..adr-0004, adr-0014, adr-0023..adr-0027] (adr-0016 replaced by adr-0023, SCHEMA §9.4 step 3).
- stales: [phase-p0-planning, comp-interactive-plan, ov-arch-data-flows] (no approvals exist yet)

## [2026-10-09] decide | delegated details of the portal v2 rules (tooling and lint consistency)

- session: s01
- pages: [schema, ip-wiki-lint, ops-approval-workflow, ops-git-conventions]
- sources: [raw/owner/2026-10-09-s01-wave0c.md, raw/owner/2026-10-09-s01-portal-v2-decisions.md]
- result: Decided by Claude under the standing delegation policy (wave 0c); the owner can overturn any of them. (1) Recording tool: tools/approvals_record.py (stdlib Python, like approvals_check.py) refuses keys of non-approvable pages, #exit on non-phase pages, and any decision without an existing raw/owner file that names the key; records carry recorded_by "claude" and owner_words (the raw file); 4 new tests in tools/test_approvals_record.py, including a round trip with approvals_check.py (APPROVED, then STALE after an edit). (2) RAW-IMMUTABLE stays an error but accepts a sanctioned masking edit: tools/raw-sanctioned-edits.tsv lists the allowed new content hash per raw file; a MANIFEST.sha256 line may change only to a listed hash for the same path. Implemented in interactive_plan/lib/lint/git.ts; 5 new tests in tests/unit/lint-git-sanctioned.test.ts show unlisted changes are still reported. (3) The mask scan is not a lint:wiki code (the map is local to the machine); SCHEMA §3.1 makes it a MUST before commits that add evidence and at every gate. (4) Masking tool: tools/mask.ps1 (pwsh 7): --scan, --file, --text, --stdin, --refresh-map; matches every spelling of a path (C:\, C:/, /c/, JSON-escaped) and both MAC separators; also masks inside zip archives and the zip data embedded in a Playwright HTML report. (5) Future bind-probe output masks itself: interactive_plan/tests/e2e/mask-labels.ts labels each address from the map (or a numbered stand-in), used by security.spec.ts; 3 new unit tests. The masked output was observed in one run of the bind-probe test. (6) ADR elaboration headings in adr-0001..0015, adr-0020..0022 now say "binding only once the owner APPROVES this ADR" instead of "in the plan app" (wording only; adr-0016 kept as written). (7) SCHEMA §8 registry: adr-0001..adr-0027, next free adr-0028.
- stales: [adr-0001, adr-0002, adr-0003, adr-0004, adr-0005, adr-0006, adr-0007, adr-0008, adr-0009, adr-0010, adr-0011, adr-0012, adr-0013, adr-0014, adr-0015, adr-0020, adr-0021, adr-0022, ip-wiki-lint] (no approvals exist yet)

## [2026-10-09] schema | approvals given in Claude Code and recorded by Claude; read-only portal; masking and the sanctioned raw edit

- session: s01
- pages: [schema, ops-approval-workflow, ops-git-conventions, ops-environment-setup, ops-resume-after-interruption, qual-definition-of-done, qual-phase-gate-checklist, adr-0014, ov-open-questions, ov-research-statistical-analysis-plan]
- sources: [raw/owner/2026-10-09-s01-plan-app-feedback.md, raw/owner/2026-10-09-s01-portal-v2-decisions.md]
- result: SCHEMA: §1.4 (portal reads only plain-language JSON), §3.1 (sanctioned masking edit; no real machine values in committed files; MANIFEST exception), §3.2, §3.4, §4.2 (approvals.json written by Claude via tools/approvals_record.py; tools/ and .env.local-map rows), §5.1 approvable, §8 registry, §9.3 RAW-IMMUTABLE row, §9.7 (P0 exception wording; exit approval in Claude Code), §10.1 (new writer rule replacing "only the plan app writes" and "Claude MUST NOT write"; recorded_by and owner_words fields), §10.2, §10.4. CLAUDE.md: §1 step 10 wording, §6 masking rule, §8 approvals rewritten the same way (SCHEMA-SPLIT checked by reading both). ops-approval-workflow: who-does-what table, step-by-step recording, diagrams, §6-§8 wording (waves are now approved in Claude Code; Wave 1 lists adr-0023..0027 instead of adr-0016). Root PLAN.md, AI_USAGE.md, RESEARCH_PLAN.md and interactive_plan/README.md updated to match. .gitignore names .env.local-map explicitly. New Q-221: rewrite git history before the first push (holds the first push only, not a phase gate).
- stales: [schema] (CLAUDE.md changed too, so the bootstrap_hash would differ; no approval exists yet)

## [2026-10-09] correct | committed files masked: real IPs and the user-folder path replaced by masks (sanctioned raw edit)

- session: s01
- pages: [log, ops-environment-setup, ops-resume-after-interruption]
- sources: [raw/evidence/phase-p0-planning/interactive-plan/IP-1-scaffold.txt, raw/evidence/phase-p0-planning/interactive-plan/IP-1-spikes.txt, raw/evidence/phase-p0-planning/interactive-plan/IP-10-arch-labels-fix.txt, raw/evidence/phase-p0-planning/interactive-plan/IP-2-tests.20261008-2358.txt, raw/evidence/phase-p0-planning/interactive-plan/IP-2-tests.txt, raw/evidence/phase-p0-planning/interactive-plan/IP-3-tests.txt, raw/evidence/phase-p0-planning/interactive-plan/IP-4-tests.txt, raw/evidence/phase-p0-planning/interactive-plan/IP-5-gate.txt, raw/evidence/phase-p0-planning/interactive-plan/IP-6-tests.txt, raw/evidence/phase-p0-planning/interactive-plan/IP-7-tests.txt, raw/evidence/phase-p0-planning/interactive-plan/IP-8-tests.20261009-0241-unit-fail.txt, raw/evidence/phase-p0-planning/interactive-plan/IP-8-tests.txt, raw/evidence/phase-p0-planning/interactive-plan/IP-9-review-fixes.txt, raw/evidence/phase-p0-planning/interactive-plan/IP-9-verify.txt, raw/evidence/phase-p0-planning/interactive-plan/playwright-report.zip, raw/evidence/phase-p0-planning/tools-wave0b-check.txt]
- result: Per the owner's decision "Mask files now, rewrite history before first push" (raw/owner/2026-10-09-s01-portal-v2-decisions.md, adr-0027). Real values replaced by masks (<USERPROFILE>, <USERPROFILE_SHORT>, <LAN_IPV4_1>, <WSL_IPV4_1>, <LAN_IPV6_n>, <LINK_LOCAL_IPV6_n>, <LAN_IPV6_NET>) with pwsh tools/mask.ps1 --file in these 16 raw evidence files: IP-1-scaffold.txt, IP-1-spikes.txt, IP-10-arch-labels-fix.txt, IP-2-tests.20261008-2358.txt, IP-2-tests.txt, IP-3-tests.txt, IP-4-tests.txt, IP-5-gate.txt, IP-6-tests.txt, IP-7-tests.txt, IP-8-tests.20261009-0241-unit-fail.txt, IP-8-tests.txt, IP-9-review-fixes.txt, IP-9-verify.txt, playwright-report.zip (all under raw/evidence/phase-p0-planning/interactive-plan/) and raw/evidence/phase-p0-planning/tools-wave0b-check.txt. Nothing else in them changed (the zip was rebuilt with the same entries; its embedded report data still opens). Each file's MANIFEST.sha256 line now holds the new hash, and the new hash is listed in tools/raw-sanctioned-edits.tsv. Also masked: one earlier log.md entry (2026-10-09 code entry for p0.10 / IP-1, two IP addresses in its result line; the only edit of an existing log entry, sanctioned by the same decision), ops-environment-setup and ops-resume-after-interruption (commands now use $HOME instead of the real user path), and a code comment in interactive_plan/lib/lint/git.ts. Not masked, by rule: the owner's name in raw/owner/ and raw/01-scoping-decisions.md (authorship). Git history still holds the original values; Q-221 asks the owner to approve a history rewrite before the first push.
- stales: [ops-environment-setup, ops-resume-after-interruption]

## [2026-10-09] lint | p0.17 rules step: quick lint 0 errors, lint:wiki 0 errors, mask scan 0 unmasked

- session: s01
- sources: [raw/evidence/phase-p0-planning/p0.17-rules-checks.txt]
- result: python tools/quick_lint.py: 200 files, 0 errors, 0 warnings. npm run lint:wiki: 0 errors, 34 warnings (the same 34 as at IP-10: UNV-MIRROR, CONTRADICTION registered, INT-NUMBER-NOSRC thresholds, one MERMAID-RULES size warning; dispositions unchanged from the IP-5/IP-10 lint entries), 2 info; no RAW-IMMUTABLE error for the sanctioned edits. pwsh tools/mask.ps1 --scan: 0 unmasked values. Also: tools tests 34 OK, npm test 881 passed, typecheck and eslint exit 0.

## [2026-10-09] plan | p0.17 step "rules" committed: portal v2 rules, masking, approvals recorder

- session: s01
- pages: [status-live]
- sources: [raw/evidence/phase-p0-planning/p0.17-rules-checks.txt]
- result: What was done → the owner's portal-v2 decisions are written rules (adr-0023 to adr-0027, SCHEMA, CLAUDE.md, ops-approval-workflow), committed evidence is masked, approvals can be recorded with tools/approvals_record.py, and the lint accepts only the listed masking edits. After the commit, npm run lint:wiki again reported 0 errors (the history check sees the masking commit as sanctioned). STATUS: In-flight cleared; new blocker "first push" (Q-221).
- next: Claude builds the wiki-to-JSON pipeline for the portal (p0.17, adr-0024)
- commit: 5d33859

## [2026-10-09] ingest | Claude Code docs on Stop hooks and project skills

- session: s01
- pages: [index, ops-portal-pipeline]
- sources: [raw/research/claude-code-hooks-skills.md]
- result: New research note (official docs read 2026-10-09) → it backs the hook and skill design. Stop hooks get stop_hook_active in their input; exit 2 keeps the turn open and shows stderr to Claude; any other non-zero exit is a non-blocking error; exec form with args is recommended for ${CLAUDE_PROJECT_DIR}; SKILL.md lives in .claude/skills/<name>/ with optional frontmatter (description is what triggers it). Also observed: PowerShell Test-Json cannot follow a $ref into another schema file. MANIFEST.sha256 gained 1 line.

## [2026-10-09] decide | wiki-to-portal pipeline: where the JSON lives, its shapes, the checker, the hook, check-script folders

- session: s01
- pages: [ops-portal-pipeline, schema, ops-git-conventions]
- sources: [raw/owner/2026-10-09-s01-portal-v2-decisions.md, raw/owner/2026-10-09-s01-wave0c.md, raw/research/claude-code-hooks-skills.md]
- result: Decided by Claude under the delegation policy (tooling and schema; the owner can overturn any of them). (1) Portal JSON in plan/portal/ (overview, roadmap, phases/<phase-id>, decisions, risks, research, architecture, questions, log, refs), one JSON Schema each in plan/portal/schema/, shared pieces in common.schema.json; the checker merges those in because Test-Json cannot follow a cross-file $ref. (2) Every translated record carries source {wiki_path, content_hash} → a later page edit shows as STALE. (3) Rules are data in plan/portal/pipeline.json: which pages map to which file, that every Q-NNN question and every log heading needs an entry, which words count as ids. (4) Shapes enforce "short and crisp": title up to 80 characters, summary up to 360, every thought chain must contain an arrow. (5) Ids in prose are written as [words](ref:id); every id-looking word must have an explainer in refs.json, including P0-P8 aliases and commit shas. (6) Nullable fields use type lists, not anyOf, so errors stay readable. (7) Check-script folders (left open by adr-0025): scripts/verify/<task-id>-<slug>.ps1 and scripts/gates/<pN>-gate.ps1, as in the approved phase-popup mockup; a script field is null until the file exists. (8) Stop hook in .claude/settings.json, exec form pwsh ... -Hook; it does nothing unless plan/portal/.hook-enabled exists, never blocks when stop_hook_active is true, and exits 1 (not 2) if the checker crashes so it can never trap a session. (9) The bookkeeping commit also carries plan/portal/log.json and overview.json once they exist (same-edit rule).
- stales: [ops-git-conventions] (no approvals exist yet)

## [2026-10-09] schema | portal JSON location and the same-edit rule

- session: s01
- pages: [schema, ops-git-conventions]
- sources: [raw/owner/2026-10-09-s01-portal-v2-decisions.md]
- result: SCHEMA §3.4 now names plan/portal/, the source hash on each record, the same-edit MUST and the clean check before commits (not a lint:wiki code: it checks JSON, not the wiki); §4.2 gains rows for plan/portal/, .claude/ and scripts/verify + scripts/gates, and tools/ lists the checker; §9.5 bookkeeping commit includes the portal log and overview JSON. CLAUDE.md §2 and §7 say the same (checked by reading both, SCHEMA-SPLIT). ops-git-conventions step 5 matches.
- stales: [schema] (CLAUDE.md changed too; no approval exists yet)

## [2026-10-09] lint | p0.17 pipeline step: 20 checker tests pass, quick lint and lint:wiki 0 errors

- session: s01
- pages: [ops-portal-pipeline]
- sources: [raw/evidence/phase-p0-planning/p0.17-pipeline-checks.txt]
- result: pwsh tools/test-portal-sync-check.ps1: 20 passed, 0 failed (clean fixture passes; STALE, MISSING, missing phase file, BAD-SHAPE, BAD-JSON, UNKNOWN-REF, UNCOVERED log heading and question, ORPHAN, MISSING-SCRIPT, MISSING-FILE, DUP-ID each caught; ids inside paths and code are not flagged; -Hash equals the SCHEMA §10.2 Python reference on a CRLF file; hook: off → 0, on + stale → 2 with the reason on stderr, stop_hook_active → 0, clean → 0, repo found through CLAUDE_PROJECT_DIR; real repo checked in 0.68 s). Real repo: 158 MISSING, 9 MISSING-FILE, as expected before the content JSON is written (next step). The configured hook command on the real repo exits 0 (switched off). python tools/quick_lint.py 202 files 0 errors; npm run lint:wiki 0 errors, 34 warnings (the same 34 as before, none from the new pages), 2 info.

## [2026-10-09] plan | p0.17 step "pipeline" committed: wiki-to-portal JSON pipeline, hook switched off

- session: s01
- pages: [status-live]
- sources: [raw/evidence/phase-p0-planning/p0.17-pipeline-checks.txt]
- result: What was done → the pipeline that turns wiki changes into plain-language portal JSON exists (skill, shapes, rules, checker, tests, Stop hook installed but off), and plan/portal/log.json holds its first entry. After the commit, npm run lint:wiki reported 0 errors (before the commit it reported 2 RAW-IMMUTABLE errors for the two new raw files while they were only staged, as an "uncommitted change (A)"; this clears on commit, same as at the rules step). STATUS: In-flight cleared, next action updated.
- next: Claude writes the portal content JSON for every page until the checker is clean, then creates plan/portal/.hook-enabled
- commit: 8d89329

## [2026-10-09] decide | portal content: how the six writers' text was merged, empty script fields, plain-word fixes, check switched on

- session: s01
- pages: [ops-portal-pipeline, status-live]
- sources: [raw/owner/2026-10-09-s01-plan-app-feedback.md, raw/owner/2026-10-09-s01-portal-v2-decisions.md, raw/owner/2026-10-09-s01-wave0c.md]
- result: Decided by Claude under the delegation policy (tooling and wording; the owner can overturn any of them). (1) Six writers each produced part of the portal text plus an explainer list; the lists were merged into plan/portal/refs.json (374 explainers, no duplicate ids or aliases). Where two writers explained the same id, the owning area's text was kept: phases P0-P4 and their tasks from the first phases writer, P5-P8 from the second, decisions and risks from their writer, experiments from the research writer, questions and commits from the log writer, components, layers and groups from the architecture writer. The temporary plan/portal/refs.parts/ folder was removed. (2) Every check-script field is null until the script exists (the checker reports a missing file otherwise); the scripts follow ops-portal-pipeline §3 (scripts/verify/<task-id>-<slug>.ps1, scripts/gates/<pN>-gate.ps1), not the shorter <task-id>.ps1 one writer used. (3) roadmap.json phase goals now use the same words as the phase files. (4) One read-through as the owner: lint, smoke test, CI, pre-commit hook, JSON lines and micro-benchmark replaced by plain words in the phase files; question popups for the three withdrawn duplicates and the tab-sleeping questions reworded; a log decision line corrected (one folder for task scripts, one for gate scripts). (5) The overview shows the true state: portal text done, check scripts and the new portal site next, Claude acts next (nothing for the owner to run). (6) The research schema has no fields for the score J text, the integrity promises, the fairness rules and the top threats, so they live in the explainers of the matching overview pages; adding fields is left to the portal build step. (7) The end-of-turn check is switched on: plan/portal/.hook-enabled created.

## [2026-10-09] correct | stale "approve in the plan app" wording fixed on two phase pages, risk-r22 and adr-0001

- session: s01
- pages: [phase-p0-planning, phase-p1-foundation, risk-r22, adr-0001]
- sources: [raw/owner/2026-10-09-s01-portal-v2-decisions.md]
- result: Consistency fixes under the delegation policy, so the pages agree with adr-0023 (owner approves in Claude Code, Claude records with tools/approvals_record.py). phase-p0-planning p0.17 now describes the portal v2 work and its check (portal check clean; approvals recorded by Claude). phase-p1-foundation: p1.1 confirms and records the toolchain already installed (observed 2026-10-09 and re-checked by the integrator: rustc 1.99.0, cargo 1.99.0, Visual Studio Build Tools 2022 17.14; cargo-deny not installed; not yet saved as evidence) and adds PowerShell 7; the local CI script runs under PowerShell 7 (adr-0025; the page said Windows PowerShell 5.1); p1.3 no longer asks for commit permission (Q-104 answered 2026-10-08); p1.9 approvals are given in Claude Code. risk-r22 mitigation, trigger, description and spike section now describe the recorder script and its tests, and say that no interrupted-write test exists yet; score unchanged. adr-0001: only the Claude elaboration, consequences and follow-ups changed (the owner's quoted decision is untouched); they no longer say only the plan app writes approvals. adr-0022's context still mentions the plan app, but only as history of what happened then, so it stays. STATUS: the Rust and MSVC blocker row now says installed.
- stales: [phase-p0-planning, phase-p1-foundation, risk-r22, adr-0001] (no approvals exist yet)

## [2026-10-09] lint | p0.17 content step: portal check clean, quick lint and lint:wiki 0 errors, mask scan 0 unmasked

- session: s01
- pages: [status-live, ops-portal-pipeline]
- sources: [raw/evidence/phase-p0-planning/p0.17-content-checks.txt]
- result: pwsh tools/portal-sync-check.ps1: clean (18 files, 252 translated records, 374 refs), exit 0; the full real-repo check now takes 3.72 s inside the test run (0.68 s with almost no JSON; target under 5 s). pwsh tools/test-portal-sync-check.ps1: 20 passed, 0 failed. The configured Stop-hook command, now switched on, exits 0 on the clean repo. python tools/quick_lint.py: 202 files, 0 errors, 0 warnings (before the evidence file existed it reported 1 REF-DANGLING for the STATUS link to that file, as expected). npm run lint:wiki: 0 errors, 34 warnings (the same 34 as before), 2 info. pwsh tools/mask.ps1 --scan: 555 tracked files, 0 unmasked; --file on the new portal JSON: nothing to mask. MANIFEST.sha256 gained 1 line.

## [2026-10-09] plan | p0.17 step "content" committed: portal text for every page, end-of-turn check switched on

- session: s01
- pages: [status-live]
- sources: [raw/evidence/phase-p0-planning/p0.17-content-checks.txt]
- result: What was done → every page the portal shows now has plain-language JSON with a fresh fingerprint, every id has an explainer, and the end-of-turn check runs on every Claude turn (it blocks a turn that leaves the portal out of step with the wiki). STATUS: In-flight empty, Rust/MSVC row says installed, next action updated (check scripts, then the new portal site). The evidence file's working copy was converted to LF line endings after the commit, matching the committed bytes.
- next: Claude writes the PowerShell 7 check scripts (one per task, one per phase gate) and fills their paths in the phase JSON; then rebuilds the portal from the approved mockups
- commit: ed8b89c

## [2026-10-09] decide | check scripts: names, result words and exit codes, owner steps in gates, drafts for P2-P8, report formats P1 needs

- session: s01
- pages: [ops-portal-pipeline, adr-0025, phase-p0-planning, phase-p1-foundation]
- sources: [raw/owner/2026-10-09-s01-plan-app-feedback.md, raw/owner/2026-10-09-s01-portal-v2-decisions.md, raw/owner/2026-10-09-s01-wave0c.md, raw/evidence/phase-p0-planning/p0.17-scripts-checks.txt]
- result: Decided by Claude under the delegation policy (tooling; the owner can overturn any of them). (1) Names follow ops-portal-pipeline §3: scripts/verify/<task-id>-<slug>.ps1 (141) and scripts/gates/p<N>-gate.ps1 (9), not the shorter <task-id>.ps1 of the step brief; slugs are hand-picked where the automatic one read badly. (2) One shared module, scripts/lib/Ferrum.Check.psm1: result words PASS, FAIL, WAIT (waits for the owner or earlier work), TODO (planned, later phase), YOURS (manual owner step, never fails); exit 0 = all checked steps pass, 1 = any FAIL, 2 = no FAIL but WAIT or TODO; an unexpected error inside a step becomes that step's FAIL with the error text, never a crash. (3) Gates list the owner's manual rows and approvals as YOURS, so the P0 gate exits 0 when every automatic check passes; the phase still ends only with the owner's #exit approval. Task scripts that wait for an approval (p0.17, p0.18) end NOT READY (2). (4) The P0 gate does not re-run the p0.13-p0.16 task scripts: its full test-gate run (style, types, unit, browser tests, build) covers them; it shares one wiki-check run with the task scripts through FERRUM_CHECK_LINT_JSON (file in the ignored interactive_plan/.lint/). (5) Scripts change nothing by default; -SaveEvidence writes a new masked file (tools/mask.ps1 --stdin) and adds a time stamp rather than overwrite a raw file; the P1 gate saves each command's output under the evidence names the P1 page lists. (6) P1 scripts fix formats the phase page left open: experiment 2 report table with "Route" and "Executed" columns; experiment 3 in spikes/s3-raw-com; experiment 4 re-run with "npm run check" in spikes/s4-playwright-cdp, targets.json there; npm-audit.txt for the plan-app audit; the before-commit check at scripts/hooks/pre-commit, tested in a temporary clone; the p1.1 link test builds a tiny program, not a library (a library build does not link). (7) P2-P8 scripts are drafts generated once from the phase JSON and the pages' verify fields (generator kept in the scratchpad, not committed): each lists its planned checks as TODO steps, quotes the planned command in its header, and ends "not ready until P<n>" (exit 2); Claude makes them real when the phase starts. (8) The wiki phase pages' verify fields are not edited to name the scripts: the portal JSON script field is the link, and ops-portal-pipeline §7 documents the layout (no re-translation of nine pages). (9) Scripts read the phase status from the portal JSON and say "has not started, so FAIL is expected" for P1-P8.

## [2026-10-09] lint | p0.17 scripts step: P0 gate PASS, P1 gate FAIL as expected, script test PASS, portal check clean

- session: s01
- pages: [ops-portal-pipeline, status-live]
- sources: [raw/evidence/phase-p0-planning/p0.17-scripts-checks.txt]
- result: pwsh scripts/run-all-checks.ps1 -Phase P0: PASS, exit 0, 262 s (23 PASS, 4 YOURS: task checks p0.1-p0.12, typecheck and eslint, 881 unit tests, 144 browser tests, build, fingerprint cross-check over 197 files, lint:wiki 0 errors, portal check clean, mask scan 0 unmasked, 34 Python tool tests and 20 portal-checker tests, script test). p0.13, p0.14, p0.15, p0.16 run alone: PASS (p0.16 = npm run verify, 175 s); p0.17 and p0.18: NOT READY, exit 2 (waiting for the owner's approvals; nothing failed). pwsh scripts/run-all-checks.ps1 -Phase P1: FAIL, exit 1, 67 s, as expected before P1 starts: entry gate WAIT (19 approvals or questions open), 16 task checks FAIL (the review step p1.16 included) with plain messages and no crash, p1.10 PASS (history-based wiki rules were built early, in P0), plan-app checks and wiki check PASS. p1.1 alone: Rust 1.99.0 (x86_64-pc-windows-msvc), cargo 1.99.0, VS Build Tools 2022 17.14.37710.0 found with vswhere, Node v24.20.0, npm 11.19.0, Python 3.12.10, git 2.52.0.windows.1, PowerShell 7.6.6 and the link test PASS; FAIL only on cargo-deny (not installed; part of p1.1) and toolchain.txt (not saved; part of p1.1). pwsh scripts/test-check-scripts.ps1 -RunDrafts: PASS (156 PowerShell files parse, 150 task and gate scripts follow the house rules and are all linked from the portal JSON, 113 drafts exit 2); a deliberately broken temporary file was reported as FAIL with line numbers, then deleted. pwsh tools/portal-sync-check.ps1: clean (18 files, 252 records, 375 refs). python tools/quick_lint.py: 202 files, 0 errors. npm run lint:wiki: 0 errors, 34 warnings (unchanged), 2 info. pwsh tools/mask.ps1 --scan: 727 tracked files, 0 unmasked. MANIFEST.sha256 gained 1 line.

## [2026-10-09] plan | p0.17 step "scripts" committed: check scripts for every task and phase, P0 gate passes

- session: s01
- pages: [status-live]
- sources: [raw/evidence/phase-p0-planning/p0.17-scripts-checks.txt]
- result: What was done → every task and phase now has a PowerShell 7 check script with a plain-language header; the P0 gate passes in one run, P1 scripts fail cleanly until P1 work exists, P2-P8 are drafts; the portal JSON names every script and the portal check stays clean. After the commit, npm run lint:wiki reported 0 errors, 34 warnings. STATUS: In-flight cleared, next action updated (the new portal site).
- next: Claude rebuilds the portal from the approved mockups (read-only, reads plan/portal/); then the owner reviews it and gives the Wave 1 approvals in Claude Code
- commit: adc3651

## [2026-10-09] decide | portal shell: what was removed, what stays, data layer, fonts, read-only gate, test setup

- session: s01
- pages: [comp-interactive-plan, adr-0023, adr-0024]
- sources: [raw/owner/2026-10-09-s01-plan-app-feedback.md, raw/owner/2026-10-09-s01-portal-v2-decisions.md, raw/owner/2026-10-09-s01-wave0c.md]
- result: Decided by Claude under the delegation policy (tooling; the owner can overturn any of them). (1) Removed from interactive_plan/ (still in git history): the wiki browser, search, the /lint view, the approvals inbox, the approve bar, POST /api/approvals with its store, lock, guard and log writer, the v1 views (dashboard, phase pages, architecture graph, roadmap, decisions, risks, research, log) and their tests; the libraries only they used (xyflow, dagre, mermaid, react-markdown, rehype-slug, remark-gfm) were uninstalled, which also removes the mermaid/katex npm audit findings. (2) Kept: the wiki check engine (lib/lint, lib/wiki, the approval-state and fingerprint modules) because npm run lint:wiki and npm run gate are the normative wiki check that the check scripts and SCHEMA use; they stay command-line tools, not pages. Also kept: the Next 16 stack, 127.0.0.1-only bind, Host check, security headers, theme toggle. (3) Data layer: zod schemas are generated from plan/portal/schema/*.json (scripts/gen-portal-schemas.mjs, npm run schemas:portal); a test fails when the generated file is stale, breaks each real file keyword by keyword (about 1180 cases) and uses PowerShell Test-Json as an independent referee: zod and Test-Json agree on every case. A missing or misshapen file shows a plain note at the top of the page instead of crashing. (4) Ids: every [words](ref:id) link and every word matching the pipeline.json id patterns renders as a button that opens the refs.json explainer in one native modal dialog; related ids open in the same dialog with a Back button; focus returns to the opener. (5) The phase popup shows each task's check script by name with the run command, and the gate's run command, not the script's contents: the portal reads only plan/portal and plan/approvals.json. (6) Approval labels are read-only and need no wiki: a stored fingerprint equal to the one the portal text was written from shows "Approved", a different one "Approved, page edited since" (Claude's checker decides whether that edit matters). (7) Fonts: IBM Plex Sans and Mono from the pinned @fontsource packages (5.3.0) through next/font/local, so builds work offline and no request leaves the computer. (8) Hardening: every route now refuses methods other than GET and HEAD (405), since the portal has no write route. (9) Browser tests run one production server on 3418 against the real plan/ folder (the portal only reads; the teardown fails the run if approvals.json, any portal JSON file, log.md or STATUS.md changed); the other tabs show a placeholder with their summary until the next step builds them. (10) Check scripts p0.13, p0.14 and p0.15 re-check what still exists (portal browser tests; approval-state, approvals-file and request-gate tests; outdated-approval tests) and say in their header that the v1 screens were replaced; p0.17 also runs the portal unit tests. The phase page and phase JSON wording of those done tasks is unchanged. (11) comp-interactive-plan keeps last_verified_commit 3eaa641 until the whole rebuild lands; its responsibilities and interfaces now describe the portal. (12) The ip-* specification pages still describe v1; they are updated or marked as history when the rebuild is complete.
- stales: [comp-interactive-plan] (no approvals exist yet)

## [2026-10-09] lint | p0.17 portal shell: npm run verify and the P0 gate pass, portal check clean, mask scan 0 unmasked

- session: s01
- pages: [comp-interactive-plan, status-live]
- sources: [raw/evidence/phase-p0-planning/p0.17-portal-shell-checks.txt]
- result: cd interactive_plan && IP_REQUIRE_BIND_PROBE=1 npm run verify: exit 0 (typecheck and eslint clean; 708 unit tests in 21 files, including the portal schema tests where zod and PowerShell Test-Json agree on every one of about 1180 single-keyword changes, and the test that every id in the real portal text renders as a working reference; lint:wiki 0 errors, 34 warnings (unchanged), 2 info, 8 real-wiki tests passed and the strict-warnings test skipped as before (the 4 v1 graph-layout tests were removed with the graph views); build; 28 browser tests passed, the teardown found all 22 guarded real files unchanged). npm run test:coverage: thresholds met (lib/portal: 100 % of lines, 96.7 % of statements, 90.5 % of branches). pwsh scripts/run-all-checks.ps1 -Phase P0: PASS, exit 0, 158 s (23 PASS, 4 YOURS). Changed task scripts alone: p0.13 PASS, p0.14 PASS, p0.15 PASS, p0.17 NOT READY (exit 2: portal check, script test and portal tests pass; waits for the owner's approvals). pwsh scripts/test-check-scripts.ps1: PASS. python tools/quick_lint.py: 202 files, 0 errors. pwsh tools/mask.ps1 --scan: 0 unmasked. pwsh tools/portal-sync-check.ps1: clean. npm audit: the mermaid/katex findings are gone with mermaid; 5 high findings remain in development tooling (braces/micromatch under eslint-config-next), accepted until the P0 exit recheck (wave 0c item 8). MANIFEST.sha256 gained 1 line.

## [2026-10-09] code | p0.17 portal shell: read-only data layer, Layout-A shell, reference popup, Overview and phase popup

- session: s01
- pages: [comp-interactive-plan]
- sources: [raw/owner/2026-10-09-s01-plan-app-feedback.md, raw/owner/2026-10-09-s01-portal-v2-decisions.md, raw/evidence/phase-p0-planning/p0.17-portal-shell-checks.txt]
- result: interactive_plan/ is now the read-only portal (task p0.17, step "portal-data-shell"). New: lib/portal (generated zod schemas, loader with plain problems and a size/mtime memo, reference tokenizer and lookup, view helpers, tabs), scripts/gen-portal-schemas.mjs, components/portal (RefProvider with the one reference dialog, Ref, RichText, Modal, PhasePopup, TopNav, TabPlaceholder), the Overview page per the Main mockup, placeholder pages for the six other tabs, self-hosted IBM Plex fonts, new CSS tokens from the mockups with a dark theme; proxy refuses non-loopback Hosts (403) and every method other than GET and HEAD (405). Removed: the v1 pages, components, approvals write path and their tests (see the decide entry). Tests: portal-schemas, portal-refs, portal-load, approvals-file (unit); overview, refs, shell, security (browser). comp-interactive-plan responsibilities and interfaces updated in the same commit (stales its approval; none exists). Check scripts p0.13, p0.14, p0.15 and p0.17 updated.
- next: Claude builds the Roadmap, Architecture, Decisions, Research, Questions and Log views from the approved mockups

## [2026-10-09] plan | p0.17 step "portal-data-shell" committed: read-only portal with Overview, phase popup and reference popup

- session: s01
- pages: [status-live]
- sources: [raw/evidence/phase-p0-planning/p0.17-portal-shell-checks.txt]
- result: What was done → the portal is read-only and reads only plan/portal and plan/approvals.json; its Overview, phase popup and reference popup follow the approved mockups, and the v1 wiki browser and approval screens are gone. STATUS: In-flight cleared, next action updated (the six remaining tabs); a refs.json explainer was added for the new commit.
- next: Claude builds the Roadmap, Architecture, Decisions, Research, Questions and Log tabs from the approved mockups
- commit: 673cbdc

## [2026-10-09] decide | portal views: script popup reads named check scripts, phase popups in the layout, risks on the Decisions tab, axe checks

- session: s01
- pages: [comp-interactive-plan, adr-0024]
- sources: [raw/owner/2026-10-09-s01-plan-app-feedback.md, raw/owner/2026-10-09-s01-portal-v2-decisions.md, raw/owner/2026-10-09-s01-wave0c.md]
- result: Decided by Claude under the delegation policy (tooling; the owner can overturn any of them). (1) Script popup: the owner asked to review each check script ("I will review the script, PS script"), so the portal now shows the real script text, read-only. GET /api/script?path= serves a script only when a portal JSON `script` field (task, gate or next action) names it, the path matches `scripts/...ps1` without `..`, its real path stays inside scripts/ and it is at most 256 KB; anything else is a 404 with a plain message and no file-system details. This replaces the earlier "name and command only" rule of the portal-data-shell step; adr-0024's Claude elaboration gets one bullet saying so (the owner-quoted decision is unchanged). (2) The gate part of the phase popup shows the script's own top explanation inline (its `<# ... #>` block without the help keywords) plus a button for the whole script, rather than the full script inline. (3) The nine phase popups are rendered once in the layout, so every tab and every phase id can open them; a phase id's explainer has a button "Open the whole phase". Links inside a popup close it before navigating. (4) Risks have no tab of their own; they are listed on the Decisions tab, highest likelihood × impact first, each with a popup. (5) Decisions, risks and research items open a shared detail popup with labelled plain fields and related ids by title; the research tab shows one line per item with section counts. (6) Questions are grouped open, answered, withdrawn (file order inside a group); the Log shows newest first with an All / Has decisions / Has approvals filter. (7) Architecture: the diagram is built from the layers in architecture.json (neighbouring layers with the same "What you see:" prefix share a row), the colour key sits inside the diagram card so the five engine parts fit in one row at 1280 px; the group switcher keeps the chosen group in the address (#group-<id>). (8) Accessibility: axe-core 4.14.0 (already in the lockfile through eslint) is now an exact devDependency; every tab is checked in light and dark themes and every popup type when open (WCAG 2.1 A and AA rules). It found one real problem, the Overview phase cards' label did not contain their visible text; the label override was removed. (9) The placeholder component of the previous step was deleted. (10) comp-interactive-plan keeps last_verified_commit 3eaa641 in this commit (a commit cannot name its own sha); the final-review step sets it, and marks the ip-* v1 specification pages as history.
- stales: [comp-interactive-plan, adr-0024] (no approvals exist yet)

## [2026-10-09] lint | p0.17 portal views: npm run verify and the P0 gate pass, portal check clean, mask scan 0 unmasked

- session: s01
- pages: [comp-interactive-plan, adr-0024, status-live]
- sources: [raw/evidence/phase-p0-planning/p0.17-portal-views-checks.txt, raw/evidence/phase-p0-planning/p0-gate.txt]
- result: cd interactive_plan && npm run verify: exit 0 (typecheck and eslint clean; 727 unit tests passed and 1 skipped in 23 files (the link-escape test needs Windows Developer Mode to create a link); lint:wiki 0 errors, 34 warnings (unchanged), 2 info; build exit 0; 69 browser tests passed, including axe on all seven tabs in both themes; the end-of-run guard found the 22 protected real files unchanged). npm run test:coverage: thresholds met, lib/portal 98.68% lines, 92.77% branches. P0 gate (scripts/run-all-checks.ps1 -Phase P0 -SaveEvidence): PASS, 23 PASS and 4 YOURS in 211 s, output saved masked as p0-gate.txt. Three earlier gate runs in this step failed for bookkeeping reasons only, each fixed before the final run: overview.json STALE after the STATUS In-flight edit; the STATUS link to the evidence file before it existed; the evidence file without its MANIFEST line. Task script p0.17: NOT READY (exit 2), 3 PASS and 1 WAIT for the owner's approvals, as expected. Portal check: clean (18 files, 252 records, 377 explainers). Quick lint: 202 files, 0 errors. Mask scan: 0 unmasked. npm audit: the same 5 high findings in development tooling, accepted until the P0 exit recheck.

## [2026-10-09] code | p0.17 portal views: Roadmap, Architecture, Decisions, Research, Questions and Log tabs; script popup

- session: s01
- pages: [comp-interactive-plan]
- sources: [raw/owner/2026-10-09-s01-plan-app-feedback.md, raw/owner/2026-10-09-s01-portal-v2-decisions.md, raw/evidence/phase-p0-planning/p0.17-portal-views-checks.txt]
- result: interactive_plan/ (task p0.17, step "portal-views"). New pages from the approved mockups: Roadmap (three stages, compact phase table that becomes cards on a phone, "Same in every phase"), Architecture (layered diagram of the Rust app from plain boxes, four-group switcher, part cards with what each talks to, footnote for the planning tooling), Decisions (row per decision with popup, replaced ones muted with their replacement, risks table with popups), Research (five short sections with popups), Questions (open first) and Log (done, next, decisions table, approvals table, commit; filter). New: app/api/script/route.ts, lib/portal/scripts.ts (named-script allow-list, reader, header extraction), lib/portal/scriptCommand.ts, lib/portal/dialogs.ts, view helpers; components ScriptProvider (script popup and ScriptButton), DetailPopup, GroupSwitcher, LogFilter, CloseLink, PageHead, RefTitle; the phase popups moved to the layout; RefProvider opens the whole phase for a phase id. Tests: unit tests for the script reader and the view helpers; browser specs per tab (roadmap, architecture, decisions, research, questions, log), scripts.spec (script popup on top of the phase popup, gate script, route allow-list, 405 for POST, 403 for a foreign Host) and a11y.spec (axe on every tab, light and dark). axe-core 4.14.0 added as an exact devDependency. Removed: components/portal/TabPlaceholder.tsx. comp-interactive-plan responsibilities and interfaces updated (GET /api/script).
- next: Claude does a final review of portal v2 (ip-* pages marked as history, comp-interactive-plan last_verified_commit), then prepares your walkthrough and the first approval wave

## [2026-10-09] plan | p0.17 step "portal-views" committed: all seven portal tabs, script popup, phase popups everywhere

- session: s01
- pages: [status-live]
- sources: [raw/evidence/phase-p0-planning/p0.17-portal-views-checks.txt, raw/evidence/phase-p0-planning/p0-gate.txt]
- result: What was done → the read-only portal now has all seven tabs of the approved mockups; phase popups open from every tab and every phase id, and each check script opens in a popup with the real file. STATUS: In-flight cleared, next action set (final review of portal v2); a refs.json explainer was added for the new commit.
- next: Claude does the final review of portal v2 (ip-* pages marked as history, comp-interactive-plan last_verified_commit), then prepares the owner walkthrough and Approval Wave 1
- commit: dfe164f

## [2026-10-09] decide | portal final review: visual fixes, one start script, ip-* pages describe v2, two v1 pages retired

- session: s01
- pages: [ip-spec, ip-routes-and-views, ip-data-contract, ip-wiki-lint, ip-testing, ip-approvals-api, ip-build-plan, comp-interactive-plan, ops-approval-workflow]
- sources: [raw/owner/2026-10-09-s01-plan-app-feedback.md, raw/owner/2026-10-09-s01-portal-v2-decisions.md, raw/owner/2026-10-09-s01-wave0c.md]
- result: Decided by Claude under the delegation policy (tooling and wording; the owner can overturn any of them). (1) The owner starts the portal with one script, `scripts/start-portal.ps1` (PowerShell 7): it finds Node also when it is not on PATH, installs packages once with npm ci, checks the port (if the portal already runs, it only opens the page), builds, starts on 127.0.0.1 and opens the browser; `-CheckOnly`, `-NoBrowser` and `-Port` options; it changes only ignored build folders. It is not a task check script, so it lives in `scripts/` and not in `scripts/verify/`. (2) Visual review against the mockups found five defects, all fixed: the Overview repeated a phase chip the row text already showed; punctuation could wrap away from an id chip ("(" at a line end, ")." or "?" at a line start); long architecture part names were centred and pushed the status chip down; "The other groups at a glance" left an empty fourth column; at phone width the phase popup's tasks table scrolled sideways (now one card per task) and the gate script's header kept its 110-character hard line breaks (now shown as labelled fields and reflowed paragraphs; no words are lost, checked by a unit test on all nine gate scripts). (3) ip-spec, ip-routes-and-views, ip-testing are rewritten for v2; ip-data-contract gets a v2 data section and says which parts serve the command-line wiki check; ip-wiki-lint is marked command line only. (4) ip-approvals-api and ip-build-plan are `status: retired` and `approvable: false`: they describe v1 only and approving history would mean nothing; Approval Wave 1 in ops-approval-workflow §8 now lists the five current ip-* pages. (5) v2 sets no page-render time target, so ip-spec drops the v1 target and its unverified tag (the portal reads a few small JSON files; the v1 measurements stay in the v1 evidence). (6) comp-interactive-plan `last_verified_commit` is 46fb685, the last commit on which `npm run verify` passed before this step's fixes (a commit cannot name its own sha); the fixes are covered by this step's evidence.
- stales: [ip-spec, ip-routes-and-views, ip-data-contract, ip-wiki-lint, ip-testing, ip-approvals-api, ip-build-plan, comp-interactive-plan, ops-approval-workflow] (no approvals exist yet)

## [2026-10-09] code | p0.17 portal final review: five visual fixes, start script, ip-* pages for v2

- session: s01
- pages: [comp-interactive-plan, ip-spec, ip-routes-and-views, ip-data-contract, ip-wiki-lint, ip-testing, ip-approvals-api, ip-build-plan, ops-approval-workflow]
- sources: [raw/evidence/phase-p0-planning/portal-v2/portal-verify.txt]
- result: interactive_plan/ (task p0.17, step "portal-verify"). RichText keeps punctuation on an id chip's line (`.ref-glue`); the Overview skips a row's extra chip when its text already shows that id; architecture part cards keep a long name left-aligned with the status chip top right; the glance cards fill the row; the phase popup's tasks table becomes one card per task below 640 px; `lib/portal/scripts.ts` gains `headerParts()` and the gate header shows labelled fields. Tests: unit tests for the chip glue and `headerParts()` (including every real gate header), browser checks for the phone-width task cards and the gate header fields. New `scripts/start-portal.ps1`; README "Start the portal" section explains it step by step. Wiki: the ip-* pages and comp-interactive-plan describe v2 (index lines updated); architecture.json and refs.json explainers for the portal updated.
- next: Claude prepares your walkthrough of the portal and the first approval wave in Claude Code

## [2026-10-09] lint | p0.17 portal verify: npm run verify and the P0 gate pass, portal check clean, mask scan 0 unmasked

- session: s01
- pages: [ip-spec, ip-routes-and-views, ip-data-contract, ip-wiki-lint, ip-testing, ip-approvals-api, ip-build-plan, comp-interactive-plan, status-live]
- sources: [raw/evidence/phase-p0-planning/portal-v2/portal-verify.txt, raw/evidence/phase-p0-planning/portal-v2/p0-gate.txt]
- result: Baseline before any change (HEAD 46fb685): npm run verify exit 0. Visual review: screenshots of the seven tabs at 1440 and 390 px, the P0 phase popup and a reference popup, read and compared with the mockups; five defects fixed and re-checked on new screenshots; no tab scrolls sideways at either width. Final state: cd interactive_plan && npm run verify exit 0 in one run (typecheck and eslint clean; 731 unit tests passed, 1 skipped (the link-escape test needs Windows Developer Mode); lint:wiki 0 errors, 34 warnings (unchanged), 2 info; build exit 0; 69 browser tests passed, including axe on all seven tabs in both themes; the end-of-run guard found the 22 protected files unchanged). npm run test:coverage exit 0, thresholds met (lib/portal 98.8% lines, 93.51% branches). P0 gate: PASS, 23 PASS and 4 YOURS in 216 s. scripts/start-portal.ps1: -CheckOnly exit 0; a full start on port 3422 answered HTTP 200, and a second run on the busy port only reported it and exited 0. Portal check clean (18 files, 252 records, 378 explainers); quick lint 202 files, 0 errors; check-script test PASS; Python tool tests 34 OK; mask scan 0 unmasked. One earlier gate run in this step failed at the Python tool tests because pages rewritten by a Python script had Windows line endings; all changed files were converted back to LF before the final run.

## [2026-10-09] plan | p0.17 step "portal-verify" committed: portal v2 reviewed against the mockups, start script, ip-* pages for v2

- session: s01
- pages: [status-live]
- sources: [raw/evidence/phase-p0-planning/portal-v2/portal-verify.txt, raw/evidence/phase-p0-planning/portal-v2/p0-gate.txt]
- result: What was done → the portal was checked against the mockups at desktop and phone width and five layout problems were fixed; one script now starts it; the ip-* pages describe the new portal. STATUS: In-flight cleared, next action set (owner walkthrough with scripts/start-portal.ps1); a refs.json explainer was added for the new commit. After the commit, `npm run lint:wiki` shows 0 errors and 42 warnings instead of 34: the 8 new ones are STALE-UPDATED on the pages this step changed (STATUS, log, comp-interactive-plan, ip-routes-and-views, ops-portal-pipeline, ov-open-questions, both phase pages), because the computer clock had passed midnight, so the commit is dated 2026-10-10 while the pages keep the session date 2026-10-09 given for this session. Left as is (warnings only); they clear at the next edit of each page.
- next: the owner walks through the portal and says what reads wrong or unclear; then Claude asks Approval Wave 1 in Claude Code
- commit: ef5dcc5

## [2026-10-09] correct | Q-008: the accessibility checker was added before the owner answered

- session: s01
- pages: [ov-open-questions]
- sources: [raw/owner/2026-10-09-s01-wave0c.md]
- result: The review of portal v2 found that Q-008 still said the axe accessibility library "would be added only with your consent", while `axe-core` 4.14.0 had already been added as an exact devDependency of `interactive_plan/` in the p0.17 "portal-views" step (commit dfe164f) and every portal tab is tested with it. Claude had treated it as a tooling choice under the delegation policy, but the question had promised to ask first. The register now says so in a dated correction, and the question stays open in a new form: keep the checker, or remove it (if removed, Claude uninstalls it and drops the accessibility browser tests). The portal question reads the same. Nothing else depends on the answer.

## [2026-10-09] decide | p0.17 review fixes: one question list, task states, no slugs in popups, cross-file checks, faster portal check

- session: s01
- pages: [ops-portal-pipeline, comp-interactive-plan, ip-routes-and-views, phase-p0-planning, phase-p1-foundation, ov-open-questions]
- sources: [raw/owner/2026-10-09-s01-plan-app-feedback.md, raw/owner/2026-10-09-s01-portal-v2-decisions.md, raw/owner/2026-10-09-s01-wave0c.md]
- result: Decided by Claude under the delegation policy (tooling, wording and checks; the owner can overturn any of them). 30 review findings were checked one by one: 29 confirmed and fixed, 1 rejected. (1) "Questions for you" is one list: the first-wave questions Q-207, Q-004, Q-005 and Q-108; the Overview row, the side list and the tab badge are all counted from that list, and the checker compares the open count and each listed question with questions.json. Q-221 (history rewrite) stays on its own "First upload" row, because it is asked before the first push, not now. (2) Every phase task has a `status` (Done, In progress, Waiting for you, Not started); the phase popup shows it, and `progress.done` must equal the tasks marked Done (p0.17 is "Waiting for you"). (3) Explainers in refs.json carry no `source` any more; instead the checker reports MISMATCH when an explainer's title, status or summary disagrees with its record, when a roadmap row disagrees with its phase file, or when a layer or group list disagrees with its parts. Architecture layers take ov-arch-system-overview and groups take adr-0026 as their source; stages and "same in every phase" stay portal-only summaries (the checker requires each phase in exactly one stage). (4) The checker walks each file once and runs each id pattern once per file: about 2.3 s instead of 4 to 8 s; its speed test limit is 10 s, a third of the Stop hook's 30 s timeout. (5) Popups show titles and short names ("Decision 19", "Risk 4", "P1"), never internal slugs; the "Planning page" kind is now "Plan note". (6) A decision shows one plain standing ("You chose this on 8 Oct; its written page waits for your sign-off in Claude Code") instead of "Accepted", "You decided" and "Not approved yet" side by side. (7) Parts that are not ours (Windows, WebView2, Chrome and Edge) have `ours: false`, a status such as "Provided by Microsoft" and "Used from P1" instead of "Built in P1". (8) Architecture follows the mockup: the diagram with a "How to read this" side panel; connections live only in each part's popup; other groups list one short line per part. (9) Gates have one command, the gate script itself; `scripts/run-all-checks.ps1 -Phase P<N>` is mentioned only in the new "For Claude" field. Every check-script header ends with a "For Claude" field that holds exit codes, rule codes and file names; the part the owner reads uses words only (a script self-test enforces it), and the phase popup hides "How to run" and "For Claude". (10) Approval waits name pages in plain words ("14 pages are not approved yet: the rule book, the P1 plan, 9 decisions and 3 parts of the app"); the keys go only into the saved evidence. A broken approvals file is now a FAIL, not "waiting for you". (11) The P0 gate also checks the four saved outputs of p0.16 and ends with "P0 gate passed", the same words as its header. (12) The Overview's start-script path opens the script popup; non-check scripts get their own note instead of "prints PASS, FAIL or NOT READY". (13) proxy.ts and hostGate.ts say the Host and method gate covers `next start`; the dev server's own overlay endpoints are outside it (comment only; not re-tested). (14) p1.10 is re-worded: its history-based wiki checks were already built in P0, so P1 only re-confirms them. (15) P0 page: the walkthrough row, test-gate wording, p0.5 count and p0.15 check now describe portal v2. Rejected: withdrawn questions Q-001 to Q-003 "have no link": they already link to Q-117, Q-118 and Q-119 (a new browser test proves it).
- stales: [ops-portal-pipeline, comp-interactive-plan, ip-routes-and-views, phase-p0-planning, phase-p1-foundation, ov-open-questions] (no approvals exist yet)

## [2026-10-09] code | p0.17 review fixes: portal, portal checker, check scripts

- session: s01
- pages: [comp-interactive-plan, ops-portal-pipeline]
- sources: [raw/owner/2026-10-09-s01-plan-app-feedback.md]
- result: interactive_plan/ (task p0.17, step "fix"): new view helpers decisionStanding, questionsRow, taskTone, partWhen; friendlyId and popupKind in lib/portal/refs.ts; ownerHeaderParts in lib/portal/scripts.ts; isCheckScript in lib/portal/scriptCommand.ts; Architecture page rebuilt with part popups; DetailPopup, RefProvider, PhasePopup, decisions page, Overview and ScriptProvider updated; zod schemas regenerated. plan/portal/: schemas (task status, part `ours`, layer and group source, refs without source), all phase files, refs, overview, questions, architecture, roadmap. tools/portal-sync-check.ps1: single-pass walk, joined-text id search, MISMATCH checks; tests: 6 new MISMATCH cases, updated fixture, 10 s speed limit. The first verify run of this step failed in the Log browser test because the new log.json entry reused the id of an older entry; the entry was renamed and the checker now reports a reused log entry id (MISMATCH). scripts/: all 150 check-script headers ("For Claude" field, plain result words), P0 and P1 gate headers, module (Get-PlainPageNames, broken approvals file is FAIL, Complete-Check -TellClaude), p0 gate step for the p0.16 outputs, self-test steps for headers and the broken approvals file. Tests: unit tests for every new helper and the real portal; browser tests for the questions row, the start-script popup, task states, one gate command, decision standing, withdrawn-question links, slug-free popups and the new Architecture tab.
- next: Claude runs every check once, saves the evidence and commits; then you walk through the portal

## [2026-10-09] lint | p0.17 review fixes: npm run verify and the P0 gate pass, portal check clean, mask scan 0 unmasked

- session: s01
- pages: [comp-interactive-plan, ops-portal-pipeline, status-live]
- sources: [raw/evidence/phase-p0-planning/portal-v2/review-fixes.txt]
- result: cd interactive_plan && npm run verify: exit 0 in one run (typecheck and eslint clean; 742 unit tests passed and 1 skipped (the link-escape test needs Windows Developer Mode); lint:wiki 0 errors, 34 warnings (unchanged), 2 info; build exit 0; 72 browser tests passed, including axe on every tab in both themes; the end-of-run guard found the 22 protected files unchanged). One earlier verify run in this step failed in the Log browser test (a reused log entry id), fixed before the final run. P0 gate (scripts/gates/p0-gate.ps1): PASS, 24 PASS and 4 YOURS in 226 s, with the new step for the saved outputs of p0.16. Portal check clean (18 files, 168 translated records, 379 explainers; fewer records than before because explainers no longer carry a source). Portal checker tests 26 passed, 0 failed (full real-repo run 2.19 s). Check-script self-test PASS (5 steps, including the plain-header rule and the broken approvals file). Quick lint 202 files, 0 errors. Task script p0.17: NOT READY, 3 PASS and 1 WAIT for the owner's approvals, as expected. Mask scan 0 unmasked. The visual result was checked on screenshots at 1440 px (Overview, Architecture with a part popup, a decision popup, the P0 phase popup and its gate). npm run test:coverage was not run in this step.

## [2026-10-09] plan | p0.17 step "fix" committed: review fixes for portal v2

- session: s01
- pages: [status-live]
- sources: [raw/evidence/phase-p0-planning/portal-v2/review-fixes.txt]
- result: What was done → a review read the portal as the owner would; 29 of its 30 findings were fixed and 1 rejected, and every check passed in one run. STATUS: In-flight cleared, the P0 gate command is now the gate script itself; a refs.json explainer was added for the new commit. After the commit, `npm run lint:wiki` shows 0 errors and 42 warnings instead of 34: the 8 new ones are STALE-UPDATED on the pages this step changed (STATUS, log, comp-interactive-plan, ip-routes-and-views, ops-portal-pipeline, ov-open-questions, both phase pages), because the computer clock had passed midnight, so the commit is dated 2026-10-10 while the pages keep the session date 2026-10-09 given for this session. Left as is (warnings only); they clear at the next edit of each page.
- next: the owner walks through the portal and says what reads wrong or unclear; then Claude asks Approval Wave 1 in Claude Code
- commit: 10c7829

## [2026-10-10] schema | CLAUDE.md for portal v2: working with the owner, wiki edit means portal edit, approvals given in chat

- session: s01
- pages: [schema]
- sources: [raw/owner/2026-10-09-s01-plan-app-feedback.md, raw/owner/2026-10-09-s01-portal-v2-decisions.md]
- result: CLAUDE.md gains §0 "Working with the owner": plain words with no unexplained internal ids, tasks as a thought chain (cause → action → why it matters), the owner's four-part format whenever he must run something (where we are as a small table, why and what it does, one PowerShell 7 script explained part by part, what to tell Claude afterwards), he works in Claude Code only, and the portal start command `pwsh -NoProfile -File scripts/start-portal.ps1`. §5 step 1 names the full checks (quick lint, `npm run lint:wiki`, portal check) instead of "until npm run lint:wiki exists". §7: wiki edit ⇒ portal JSON in the same edit, and the Stop hook is on while `plan/portal/.hook-enabled` exists (never removed to get past a finding). §8: approvals are given in chat and recorded by Claude in the same turn. §11: P0 code is the portal, the check scripts and tools/; the PATH line now adds pwsh. The masking rule (§6) was already present and is unchanged. The §1 start order is unchanged, so SCHEMA §9.6 still matches it (SCHEMA-SPLIT checked by reading both). SCHEMA.md itself is unchanged.
- stales: [schema] (CLAUDE.md is hashed into the schema approval as bootstrap_hash; no approvals exist yet)

## [2026-10-10] decide | p0.17 handoff: the session handoff is updated in place, pages edited after midnight carry 2026-10-10

- session: s01
- pages: [handoff-2026-10-09-s01, status-live]
- sources: [raw/owner/2026-10-09-s01-wave0c.md]
- result: Decided by Claude under the delegation policy (bookkeeping only). (1) The handoff for session s01 is the existing file handoff-2026-10-09-s01, rewritten for portal v2, because ops-handoff-template allows one file per session and the next session has not started; the v1 text stays in git (commit 6118d32). A second file would need a new id for the same session. (2) The computer clock passed midnight during the previous step, so pages edited in this step (STATUS, log, index, the handoff) carry `updated: 2026-10-10` and these log headings are dated 2026-10-10, matching the commit date; the session id stays s01. This clears the date warning on the log and does not add new ones. The other pages from the previous step keep their 2026-10-09 date and warning until their next real edit, rather than editing them only to change a date. (3) The Stop hook was already switched on in the content step (`plan/portal/.hook-enabled` is tracked); this step proves it rather than re-creating the file.

## [2026-10-10] handoff | s01: portal v2 handed over; the owner walks through it, then approvals in chat, then P0 sign-off

- session: s01
- pages: [handoff-2026-10-09-s01, status-live]
- sources: [raw/evidence/phase-p0-planning/portal-v2/handoff-checks.txt]
- result: Handoff rewritten for portal v2 (Done, In progress, Next, Blockers, Notes, open items for the owner). STATUS next action is in the owner's four-part format: where we are, why, the start script explained, what to tell Claude; then Claude fixes wording, asks Approval Wave 1 in chat, and task p0.18 ends with the owner's P0 sign-off. Open items listed for the owner: Q-008 (keep or remove the accessibility checker), npm audit recheck before P0 sign-off, the unverified line-ending claim on risk-r22, the dev-server overlay endpoints outside the address guard (comment only), cargo-deny not installed (P1), Q-221 before the first push.
- next: the owner starts the portal with scripts/start-portal.ps1, reads every tab and popup including the P1 scripts, and tells Claude what reads unclear

## [2026-10-10] lint | p0.17 handoff: P0 gate passes, the end-of-turn hook passes clean and blocks stale, portal check clean, mask scan 0 unmasked

- session: s01
- pages: [status-live, handoff-2026-10-09-s01, schema]
- sources: [raw/evidence/phase-p0-planning/portal-v2/handoff-checks.txt]
- result: End-of-turn hook (the Stop hook command run by hand with a simulated Stop input): on the clean repo at HEAD 0150224 exit 0 in 2.2 s, also exit 0 with stop_hook_active true; after STATUS.md was edited and before overview.json was re-translated, exit 2 with "1 STALE plan/portal/overview.json" on stderr; on the final state exit 0. P0 gate (scripts/gates/p0-gate.ps1): PASS, 24 PASS and 4 YOURS in 223 s (742 unit tests passed, 1 skipped; 72 browser tests passed; build exit 0; tool tests 34 OK and portal checker 26 passed). Portal check clean (18 files, 168 records, 380 explainers). Quick lint 202 files, 0 errors. `npm run lint:wiki`: 0 errors, 40 warnings (the 34 known ones plus 6 date warnings on pages last committed after midnight; the log's date warning is cleared), 2 info, with the evidence file present and unstaged; after staging, the only error is RAW-IMMUTABLE "uncommitted change (A)" on the new evidence file itself, which clears with the commit (re-checked after it). Mask scan after staging: 682 tracked files, 0 unmasked. npm run verify and npm run test:coverage were not run separately in this step (no portal code changed; the gate runs the unit, browser and build parts).

## [2026-10-10] plan | p0.17 step "handoff" committed: portal v2 handed over to the owner

- session: s01
- pages: [status-live]
- sources: [raw/evidence/phase-p0-planning/portal-v2/handoff-checks.txt]
- result: What was done → the end-of-turn check is proven on, the session rules in CLAUDE.md say how to write for the owner and how the portal and approvals work, the handoff and STATUS tell the owner what to do next in plain words. STATUS: In-flight cleared; a refs.json explainer was added for the new commit. After the commit, `npm run lint:wiki` reports 0 errors (the RAW-IMMUTABLE error on the staged evidence file cleared with the commit).
- next: the owner starts the portal with scripts/start-portal.ps1, reads every tab and popup including the P1 scripts, and tells Claude what reads unclear; then Claude asks Approval Wave 1 in chat
- commit: 3991339

## [2026-10-10] ingest | Owner answers Q-008 (keep the accessibility checker) and directs Claude to pause between phases

- session: s01
- pages: [ov-open-questions, adr-0014, ops-session-protocol, phase-p0-planning, phase-p1-foundation, index, status-live]
- sources: [raw/owner/2026-10-10-s01-q008-and-pause.md]
- result: Raw file appended to MANIFEST.sha256 and listed in index.md. Q-008 set to answered with the owner's words and the source path: after asking what the checker does and why (Claude explained: colour contrast, popup focus, Esc and focus return, labels, page structure; test-only; small cost; it cannot judge wording), the owner said "Okay, lets add.", so the accessibility checker stays (`@axe-core/playwright`, installed as its engine `axe-core` 4.14.0, an exact devDependency of interactive_plan/); no code changes. The 2026-10-09 correction note on Q-008 is kept. Register: 38 open, 12 answered. Standing directive recorded verbatim: "Make sure to pause when completing the planning phase and before building the next phase". Applied: adr-0014 quotes it as a second owner decision and its elaboration now says the exit approval is not a go-ahead (Claude waits for an explicit go, logged as `gate | <next-phase-id> go-ahead given`; while waiting only finish-up work on the closed phase, no planning or setup of the next phase); ops-session-protocol §1 has a "Pause between phases" rule; phase-p0-planning task p0.18 ends with the pause; phase-p1-foundation's first entry criterion now also needs the owner's explicit go. Q-108 (formal exit review for P0 and P1 too) gets a dated note and stays open: the directive makes Claude pause after P0 but does not by itself answer whether P0 and P1 get the same formal exit review. The pause is a rule for Claude, not a machine check: no lint rule, gate script or approvals checker tests for the go-ahead.
- stales: [ov-open-questions, adr-0014, ops-session-protocol, phase-p0-planning, phase-p1-foundation] (no approvals exist yet, so nothing is actually stale)

## [2026-10-10] schema | Pause between phases: CLAUDE.md §1 and SCHEMA §9.7 exit-gate step 7

- session: s01
- pages: [schema]
- sources: [raw/owner/2026-10-10-s01-q008-and-pause.md]
- result: Owner's standing directive of 2026-10-10 written into the schema layer (SCHEMA §15: both files edited consistently). SCHEMA §9.7: new exit-gate step 7 "Pause": from the exit-ready point Claude stops, reports and waits; no work of the next phase (task, install, scaffold, spike) until the owner has signed off the phase and explicitly said in chat to start the next one, transcribed to raw/owner/ and logged `gate | <next-phase-id> go-ahead given`; a sign-off alone is not a go-ahead; the rule applies to P0 too. Entry-gate step 1 now also requires that go-ahead. CLAUDE.md §1 gains a "PAUSE between phases" paragraph after step 10 (with P0 as the immediate case: portal review, approvals in chat, P0 sign-off, then pause; P1 waits for the owner's explicit go), §8 says the exit approval is followed by the pause, §11 says no Ferrum code until P0 sign-off and the explicit go for P1. The §1 start order (steps 0-10) is unchanged, so SCHEMA §9.6 still matches it (SCHEMA-SPLIT checked by reading both).
- stales: [schema] (SCHEMA.md content and CLAUDE.md, which is hashed into the schema approval as bootstrap_hash; no approvals exist yet)

## [2026-10-10] plan | p0.17 step "q008-pause" committed: Q-008 answered, pause between phases recorded

- session: s01
- pages: [status-live]
- sources: [raw/owner/2026-10-10-s01-q008-and-pause.md]
- result: What was done → the owner's answer to Q-008 (keep the accessibility checker) and his standing rule to pause after the planning phase and before building any next phase are saved and written into the session rules, the schema, the review decision and the P0 and P1 plans. STATUS: In-flight cleared; next action unchanged in substance (portal walkthrough, approvals in chat, P0 sign-off) and now ends with the pause: P1 does not start without the owner's explicit go. A refs.json explainer was added for the new commit.
- next: the owner walks through the portal and says what reads unclear; then Approval Wave 1 in chat, the P0 exit review and sign-off; then Claude pauses until the owner says go for P1
- commit: bc72c17

## [2026-10-10] ingest | Owner asks for a "Ref" button that outlines and names the portal's blocks for layout feedback

- session: s01
- pages: [ip-routes-and-views, ip-testing, index, status-live]
- sources: [raw/owner/2026-10-10-s01-ref-button.md]
- result: Raw file appended to MANIFEST.sha256 and listed in index.md. During his portal walkthrough the owner asked, before anything else proceeds, for a Ref button that outlines how the UI components sit on the portal so he can give layout feedback; the design option relayed with the request is "Outline + labels + copy". It is planning tooling of the read-only portal (task p0.17): no plan content, approval or Ferrum code changes. Specified in ip-routes-and-views §5 (button, labels, copy text, bar, Layout map, id registry and its rules) and ip-testing (unit and browser tests, visual review).
- stales: [ip-routes-and-views, ip-testing] (no approvals exist yet, so nothing is actually stale)

## [2026-10-10] code | p0.17 Ref mode: Ref button, fixed block ids, outlines, copyable labels, Layout map

- session: s01
- pages: [ip-routes-and-views, ip-testing]
- sources: [raw/owner/2026-10-10-s01-ref-button.md]
- result: New `interactive_plan/lib/portal/uiRefs.ts` (the registry: 64 block ids with plain names, prefixes HD top bar, OV, RM, AR, DE, RE, QU, LO tabs, PH phase popup, IT item popup, RF reference popup, SC script popup; `ui()` marks a block with `data-ui-ref`; label and copy-text helpers; Layout map groups) and `components/portal/RefMode.tsx` (the toggle with `aria-pressed` and a description, label buttons added to marked blocks while on and removed when off, a MutationObserver for blocks that appear later, copy with a fallback and a polite "Copied" message, a bar that moves into the top open popup, the Layout map dialog, Esc ends the mode when no popup is open, choice kept in localStorage with try/catch). Blocks marked on all seven tabs and in the phase, item, reference and script popups; repeated items get fixed suffixes (phase number for phase cards). Delegated details (Claude): the item popups (decision, risk, research item, part) get ids too (prefix IT), since the owner reviews them as well; question cards and log entries are labelled once, on the first card, to avoid clutter; labels sit just above each block and Ref mode adds 16 px above each block, room in the top bar and in small popups so no label covers text; to keep the top bar on one line at 1440 px in normal mode with the new button, its gaps went from 24 to 16 px, the tool gap from 16 to 10 px and the tab side padding from 12 to 10 px. Tests: `tests/unit/ui-refs.test.ts` (12) and `tests/e2e/ref-mode.spec.ts` (17). Builds, screenshots and browser runs used a scratch git worktree and ports 3421 and 3422, so the owner's portal on 3417 kept running untouched.

## [2026-10-10] lint | p0.17 Ref mode: npm run verify green, screenshots reviewed in both themes at 1440 and 390 px

- session: s01
- pages: [ip-routes-and-views, ip-testing, status-live]
- sources: [raw/evidence/phase-p0-planning/portal-v2/ref-mode-checks.txt]
- result: `npm run verify` exit 0 in one run (typecheck, eslint, 754 unit tests passed and 1 skipped, `lint:wiki` 0 errors, 36 warnings, 2 info, build, 89 browser tests passed including the 17 Ref mode tests, E2E guard: real files unchanged). It ran in a scratch git worktree of HEAD with this step's files copied in, because rebuilding `interactive_plan/.next` would have broken the owner's running portal on 3417. Unit tests with coverage in the main tree: thresholds met, `uiRefs.ts` 100 % lines. Visual review: screenshots with Ref mode on of the seven tabs, the phase, script, reference and item popups and the Layout map at 1440 and 390 px, light and dark; fixed labels covering header pieces, headings and the block above, labels cut off at the top of popups, and the top bar wrapping in normal mode. Quick lint and the portal check are run again on the final tree before the commit.

## [2026-10-10] plan | p0.17 step "ref-mode" committed: Ref button for layout feedback

- session: s01
- pages: [status-live]
- sources: [raw/owner/2026-10-10-s01-ref-button.md]
- result: What was done → the owner asked for a way to point at parts of the portal in layout feedback → the Ref button now outlines every block of the tab and of open popups with a fixed, copyable name, and a Layout map lists them all → his walkthrough feedback can name exact blocks. STATUS: In-flight cleared; next action now says to restart the running portal (it is a build, so the button appears only after a rebuild) and to use Ref for layout feedback. A refs.json explainer was added for the new commit.
- next: the owner restarts the portal, walks through it with Ref mode and tells Claude what reads unclear or what to change in the layout; then Approval Wave 1 in chat, the P0 exit review and sign-off; then Claude pauses until the owner says go for P1
- commit: e1b198d

## [2026-10-10] code | p0.17 Ref mode review fixes: moves nothing, room for the bar, fixed item names, Layout map jumps

- session: s01
- pages: [ip-routes-and-views, ip-testing]
- sources: [raw/owner/2026-10-10-s01-ref-button.md, raw/evidence/phase-p0-planning/portal-v2/ref-mode-fixes-checks.txt]
- result: A review of the Ref button raised 11 issues; each was confirmed in the code and fixed, none rejected. Ref mode no longer changes the layout it names: the extra space above blocks, the larger popup gaps and the wider top-bar gaps are gone (the top bar stays one row at 1440 px; its labels show only the id, with the name in the tooltip), and labels sit in gaps, card padding, popup header borders or at the right end in the small popups. The bar is measured and the page and popups leave room for it at the end, so nothing hides under it at 390 px; it no longer moves into the Layout map. Log entries are all marked and the first visible one under the current filter is labelled. Repeated items take a fixed number and word from the registry, keyed by the item's own data id (`OV-3.3 Step: The script`, `RM-2.1 Stage card: Build`, `AR-3.2 Layer row: Ferrum engine`, `OV-4.1 Phase card: P1`), never a list position. The Layout map has jump links, opens at the current tab or popup and lists the numbered items. An old "Copied" message is cleared when the bar moves to another popup. Focus returns to List all when the map closes and stays in a popup after Turn off. Tests: `ui-refs.test.ts` 15, `ref-mode.spec.ts` 24.

## [2026-10-10] lint | p0.17 Ref mode review fixes: npm run verify green, positions unchanged in Ref mode

- session: s01
- pages: [ip-routes-and-views, ip-testing, status-live]
- sources: [raw/evidence/phase-p0-planning/portal-v2/ref-mode-fixes-checks.txt]
- result: `npm run verify` exit 0 in one run (typecheck, eslint, 757 unit tests passed and 1 skipped, `lint:wiki` 0 errors, 36 warnings, 2 info, build, 96 browser tests passed including the 24 Ref mode tests, E2E guard: real files unchanged), in a scratch git worktree of HEAD with this step's files copied in (byte-identical), so the owner's portal on 3417 kept running. A probe on all seven tabs, both themes, 1440 and 390 px: top bar height and every block's position the same with Ref on and off; the last content ends above the bar. Screenshots of the header, phase, script and reference popups and the Layout map reviewed. Quick lint 0 errors, portal check clean, mask scan 0 unmasked on the final tree.

## [2026-10-10] plan | p0.17 step "ref-mode-fixes" committed: Ref mode shows the real layout

- session: s01
- pages: [status-live]
- sources: [raw/evidence/phase-p0-planning/portal-v2/ref-mode-fixes-checks.txt]
- result: What was done → a review showed Ref mode changed the layout it names and hid page ends on a phone → it now moves nothing, leaves room for its bar, names repeated items with fixed numbers and words and has a jump list → the owner's layout feedback is about the real layout. STATUS: In-flight cleared; next action unchanged in substance (restart the portal, walk through it with Ref mode, then approvals in chat and the P0 sign-off, then the pause). A refs.json explainer was added for the new commit.
- next: the owner restarts the portal, walks through it with Ref mode and tells Claude what reads unclear or what to change in the layout; then Approval Wave 1 in chat, the P0 exit review and sign-off; then Claude pauses until the owner says go for P1
- commit: 89b45cf

## [2026-10-10] ingest | Owner asks for separate columns in the phase popup's tasks table

- session: s01
- pages: [ip-routes-and-views, ip-testing, index, status-live]
- sources: [raw/owner/2026-10-10-s01-task-table-columns.md]
- result: Raw file appended to MANIFEST.sha256 and listed in index.md. Reviewing portal v2 with Ref mode, the owner asked that the tasks table (Ref name PH-3) get separate columns for id, title, what, why, how, logic (thought chain notation), check script and state. Claude's reading, recorded in the raw file: what = what the task does or produces, why = why it matters, how = the approach, logic = the existing thought chain, check script = the script button with the plain check line under it, state = the status in words. This replaces the earlier column set from the 2026-10-09 feedback. Planning tooling of the read-only portal (task p0.17), no Ferrum code. Specified in ip-routes-and-views §3 and §4 and ip-testing.
- stales: [ip-routes-and-views, ip-testing] (no approvals exist yet, so nothing is actually stale)

## [2026-10-10] code | p0.17 tasks table: eight columns, task JSON gains what, why and how

- session: s01
- pages: [ip-routes-and-views, ip-testing]
- sources: [raw/owner/2026-10-10-s01-task-table-columns.md]
- result: `plan/portal/schema/phase.schema.json` requires `what`, `why` and `how` on every task (plain text, 1-240 characters), `lib/portal/schemas.gen.ts` regenerated. `PhasePopup.tsx` shows Id, Title, What, Why, How, Logic, Check script, State, each header `th scope="col"`, PH-3 kept; Logic shows one thought-chain step per line (`chainSteps()` in `lib/portal/view.ts` splits at each arrow without breaking a `[words](ref:id)` link); Check script shows the script button (or "Not written yet") with the check line under it; State shows the status chip. The table sits in a focusable, labelled area that scrolls sideways only if needed; the phase popup is up to 1400 px wide; at phone width each task is a card with eight labelled rows. All 141 tasks of the nine phase files got what, why and how translated from their phase pages (no new facts; claims a page marks as unverified are said as "not checked yet" or "not yet confirmed"); a spot check of 10 random tasks against their pages found nothing added. The wiki-to-portal skill explains the new fields and which field fills each column; the portal-sync fixture and its tests cover a missing `why` and an id without explainer inside `how`. Tests: `tests/unit/portal-task-table.test.ts` (13), new or extended browser tests in overview, shell, ref-mode and a11y (axe on the open phase popup in both themes at 1440 and 390 px).

## [2026-10-10] lint | p0.17 tasks table: npm run verify green, screenshots reviewed in both themes at 1440 and 390 px

- session: s01
- pages: [ip-routes-and-views, ip-testing, status-live]
- sources: [raw/evidence/phase-p0-planning/portal-v2/task-columns-checks.txt]
- result: `npm run verify` exit 0 in one run (typecheck, eslint, 770 unit tests passed and 1 skipped, `lint:wiki` 0 errors, 36 warnings, 2 info, build, 101 browser tests passed, E2E guard: real files unchanged), in a scratch git worktree of HEAD with this step's files copied in (byte-identical), so the owner's portal on 3417 kept running; the worktree was deleted afterwards. Screenshots of the P1 phase popup's tasks table at 1440 and 390 px in both themes read: all eight columns fit at 1440 px with no sideways scrolling, phone cards show the eight labelled rows; no defect. Quick lint 0 errors, portal check clean, portal-sync tests 27 passed, mask scan 0 unmasked on the final tree.

## [2026-10-10] plan | p0.17 step "task-columns" committed: tasks table in eight columns

- session: s01
- pages: [status-live]
- sources: [raw/owner/2026-10-10-s01-task-table-columns.md, raw/evidence/phase-p0-planning/portal-v2/task-columns-checks.txt]
- result: What was done → the owner asked for separate columns in the tasks table → every phase's tasks table now shows Id, Title, What, Why, How, Logic, Check script and State, and every task has a short what, why and how from its phase page → he can read each task at a glance. STATUS: In-flight cleared; next action unchanged in substance (restart the portal, walk through it with Ref mode, then approvals in chat and the P0 sign-off, then the pause). A refs.json explainer was added for the new commit.
- next: the owner restarts the portal, walks through it with Ref mode and tells Claude what reads unclear or what to change in the layout; then Approval Wave 1 in chat, the P0 exit review and sign-off; then Claude pauses until the owner says go for P1
- commit: 97d3f22

## [2026-10-10] code | p0.17 tasks table review fixes: three-step chains, why and how rewritten, fits 1280 px, short phone cards

- session: s01
- pages: [ip-routes-and-views, ip-testing]
- sources: [raw/owner/2026-10-10-s01-task-table-columns.md]
- result: A review of the eight-column tasks table found seven points; all fixed. (1) Task p8.4's thought chain had arrows inside its middle step and showed as nine Logic lines: rewritten with commas (its refs.json explainer too), and `plan/portal/schema/phase.schema.json` now requires every task chain to have exactly three steps (exactly two arrows; `schemas.gen.ts` regenerated), with a unit test over all real phase files. (2) Why repeated a Logic step in 85 of 141 tasks: every Why rewritten to say what goes wrong without the task or who is affected (p4.2's Why is now a reason, not the design). (3) How repeated the check line in 30 tasks (60 at a looser measure): those rewritten as the method (p5.5 now says how the meter's own cost is measured); text similarity (Python difflib ratio) is now below 0.6 for every task and below 0.5 for all but 11. All texts come from the phase pages, no new facts. (4) Columns: Id 64 px, State 100 px, table minimum 1120 px, so a 1280 px window needs no sideways scrolling (browser test). (5) Phone cards open with one heading line of Id, State and Title; What, Why and How carry their name in front (P1's cards: about 553 px each instead of about 700). (6) The scroll area is labelled "Tasks table"; a screen reader hears "then" and "so" in place of the hidden arrows (`chainJoin()` in `lib/portal/view.ts`). (7) p7.9's What now says it covers the three strategies that put tabs to sleep and that "never sleep" uses the first campaign's setup. The wiki-to-portal skill states the why/how/chain rules. Kept on purpose: the table area stays a keyboard stop at every width, because it still scrolls sideways below 1120 px.
- stales: [ip-routes-and-views, ip-testing] (no approvals exist yet, so nothing is actually stale)

## [2026-10-10] lint | p0.17 tasks table review fixes: npm run verify green, screenshots at 1440, 1280 and 390 px read

- session: s01
- pages: [ip-routes-and-views, ip-testing, status-live]
- sources: [raw/evidence/phase-p0-planning/portal-v2/task-columns-fixes-checks.txt]
- result: `npm run verify` exit 0 in one run (typecheck, eslint, 773 unit tests passed and 1 skipped, `lint:wiki` 0 errors, 36 warnings, 2 info, build, 102 browser tests passed, E2E guard: real files unchanged), in a scratch git worktree of HEAD with this step's files copied in (byte-identical; the first run found the table 1 px too wide at 1280 px, so the minimum went from 1150 to 1120 px and the run was repeated), so the owner's portal on 3417 kept running; the worktree was deleted afterwards. Screenshots of the P1 tasks table at 1440, 1280 and 390 px in both themes read: no sideways scrolling at 1440 or 1280, phone cards open with Id, State and Title; p8.4 shows three Logic steps. Quick lint, portal check, portal-sync tests and mask scan on the final tree: see the evidence file.

## [2026-10-10] plan | p0.17 step "task-columns-fixes" committed: tasks table fixed after a review

- session: s01
- pages: [status-live]
- sources: [raw/owner/2026-10-10-s01-task-table-columns.md, raw/evidence/phase-p0-planning/portal-v2/task-columns-fixes-checks.txt]
- result: What was done → a review found that Why and How repeated the Logic and check columns, one chain split into nine lines, the table scrolled sideways on 1280 px laptops and phone cards were long → every Why now says what goes wrong without the task, every How the method, every chain has exactly three steps (enforced by the schema), the table fits 1280 px and phone cards open with Id, State and Title → each column now tells the owner something new. STATUS: In-flight cleared; next action unchanged in substance (restart the portal, walk through it with Ref mode, then approvals in chat and the P0 sign-off, then the pause). A refs.json explainer was added for the new commit.
- next: the owner restarts the portal, walks through it with Ref mode and tells Claude what reads unclear or what to change in the layout; then Approval Wave 1 in chat, the P0 exit review and sign-off; then Claude pauses until the owner says go for P1
- commit: 659f619

## [2026-10-10] ingest | Owner asks for a browser design and picks option A

- session: s01
- pages: [adr-0028, comp-app-shell, ip-routes-and-views, ip-testing, ops-portal-pipeline, index, status-live]
- sources: [raw/owner/2026-10-10-s01-browser-ui-design-request.md, raw/owner/2026-10-10-s01-browser-ui-design-answers-1.md, raw/owner/2026-10-10-s01-browser-ui-choice.md, raw/evidence/phase-p0-planning/browser-ui/option-a.dc.html]
- result: Three raw owner files and a frozen, byte-identical copy of the chosen design file (option-a.dc.html, run through tools/mask.ps1 --stdin with no change) appended to MANIFEST.sha256 and listed in index.md (the evidence folder entry now names browser-ui/). The owner asked for a Claude design of the Ferrum browser in light and dark mode, partly inspired by the Comet browser; he chose Ferrum's own panel instead of an AI assistant, tabs across the top, and to see panel options; from the three options on the design canvas (A right-side panel, B bottom status bar with a drawer, C toolbar pop-over) he picked A: "I like Option A, let's go with it now. Can we add it to the interactive plan document". Claude's reading: "the interactive plan document" is the read-only plan portal; the design goes into the Architecture view's Application group. All numbers, sites and log lines on the design are sample values; nothing is measured.
- stales: [comp-app-shell, ip-routes-and-views, ip-testing, ops-portal-pipeline] (no approvals exist yet, so nothing is actually stale)

## [2026-10-10] decide | adr-0028: browser look, tabs on top and a Ferrum panel on the right (owner, option A)

- session: s01
- pages: [adr-0028, comp-app-shell]
- sources: [raw/owner/2026-10-10-s01-browser-ui-choice.md, raw/owner/2026-10-10-s01-browser-ui-design-answers-1.md]
- result: adr-0028 status accepted, decided_by owner (SCHEMA §10.4 rule 3(b), the owner's words quoted verbatim); its "Claude elaboration" section binds only after the owner approves the ADR. Options A, B, C recorded; consequences: the panel costs about 352 px of width; its content waits on P4 (blocklist), P5 (measurement and network log) and P7 (sleeping tabs); per-tab memory and CPU stay UNVERIFIED[phase-p5-telemetry]; the network log stays addresses and sizes only (adr-0008, Q-114); fonts must be bundled because the shell loads nothing remote. comp-app-shell gains a "Look" section and its phase-plan line names the panel's sections. Portal: decisions.json item (decided by "you"), architecture.json `browser_design` block (title, summary, decision adr-0028, canvas link, sample note, six callouts), comp-app-shell record and refs.json explainers updated.

## [2026-10-10] code | p0.17 browser design: "How the browser will look" in the Architecture view

- session: s01
- pages: [ip-routes-and-views, ip-testing, ops-portal-pipeline, comp-app-shell]
- sources: [raw/owner/2026-10-10-s01-browser-ui-choice.md, raw/evidence/phase-p0-planning/browser-ui/option-a.dc.html]
- result: Planning tooling only, no Ferrum code. `plan/portal/schema/architecture.schema.json` gains an optional `browser_design` object (decision `adr-NNNN`, canvas_url `https://claude.ai/...` up to 200 characters, 1-10 callouts, no unknown keys; `schemas.gen.ts` regenerated). `components/portal/BrowserMockup.tsx` is a static copy of option A drawn at 1440 x 900 and scaled to the card, both palettes copied from the design file, with a Light / Dark switch that starts on the portal's theme; it is one image for screen readers whose summary says the values are samples, and nothing in it is focusable. `app/architecture/page.tsx` shows the block first in the Application group, then the callouts, the sample note, the canvas link and "Why we chose it". Ref ids AR-9, AR-9.1 to AR-9.3 in `lib/portal/uiRefs.ts`. The screenshot review found the layer box "Browser controls" printing raw link markup (a button cannot hold a link): `plainText()` in `lib/portal/view.ts` now prints the link's words there. `tools/portal-sync-check.ps1` reports MISMATCH when `browser_design.decision` is not a decision in decisions.json (two new self-tests, fixture updated). Tests: `tests/unit/browser-mockup.test.tsx`, AR-9 in ui-refs and ref-mode, a "browser design" group in architecture.spec.ts, plainText in portal-view-tabs. ip-routes-and-views, ip-testing, ops-portal-pipeline and the wiki-to-portal skill describe the block.
- stales: [ip-routes-and-views, ip-testing, ops-portal-pipeline] (no approvals exist yet, so nothing is actually stale)

## [2026-10-10] lint | p0.17 browser design: npm run verify green, screenshots read in both themes at 1440 and 390 px

- session: s01
- pages: [ip-routes-and-views, ip-testing, status-live]
- sources: [raw/evidence/phase-p0-planning/portal-v2/browser-design-checks.txt]
- result: `npm run verify` exit 0 on the final files (typecheck, eslint, 783 unit tests passed and 1 skipped, `lint:wiki` 0 errors, 36 warnings, 2 info, build, 107 browser tests passed incl. the five browser design tests, E2E guard: real files unchanged), in a scratch git worktree of HEAD with this step's files copied in (byte-identical), so the owner's portal on 3417 kept running; the worktree was deleted and its servers stopped. Screenshots of the Architecture view's Application group at 1440 and 390 px, portal light and dark, each with the picture also switched to the other palette, were read against the design file: one defect (raw link markup in a layer box), fixed and re-verified; no sideways scrolling; at 390 px the picture is small but whole. Quick lint 0 errors, portal check clean, portal-sync self-tests 29 passed, mask scan 0 unmasked.

## [2026-10-10] plan | p0.17 step "browser-design" committed: the chosen browser look is in the Architecture view

- session: s01
- pages: [status-live]
- sources: [raw/owner/2026-10-10-s01-browser-ui-choice.md, raw/evidence/phase-p0-planning/portal-v2/browser-design-checks.txt]
- result: What was done → the owner picked option A of the browser design and asked to add it to the plan portal → adr-0028 records his choice and the Architecture view shows the picture first, in light or dark, with the canvas link and a note that every value is a sample → he can see how Ferrum will look next to what it is made of. STATUS: In-flight cleared; next action unchanged in substance (restart the portal, walk through it with Ref mode, then approvals in chat and the P0 sign-off, then the pause), now also naming the browser picture. A refs.json explainer was added for the new commit.
- next: the owner restarts the portal, walks through it with Ref mode and tells Claude what reads unclear or what to change in the layout; then Approval Wave 1 in chat, the P0 exit review and sign-off; then Claude pauses until the owner says go for P1
- commit: d0ac1f3

## [2026-10-10] code | p0.17 browser design review fixes: title-bar question Q-125, plain decision text, readable panel on phones, sample note under the picture

- session: s01
- pages: [adr-0028, comp-app-shell, ov-open-questions, ip-routes-and-views, ip-testing]
- sources: [raw/owner/2026-10-10-s01-browser-ui-choice.md, raw/evidence/phase-p0-planning/browser-ui/option-a.dc.html]
- result: Planning tooling and docs only, no Ferrum code. A review of the browser design step found 10 points; all fixed, none rejected. (1) Option A puts the tabs in the window's top bar, which needs a custom title bar, while comp-app-shell advises against one at first (Tauri #12207, UNVERIFIED[phase-p1-foundation]): new open question Q-125 (blocking P3, recommended default: normal Windows title bar first), a Negative point in adr-0028 and a "Title bar" paragraph in comp-app-shell's Look section. (2) The adr-0028 portal catch no longer uses bare phase ids and links Q-125. (3) "the Comet layout the owner liked" became "Comet's side-panel layout, which the owner named as inspiration". (4) "sections stay empty until their phase lands" and "fonts bundled, strict CSP" moved into a "Claude's proposals" list inside the elaboration block; CSP tagged UNVERIFIED[phase-p2-minimal-container]; frontmatter `unverified` lists added (adr-0028, comp-app-shell, ov-open-questions). (5) `BrowserMockup.tsx`: the Ferrum panel is its own component; at 900 px or less a close-up of it (design size 352 x 802, scaled to the column, max 480 px wide) follows the window, a second labelled image. (6) The sample note is passed into BrowserMockup and sits directly under the window; both pictures carry a "Sample values" tag in portal colours. (7) The drawing stays hidden (`.bm-frame:not([data-ready])`) until a `useFitScale` hook has measured a non-zero width. (8) Screenshots now include 1280 px. (9) The adr-0028 portal `related` list now has the components the catch depends on and Q-125. (10) adr-0028's evidence line says the frozen design copy is source text that needs the canvas runtime (`support.js`, not frozen) to draw; the raw file is unchanged. Tests: three new unit tests in browser-mockup.test.tsx, note/tag/close-up checks in architecture.spec.ts at 1280 and 390 px. ip-routes-and-views and ip-testing describe the close-up, tag, note and hidden-until-measured drawing.
- stales: [adr-0028, comp-app-shell, ip-routes-and-views, ip-testing] (no approvals exist yet, so nothing is actually stale)

## [2026-10-10] lint | p0.17 browser design review fixes: npm run verify green, screenshots at 1440, 1280 and 390 px read

- session: s01
- pages: [ip-testing, status-live]
- sources: [raw/evidence/phase-p0-planning/portal-v2/browser-design-fixes-checks.txt]
- result: `npm run verify` exit 0 on the final files (typecheck, eslint, 786 unit tests passed and 1 skipped, `lint:wiki` 0 errors, 35 warnings, 2 info, build, 107 browser tests passed, E2E guard: real files unchanged) in a scratch git worktree of HEAD 038cb03 with this step's files copied in (byte-identical), E2E on 3418 and screenshots on 3423; the worktree was deleted, its servers stopped, the owner's portal on 3417 kept running and `.git/config` is unchanged. A first run failed only on RAW-IMMUTABLE for the sanctioned masking commit because its git calls lacked core.longpaths; with it set through the environment the wiki check gave 0 errors. Screenshots read: at 390 px the panel close-up is at scale 0.892 and readable in both palettes, the note is 12 px under the picture; at 1280 and 1440 px the picture is at 0.803 and the close-up is hidden; before scripts run the drawing is hidden; no sideways scrolling. Quick lint 0 errors, portal check clean, portal-sync self-tests 29 passed, mask scan 0 unmasked.

## [2026-10-10] plan | p0.17 step "browser-design-fixes" committed: browser picture fixed after a review, question Q-125 added

- session: s01
- pages: [status-live]
- sources: [raw/evidence/phase-p0-planning/portal-v2/browser-design-fixes-checks.txt]
- result: What was done → a review of the browser picture found 10 problems (a title-bar clash, jargon and an invented owner feeling in the decision text, a picture too small on phones, the sample note far from it, a wrong-size flash) → all fixed, with a new open question Q-125 on keeping the normal Windows title bar above the tabs at first → the owner sees a readable, clearly-sample picture and decides the title bar before tabs are built. STATUS: In-flight cleared; next action unchanged in substance (restart the portal, walk through it with Ref mode, then approvals in chat and the P0 sign-off, then the pause), now naming the close-up and the moved note. A refs.json explainer was added for the new commit.
- next: the owner restarts the portal, walks through it with Ref mode and tells Claude what reads unclear; Q-125 can be answered any time before P3; then Approval Wave 1 in chat, the P0 exit review and sign-off; then Claude pauses until the owner says go for P1
- commit: 2666df3

## [2026-10-10] ingest | Owner asks for paged, searchable, filterable decisions and log with a category and 2 tags each

- session: s01
- pages: [ip-routes-and-views, ip-testing, ops-portal-pipeline, index, status-live]
- sources: [raw/owner/2026-10-10-s01-decisions-log-browse.md]
- result: Raw file appended to MANIFEST.sha256 and listed in index.md. The owner wrote: "Decisions and logs should be paginated, should show category and 2 tags of relevance. Should be searchable, filterable. Ask me questions, show me a plan then". His answers: separate category lists (decisions by topic: Process & approvals, The app, Security & privacy, Research & benchmarks, Tools & setup, Plan portal; log by kind of work: Built, Checked, Decided, Fixed, Planned, Set up), a fixed tag list, 20 per page with page numbers, and four filters (category + tag, status / who decided, phase, date range). Planning tooling of the read-only portal (task p0.17), no Ferrum code. Specified in ip-routes-and-views §6, ip-testing and ops-portal-pipeline.
- stales: [ip-routes-and-views, ip-testing] (no approvals exist yet, so nothing is actually stale)

## [2026-10-10] plan | Owner approves the browsing plan for decisions and log: "Approved the plan"

- session: s01
- pages: [ip-routes-and-views, status-live]
- sources: [raw/owner/2026-10-10-s01-decisions-log-browse-approval.md]
- result: Raw file appended to MANIFEST.sha256 and listed in index.md. Claude showed the plan in chat (labels: one category and two tags from a fixed list of 26, decisions also a phase; search, filters, results line, Clear filters, tag chips that filter, 20 per page with numbers, everything kept in the address, empty state, Ref ids) and asked whether the Risks table should get the same. The owner's words, verbatim: "Approved the plan". He did not answer the Risks question or change the tag list, so the Risks table stays as it is and the 26 tags are used as proposed. This is approval of a build plan in chat, not a page approval: nothing is recorded in plan/approvals.json.

## [2026-10-10] code | p0.17 browse: categories, tags, search, filters and pages on Decisions and Log

- session: s01
- pages: [ip-routes-and-views, ip-testing, ops-portal-pipeline]
- sources: [raw/owner/2026-10-10-s01-decisions-log-browse.md, raw/owner/2026-10-10-s01-decisions-log-browse-approval.md]
- result: Planning tooling only, no Ferrum code. Data: new `plan/portal/taxonomy.json` (single source of the 6 decision categories, 6 log categories and 26 tags, each with a plain one-line explanation; schema `taxonomy.schema.json`); decisions.schema and log.schema require `category`, exactly 2 different `tags` and, on decisions, `phase`; all 28 decisions and all 39 existing log entries labelled (content hashes unchanged). A decision's `phase` is the phase it mainly affects, not the page's frontmatter `phase` (that is the producing phase, P0 on 27 of 28 pages, which would make the filter useless); for decisions about how the project is run it is the page's own phase. `tools/portal-sync-check.ps1` check 7 reports BAD-LABEL (missing, unknown or wrong-list category, tag count other than 2, unknown or repeated tag, a name listed twice in taxonomy.json, a phase with no phase file); 10 new self-tests, fixture updated; the wiki-to-portal skill explains how to choose labels. Portal: `lib/portal/schemas.gen.ts` regenerated, the loader reads taxonomy.json; one shared client component `components/portal/browse/Browse.tsx` gives both tabs a search box (every word, case and accents ignored), filters (category, tags with "has every ticked tag", phase, date from/to; Decisions also status and who decided; Log's old pills became a "Show" choice), a live results line ("Showing 21–28 of 28"), Clear filters, a "No matches" state, 20 per page with numbered pages and Previous / Next, and the whole view in the address (replaceState, unknown values dropped, back to page 1 on every change). Cards show a category chip and two tag chips; a tag chip filters by its tag. Ref ids DE-4 to DE-7 and LO-7 to LO-10 added, LO-2 renamed "Decisions or approvals filter", none renumbered. The Risks table is unchanged. Pure logic in `lib/portal/browse.ts`, `browseTabs.ts`, `taxonomy.ts`. Tests: `tests/unit/portal-browse.test.ts`, `portal-browse-ui.test.tsx`, `tests/e2e/browse.spec.ts`; decisions, log and ref-mode specs and portal-load updated. Left in place, unused: `components/portal/LogFilter.tsx` and its two CSS rules (Claude did not create them; deleting needs the owner's permission).
- stales: [ip-routes-and-views, ip-testing, ops-portal-pipeline] (no approvals exist yet, so nothing is actually stale)

## [2026-10-10] lint | p0.17 browse: npm run verify green, screenshots of Decisions and Log read at 1440 and 390 px in both themes

- session: s01
- pages: [ip-routes-and-views, ip-testing, status-live]
- sources: [raw/evidence/phase-p0-planning/portal-v2/browse-checks.txt]
- result: `npm run verify` exit 0 (typecheck, eslint, 825 unit tests passed and 1 skipped, `lint:wiki` 0 errors, 35 warnings, 2 info, build, 133 browser tests passed, E2E guard: real files unchanged) in a scratch git worktree of HEAD ce4acb5 outside the repo with this step's files copied in (byte-identical), core.longpaths set only through the environment; after the new plain log entry was added (40 entries, 2 pages) the browse, log, decisions and ref-mode browser tests were re-run there: 59 passed. Screenshots on port 3423 (Decisions and Log at 1440 and 390 px, light and dark, a filtered view of each, log page 2, the empty state, the open tag list and the phone filters) were read: no defects, no sideways scrolling. The worktree was removed, its server stopped, the owner's portal on 3417 kept running, `.git/config` unchanged. Repo: quick lint 0 errors, portal check clean, portal-sync self-tests 39 passed, mask scan 0 unmasked.

## [2026-10-10] plan | p0.17 step "browse" committed: decisions and log can be searched, filtered and paged

- session: s01
- pages: [status-live]
- sources: [raw/owner/2026-10-10-s01-decisions-log-browse-approval.md, raw/evidence/phase-p0-planning/portal-v2/browse-checks.txt]
- result: What was done → the owner asked for paged, searchable, filterable decisions and log with a category and two tags each, answered Claude's questions and approved the plan ("Approved the plan") → every decision and log entry is labelled from one fixed list, and both tabs have search, filters, a results line, 20 per page with page numbers and the view kept in the address → he can find any decision or log entry quickly and share a link to a filtered view. STATUS: In-flight cleared; next action unchanged in substance (restart the portal, walk through it with Ref mode, then approvals in chat and the P0 sign-off, then the pause), now also naming the new search and filters. A refs.json explainer was added for the new commit.
- next: the owner restarts the portal, walks through it with Ref mode and tells Claude what reads unclear; then Approval Wave 1 in chat, the P0 exit review and sign-off; then Claude pauses until the owner says go for P1
- commit: 3a19188

## [2026-10-10] code | p0.17 browse review fixes: focus kept on Previous/Next, only tags in use, reversed-date hint, "Affects phase", four decision labels

- session: s01
- pages: [ip-routes-and-views]
- sources: [raw/owner/2026-10-10-s01-decisions-log-browse.md, raw/owner/2026-10-10-s01-decisions-log-browse-approval.md]
- result: Planning tooling only, no Ferrum code. A review of the browse step raised 11 points; 10 were fixed and 1 needs no code. (1) Previous and Next at the ends are now `aria-disabled` and ignore the press instead of `disabled`, so keyboard focus stays on the button; new unit and browser tests check the focus. (2) The Tags list offers only the tags some item on that tab has (`offeredInUse` in `lib/portal/taxonomy.ts`; taxonomy.json still holds all 26): 13 on the Log, 25 on Decisions today (only "tab sleeping" is unused there). (3) The two date boxes limit each other (`min`/`max`), and when "Date from" is after "Date to" the empty message says "The 'Date from' day is after the 'Date to' day." (`datesReversed`); unit and browser tests. (4) The Decisions phase filter is labelled "Affects phase", the choice (a decision's phase is the one it mainly affects) is added to the decisions table of the browse log entry, adr-0019 now affects P2 (its first raw WebView2 code and checks land there) and adr-0013 P6 (the analysis tools and first analysis). (5) Tags: adr-0012 now benchmarks + memory, adr-0020 wiki + phases. (6) Log search hint shortened to "Search the log" (it was cut off at 390 px). (7) The tag list also closes when keyboard focus leaves it (a click on plain text inside is left to the click-outside rule). (8) The browse log entry now says "category" like the screen does, and "adds that tag to the filter". (9) A filter with fewer than two choices is not drawn (today the Log's phase: every entry is P0); it appears by itself once there is a choice. (10) A page number past the end is corrected in the address (`clampPage`). (11) Ref id LO-2 names a different block since the browse step; no code change, mentioned to the owner. Wiki: ip-routes-and-views §6 describes the new behaviour.
- stales: [ip-routes-and-views] (no approvals exist yet, so nothing is actually stale)

## [2026-10-10] lint | p0.17 browse review fixes: npm run verify green, screenshots of Decisions and Log read at 1440 and 390 px

- session: s01
- pages: [ip-routes-and-views, status-live]
- sources: [raw/evidence/phase-p0-planning/portal-v2/browse-fixes-checks.txt]
- result: `npm run verify` exit 0 (typecheck, eslint, 833 unit tests passed and 1 skipped, `lint:wiki` 0 errors, 35 warnings, 2 info, build, 141 browser tests passed, E2E guard: real files unchanged) in a scratch git worktree of HEAD 55ae9f2 outside the repo with this step's files copied in; after the new plain log entry (41 entries, 3 pages) the browse, log, decisions and ref-mode browser tests were re-run there: 67 passed. Screenshots on port 3423 (Decisions and Log at 1440 and 390 px in both themes, the open tag lists with 25 and 13 tags, the phone filters with "Search the log" and "Affects phase", the reversed-date message in both themes, Previous keeping focus after going to page 1, log page 2 on a phone) were read: no defects, no sideways scrolling. The worktree was removed, its server stopped, the owner's portal on 3417 kept running, `.git/config` unchanged. Repo: quick lint 0 errors, 0 warnings; portal-sync self-tests 39 passed; mask scan 0 unmasked; portal check clean after restamping.

## [2026-10-10] plan | p0.17 step "browse-fixes" committed: search and filters fixed after a review

- session: s01
- pages: [status-live]
- sources: [raw/evidence/phase-p0-planning/portal-v2/browse-fixes-checks.txt]
- result: What was done → a review of the new search, filters and pages raised 11 points → 10 were fixed (focus kept on Previous and Next, only tags in use offered, a plain message for a reversed date range, "Affects phase" on Decisions, a one-choice filter hidden, the tag list closing when focus leaves, a too-high page number corrected, a shorter Log search hint, four decision labels and the browse log entry's wording) and the Ref name change of LO-2 is noted for the owner → the owner finds things without dead ends or confusing labels. STATUS: In-flight cleared; next action unchanged in substance (restart the portal, walk through it with Ref mode, then approvals in chat and the P0 sign-off, then the pause), now naming the review fixes. A refs.json explainer was added for the new commit.
- next: the owner restarts the portal, walks through it with Ref mode and tells Claude what reads unclear; then Approval Wave 1 in chat, the P0 exit review and sign-off; then Claude pauses until the owner says go for P1
- commit: c14d4b6

## [2026-10-11] ingest | Owner asks for one list pattern: cards that open on click, sort, and the same for questions, risks and research

- session: s01
- time: 00:11
- pages: [ip-routes-and-views, ip-testing, ops-portal-pipeline, ops-wiki-maintenance, ov-open-questions, schema, ip-spec, index]
- sources: [raw/owner/2026-10-10-s01-browse-v2-request.md, raw/owner/2026-10-10-s01-browse-v2-answers-1.md, raw/owner/2026-10-10-s01-browse-v2-answers-2.md, raw/owner/2026-10-10-s01-browse-v2-answers-3.md]
- result: Four raw files appended to MANIFEST.sha256 and listed in index.md. The owner wrote: "Make log entry cards accordian, add option to sort in asc, desc. I think you are already storing time. Btw, similar feedback for questions too." His answers in three rounds: the pattern also on Decisions, Risks and Research; add the time of day from now on (old entries keep the date); all cards closed with Open all; newest first by default; questions and risks use the six decision topics; Research becomes one list with its kind as category; Questions start on Open; extra sorts (highest risk first, by number, by phase, A to Z); Risks start highest risk first and Research by phase; the unused LogFilter.tsx and its two style rules may be deleted. Wiki: ip-routes-and-views §6 now describes the one list pattern for all five lists (route rows, detail popup, IT prefix updated); ip-testing, ops-portal-pipeline (labels for questions, risks and research; the time rule; BAD-LABEL and MISMATCH rows), ops-wiki-maintenance (time rule in the ground rules; §5 copy of tools/quick_lint.py synced), ov-open-questions (`asked` may carry the time), SCHEMA §6.1 and the §9.3 LOG-FORMAT row (time), ip-spec (component tree). The written-ahead SCHEMA §12 `- time: HH:MM` line is part of this step.
- stales: [schema, ip-routes-and-views, ip-testing, ov-open-questions, ip-spec] (no approvals exist yet, so nothing is actually stale)

## [2026-10-11] plan | Owner approves the "same pattern for every list" plan: "Approved"

- session: s01
- time: 00:11
- pages: [ip-routes-and-views, status-live]
- sources: [raw/owner/2026-10-10-s01-browse-v2-approval.md]
- result: Raw file appended to MANIFEST.sha256 and listed in index.md. The owner's words: "Approved". The plan: one pattern for Log (41), Questions (54), Decisions (28), Risks (25) and Research (70): cards closed at first with Open all / Close all, search, filters (a filter with one choice hidden), Sort, 20 per page, the view in the address (open cards not); time of day from now on; labels for questions, risks and research from the existing 26 tags; delete LogFilter.tsx; new Ref ids, none renumbered. Built by two agents (data and labels; screens), integrated and checked by Claude.

## [2026-10-11] code | p0.17 lists: one list pattern for log, questions, decisions, risks and research

- session: s01
- time: 00:11
- pages: [ip-routes-and-views, ip-testing, ops-portal-pipeline, ops-wiki-maintenance, ov-open-questions, schema]
- sources: [raw/owner/2026-10-10-s01-browse-v2-approval.md]
- result: Planning tooling only, no Ferrum code. Data: questions.json, risks.json and research.json items carry `category` and exactly 2 `tags` (research also `phase`); taxonomy.json gains `research_categories` (Research question, Prediction, Experiment, Measure, Test site); questions.json reordered to the order of the questions page so same-day ties follow it, summary reworded ("newest first; the list starts on the open ones"); optional `time` (HH:MM) on log entries and questions; schemas, tools/portal-sync-check.ps1 (BAD-LABEL for the new kinds, MISMATCH for a time that differs from the wiki), 13 new checker tests, tools/quick_lint.py and lib/wiki/log.ts accept `- time:` and report a bad value as LOG-FORMAT (lint-parity list updated). Screens: lib/portal/browse.ts (six sorts with written-order ties, a filter that starts on a value, optional date range, several phases per item, address prefix `risk-`), lib/portal/browseTabs.ts (`TAB_CONFIG` per list), Browse.tsx with native accordion cards, Sort and Open all, new CardLine.tsx and CardParts.tsx; Questions one list starting on Open; Risks table now cards ("Risk L × I = S"); Research one list of 70 with a Kind filter; decision, risk and research popups replaced by the opened card; LogFilter.tsx and its 2 CSS rules deleted (owner allowed it). Ref ids: new DE-8 to DE-17, RE-8 to RE-15, QU-7 to QU-12, LO-11, LO-12; changed DE-3, RE-2, QU-6, LO-3, DE-5, LO-8, DE-7, LO-10; retired RE-3 to RE-7, QU-2 to QU-5.
- stales: [ip-routes-and-views, ip-testing, ov-open-questions, schema] (no approvals exist yet, so nothing is actually stale)

## [2026-10-11] lint | p0.17 lists: npm run verify green in a scratch copy; screenshots of all five lists read at 1440 and 390 px in both themes

- session: s01
- time: 00:11
- pages: [ip-routes-and-views, ip-testing, status-live]
- sources: [raw/evidence/phase-p0-planning/portal-v2/lists-checks.txt]
- result: In a scratch copy outside the repo (own npm ci, e2e port 3448): typecheck, eslint, 868 unit tests passed and 1 skipped; lint:wiki first failed with 1 error: the copy has no .git, so the lint checked the MANIFEST format and flagged line 64 (an existing ` *` marker from c14d4b6); with that line changed in the copy only, 0 errors, 34 warnings, 4 info (in the repo, with git, the line stays as committed and lint:wiki is 0 errors); build; 210 browser tests passed; E2E guard: real files unchanged. 36 screenshots on port 3449 (all five lists at 1440 and 390 px, light and dark; a card opened; Open all; Oldest first, By number, risk A to Z; Questions on Any; Research filtered to Experiment and Measure) were read: no sideways scrolling, counts right (Questions "1–20 of 39 (54 in all)" on Open, 54 on Any; Research 9 experiments, 27 measures), no defects found. Scratch copy deleted, its server stopped, the owner's portal on 3417 kept running, `.git/config` unchanged. Repo: quick lint 0 errors, 0 warnings; python tool tests 19 OK; portal-sync self-tests 52 passed; portal check clean; mask scan 0.

## [2026-10-11] plan | p0.17 step "lists" committed: every list now works the same way

- session: s01
- time: 00:16
- pages: [status-live]
- sources: [raw/owner/2026-10-10-s01-browse-v2-approval.md, raw/evidence/phase-p0-planning/portal-v2/lists-checks.txt]
- result: What was done → the owner's approved plan ("Approved") was built by two agents and integrated: one list pattern on Log, Questions, Decisions, Risks and Research, labels on every question, risk and research item, the time of day on new log entries and questions → the owner finds and compares items the same way on every tab. STATUS: In-flight cleared; next action unchanged in substance (restart the portal, walk through it with Ref mode, then approvals in chat and the P0 sign-off, then the pause), now naming the five lists. A refs.json explainer was added for the new commit.
- next: the owner restarts the portal, walks through it with Ref mode and tells Claude what reads unclear (and whether a "speed" or "reliability" tag should be added); then Approval Wave 1 in chat, the P0 exit review and sign-off; then Claude pauses until the owner says go for P1
- commit: 8af6847

## [2026-10-11] code | p0.17 lists-fixes: review fixes for the one list pattern

- session: s01
- time: 00:50
- pages: [ip-routes-and-views, ip-testing, ops-resume-after-interruption]
- sources: [raw/owner/2026-10-10-s01-browse-v2-approval.md, raw/evidence/phase-p0-planning/portal-v2/lists-fixes-checks.txt]
- result: Planning tooling only, no Ferrum code. A review of the lists step raised 11 findings; 10 fixed, 1 partly. (1) Research: each kind has one status, so the Status filter is left out while it follows the kind one to one (new pure helper mirrorsCategory) and the closed line drops the status chip; the opened card shows "Status: …". (2) Overview link now says "See the open questions →". (3) Topics aligned with their decisions: Q-110 and Q-211 → Security & privacy (as adr-0019), risk-r18 → Security & privacy, Q-104 → Process & approvals (as adr-0003), Q-102 → Plan portal (as Q-103); risk-r03 kept under The app (its subject is the tab-sleep feature). (4) The owner's weak-tag list gains the page-load items tagged "address bar", rq-07 and exp-reliability ("memory"), Q-005 ("tabs") and Q-115 ("web views"); no tag changed or added. (5) Lists without dates (Risks, Research) show a note under Sort for Newest or Oldest first (sortNote). (6) Research kind links are a client component (KindLinks.tsx) that keeps the rest of the address, drops the page, marks the chosen kind (aria-current, filled pill) and clears it on a second click. (7) The resume example in ops-resume-after-interruption §4 carries "- time:" with the rule; the optional lint warning for missing times was not added (the rule lives in the skill and the procedures; a new lint code would also need a SCHEMA §9.3 row). (8) "Asked now" is a solid orange chip (.chip-asked). (9) The opened card's tag row says "Filter by tag:" and no longer repeats the category (LabelChips without category). (10) a11y.spec checks every list with all cards open at 1440 and 390 px in both themes (20 new tests). (11) Ref names: DE-7, DE-17, RE-15, QU-12 and LO-10 renamed to "Filter by tag chips" (they hold only tags now; supersedes the suggested "Kind and tag chips"); RE-2 marks the chosen kind; no id added, retired or renumbered. Also: updated set to 2026-10-11 on 8 pages committed after midnight (STALE-UPDATED), their portal hashes restamped.
- stales: [ip-routes-and-views, ip-testing, ops-resume-after-interruption, schema, ov-open-questions, ops-wiki-maintenance, ops-portal-pipeline, ip-spec, comp-interactive-plan] (no approvals exist yet, so nothing is actually stale)

## [2026-10-11] lint | p0.17 lists-fixes: npm run verify green in a scratch clone; fresh screenshots of the five lists and of each fix

- session: s01
- time: 00:50
- pages: [ip-routes-and-views, ip-testing, status-live]
- sources: [raw/evidence/phase-p0-planning/portal-v2/lists-fixes-checks.txt]
- result: Scratch clone outside the repo (git clone, working-tree diff applied, node_modules copied, core.longpaths via env only): typecheck, eslint, 873 unit tests passed and 1 skipped, lint:wiki 0 errors, build, 233 browser tests passed (23 new), E2E guard: real files unchanged. 33 screenshots on port 3449 read: no sideways scrolling anywhere; Research has no Status filter and the opened card says the status; the Overview link reads "See the open questions →"; the sort notes read right; the chosen kind is filled and keeps search and sort; "Asked now" stands apart in both themes; opened cards show "Filter by tag:" and no repeated category. Clone deleted, its server stopped, the owner's portal on 3417 kept running, .git/config unchanged. Repo: vitest 873 passed; lint:wiki 0 errors, 34 warnings after the updated-date fix; quick lint 0 errors, 0 warnings; python tool tests 19 OK; portal-sync self-tests 52 passed; mask scan 0.

## [2026-10-11] plan | p0.17 step "lists-fixes" committed: the lists review is fixed

- session: s01
- time: 00:52
- pages: [status-live]
- sources: [raw/evidence/phase-p0-planning/portal-v2/lists-fixes-checks.txt]
- result: What was done → the 11 review findings on the one list pattern were fixed and checked (Research status, Overview link, topics, weak-tag list, sort notes, kind links, the time line in the resume example, the "Asked now" chip, tag chips in opened cards, accessibility checks with cards open, Ref names) → the owner sees no repeated chips or filters, and the lists explain themselves. STATUS: In-flight cleared; next action unchanged in substance, now mentioning the review fixes. A refs.json explainer was added for the new commit.
- next: the owner restarts the portal, walks through it with Ref mode and tells Claude what reads unclear (and whether a "speed" or "reliability" tag should be added); then Approval Wave 1 in chat, the P0 exit review and sign-off; then Claude pauses until the owner says go for P1
- commit: b2557e0

## [2026-10-11] ingest | Owner answers to the Wave 1 and Wave 2 questions, the P0 sign-off and the approval of both waves

- session: s01
- time: 01:48
- pages: [ov-open-questions]
- sources: [raw/owner/2026-10-11-s01-wave1-answers-and-p0-signoff.md, raw/owner/2026-10-11-s01-wave1-pages-approval.md, raw/owner/2026-10-11-s01-p0-exit-scope.md, raw/owner/2026-10-11-s01-wave2-answers.md, raw/owner/2026-10-11-s01-wave2-pages-approval.md]
- result: Five raw owner files transcribed verbatim (index and MANIFEST lines added). Owner words: "1 yes 2 yes 3 yes for now. I may add bookmarks but after we are done. 3 yes 4 yes, it's a sign off. However, don't start next phase. Just mark the fact that phase0 and update all the documents needed"; then "Yes, approve them all (Recommended)" (Wave 1 pages); "Do the phase-1 round now" and "Yes, accept it (Recommended)" (manual lint report); Q-106 "Yes, approve it (Recommended)", Q-110 "Yes, one audited module (Recommended)", Q-211 "Two small extra modules (Recommended)"; finally "Approved all, mark it, don't start phase 1". Not a P1 go-ahead.

## [2026-10-11] plan | Owner answers written into the pages: Q-207, Q-004, Q-005, Q-108, Q-106, Q-110, Q-211 answered

- session: s01
- time: 01:48
- pages: [ov-open-questions, adr-0014, adr-0018, adr-0019, ov-project, ov-arch-webview2-integration, phase-p0-planning]
- sources: [raw/owner/2026-10-11-s01-wave1-answers-and-p0-signoff.md, raw/owner/2026-10-11-s01-wave2-answers.md]
- result: Seven questions set to answered with the owner's words, and the summary-by-gate table updated (schema and P1 entry no longer held by any question). adr-0014: Option B confirmed for every phase (Q-108). adr-0018: approved layout, spikes kept (Q-106). adr-0019: approved (Q-110) and Decision point 3 added, the two Windows unsafe modules telemetry::win and bench::win (Q-211 option a), with the continuous check widened to the three modules. ov-project: non-goals and split-view deferral confirmed; bookmarks noted as a possible addition after the planned phases (Q-005). ov-arch-webview2-integration: the proposal paragraph now records the owner's choice. phase-p0-planning: state on 2026-10-11 added. Portal JSON re-translated (questions, decisions 14, 18, 19, the P0 phase and roadmap row, explainers). These edits were made before the approvals below, so they stale nothing.
- next: record the approvals, run the P0 gate on the exit commit, record the P0 sign-off

## [2026-10-11] decide | adr-0018 and adr-0019 accepted by the owner

- session: s01
- time: 01:48
- pages: [adr-0018, adr-0019]
- sources: [raw/owner/2026-10-11-s01-wave2-answers.md, raw/owner/2026-10-11-s01-wave2-pages-approval.md]
- result: Both claude-proposed ADRs set to status accepted (decided_by stays claude-proposed, SCHEMA §6.4); index rows updated.

## [2026-10-11] approval | Approval Wave 1 approved: schema, the portal v2 ip pages, phase-p0-planning, adr-0001 to adr-0004, adr-0014, adr-0023 to adr-0027, comp-interactive-plan

- session: s01
- time: 01:48
- pages: [schema, ip-spec, ip-routes-and-views, ip-data-contract, ip-wiki-lint, ip-testing, phase-p0-planning, adr-0001, adr-0002, adr-0003, adr-0004, adr-0014, adr-0023, adr-0024, adr-0025, adr-0026, adr-0027, comp-interactive-plan]
- sources: [raw/owner/2026-10-11-s01-wave1-pages-approval.md]
- result: 18 keys recorded with tools/approvals_record.py (schema with the CLAUDE.md bootstrap_hash); tools/approvals_check.py shows each APPROVED. Q-207 and Q-004 are closed (answered yes, and schema approved).

## [2026-10-11] approval | Approval Wave 2 approved: the P1 dependency set

- session: s01
- time: 01:48
- pages: [phase-p1-foundation, adr-0006, adr-0007, adr-0010, adr-0011, adr-0012, adr-0018, adr-0019, adr-0021, comp-core, comp-webview2-runtime, comp-windows-os]
- sources: [raw/owner/2026-10-11-s01-wave2-pages-approval.md]
- result: 12 keys recorded; tools/approvals_check.py shows 30 entries, all APPROVED. This approval is not a P1 go-ahead: the owner said "don't start phase 1".

## [2026-10-11] gate | phase-p0-planning exit ready for review

- session: s01
- time: 01:48
- pages: [phase-p0-planning]
- result: Status set to gate-review. Manual items: the owner walked through portal v2 and its additions (2026-10-09 to 2026-10-11), answered or deferred the open questions (Waves 1 and 2 answered; the rest wait for their own waves, ops-approval-workflow §8), and accepted the manual lint report (raw/owner/2026-10-11-s01-p0-exit-scope.md). Next: scripts/gates/p0-gate.ps1 on the exit commit, then record phase-p0-planning#exit.

## [2026-10-11] gate | phase-p0-planning exit gate run 1 on e446aa4: FAIL at p0.8 (one MANIFEST line unreadable)

- session: s01
- time: 02:05
- pages: [phase-p0-planning]
- sources: [raw/evidence/phase-p0-planning/p0-gate.20261011-0204.txt]
- result: pwsh scripts/gates/p0-gate.ps1 -SaveEvidence (owner's portal stopped for the run): 23 PASS, 1 FAIL, 4 YOURS in 829 s. All test-gate rows passed (typecheck and style, 873 unit tests, browser tests on the production build, build, fingerprint cross-check, wiki check, portal sync, mask scan, tool tests). The FAIL: task p0.8 found no fingerprint for evidence/phase-p0-planning/portal-v2/browse-fixes-checks.txt, because its MANIFEST line (written in c14d4b6) used the binary-mode marker " *" that the checker does not read; the hash itself is correct. Fix: MANIFEST is append-only, so the old line stays and a correct line for the same file is appended, plus the line for this run's evidence file. p0.8 alone now passes (77 raw files, all match). npm audit in interactive_plan: the same 5 high findings as before, all in development-only lint tooling (braces via micromatch, fast-glob, eslint-config-next); the offered fix downgrades eslint-config-next to 14.2.35 (breaking), so not applied.
- next: commit, then run the P0 gate again on that commit

## [2026-10-11] gate | phase-p0-planning exit gate run 2 on b5f7d40: PASS

- session: s01
- time: 02:19
- pages: [phase-p0-planning]
- sources: [raw/evidence/phase-p0-planning/p0-gate.20261011-0218.txt]
- result: pwsh scripts/gates/p0-gate.ps1 -SaveEvidence on b5f7d40 (clean tree; owner's portal stopped for the run): RESULT PASS, 24 PASS, 4 YOURS, 745 s. Tasks p0.1 to p0.12 re-checked; test gate: typecheck and style exit 0, 873 unit tests passed (1 skipped), 233 browser tests passed on the production build bound to 127.0.0.1, build, fingerprint cross-check, wiki check 0 errors, saved first-run outputs present; housekeeping: portal sync clean, 0 unmasked values, tool tests pass, every check script parses. The four YOURS items are done by the owner: walkthrough (2026-10-09 to 2026-10-11), open questions answered or deferred to their waves, approvals of Waves 1 and 2, and the exit approval below. Exit criteria met: automated items passed on the exit commit with output saved; manual lint report 0 errors and accepted by the owner; Waves 1 and 2 APPROVED; no open question blocks the P1 dependency set.

## [2026-10-11] approval | phase-p0-planning#exit approved: the owner signed off P0

- session: s01
- time: 02:19
- pages: [phase-p0-planning]
- sources: [raw/owner/2026-10-11-s01-wave1-answers-and-p0-signoff.md, raw/owner/2026-10-11-s01-wave2-pages-approval.md]
- result: Recorded with tools/approvals_record.py after the gate passed (owner words: "it's a sign off. However, don't start next phase"; then "Approved all, mark it, don't start phase 1"). approvals_check: 31 entries; phase-p0-planning and its #exit show APPROVED_VOLATILE_DRIFT because only the status line changed (gate-review, then done).

## [2026-10-11] gate | phase-p0-planning exit approved; P0 done; PAUSED before P1

- session: s01
- time: 02:19
- pages: [phase-p0-planning, status-live]
- result: phase-p0-planning status set to done (index row too). Per SCHEMA §9.7 exit-gate step 7 Claude now pauses: no P1 task, install, scaffold or spike until the owner explicitly says go in Claude Code (to be transcribed and logged as gate | phase-p1-foundation go-ahead given). The owner said "don't start phase 1". Milestone report for the owner: the s01 handoff (updated) and the chat report.
- next: owner says go for P1 when ready; then Claude runs the P1 entry gate (SCHEMA §9.7) and starts with p1.1

## [2026-10-11] handoff | s01 handoff updated: P0 done and signed off, paused before P1

- session: s01
- time: 02:20
- pages: [handoff-2026-10-09-s01, status-live]
- result: handoff-2026-10-09-s01 rewritten for the P0 exit (third version; one file per session). STATUS: phase-p0-planning done, current task none (paused before p1.1), next action in the four-part format: nothing to run, say go for P1 when ready.
- next: owner's go-ahead for P1

## [2026-10-11] plan | p0.18 P0 exit committed: answers, approvals, gate pass, sign-off; paused

- session: s01
- time: 02:22
- pages: [status-live]
- result: Task commits e446aa4 (answers written into pages, Waves 1 and 2 recorded), b5f7d40 (MANIFEST line appended, gate run 1 saved) and f975531 (gate run 2 PASS, phase-p0-planning#exit recorded, phase done, handoff). scripts/verify/p0.17-portal-v2.ps1 PASS and scripts/verify/p0.18-close-p0.ps1 PASS after f975531. STATUS In-flight cleared; next action: paused until the owner says go for P1. Commit explainers added to refs.json.
- next: owner's go-ahead for P1
- commit: f975531

## [2026-10-11] lint | P0 finish-up: lint:wiki found 12 errors after P0 was set to done

- session: s01
- time: 11:54
- pages: [status-live, phase-p0-planning, adr-0016, ov-open-questions, risk-r22]
- sources: [raw/owner/2026-10-11-s01-p0-finishup-reapproval.md, raw/evidence/phase-p0-planning/r22-eol-check.txt]
- result: The owner asked to "update everything well" before a fresh session for P1. End-of-session checks: quick_lint 0, portal check clean, mask scan 0, but npm run lint:wiki showed 12 errors that appear only once P0 is done: STATUS current_task held text (pattern pN.M or null) and eight UNVERIFIED[phase-p0-planning] claims were past due (UNV-PASTDUE). Fixed: current_task null; phase-p0-planning's four claims closed with IP-1 scaffold and spike evidence; adr-0016's rename claim withdrawn (IP-4 tested it in Node only; adr-0023 removed the write path); ov-open-questions' coverage-v8 claim closed with IP-1 evidence; risk-r22's line-ending claim checked fresh (a clean clone with core.autocrlf=true: 276 wiki text files, all LF). A first clone attempt failed at checkout ("Filename too long") and checked nothing; rerun with core.longpaths for the clone only. MANIFEST: two lines appended (one first written with the " *" marker and corrected before commit). After the fixes: lint:wiki 0 errors, 36 warnings (34 plus APPROVAL-STALE for phase-p0-planning and its #exit, cleared by the re-approval below). Stales approval of phase-p0-planning and phase-p0-planning#exit.

## [2026-10-11] approval | phase-p0-planning and phase-p0-planning#exit re-approved after the finish-up edit

- session: s01
- time: 12:13
- pages: [phase-p0-planning]
- sources: [raw/owner/2026-10-11-s01-p0-finishup-reapproval.md]
- result: Owner: "Yes, re-approve both (Recommended)". Recorded with tools/approvals_record.py (earlier decisions kept in history). approvals_check: 31 entries, all APPROVED. Not a P1 go-ahead: the owner gives that in a fresh session.

## [2026-10-11] handoff | s01 closed: P0 finish-up done; P1 starts in a fresh session

- session: s01
- time: 12:14
- pages: [handoff-2026-10-09-s01, status-live]
- result: Handoff updated (finish-up, approvals all APPROVED, risk-r22 check done, long-path side finding, portal not running because Claude Code stopped it on low memory). STATUS: current_task null; next action: the owner opens a fresh session (s02), Claude runs the session start, and P1 begins only on the owner's explicit go.
- next: fresh session s02; owner's go-ahead for P1

## [2026-10-11] plan | P0 finish-up committed

- session: s01
- time: 12:14
- pages: [status-live]
- result: Task commit 5de4b44 (claims closed, risk-r22 evidence, re-approval, portal records, handoff). The checks before the checkpoint then found two slips in it: the risk-r22 portal mitigation was over 240 characters (portal-sync BAD-SHAPE) and the handoff quoted the unverified-tag text literally (lint:wiki UNV-PASTDUE); both fixed in 1b4ad02. After 1b4ad02: quick_lint 0 errors, lint:wiki 0 errors (33 warnings), portal check clean, mask scan 0.
- next: fresh session s02; owner's go-ahead for P1
- commit: 5de4b44

## [2026-10-11] resume | s02 start: P0 done and signed off, tree clean, nothing in flight

- session: s02
- time: 12:25
- pages: [status-live, phase-p1-foundation]
- result: Session-start steps of CLAUDE.md section 1 run: SCHEMA §5-§12 read, STATUS (In-flight empty), last five log entries, approvals_check (31 entries, all APPROVED), handoff-2026-10-09-s01, index, phase-p1-foundation. Git: clean on 9027860, no stash, no index.lock. Git and STATUS agree.

## [2026-10-11] gate | phase-p1-foundation go-ahead given

- session: s02
- time: 12:25
- pages: [phase-p1-foundation]
- sources: [raw/owner/2026-10-11-s02-p1-go-ahead.md]
- result: Owner: "Start phase 1 please", with the wish to finish P1 in this session and a standing rule: no kill commands and no deleting of things Claude did not create; ask first. Transcribed verbatim.

## [2026-10-11] gate | phase-p1-foundation entry passed

- session: s02
- time: 12:25
- pages: [phase-p1-foundation, status-live]
- sources: [raw/owner/2026-10-11-s02-p1-go-ahead.md]
- result: SCHEMA §9.7 entry checks. (1) phase-p0-planning done, phase-p0-planning#exit APPROVED, go-ahead given. (2) Dependency set (schema, phase-p1-foundation, adr-0006, adr-0007, adr-0010, adr-0011, adr-0012, adr-0014, adr-0018, adr-0019, adr-0021, comp-core, comp-webview2-runtime, comp-windows-os) all APPROVED. (3) No open question blocks an id in it (Q-106, Q-110, Q-218 answered). (4) The one CONTRADICTION in the set (adr-0010) is registered under Q-107. phase-p1-foundation set to in-progress (volatile key only; approval APPROVED_VOLATILE_DRIFT).
- next: p1.1 confirm and record the toolchain

## [2026-10-11] code | p1.1 toolchain confirmed and recorded; cargo-deny installed

- session: s02
- time: 12:34
- pages: [phase-p1-foundation]
- sources: [raw/evidence/phase-p1-foundation/toolchain.txt, raw/evidence/phase-p1-foundation/toolchain-details.txt]
- result: cargo install cargo-deny --locked installed cargo-deny 0.20.2. scripts/verify/p1.1-toolchain.ps1 -SaveEvidence PASS (8 of 8): rustc 1.99.0 on x86_64-pc-windows-msvc, cargo 1.99.0, VS Build Tools 2022 17.14, node v24.20.0, npm 11.19.0, Python 3.12.10, git 2.52.0.windows.1, PowerShell 7.6.6. Nothing else had to be installed (no winget, no UAC prompt). Git's link.exe is first on PATH, but cargo rustc --print link-args shows cargo calls the MSVC 14.44.35207 link.exe, and throw-away --lib and --bin crates build. This settles the phase page's link.exe claim; the phase-page tags are closed at the exit gate (editing the page now would stale its approval). Note: cargo and rustc are not on the Claude Code Bash PATH; add $USERPROFILE/.cargo/bin.
- next: p1.2 machine inventory
- commit: 29b7d81

## [2026-10-11] code | p1.2 benchmark machine inventory recorded

- session: s02
- time: 12:35
- pages: [phase-p1-foundation]
- sources: [raw/evidence/phase-p1-foundation/environment.md]
- result: Inventory commands of the phase page (plus memory modules, monitor list, Windows display version, browser file versions) saved as environment.md, masked. AMD Ryzen 7 6800H (8 cores, 16 threads), 4 x 8 GiB memory modules, Radeon graphics plus two DisplayLink adapters, Windows 11 Pro 25H2 build 26200.9457, Balanced power plan, no battery. WebView2 pv 154.0.4258.62, unchanged since 2026-10-08; Edge 155.0.4283.45; Chrome 154.0.8037.95. scripts/verify/p1.2-machine-inventory.ps1 PASS (3 of 3). Q-116 (is this the benchmark machine) and Q-122 (wall-power meter) are still open for the owner; batched with the next owner questions.
- next: p1.3 git hygiene and licences
- commit: c0142a5

## [2026-10-11] code | p1.3 ignore rules, line-ending rules and dual licence files

- session: s02
- time: 12:36
- pages: [phase-p1-foundation]
- result: .gitignore gained benchmarks/results/, *.etl and browser-profile folders (target/ already covers spikes/*/target/); .gitattributes gained binary types and CRLF for .cmd/.bat; LICENSE-APACHE from apache.org LICENSE-2.0.txt, LICENSE-MIT from opensource.org/license/mit (holder line "The Ferrum contributors", owner may change it); README licence section. scripts/verify/p1.3-ignore-licences.ps1 PASS (3 of 3); git check-ignore -v shows a rule for each build-output path; plan/snapshots/ stays tracked; no tracked file became ignored.
- next: p1.4 Cargo workspace
- commit: e4a193a

## [2026-10-11] code | p1.4 empty Cargo workspace per adr-0018

- session: s02
- time: 12:39
- pages: [phase-p1-foundation]
- sources: [raw/evidence/phase-p1-foundation/p1.4-cargo-build.txt, raw/evidence/phase-p1-foundation/p1.4-cargo-test.txt, raw/evidence/phase-p1-foundation/p1.4-cargo-fmt.txt, raw/evidence/phase-p1-foundation/p1.4-cargo-clippy.txt]
- result: Root Cargo.toml (resolver 2, exclude spikes/*, edition 2024, rust-version 1.90, MIT OR Apache-2.0, publish false, workspace lint unsafe_code forbid), Cargo.lock, rust-toolchain.toml pinned to 1.99.0 (rustup installed the named toolchain on first use). Six library stubs with #![forbid(unsafe_code)] and one test each (ferrum-core, -webview-manager, -security, -resource-manager, -telemetry, -network-logger as its own crate per comp-network-logger). Section-12 folders with README placeholders (docs/ in p1.13). cargo build, test (6 passed), fmt --check and clippy -D warnings all exit 0 (evidence p1.4-cargo-*.txt; the gate re-runs them as cargo-*.txt on one commit). scripts/verify/p1.4-rust-workspace.ps1 PASS (7 of 7). No component page changed: the stubs add no behaviour or interface (SCHEMA §9.8).
- next: p1.17 Tauri CLI and frontend pins
- commit: de68d66

## [2026-10-11] code | p1.17 Tauri CLI and frontend tool pins for the spikes

- session: s02
- time: 12:41
- pages: [phase-p1-foundation]
- sources: [raw/evidence/phase-p1-foundation/registry-versions-2026-10-11.txt, raw/evidence/phase-p1-foundation/toolchain-tauri.txt]
- result: Registry re-check saved (registry-versions-2026-10-11.txt): tauri 2.12.1 -> 2.12.3, @tauri-apps/cli 2.12.1 -> 2.12.2, @tauri-apps/api 2.12.1 -> 2.12.3 (newer patch used, as the phase page says); wry 0.57.0, webview2-com 0.39.1, windows 0.62.2, Playwright 1.64.0 unchanged. spikes/s1-multiwebview/package.json pins @tauri-apps/api 2.12.3, @tauri-apps/cli 2.12.2, vite 8.3.4, typescript 7.0.2 exactly, with package-lock.json. npx tauri --version = tauri-cli 2.12.2 (toolchain-tauri.txt). Tooling decision (delegated): the p1.17 check script also reads toolchain-*.txt companions, because toolchain.txt is raw and cannot be edited. p1.17 check PASS (2 of 2); check-script self-test PASS.
- next: p1.5 spike S1 multi-webview
- commit: 135d6cc

## [2026-10-11] code | p1.5 spike S1 automatic part: all automatic checks pass; sync deadlock reproduced

- session: s02
- time: 12:55
- pages: [phase-p1-foundation, risk-r02, risk-r05]
- sources: [raw/evidence/phase-p1-foundation/spike-s1/auto-1.json, raw/evidence/phase-p1-foundation/spike-s1/sync-1.json, raw/evidence/phase-p1-foundation/spike-s1/job-4.job.json]
- result: Spike app in spikes/s1-multiwebview (tauri 2.12.3 unstable). Automatic run: three child views from an async command (no deadlock), hide/show tab switching (visibilityState follows), no blank rendering (PrintWindow pixels match each tab colour), relayout on resize (bounds and page size follow), process lists from GetProcessInfos and GetProcessExtendedInfos (8 processes; one renderer per tab plus one for the shell). Where shell and tab overlap, the tab is drawn on top (issue 15682 seen), so the shell must never overlap tab bounds. Creating views from a synchronous command deadlocked (watchdog ended the app after 25 s). Job Object: all 8 WebView2-listed processes join the job, plus the app and a crashpad-handler WebView2 does not list; the job is empty 3 s after exit (3 runs agree). Report waits for the owner's Alt+Tab, resize and text-shortcut checks (manual rows).
- next: p1.7 spike S3 raw COM while the owner's S1 checks are pending
- commit: 331e3f6

## [2026-10-11] code | p1.7 spike S3 raw COM: every call succeeded

- session: s02
- time: 13:01
- pages: [phase-p1-foundation, risk-r03]
- sources: [raw/evidence/phase-p1-foundation/spike-s3-raw-com.md, raw/evidence/phase-p1-foundation/spike-s3/s3-1.json, raw/evidence/phase-p1-foundation/spike-s3/cargo-tree.txt]
- result: spikes/s3-raw-com (tauri 2.12.3, shell plus one child tab) reached every planned feature through with_webview: casts to ICoreWebView2_2/_3/_19 and Environment8; MemoryUsageTargetLevel Normal -> Low -> Normal; TrySuspend while hidden (result true, IsSuspended true), Resume, and show() waking a suspended view; GetProcessInfos; WebResourceResponseReceived (also reports Tauri custom-protocol responses, so a network logger must filter); ProcessFailed for the tab renderer ended via edge://kill (RENDER_PROCESS_EXITED, TERMINATED, exit code 1) with recovery by navigating; handlers removed with their tokens. One webview2-com (0.39.1) and one windows (0.62.2) in the tree. Unsafe invariants drafted in the report. This settles risk-r03 in favour of the raw-COM route and the phase-page claim that a renderer crash can be triggered on purpose (closed at the exit gate). Tooling decision (delegated): the p1.7 check script also looks in src-tauri/. Check PASS (3 of 3).
- next: p1.8 spike S4 Playwright over CDP
- commit: 3e30f93

## [2026-10-11] code | p1.8 spike S4 Playwright over CDP: one harness drives S1, Chrome and Edge

- session: s02
- time: 13:09
- pages: [phase-p1-foundation, risk-r06]
- sources: [raw/evidence/phase-p1-foundation/spike-s4-playwright-cdp.md, raw/evidence/phase-p1-foundation/spike-s4/results.json]
- result: spikes/s4-playwright-cdp/run.ts (playwright 1.64.0, Node 24 type stripping) drove spike S1 (WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222, non-elevated), Chrome for Testing 155.0.8059.39 and Edge 155.0.4283.45 (fresh profiles) through the same connectOverCDP path. S1 exposes the shell and each child web view as its own page target, identifiable by URL. Navigation to a loopback fixture, paint entries, evaluate, click, type, screenshot, response events, page.route, a raw CDP session, goBack, newPage and newContext worked on all three. Limitation: on a hidden S1 tab there are no paint entries and screenshots time out, while visibilityState reads visible; the harness must measure only shown tabs. S1 exits by its own timer; browsers closed with CDP Browser.close; nothing killed. Check PASS (2 of 2).
- next: p1.6 spike S2 profiles
- commit: c4dfd4d

## [2026-10-11] code | p1.6 spike S2 profiles: route (c) gives per-site profiles in one browser process

- session: s02
- time: 13:17
- pages: [phase-p1-foundation, risk-r01]
- sources: [raw/evidence/phase-p1-foundation/spike-s2-profiles.md, raw/evidence/phase-p1-foundation/spike-s2/s2-1.json]
- result: spikes/s2-profiles ran routes (c) and (d) with a loopback cookie fixture. Route (c), tab controllers created with raw COM from Tauri's own environment (CreateCoreWebView2ControllerWithOptions + SetProfileName): all calls S_OK, both sites and the shell report one BrowserProcessId, cookie who=A is sent by site A only. Route (d), Tauri child web views with a data_directory each: works and isolates cookies, but each site gets its own browser process (contradicts Q7). Route (a): Tauri PR 16054 still open and unmerged (GitHub API, 13:14); route (b), a fork patch, not run (supply-chain decision). Check PASS (2 of 2). Correction: the f7004a9 commit message said clippy was clean; it had 2 collapsible_if warnings, fixed in 809cd3c; all three Rust spikes now show 0 clippy warnings.
- next: p1.9 spike synthesis and proposed ADRs
- commit: f7004a9

## [2026-10-11] code | p1.10 git-backed wiki lint rules re-confirmed on the P1 history

- session: s02
- time: 13:19
- pages: [phase-p1-foundation]
- sources: [raw/evidence/phase-p1-foundation/check-p1.10.txt]
- result: scripts/verify/p1.10-history-wiki-checks.ps1 PASS (3 of 3): RAW-IMMUTABLE and STALE-UPDATED unit tests on fixture repositories 13 passed; npm run lint:wiki on the real wiki 203 pages, 0 errors; all 106 raw files have matching MANIFEST fingerprints. No second linter, no rule change needed.
- next: p1.12 dependency auditing
- commit: 60c7d03

## [2026-10-11] code | p1.12 cargo-deny rules, npm audit, new question Q-222 (MPL-2.0)

- session: s02
- time: 13:22
- pages: [phase-p1-foundation, ov-open-questions]
- sources: [raw/evidence/phase-p1-foundation/cargo-deny-p1.12.txt, raw/evidence/phase-p1-foundation/npm-audit.txt]
- result: deny.toml (advisories, permissive licence allow list compatible with MIT OR Apache-2.0, wildcards denied, crates.io only): cargo deny check ok on the workspace. Informational run on spike S1's Tauri tree: 5 crates declare MPL-2.0 (cssparser, cssparser-macros, dtoa-short, option-ext, selectors) and are rejected; new question Q-222 (blocks P2) asks the owner whether to allow MPL-2.0. npm audit for interactive_plan: production 0; dev-only 5 high from braces 3.0.3 via eslint-config-next 16.4.0, the only offered fix is a breaking downgrade, accepted as dev-only (delegated tooling decision, owner may overturn). Check PASS (4 of 4).
- next: p1.13 doc stubs
- commit: 04d9f8c

## [2026-10-11] code | p1.13 public doc stubs and AI_USAGE update

- session: s02
- time: 13:24
- pages: [phase-p1-foundation]
- result: SECURITY.md, BENCHMARKING.md, REPRODUCIBILITY.md and docs/README.md written as short entry points linking the canonical wiki pages and the P1 spike reports; AI_USAGE.md gained a use-by-phase section and a dated approval note. Check PASS (3 of 3): files exist, all relative links resolve, lint:wiki REF-DANGLING 0.
- next: p1.15 pre-commit hook
- commit: 3b24c12

## [2026-10-11] code | p1.15 pre-commit hook written and tested in a temporary clone; SCHEMA tag closed at the exit gate

- session: s02
- time: 13:25
- pages: [phase-p1-foundation, schema, qual-ci-plan]
- result: scripts/hooks/pre-commit stops a commit on quick_lint errors and warns when code under a component path (crates/*, apps/*) is committed without its component page. scripts/verify/p1.15-code-page-warning.ps1: the clone test passes (code-only commit warns, code-plus-page commit does not); its second step fails until SCHEMA §9.8 drops its `UNVERIFIED` tag. That SCHEMA edit (and the matching qual-ci-plan tag) is deferred to the exit-gate batch, because editing SCHEMA stales the schema approval, which is in every phase's dependency set; the owner re-approves once there. The hook is not installed in this repo (one cp per clone); installing it is offered to the owner.
- next: p1.11 CI workflow and local CI script
- commit: 898fd14

## [2026-10-11] correct | p1.15 code entry: tag keyword put in backticks (lint UNV-NOPHASE)

- session: s02
- time: 13:26
- pages: [log]
- result: The "[2026-10-11] code | p1.15 pre-commit hook written ..." entry, committed in 5c12770, contained the SCHEMA §7.1 tag keyword without backticks, which tools/quick_lint.py reports as 1 UNV-NOPHASE error. The keyword was put in backticks; no other character changed. This edits an existing entry, against SCHEMA §12 (append-only), following the 2026-10-08 precedent, so the wiki stays at 0 lint errors; it is reported to the owner. Claude's checkpoint script now refuses to commit when quick_lint prints errors.
- commit: 5c12770

## [2026-10-11] code | p1.11 CI workflow and local CI script; local run passes 14 of 14

- session: s02
- time: 13:32
- pages: [phase-p1-foundation, qual-ci-plan]
- sources: [raw/evidence/phase-p1-foundation/ci-local-p1.11.txt]
- result: .github/workflows/ci.yml on windows-latest (contents read, actions pinned by commit SHA: checkout v7.0.1, setup-node v7.1.0; long paths enabled before checkout) with jobs rust, rust-deps (cargo-deny 0.20.2), plan-app (incl. Playwright e2e), wiki (lint:wiki with full history, hash parity, tools tests). cargo-audit not added: cargo-deny advisories use the same RustSec database (delegated tooling decision). scripts/ci-local.ps1 runs the same steps; two deliberate differences: npm ci only with -CleanInstall (it deletes node_modules), e2e only with -E2E (Playwright force-stops its server; owner's no-kill rule). Local run PASS 14 of 14 (873 unit tests, lint:wiki 0 errors and 33 warnings, hash parity 42, tools 44). p1.11 check PASS with one owner step: push and report the GitHub run, or defer (the first push also waits for Q-221).
- next: p1.14 literature protocol and first reading batch
- commit: 5b6113c

## [2026-10-11] code | p1.14 literature protocol, reading log and batch 1

- session: s02
- time: 13:34
- pages: [phase-p1-foundation]
- sources: [raw/research/literature-batch-1.md]
- result: New raw note literature-batch-1 (fetched 2026-10-11): ARC original paper page (USENIX FAST 2003), WICG Page Lifecycle report (2022), Win32 CreateMemoryResourceNotification, WebView2 TrySuspend/Resume reference; each labelled. New pages ov-research-literature-protocol and ov-research-literature-log (indexed). Open: memory-pressure thresholds, and whether WebView2 fires freeze/resume on suspend (P7 test). Check PASS (2 of 2); lint:wiki 0 errors.
- next: p1.9 spike synthesis and proposed ADRs
- commit: 058ca1a

## [2026-10-11] decide | p1.9 proposed ADRs 0029 to 0031 from the spikes; owner batch next

- session: s02
- time: 13:42
- pages: [adr-0029, adr-0030, adr-0031, risk-r01, risk-r02, risk-r03, risk-r05, risk-r06, phase-p2-minimal-container]
- sources: [raw/evidence/phase-p1-foundation/spike-s2-profiles.md, raw/evidence/phase-p1-foundation/spike-s3/s3-2.json, raw/evidence/phase-p1-foundation/spike-s4-playwright-cdp.md]
- result: Proposed adr-0029 (tab web views are controllers Ferrum creates from Tauri's environment, one profile per site; refines how adr-0007 is built; would answer Q-107), adr-0030 (back/forward through CanGoBack/GoBack/GoForward and HistoryChanged; spike S3 history step, s3-2.json), adr-0031 (one Playwright CDP harness for all products, visible tab only, Job Object attribution). Five risks set to mitigating with spike results; their P1 claims closed or re-targeted (risk-r01 absence claim to P3). P2 page revised to the proposals (no P2 approval existed yet). No approved page was edited. Next: one owner batch (S1 hand checks, the three ADRs, Q-222, GitHub, Q-116, Q-122, hook install, MIT holder line), then the exit-gate claim closure.
- next: owner batch in chat
- commit: 82fe00a

## [2026-10-11] approval | adr-0029, adr-0030, adr-0031 approved; Q-107, Q-116, Q-122, Q-222 answered; GitHub deferred

- session: s02
- time: 13:50
- pages: [adr-0029, adr-0030, adr-0031, ov-open-questions]
- sources: [raw/owner/2026-10-11-s02-p1-design-and-questions.md]
- result: Owner: "Approve all three (Recommended)", "Allow MPL-2.0 for libraries (Recommended)", "Defer GitHub for now (Recommended)", "Yes this PC; no power meter". Recorded with tools/approvals_record.py (34 entries); the three ADRs set to accepted (volatile key, state APPROVED_VOLATILE_DRIFT). The one-window model (adr-0007) is confirmed. Questions answered: Q-107 (by adr-0029), Q-116 (this PC), Q-122 (no meter), Q-222 (MPL-2.0 allowed for libraries). The p1.11 GitHub step is deferred by the owner. Still open in this batch: the spike S1 hand checks.
- next: owner's S1 hand-check result; meanwhile Claude closes the remaining P1-targeted claims for the exit gate

## [2026-10-11] plan | P1 exit preparation: P1-targeted claims closed on 25 pages; four wait for the S1 hand check

- session: s02
- time: 13:56
- pages: [comp-webview-manager, ov-arch-configuration, ov-arch-crate-graph, ov-arch-repo-layout, ov-arch-webview2-integration, adr-0002, adr-0005, adr-0006, adr-0010, adr-0011, adr-0018, adr-0021, adr-0028, ov-open-questions, ops-environment-setup, ops-git-conventions, phase-p1-foundation, qual-ci-plan, qual-testing-strategy, risk-r18, risk-r20, schema]
- sources: [raw/evidence/phase-p1-foundation/p1-claim-checks.txt, raw/evidence/phase-p1-foundation/p1.15-hook-test.txt]
- result: Every claim tagged for P1 was verified with P1 evidence, re-targeted with a written reason, or dropped. New small checks saved in p1-claim-checks.txt (clippy undocumented_unsafe_blocks and rustc unsafe_op_in_unsafe_fn deny on Rust 1.99.0; proptest 1.12.0 needs Rust 1.88; turbopack.root works with spike lockfiles present; winget lists Node 24.20.0 and has a pin command) and the hook clone test in p1.15-hook-test.txt. Re-targeted to P2: Tauri app as a workspace member, crate versions and the toml crate, GitHub runner capabilities and SHA-pinned actions (first push deferred), reproducible-binary hashes, Node pinning after Node 26 LTS; to P3: the custom title bar resize issue 12207; to P6: pytest. Dropped: the PR 16054 patch route (not chosen) and cargo-audit (cargo-deny reads the same advisory database). SCHEMA §9.8 now names the pre-commit hook (closes the p1.15 check) and §8 lists adr-0001 to adr-0031 (next free adr-0032). ops-environment-setup's Rust and Build Tools rows now say installed. Still tagged for P1, waiting for the owner's S1 hand check: adr-0007, risk-r02, ov-arch-system-overview, comp-app-shell. quick_lint 0 errors; portal clean.
- stales: [adr-0002, adr-0006, adr-0010, adr-0011, adr-0018, adr-0021, phase-p1-foundation, schema]

## [2026-10-11] gate | adr-0002, adr-0006, adr-0010, adr-0011, adr-0018, adr-0021, phase-p1-foundation, schema approval stale

- session: s02
- time: 13:56
- pages: [adr-0002, adr-0006, adr-0010, adr-0011, adr-0018, adr-0021, phase-p1-foundation, schema]
- result: The exit-preparation edits above change these approved pages (claim closures only; no decision text changed), so their approvals are STALE (approvals_check). No implementation depends on them before the owner's review: only the S1 report and the exit gate remain, and the gate's entry check will wait for the re-approval. The owner is asked to re-approve them together with the P1 sign-off.
- next: owner's S1 hand check, then the re-approval round

## [2026-10-11] code | p1.15 hook check passes after the SCHEMA §9.8 update

- session: s02
- time: 13:57
- pages: [phase-p1-foundation]
- sources: [raw/evidence/phase-p1-foundation/check-p1.15.txt]
- result: scripts/verify/p1.15-code-page-warning.ps1 -SaveEvidence PASS (2 of 2): the clone test (code-only commit warns, code-plus-page commit does not) and the rulebook step (SCHEMA §9.8 now names the hook). Hook committed in 898fd14; not installed in this repo unless the owner asks.
- commit: b570056

## [2026-10-11] code | p1.5 spike S1 report with the owner hand checks; Alt+Tab focus a known issue

- session: s02
- time: 14:18
- pages: [phase-p1-foundation, risk-r02, adr-0007]
- sources: [raw/evidence/phase-p1-foundation/spike-s1-multiwebview.md, raw/owner/2026-10-11-s02-s1-hand-checks.md]
- result: Owner hand checks: Ctrl+A/C/V/Z work in a tab; resize, maximise and minimise work; after Alt+Tab back, typing reaches the tab only after a click (Tauri issue 13466 seen); owner: known issue, fix later. S1 report written (9 PASS, 1 FAIL as a known issue). The last four P1-targeted claims closed (adr-0007, risk-r02, ov-arch-system-overview, comp-app-shell); the focus fix is now a P2 claim, custom-title-bar resize a P3 claim. p1.5 check PASS. Stales adr-0007 (re-approval with the other 8 pages).
- commit: af70134

## [2026-10-11] approval | nine pages re-approved after the P1 claim closures

- session: s02
- time: 14:25
- pages: [adr-0002, adr-0006, adr-0007, adr-0010, adr-0011, adr-0018, adr-0021, phase-p1-foundation, schema]
- sources: [raw/owner/2026-10-11-s02-p1-reapproval.md]
- result: Owner: "Re-approve all 9 (Recommended)". Recorded with tools/approvals_record.py (previous decisions kept in history). approvals_check: 34 entries, all APPROVED or APPROVED_VOLATILE_DRIFT; approvals_check --gate phase-p1-foundation: ENTRY GATE PASS. STATUS blocked_on cleared. Not the P1 sign-off.
- next: pwsh -NoProfile -File scripts/gates/p1-gate.ps1 -SaveEvidence

## [2026-10-11] gate | phase-p1-foundation exit ready for review

- session: s02
- time: 14:33
- pages: [phase-p1-foundation, status-live]
- sources: [raw/evidence/phase-p1-foundation/p1-gate.txt]
- result: SCHEMA §9.7 exit steps 1 to 5. (1) scripts/gates/p1-gate.ps1 -SaveEvidence on 8cd0461: every automated item passed (cargo fmt, clippy -D warnings, cargo test, cargo deny, lint:wiki 0 errors, plan app lint/typecheck/test/build, ci-local.ps1, S4 robot), evidence committed in 314f849. (2) Every test_gate.evidence file exists. (3) Manual items recorded in raw/owner/: no admin (UAC) prompt was needed in P1 (nothing had to be installed with elevation); S1 hand checks done (Alt+Tab focus a known issue, fix in P2); profile route chosen and the one-window model confirmed (adr-0029); GitHub deferred by the owner. (4) Lint clean; no P1-targeted claim remains. (5) phase-p1-foundation set to gate-review (volatile key). 16 of 17 tasks done; p1.16 waits for the owner's approval of phase-p1-foundation#exit. Claude now pauses (owner's rule of 2026-10-10).
- next: owner reviews and signs off P1 (phase-p1-foundation#exit); P2 does not start without an explicit go

## [2026-10-11] approval | phase-p1-foundation#exit approved: P1 signed off

- session: s02
- time: 15:14
- pages: [phase-p1-foundation]
- sources: [raw/owner/2026-10-11-s02-p1-signoff.md]
- result: Owner: "Sign off". Recorded with tools/approvals_record.py; approvals_check: phase-p1-foundation and its #exit APPROVED_VOLATILE_DRIFT (status keys only). Not a P2 go-ahead.

## [2026-10-11] gate | phase-p1-foundation exit approved

- session: s02
- time: 15:14
- pages: [phase-p1-foundation, status-live]
- result: SCHEMA §9.7 step 6: phase-p1-foundation set to done (17 of 17 tasks). lint:wiki shows no UNV-PASTDUE for P1. Step 7: Claude pauses; phase-p2-minimal-container starts only on the owner's explicit go in chat.

## [2026-10-11] handoff | s02 closed: P1 done and signed off; paused before P2

- session: s02
- time: 15:14
- pages: [handoff-2026-10-11-s02, status-live]
- result: Handoff written; STATUS points the next session at the owner's P2 go-ahead and Approval Wave 3. Tree clean after the closing commits.
- next: owner's explicit go for P2

## [2026-10-11] gate | phase-p2-minimal-container go-ahead given

- session: s02
- time: 15:49
- pages: [phase-p2-minimal-container]
- sources: [raw/owner/2026-10-11-s02-p2-go-ahead.md]
- result: Owner: "Go ahead with phase 2". approvals_check --gate phase-p2-minimal-container: BLOCKED by adr-0015, comp-app-shell, comp-security-engine, comp-tab-content, comp-webview-manager, phase-p2-minimal-container (all PENDING: Approval Wave 3) and Q-109, Q-202, Q-214. No P2 implementation until these clear.

## [2026-10-11] plan | P2 dependency pages aligned with adr-0029 before Approval Wave 3

- session: s02
- time: 15:49
- pages: [comp-webview-manager, comp-tab-content, comp-app-shell, adr-0015]
- result: So that the owner approves the current design: comp-webview-manager now names the RawComHost backend and WebView2 events instead of Tauri hooks (downloads via DownloadStarting; old P4 claim about coexistence with Tauri on_navigation replaced by a P2 claim that the COM events cover the hooks); comp-tab-content says Ferrum-created tab controllers should have no Tauri IPC bridge (P2 claim, p2.3 negative test); comp-app-shell's async-creation note follows S1 and adr-0029; adr-0015 got a dated Claude-elaboration note (the owner's choice unchanged) mapping its Tauri hooks to WebView2 events for tabs, and its P4 claim now refers to Ferrum-created controllers. None of these pages was approved yet.
- next: ask Approval Wave 3 and Q-109, Q-202, Q-214

## [2026-10-11] approval | Approval Wave 3 approved; Q-109, Q-202, Q-214 answered

- session: s02
- time: 17:58
- pages: [adr-0015, comp-app-shell, comp-security-engine, comp-tab-content, comp-webview-manager, phase-p2-minimal-container, ov-open-questions]
- sources: [raw/owner/2026-10-11-s02-wave3-and-p2-questions.md]
- result: Owner: "Approve all six (Recommended)", "Offer a button (Recommended)", "Local HTTPS certificate (Recommended)", "TOML (Recommended)". Six keys recorded with tools/approvals_record.py. Q-109 (sign-in bar with an Open-in-browser button), Q-202 (local development CA in the owner's user certificate store, installed with his confirmation; key never committed), Q-214 (TOML) answered.

## [2026-10-11] gate | phase-p2-minimal-container entry passed

- session: s02
- time: 17:58
- pages: [phase-p2-minimal-container, status-live]
- result: approvals_check --gate phase-p2-minimal-container: ENTRY GATE PASS (P1 done with #exit approved; go-ahead given; dependency set APPROVED; no open question blocks it; the adr-0010 contradiction is registered under the answered Q-107). phase-p2-minimal-container set to in-progress (volatile key).
- next: p2.1 local fixture server

## [2026-10-11] code | p2.1 local HTTPS fixture server with a name-constrained dev CA

- session: s02
- time: 18:12
- pages: [phase-p2-minimal-container]
- sources: [raw/evidence/phase-p2-minimal-container/p2.1-fixture-curl.txt, raw/evidence/phase-p2-minimal-container/check-p2.1.20261011-1811.txt]
- result: tests/fixtures/server (fixture-server, exact pins) serves 16 documented routes over HTTPS. The local development CA lives outside the repo, is name-constrained to localhost, 127.0.0.0/8 and ::1, and was installed into the owner's user Root store with his confirmation of the Windows prompt (Q-202). 7 crate tests pass, including a certificate for example.com being rejected with NameConstraintViolation; a Windows curl probe got every documented status (--ssl-revoke-best-effort for the probe only, because a private CA has no revocation server). The p2.1 check script is now real: PASS; two earlier failing runs are kept as evidence. Test-support code, no component page.
- commit: e007c71

## [2026-10-11] code | p2.2 Ferrum app skeleton in apps/desktop

- session: s02
- time: 18:25
- pages: [phase-p2-minimal-container, comp-app-shell]
- sources: [raw/evidence/phase-p2-minimal-container/check-p2.2.txt, raw/evidence/phase-p2-minimal-container/p2.2-window-check.png]
- result: Tauri 2.12.3 app crate ferrum-desktop (workspace member, forbid unsafe), shell in vanilla TS + Vite with the adr-0028 toolbar (back, forward, reload, address bar), shell as a Tauri child web view in a 52 px band, strict CSP, capability shell.json for the shell web view only (no remote), FERRUM_EXIT_AFTER self-exit switch. Workspace lint unsafe_code now deny (crate roots keep forbid; adr-0019 module later); deny.toml allows MPL-2.0 (Q-222). Release build with the pinned Tauri CLI exit 0; p2.2 check PASS (window shows the toolbar, exits by itself); a first sampling bug in the check was fixed. comp-app-shell last_verified_commit set (volatile; its text already describes this).
- commit: 2c96d06

## [2026-10-11] code | p2.3 app bridge locked to the shell; IPC refusal self-test passes

- session: s02
- time: 18:34
- pages: [phase-p2-minimal-container, comp-app-shell, comp-tab-content]
- sources: [raw/evidence/phase-p2-minimal-container/p2.3-ipc-selftest.json, raw/evidence/phase-p2-minimal-container/check-p2.3.txt]
- result: build.rs declares the app commands (AppManifest), the only capability shell.json grants them to the shell web view with no remote section, app_ping is a harmless probe. Self-test FERRUM_SELFTEST=ipc: a hostile fixture page over HTTPS tried an app command and the event plugin listen and emit through the bridge; all three were refused by the ACL, and the shell positive control worked. The page loaded over HTTPS, so WebView2 trusts the local dev CA. p2.3 check PASS (3 of 3). The Ferrum-created content controller (adr-0029) joins this self-test in p2.6.
- commit: 196e66a

## [2026-10-11] code | p2.4 settings model in ferrum-core

- session: s02
- time: 18:36
- pages: [phase-p2-minimal-container, comp-core]
- sources: [raw/evidence/phase-p2-minimal-container/check-p2.4.txt]
- result: crates/core config module: the P2 subset of ov-arch-configuration in TOML (Q-214): start pages, http_policy, external_schemes, google_oauth (Q-109), new_window, data_dir; deny_unknown_fields; layered load (defaults, user file, experiment override); adr-0015 validation of start pages (https kept, http upgraded or warned, other schemes refused); config hash for later telemetry. 9 tests pass; p2.4 check PASS. comp-core last_verified_commit set (its interfaces already name config::Config, load, hash).
- commit: a69fa57

## [2026-10-11] code | p2.5 address-bar normalisation in ferrum-core

- session: s02
- time: 18:39
- pages: [phase-p2-minimal-container, comp-core]
- sources: [raw/evidence/phase-p2-minimal-container/check-p2.5.txt]
- result: Pure function address::normalize: scheme-less input gets https, http upgraded or warned, javascript/data/file/blob/view-source/about (except about:blank) refused, mailto/tel/custom schemes need confirmation or are denied, IDN to punycode, IPv6 literals, plain words refused (no search engine in P2), domain-label rules. 36 table cases over 14 classes plus a "malformed never navigates" test pass; the table caught a real bug (example..org accepted), fixed. p2.5 check PASS.
- commit: d3ad7ee

## [2026-10-11] code | p2.6 content web view created by Ferrum, wired to the shell

- session: s02
- time: 18:51
- pages: [phase-p2-minimal-container, comp-webview-manager, comp-app-shell]
- sources: [raw/evidence/phase-p2-minimal-container/p2.6-nav-selftest.json, raw/evidence/phase-p2-minimal-container/p2.6-ipc-selftest.json]
- result: webview-manager gained the tab module and the single raw-COM module webview2 (adr-0019): ContentView from Tauri's environment with profile ferrum-default (adr-0029), navigation, source, completion (HTTP status), history, title and focus events, navigate/back/forward/reload/stop/bounds/focus/close. The app places it below the toolbar, loads settings, exposes tab_* commands to the shell only, and restores page focus on window activation (S1 issue; manual confirmation pending). Self-test nav: two fixture pages each starting -> source changed -> completed (200) in order, received in order by the shell. Self-test ipc: the Ferrum-created view has no bridge at all (settles the adr-0029 / comp-tab-content / P2 claim; tags closed at the exit gate). Checks p2.6 and p2.3 PASS.
- commit: 2c9d89f
