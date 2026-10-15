# P4: what stays shared between profiles and tabs, per isolation mode

Compiled by Claude on 2026-10-15 (session s07, task p4.14) from the P4 test evidence named in each row; no new
measurement was made for this file. Master prompt section 5 Phase 3 asks to "document precisely which resources remain
shared" and forbids claiming complete isolation without validation. "Tested" = a live test asserted it; "observed" =
seen in a process inventory or log, not asserted; "derived" = follows from an observation, not tested.

## Sources

- [check-p4.7.txt](check-p4.7.txt): p4.7 live tests (`isolation.spec`: storage per profile, clearing one site, private
  tabs, process inventory with two site profiles), 2026-10-13.
- [isolation-modes.md](isolation-modes.md) and [check-p4.15.txt](check-p4.15.txt): p4.15, the three isolation modes with
  two sites open, process counts per mode, 2026-10-14.
- [check-p4.18.txt](check-p4.18.txt): p4.18, the browser switches of every browser process in each mode, 2026-10-14.

## Per mode

| Resource | `shared` | `per-site` (default) | `per-site-udf` | Basis |
|---|---|---|---|---|
| Browser process | one for everything | one for everything | one per environment: the shell's plus one per site | observed (p4.7 inventory; p4.15 counts 1, 1, 3) |
| GPU and utility processes | one GPU, two utility | one GPU, two utility | one GPU and two utility per environment | observed (p4.15 counts) |
| Network service, so HSTS, DNS and connection pools | shared | shared | one per environment | derived from the process counts, not tested |
| Renderer processes | each site's page had its own | each site's page had its own | each site's page in its own environment | observed (p4.7 inventory, p4.15) |
| User data folder | the shell's | the shell's (profiles inside it) | the shell's, plus `udf/<profile>` per site | tested (p4.15: folders exist) |
| Cookies, localStorage, IndexedDB | one profile for all sites | per profile | per profile and folder | tested (p4.7 and p4.15 storage specs) |
| Clearing one site's data | clears the one shared profile (not tested) | leaves other profiles intact | leaves other folders intact (not tested) | tested for per-site only (p4.7) |
| Browser switches (SmartScreen on, autoplay, two menu switches) | identical | identical | identical in every environment | tested (p4.18 command lines) |
| Remote debugging port, when a test or benchmark sets it | one | one | not checked per environment | observed in p3.6 (one environment); not tested under per-site-udf |
| WebView2 runtime files on disk | shared | shared | shared | by construction |

## Not tested

Service workers, audio and crash-handler processes per mode; whether HSTS, DNS and socket pools are in fact separate
under `per-site-udf` (derived from the separate browser processes only). Nothing here claims complete isolation.
