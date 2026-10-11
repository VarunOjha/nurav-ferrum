# RAW SOURCE — Owner answers to the Wave 2 (phase-1 round) questions Q-106, Q-110, Q-211 (session s01, 2026-10-11)

> Immutable raw source. Transcribed by Claude on 2026-10-11. Owner answers verbatim (AskUserQuestion, Claude Code chat).
> Follows: [2026-10-11-s01-p0-exit-scope.md](2026-10-11-s01-p0-exit-scope.md).

| Question (Claude) | Owner answer |
|---|---|
| Q-106 — Phase-1 question 1 of 3: do you approve the folder layout? The repo folder is the project folder, with one Rust workspace. Extra folders: the network logger as its own part, the plain comparison app, the benchmark robots, the security test pages, a spikes folder for throwaway test builds (kept as evidence), tools, and saved approval snapshots. | **"Yes, approve it (Recommended)"** (spikes kept as evidence) |
| Q-110 — Phase-1 question 2 of 3: some features can only be reached by talking to WebView2 directly with 'unsafe' Rust code. Do you approve one deliberate, carefully reviewed module for that? | **"Yes, one audited module (Recommended)"** |
| Q-211 — Phase-1 question 3 of 3: measuring memory and CPU per process also needs unsafe Windows calls. Where should that code live? | **"Two small extra modules (Recommended)"**: option (a), `telemetry::win` and `bench::win`, each with its own `## Unsafe invariants` section. |

Consequence noted by Claude: adr-0019 currently confines all unsafe code to the WebView2 COM module; it gets the Q-211 (a) exception
written in before the owner's approval of the Wave 2 pages is recorded.
