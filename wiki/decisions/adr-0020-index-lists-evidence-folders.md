---
id: adr-0020
type: decision
title: "index.md lists raw evidence and bench folders, not individual files"
status: accepted
updated: 2026-10-08
sources:
  - raw/owner/2026-10-08-s01-wave0b.md
  - raw/evidence/phase-p0-planning/interactive-plan/IP-0-toolchain.txt
related: [schema, index, ip-wiki-lint, ops-wiki-maintenance, ov-open-questions, phase-p0-planning, adr-0002]
approvable: true
date: 2026-10-08
decided_by: owner
supersedes: []
options:
  - "Lower-case index labels, compared case-insensitively"
  - "List evidence and bench folders instead of files"
  - "Rename future evidence files to lower case"
phase: phase-p0-planning
tags: [schema, index, lint, raw]
---

# ADR-0020: index.md lists raw evidence and bench folders, not individual files

## Context

SCHEMA §11 listed every raw file in [index.md](../index.md) under `Raw sources`, with the file's
basename (without extension) as its index label, and the index-line regex allows only `[a-z0-9.-]` in
labels. The P0 evidence names fixed on [phase-p0-planning](../phases/phase-p0-planning.md)
(`IP-0-toolchain.txt`, `IP-1-scaffold.txt`, …) contain upper-case letters. After p0.9 saved
[IP-0-toolchain.txt](../raw/evidence/phase-p0-planning/interactive-plan/IP-0-toolchain.txt), the quick
lint reported one `INDEX-MISSING` error that no index line could fix. This was registered as
[Q-219](../overview/ov-open-questions.md#q-219-index-ids-for-upper-case-evidence-file-names-schema-11-vs-the-p0-evidence-names)
because each fix changes lint semantics. Benchmark runs (P5/P6) will add many more raw files, which
would make a per-file listing long.

## Options considered

| Option | Pros | Cons |
|---|---|---|
| A. Lower-case the label, compare case-insensitively | Keeps one line per file | Labels no longer equal file names; still one line per benchmark output file |
| B. **List evidence and bench folders instead of files** | Scales to benchmark runs; no label/file-name mismatch | The index no longer names each evidence file; readers open the folder |
| C. Rename future evidence files to lower case | No schema change | `IP-0-toolchain.txt` cannot be renamed (raw is immutable), so its error stays unless combined with A or B |

## Decision

### Owner decision (verbatim)

As recorded in [raw/owner/2026-10-08-s01-wave0b.md](../raw/owner/2026-10-08-s01-wave0b.md), answer to Q-219:

> **"List folders, not files"** — wiki/index.md lists each evidence folder (e.g. `raw/evidence/phase-p0-planning/`) instead of every file; scales to benchmark result files later. Requires a small SCHEMA §11 change + lint update, recorded as an ADR.

This quoted choice is what `decided_by: owner` and `status: accepted` cover (SCHEMA §10.4 rule 3(b)).

### Claude elaboration (binding only once this ADR is APPROVED in the plan app)

The exact rule written into SCHEMA §11:

- A file under `wiki/raw/evidence/` or `wiki/raw/bench/` is **not** listed individually. Instead the
  index lists its **first-level folder** below `evidence/` or `bench/` (that is `raw/evidence/<phase-id>/`
  or `raw/bench/<run-id>/`). One line covers every file in that folder and in its subfolders (for example
  `raw/evidence/phase-p0-planning/interactive-plan/` and `raw/bench/<run-id>/segment-NN/`).
- The folder's index label is its path relative to `wiki/raw/`, lower-cased, with `/` and every other
  character outside `[a-z0-9.-]` replaced by `-`, and no trailing `-`. Example:
  `raw/evidence/phase-p0-planning/` → `evidence-phase-p0-planning`. The SCHEMA §11 line regex is
  unchanged, so the plan app's index parser is unchanged.
- The link target is the folder path relative to `wiki/` with a trailing slash; the status column is
  `raw`. Example:
  `- [evidence-phase-p0-planning](raw/evidence/phase-p0-planning/) | raw | Evidence folder: phase-p0-planning | …`
- A file placed directly in `raw/evidence/` or `raw/bench/` (no folder) is an `INDEX-MISSING` error:
  evidence always goes into a phase folder, bench output into a run folder.
- Raw files elsewhere (`raw/` top level, `raw/owner/`, `raw/research/`, `raw/assets/`) are still listed
  one line per file, as before.
- `INDEX-MISSING` in the quick lint ([ops-wiki-maintenance §5](../operations/ops-wiki-maintenance.md#5-lint),
  `tools/quick_lint.py`) and in the TS lint ([ip-wiki-lint](../interactive-plan/ip-wiki-lint.md) §2)
  checks folder lines this way: every first-level evidence/bench folder that contains a file needs a
  line, and a folder line whose folder does not exist is an error.

## Consequences

### Positive

- The upper-case evidence names mandated for IP-0…IP-10 stay as specified; no raw file is renamed.
- The index stays short when benchmark campaigns write hundreds of files.

### Negative

- The index no longer names each evidence file. The phase page `test_gate.evidence` lists and the
  `log.md` entries remain the per-file record.
- Edits SCHEMA §11, so the `schema` approval goes stale (SCHEMA §15; no approvals exist yet). Also edits
  the chat-approved page ip-wiki-lint (SCHEMA §10.4 rule 2).

### Related risks and phases

- `phase-p0-planning` (IP-9/IP-10 and the P0 exit need a clean lint); P5/P6 bench runs.

## Verification / evidence

- Owner answer: [raw/owner/2026-10-08-s01-wave0b.md](../raw/owner/2026-10-08-s01-wave0b.md).
- After the change the quick lint reports 0 errors over the real wiki, and its unit test covers a
  listed folder, a missing folder line, a file directly under `raw/evidence/` and a stale folder line
  (`tools/test_quick_lint.py`; output saved under `raw/evidence/phase-p0-planning/`).
