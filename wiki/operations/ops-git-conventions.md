---
id: ops-git-conventions
type: operations
title: "Git conventions: checkpoint commits, messages, never push"
status: draft
updated: 2026-10-08
sources:
  - raw/01-scoping-decisions.md
  - raw/00-master-prompt.md
related: [adr-0011, adr-0003, adr-0014, ops-session-protocol, ops-resume-after-interruption, ov-open-questions]
approvable: true
audience: claude
trigger: "Every commit, every checkpoint, and any time a git command could change or discard history."
tags: [git, commits, ci]
---

# Git conventions

Owner decision Q8 ([raw/01-scoping-decisions.md](../raw/01-scoping-decisions.md)): git + GitHub Actions
(windows-latest), dual MIT OR Apache-2.0, **Claude never pushes**, the owner creates the remote
(adr-0011). The repository was initialised with `git init -b main` in session s01 and has **no commits
yet** (observed 2026-10-08). Whether Claude may make local commits during P0, including the first one,
is open question Q-104 in [ov-open-questions](../overview/ov-open-questions.md).

## 1. Hard rules

- **Never** `git push`, `git push --tags`, or create/modify remotes. The owner pushes.
- **Never** rewrite or discard history or work without explicit owner consent in the current session:
  no `reset --hard`, `rebase`, `commit --amend` of an earlier session's commit, `filter-branch`,
  `clean -f`, `checkout -- <path>`, `restore` (of the working tree), `stash drop`, `branch -D`,
  `push --force`, removing `.git/index.lock`. Allowed without consent because nothing is lost:
  `git restore --staged -- <paths>` (unstage only) and `git stash push -u -m "interrupted …" -- <paths>`
  (preserve, [ops-resume-after-interruption §3.2](ops-resume-after-interruption.md#32-preserve-and-restart-default-when-unsure)).
- **Never** bypass hooks (`--no-verify`) or signing settings.
- **Never** commit secrets, tokens, browser profiles, cookies, user-data folders (`EBWebView/` and the
  like), downloads, or personal browsing data (master prompt §12).
- **Never** edit or delete anything under `wiki/raw/` (SCHEMA §3.1). Lint check `RAW-IMMUTABLE` relies on
  git history for this.
- **Never** commit `plan/approvals.json` changes made by anyone other than the plan app. Claude may
  include the file in a commit only as written by the app, and says so in the message.
- Quote every path in git commands; the repo path contains a space.

## 2. Checkpoint commits

One verified task = one **task commit**, followed by one **bookkeeping commit** (see
[ops-session-protocol §4](ops-session-protocol.md#4-checkpoints)).

1. `git status --short` and `git diff` — read what will be committed.
2. Stage the task's explicit paths: `git add -- <path> <path>` (avoid `git add -A` so stray files such
   as local profiles, `.interrupted/` copies or benchmark scratch output are not swept in). Do not stage
   the bookkeeping paths `STATUS.md`, `wiki/log.md`, `wiki/index.md` here unless the task itself is
   about them.
3. Commit with the message format below.
4. Record the short sha (`git rev-parse --short HEAD`) in the log entry `- commit:` line, clear
   In-flight and set `next_action` in STATUS.md.
5. Bookkeeping commit: `git add -- STATUS.md wiki/log.md` (plus `wiki/index.md` if changed) and
   `git commit -m "docs(status): checkpoint pN.M [pN.M]"` (with the trailer). Never `--amend` the
   task commit to fold these in: the sha in the log must stay valid. After this the tree is clean.

A commit is made **after** the task's verification command has been run and observed to pass, except a
`wip` checkpoint (below), which must say in its body what is not yet verified.

## 3. Message format

Conventional Commits style with a task-id suffix:

```text
<type>(<scope>): <imperative summary, at most ~72 chars> [pN.M]

<what changed and why, 1-5 lines>

Verification: <command(s) run> -> <observed result>
Refs: pN.M, adr-NNNN, risk-rNN
Stales: <approval ids, if any approvable page changed>

Co-Authored-By: <trailer exactly as given by the Claude Code harness>
```

- **Types:** `feat`, `fix`, `test`, `refactor`, `perf`, `build`, `ci`, `docs`, `chore`, `bench`
  (benchmark workloads/harness), `wip` (checkpoint of an unfinished task; never for finished work).
  `bench` and `wip` are project additions to the common type list.
- **Scopes:** a crate or area name: `core`, `webview-manager`, `security`, `resource-manager`,
  `telemetry`, `shell`, `harness`, `analysis`, `paper`, `wiki`, `plan-app`, `ci`, `deps`, `status`
  (bookkeeping commits only).
- **Trailer:** the attribution line the Claude Code harness specifies for the session. As of
  2026-10-08 it is `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. If the harness specifies a
  different line in a later session, use that one; if the owner's own instructions say otherwise, the
  owner wins.
- `Verification:` must report only what was actually run in this repository state. If nothing was run
  (pure docs), write `Verification: none (docs only); quick lint <clean|N errors>`.

Examples:

```text
docs(wiki): draft P1 phase page and toolchain ADRs [p0.3]
feat(webview-manager): create tab webviews off the main thread [p3.2]
wip(security): partial navigation-policy matcher, tests not yet passing [p4.1]
docs(status): checkpoint p3.2 [p3.2]
```

## 4. Branches and tags

- Default branch `main`. Single-developer flow: Claude commits to `main` locally unless the owner asks
  for a branch. Risky spikes (for example risk-r01/risk-r02 de-risking) may use `spike/<task-id>-<slug>`
  branches so `main` stays buildable; merging a spike back is proposed to the owner.
- After an owner-approved milestone exit (`<phase-id>#exit`), Claude may create a local annotated tag
  `pN-exit` (for example `git tag -a p2-exit -m "M1 exit approved"`). The owner decides whether to push it.

## 5. Ignore policy (to implement in P1)

The `.gitignore` is a P1 deliverable. It must at least exclude `target/`, `node_modules/`, `.next/`,
`interactive_plan/test-results/`, Playwright reports, any WebView2 or browser user-data folders, local
`.env*` files, `.interrupted/` (copy-aside folders from interruption recovery) and OS clutter. Whether large benchmark outputs under `wiki/raw/bench/` are committed in full,
compressed or kept outside git is a P6 decision `UNVERIFIED[phase-p6-benchmark-harness]` (size of runs
unknown until then).

## 6. CI

GitHub Actions on `windows-latest` (adr-0011) is set up in P1. CI runs only after the owner creates and
pushes to the remote; Claude never triggers it. Whether a pre-commit hook or CI job can enforce "component
page updated in the same commit as the code" is `UNVERIFIED[phase-p1-foundation]` (SCHEMA §9.8).
