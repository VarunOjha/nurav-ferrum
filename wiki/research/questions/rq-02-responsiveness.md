---
id: rq-02
type: research-question
title: "Startup, navigation and rendering responsiveness"
status: open
updated: 2026-10-08
sources:
  - raw/00-master-prompt.md
  - raw/research/measurement-methodology.md
related:
  - ov-research-plan
  - ov-research-traceability
  - exp-navigation
  - exp-rendering
  - exp-startup
approvable: true
question: "Does hosting web content in Ferrum (Tauri shell + child WebView2 per tab) change startup latency, navigation latency or rendering smoothness compared with Chrome, Edge and the minimal baseline?"
hypotheses:
  - hyp-04
  - hyp-05
  - hyp-06
paper_section: "Results: responsiveness"
phase: phase-p6-benchmark-harness
tags:
  - research
---

# RQ-02: Startup, navigation and rendering responsiveness

> Does hosting web content in Ferrum (Tauri shell + child WebView2 per tab) change startup latency, navigation latency or rendering smoothness compared with Chrome, Edge and the minimal baseline?

**Why it matters.** Master prompt §7 (startup, navigation and rendering dimensions). Embedded WebView2 composition and Ferrum's navigation interception could add latency (`adr-0007`).

**Hypotheses (pre-registration candidates).**
- [hyp-04](../hypotheses/hyp-04-startup-window-visible.md): Ferrum shows its first window sooner than Chrome and Edge
- [hyp-05](../hypotheses/hyp-05-navigation-non-inferiority.md): Ferrum's navigation latency is non-inferior to Chrome and Edge
- [hyp-06](../hypotheses/hyp-06-rendering-non-inferiority.md): Ferrum's rendering smoothness is non-inferior to Chrome and Edge

**Experiments.** [exp-navigation](../experiments/exp-navigation.md), [exp-rendering](../experiments/exp-rendering.md), [exp-startup](../experiments/exp-startup.md)

**Paper section.** Results: responsiveness. See [ov-research-paper-plan](../ov-research-paper-plan.md).

**Status.** `open`. No data exists. The answer will be written here only after the experiments listed above reach `analyzed`, and it will link `raw/bench/` run ids (see [ov-research-traceability](../ov-research-traceability.md)).
