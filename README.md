# Ferrum

**Status: planning (phase P0).** There is no application code, no release and no benchmark result yet.

Ferrum aims to be an open-source, resource-efficient and security-conscious web-application container
for Windows 11, built with Rust, Tauri 2 and Microsoft WebView2. Whether it actually uses fewer resources
than Chrome or Edge is a research question, not an established property (see
[RESEARCH_PLAN.md](RESEARCH_PLAN.md)). It is also a research project: a
reproducible benchmark framework comparing Ferrum with Google Chrome, Microsoft Edge and a minimal
Tauri baseline, and an experimental adaptive WebView lifecycle manager, written up as a paper.

The working paper title is *Adaptive Resource Management for Chromium-Based Desktop Web Containers:
Design and Experimental Evaluation*. Whether any of Ferrum's ideas are novel is **not established**; a
literature review is planned before any such claim.

## How this project works

- **Planning first.** Every phase, decision, risk and experiment is a page in [`wiki/`](wiki/). The
  owner approves each page in the interactive plan app before any implementation that depends on it.
- **Phase-gated.** Work proceeds in phases P0–P8 (milestones M1–M7), each with an automated and a
  manual test gate and an owner review at its exit.
- **Built across many sessions.** The documentation is the project memory, following
  [Karpathy's LLM-wiki pattern](wiki/raw/research/llm-wiki-pattern.md). Any new session resumes from
  [`STATUS.md`](STATUS.md), [`wiki/log.md`](wiki/log.md) and the latest handoff.
- **AI-assisted, human-responsible.** See [`AI_USAGE.md`](AI_USAGE.md).

## Repository map

| Path | What it is |
|---|---|
| [`STATUS.md`](STATUS.md) | Live state: current phase, in-flight work, blockers, next action |
| [`CLAUDE.md`](CLAUDE.md) | Session bootstrap for Claude Code (resume, checkpoint, integrity rules) |
| [`PLAN.md`](PLAN.md) | Human summary of the phases and milestones |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Human summary of the planned architecture |
| [`RESEARCH_PLAN.md`](RESEARCH_PLAN.md) | Human summary of research questions, hypotheses and experiments |
| [`AI_USAGE.md`](AI_USAGE.md) | How AI assistance is used and reviewed |
| [`wiki/SCHEMA.md`](wiki/SCHEMA.md) | Rules of the wiki (page types, ids, approvals, operations) |
| [`wiki/index.md`](wiki/index.md) | Catalogue of every wiki page |
| [`wiki/log.md`](wiki/log.md) | Append-only project log |
| [`wiki/raw/`](wiki/raw/) | Immutable sources: requirements, owner decisions, research notes, later benchmark data and test evidence |
| [`wiki/overview/`](wiki/overview/) | Project overview, glossary, open questions for the owner |
| [`wiki/architecture/`](wiki/architecture/) | Architecture narrative and one page per component |
| [`wiki/phases/`](wiki/phases/) | One page per phase: tasks, test gates, exit criteria |
| [`wiki/decisions/`](wiki/decisions/) | Architecture decision records (ADRs) |
| [`wiki/risks/`](wiki/risks/) | Risk register |
| [`wiki/research/`](wiki/research/) | Research questions, hypotheses, experiments, metrics, workloads |
| [`wiki/quality/`](wiki/quality/) | Test strategy and gates |
| [`wiki/operations/`](wiki/operations/) | Session, resume, handoff, approval, git and environment procedures |
| `wiki/interactive-plan/` | Data contract and views of the plan app |
| `interactive_plan/` | Next.js app that visualises the wiki and records approvals (planning tool, not shipped) |
| `plan/approvals.json` | Owner approvals, written only by the plan app |

The Ferrum source tree (`apps/`, `crates/`, `benchmarks/`, `analysis/`, …) does not exist yet. Its
planned layout follows section 12 of the [master prompt](wiki/raw/00-master-prompt.md) (proposed in adr-0018).

## Getting started

Nothing is buildable yet. Toolchain prerequisites and exact install commands are in
[`wiki/operations/ops-environment-setup.md`](wiki/operations/ops-environment-setup.md).

## License

Planned: dual-licensed under MIT OR Apache-2.0 (owner decision, adr-0011). License files will be
added in phase P1.
