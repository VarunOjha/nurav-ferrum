# RAW SOURCE — Owner answers Q-230: Ferrum's own measuring is off by default (session s08, 2026-10-18)

> Immutable raw source. Transcribed by Claude on 2026-10-18. Owner answer verbatim (Claude Code chat,
> AskUserQuestion, one question). Follows: [2026-10-18-s08-p5-10-netlog-reapproval.md](2026-10-18-s08-p5-10-netlog-reapproval.md).

## 1. Context

Before p5.11 (settings for measuring and the network log), Claude noticed that ov-arch-configuration, a design page
Claude wrote, gives `[telemetry] enabled = true`, which the owner had never been asked about. Asked as Q-230.

## 2. The question and options (as asked)

Question: "Ferrum's own measuring (memory, CPU, startup and page-load times, tab changes; no web addresses) can write
data files during normal use. Should it be on or off by default?" Options: "Off by default (Recommended)" ("Like the
network log: you switch it on in Settings, and benchmark runs switch it on themselves. No files pile up in daily
use.") and "On by default" ("As the current design says. Data is always there for checking, but files grow during
every session (roughly a few MB per hour at one reading per second), so old ones get deleted after a set time.").

## 3. The owner's answer (verbatim)

> Off by default (Recommended)

## 4. Meaning recorded by Claude

Q-230 answered: `[telemetry] enabled` defaults to false; the user switches it on in Settings, benchmark runs switch it
on themselves. ov-arch-configuration is corrected in p5.11. The "few MB per hour" in the option text was Claude's
rough estimate, not a measurement.
