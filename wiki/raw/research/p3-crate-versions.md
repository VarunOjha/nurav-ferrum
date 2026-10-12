---
id: research-p3-crate-versions
type: research-note
title: "P3 crate versions: Ferrum's pinned crates compared with the newest releases on crates.io"
updated: 2026-10-12
sources:
  - Cargo.lock (repository, P3)
  - https://crates.io/api/v1/crates/<name> (accessed 2026-10-12, one request per crate)
---

# P3 crate versions (task p3.13)

> Raw research note. Written by Claude in session s02 on 2026-10-12. **VERIFIED** = read on that day: the locked
> version from `Cargo.lock`, the newest stable version from the crates.io API field `max_stable_version`.

| Crate | Locked in Cargo.lock | Newest stable on crates.io (2026-10-12) |
|---|---|---|
| url | 2.5.8 | 2.5.8 |
| toml | 1.1.8+spec-1.1.0 | 1.1.8+spec-1.1.0 |
| serde_json | 1.0.154 | 1.0.154 |
| serde | 1.0.229 | 1.0.229 |
| tokio | 1.53.2 | 1.53.2 |
| sha2 | 0.11.0 | 0.11.0 |
| tracing | 0.1.44 | 0.1.44 |
| tracing-subscriber | 0.3.23 | 0.3.23 |
| psl | 2.1.241 | 2.1.241 |

- **VERIFIED**: every crate above is on the newest stable release on that day.
- Compatibility: the workspace builds, its tests pass and `cargo deny check` reports "advisories ok, bans ok, licenses
  ok, sources ok" with these versions (P3 runs, 2026-10-12).
- `thiserror` is not a Ferrum dependency (Ferrum's errors are hand-written enums); it appears in `Cargo.lock` only as a
  dependency of other crates.
- `psl` releases often (a new Public Suffix List each time, research note p3-profiles-psl R1), so "newest" holds only
  for the day it was checked.
