---
id: adr-0032
type: decision
title: "Bookmarks and history in a local SQLite file; a manual, encrypted backup file moves them to another Ferrum"
status: accepted
updated: 2026-10-12
sources:
  - raw/owner/2026-10-12-s02-feature-set-request.md
  - raw/owner/2026-10-11-s01-wave1-answers-and-p0-signoff.md
related: [phase-p3-tabs-sessions, comp-core, comp-app-shell, ov-arch-configuration, ov-arch-trust-boundaries, ov-project, adr-0015, adr-0028]
approvable: true
date: 2026-10-12
decided_by: claude-proposed
supersedes: []
options:
  - "A. SQLite: one database file in Ferrum's data folder, plus a manual encrypted export and import file"
  - "B. Postgres on the same PC, plus the same export and import file"
  - "C. Postgres on a server, shared live by every Ferrum"
  - "D. Keep JSON files (today's history.json) and add bookmarks.json"
phase: phase-p3-tabs-sessions
tags: [storage, bookmarks, history, backup, security]
unverified:
  - claim: "rusqlite with its bundled SQLite build includes the FTS5 text index, needs no SQLite installed on the PC and passes cargo deny"
    verify_in: phase-p3-tabs-sessions
  - claim: "A maintained Rust crate implements passphrase-based authenticated encryption for the backup file (planned: the age format, or Argon2id with XChaCha20-Poly1305) under a licence cargo deny allows"
    verify_in: phase-p3-tabs-sessions
---

# ADR-0032: Bookmarks and history in a local SQLite file; a manual, encrypted backup moves them

## Context

On 2026-10-12, during the P3 review, the owner asked for a small feature set: bookmarks, searchable history and
"search (of the past) on the URL bar", and asked whether a Postgres database could hold the data
([raw/owner/2026-10-12-s02-feature-set-request.md](../raw/owner/2026-10-12-s02-feature-set-request.md)). On
2026-10-11 the owner had noted bookmarks as a possible later addition (Q-005).

Today (P3, task p3.7) history is a JSON file, `history.json`, in Ferrum's data folder: at most 1000 entries,
searchable by address or title in the sidebar, clearable at once ([ov-arch-configuration](../architecture/ov-arch-configuration.md)).
Bookmarks do not exist. Ferrum is also a research project: anything that runs beside it changes what the
benchmarks against Chrome and Edge measure.

## Options considered

| Option | Good | Bad |
|---|---|---|
| A. **SQLite file + encrypted export/import** | Nothing to install or run; works offline; instant; strong text search on one PC; data stays on the PC; no effect on benchmarks to speak of (Chrome and Firefox keep their history in SQLite files too) | One PC only, unless the backup file is carried over |
| B. Postgres on the same PC + the same export/import | Familiar SQL tools; strong text search | A database server runs all the time on every PC with Ferrum (install, password, updates, major-version upgrades); Ferrum fails without it; the server's memory and CPU must be counted or excluded in the benchmarks |
| C. Postgres on a server, shared live | Same data on every PC at once | Browsing history leaves the PC; needs network, a stored password and encrypted connections; offline gaps; changes the security design (P4) |
| D. JSON files | Already built for history | Slow and memory-hungry as lists grow; no real text search; whole file rewritten on each change |

## Decision

### Owner decision (verbatim)

From [raw/owner/2026-10-12-s02-feature-set-request.md](../raw/owner/2026-10-12-s02-feature-set-request.md):

> SQLite works as well for me. Sorry, I mis spelled postgress again. Essentially, I want a dump that I can load to another Ferrum browser. So data sharing is sorted.

and, on the backup:

> But I will like the option to take backup of the data from postgress and upload to another ferrum. This will be manual, but secure.

The owner also said "I will review the plan and approve implementation", so this ADR stays `proposed` until the
owner approves it in chat (SCHEMA §10.4 rule 3(a)).

### Claude elaboration (binding only once the owner APPROVES this ADR)

**Store.**

- One SQLite file, `ferrum.db`, in Ferrum's data folder, beside `session.json`. It holds history and bookmarks.
  It is browsing data: never committed, like `history.json` today.
- SQLite is compiled into Ferrum (the `rusqlite` crate with its bundled SQLite), so nothing is installed on the PC.
  Titles and addresses get a text index (SQLite FTS5) for fast search from the address bar.
  Both UNVERIFIED[phase-p3-tabs-sessions], checked when the store is built (p3.18), together with `cargo deny`.
- Every change is one transaction, so a crash never leaves a half-written file.
- History limit rises from 1000 to 50 000 entries (oldest dropped). **Clear history** empties the tables and the
  text index, then compacts the file (`VACUUM`), so cleared entries do not linger inside it.
- On first start after the update, `history.json` is copied into the database. The old file is renamed
  `history.json.imported` and kept; nothing is deleted.
- Bookmarks keep only `http` and `https` addresses. A `javascript:` or `file:` "bookmark" would let a backup file
  or a mistake run code or open local files, so such addresses are refused when saved and when imported.
- The file itself is not encrypted on disk. It is protected by the Windows user account, as Chrome and Edge protect
  theirs. Encrypting it locally would protect little (the key would sit on the same PC).

**Backup file (export and import, manual).**

- **Export** writes one file (`.ferrum-backup`) holding bookmarks and history, with a format version. It is
  encrypted with a passphrase the owner types (at least 12 characters, typed twice). The passphrase is never stored
  or logged. The encryption is authenticated: a wrong passphrase, a damaged file or any change to the file is
  refused as a whole, never half-imported. Planned format: the published `age` format in passphrase mode, or
  Argon2id key stretching with XChaCha20-Poly1305; chosen in p3.21 after a maintenance and licence check
  (UNVERIFIED[phase-p3-tabs-sessions]). Ferrum invents no encryption of its own.
- **Import** asks for the passphrase, then shows what is inside ("212 bookmarks, 3 400 history entries") before
  anything changes. The owner chooses **merge** (duplicates skipped) or **replace**. Replace first copies the current
  `ferrum.db` to a dated backup beside it.
- Import checks everything: format version, a size limit (100 MB), `http`/`https` addresses only, title length.
  A file that fails any check changes nothing.
- **Not included, on purpose:** cookies, saved logins, site data and per-site profiles. They belong to WebView2's
  profiles; moving them would move live sign-ins, a security risk. The owner signs in again on the new PC.
- Settings are not in the backup at first; they can be added later if the owner asks.

**Not chosen.** No server, no live sync, no Postgres. Searching the words *inside* visited pages is not planned
(the owner chose searching titles and addresses).

## Consequences

### Positive

- Bookmarks and a fast "search of the past" in the address bar, with no setup and no running server.
- Data moves between PCs by a file the owner controls, unreadable without the passphrase.
- No extra process, so the benchmark comparison with Chrome and Edge stays fair.

### Negative

- No automatic sync: moving data is a manual export and import.
- Two new dependencies (SQLite through `rusqlite`, an encryption crate). Both pass `cargo deny` before use.
- New sensitive assets: `ferrum.db` and backup files. [ov-arch-trust-boundaries](../architecture/ov-arch-trust-boundaries.md)
  lists them when they are built; P4 tests that remote pages cannot reach them (the p2.3 bridge lock covers the new
  commands).
- A lost passphrase means the backup file cannot be opened. That is the price of real encryption, and the export
  screen says so.

## Verification / evidence

- Owner's words: [raw/owner/2026-10-12-s02-feature-set-request.md](../raw/owner/2026-10-12-s02-feature-set-request.md).
- When built: the checks of p3.18 (store) and p3.21 (backup) on the [P3 page](../phases/phase-p3-tabs-sessions.md),
  saved under `raw/evidence/phase-p3-tabs-sessions/`.
