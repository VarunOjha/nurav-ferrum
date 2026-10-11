# Benchmarking

No benchmark has been run yet, so this repository contains **no performance results**. Benchmarks start in
P5/P6; this file outlines the fairness rules they follow. The canonical documents are in the wiki.

## What is compared

Ferrum against Chrome, Edge and a minimal Tauri + WebView2 baseline app, on one documented machine
([machine inventory](wiki/raw/evidence/phase-p1-foundation/environment.md)). Plan:
[research plan](wiki/research/ov-research-plan.md); experiments under `wiki/research/experiments/`.

## Fairness rules (outline)

- **Same robot for everyone.** One Node/TypeScript Playwright harness drives all products over the same CDP path
  ([adr-0012](wiki/decisions/adr-0012-benchmark-harness-rust-playwright.md); shown to work in the
  [spike S4 report](wiki/raw/evidence/phase-p1-foundation/spike-s4-playwright-cdp.md)). The debug-port flag is
  applied to every product alike.
- **Measure only what is shown.** Hidden tabs record no paint timing and cannot be screenshotted (spike S4), so
  paint and visual measures are taken on the visible tab.
- **No flattering settings.** Chrome and Edge resource-saving features are not switched off to make Ferrum look
  better ([CLAUDE.md](CLAUDE.md) §6). The framing (vendor defaults, matched settings or both) is an open owner
  question (Q-117 in [open questions](wiki/overview/ov-open-questions.md)).
- **Pre-registered analysis.** Hypotheses, metrics and statistics are fixed before data is collected
  ([fairness protocol](wiki/research/ov-research-fairness-protocol.md),
  [statistical analysis plan](wiki/research/ov-research-statistical-analysis-plan.md),
  [threats to validity](wiki/research/ov-research-threats-to-validity.md)).
- **Raw data is kept unedited** under `wiki/raw/bench/`, and every reported number links to it.
