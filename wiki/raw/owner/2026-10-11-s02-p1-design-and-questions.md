# RAW SOURCE — Owner decides the P1 design proposals and four questions (session s02, 2026-10-11 13:49)

> Immutable raw source. Transcribed by Claude on 2026-10-11. Owner answers verbatim (Claude Code AskUserQuestion).
> Follows: [2026-10-11-s02-p1-go-ahead.md](2026-10-11-s02-p1-go-ahead.md).

## 1. Questions and answers (verbatim)

| Question (Claude) | Owner answer |
|---|---|
| Do you approve the three design proposals from the experiments? (adr-0029: Ferrum creates each tab view itself with a profile per site, one shared browser; adr-0030: back/forward ask the browser's own history; adr-0031: one test-robot path for all browsers, measuring only the visible tab.) This also confirms the one-window design. | **"Approve all three (Recommended)"** |
| Five libraries that Tauri brings in use the MPL-2.0 licence (...). May the licence check allow MPL-2.0 for libraries? (Q-222; without it, phase 2's licence check fails.) | **"Allow MPL-2.0 for libraries (Recommended)"** |
| GitHub: the check workflow is ready, but old commits still contain the real machine values (the history-rewrite question, Q-221), so a first upload should wait until that is settled. What do you want for phase 1? | **"Defer GitHub for now (Recommended)"** |
| For the benchmarks: is this computer (AMD Ryzen 7 6800H, 32 GB nominal RAM, recorded in environment.md) the benchmark machine, and do you have a wall-power meter? (Q-116, Q-122) | **"Yes this PC; no power meter"** |

The option text the owner chose for the first question said: "Claude records your approval; P2 is then planned on these.
adr-0029 also answers the open profile question (Q-107)."

## 2. Meaning recorded by Claude

- `adr-0029`, `adr-0030`, `adr-0031`: approved. The one-window hosting model (adr-0007) is confirmed. Q-107 (how to implement
  per-site profiles) is answered by adr-0029: route (c), controllers Ferrum creates from Tauri's environment.
- Q-222: answered; `deny.toml` may allow `MPL-2.0` for dependencies (added when P2 first needs it).
- p1.11 GitHub owner step: deferred by the owner. Phase 1 closes with the local CI run as evidence; the first push waits for
  Q-221.
- Q-116: this computer (the one in `wiki/raw/evidence/phase-p1-foundation/environment.md`) is the benchmark machine.
- Q-122: no wall-power meter is available.
- Not yet given: the spike S1 hand checks (Alt+Tab focus, resize, shortcuts) and the P1 sign-off.
