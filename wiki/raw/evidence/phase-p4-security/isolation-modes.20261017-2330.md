# p4.15 isolation modes: processes per mode (observed)

Run: 2026-10-17 23:30 at commit c59d019 (with uncommitted changes), debug build, by `scripts/verify/p4.15-selectable-isolation-modes.ps1 -SaveEvidence`.
Fixture: two test sites (site-a.localhost, site-b.localhost) open in two tabs, plus the empty start tab; counts from
WebView2 GetProcessExtendedInfos of every environment (test hook `test_processes`). One run each; not a measurement
of cost (that is P6, exp-isolation-overhead).

| Mode | Configuration | Environments | Browser processes | Renderers | GPU | Utility | All processes |
|---|---|---|---|---|---|---|---|
| `shared` | cfg-ferrum-shared-profile | shell | 1 | 4 | 1 | 2 | 8 |
| `per-site` | cfg-ferrum-profile-per-site | shell | 1 | 4 | 1 | 2 | 8 |
| `per-site-udf` | cfg-ferrum-udf-per-site | shell, site-site-a.localhost, site-site-b.localhost | 3 | 4 | 3 | 6 | 16 |

No mode was found infeasible in this run: all three passed their storage tests (check-p4.15.txt).
