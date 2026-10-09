---
id: research-llm-wiki-pattern
type: research-note
title: "Karpathy's LLM Wiki pattern and its adaptation for Ferrum"
updated: 2026-10-08
sources:
  - https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
  - https://gist.githubusercontent.com/karpathy/442a6bf555914893e9891c11519de94f/raw
  - https://github.com/tobi/qmd
---

# Karpathy's LLM Wiki pattern, adapted for Ferrum

> Research note (raw source layer). Access date for every URL is **2026-10-08**.
> Status legend: **VERIFIED** = I read it in the primary source on the access date.
> **UNCERTAIN** = inferred, secondary-source-only, or not checked. **PROPOSAL** = Claude's design
> recommendation for Ferrum. It is not part of Karpathy's text and the owner has not approved it.

## 1. Primary source identification

| Claim | Status | Source |
|---|---|---|
| The primary source is a GitHub gist by user `karpathy`, id `442a6bf555914893e9891c11519de94f`. Its page title is `llm-wiki · GitHub` and its document heading is `# LLM Wiki` | VERIFIED | gist page + raw URL above |
| The full raw text was fetched with `curl` from the raw URL: 11,985 bytes, sha256 `dc3efe98ae62f23dd08acad13aba2e95287beb20b6bec2f4af0423557fe37401` | VERIFIED (local fetch) | raw URL |
| Gist creation timestamp is `2026-04-04T16:25:13Z`. This is the first `relative-time` element on the gist HTML page. Later timestamps on the page (Sept 2026) appear to be comments | UNCERTAIN (I did not confirm which element is the creation date; the GitHub gists API returned "Server Error") | gist page |
| Secondary blogs describe it as an April 2026 gist and quote an "idea file" remark that they attribute to Karpathy (likely a post on X) | UNCERTAIN (secondary only; I did not fetch the X post) | https://www.aibuilderclub.com/blog/karpathy-llm-wiki , https://agentpedia.codes/blog/karpathy-llm-wiki-idea-file |

The gist calls itself abstract on purpose: "This document is intentionally abstract. It describes the idea, not a specific implementation." (VERIFIED). Everything below in §2–§5 comes from the gist. §6 is Ferrum-specific proposal.

## 2. Core idea (VERIFIED, gist)

- It contrasts the pattern with RAG. Under RAG, "the LLM is rediscovering knowledge from scratch on every question. There's no accumulation."
- In this pattern, the LLM "**incrementally builds and maintains a persistent wiki** — a structured, interlinked collection of markdown files that sits between you and the raw sources."
- "The knowledge is compiled once and then *kept current*, not re-derived on every query."
- "**the wiki is a persistent, compounding artifact.**"
- Division of labour: "You never (or rarely) write the wiki yourself — the LLM writes and maintains all of it. You're in charge of sourcing, exploration, and asking the right questions."
- Metaphor: "Obsidian is the IDE; the LLM is the programmer; the wiki is the codebase."
- The listed contexts include Research ("going deep on a topic over weeks or months … with an evolving thesis") and Business/team ("Possibly with humans in the loop reviewing updates"). The gist gives **no software-project example**, so applying it to code + ADRs is our own extension.

## 3. Three layers (VERIFIED, gist)

| Layer | Gist definition | Key rule (quote) |
|---|---|---|
| **Raw sources** | Curated source documents: articles, papers, images, data files | "These are immutable — the LLM reads from them but never modifies them. This is your source of truth." |
| **The wiki** | A directory of LLM-generated markdown: summaries, entity pages, concept pages, comparisons, an overview, a synthesis | "The LLM owns this layer entirely … You read it; the LLM writes it." |
| **The schema** | A document "(e.g. CLAUDE.md for Claude Code or AGENTS.md for Codex)" that defines structure, conventions and workflows | "This is the key configuration file — it's what makes the LLM a disciplined wiki maintainer rather than a generic chatbot. You and the LLM co-evolve this over time" |

## 4. Operations (VERIFIED, gist)

1. **Ingest.** "You drop a new source into the raw collection and tell the LLM to process it." Example flow from the gist: read the source → discuss takeaways with the human → write a summary page → update the index → update relevant entity/concept pages → append an entry to the log. "A single source might touch 10-15 wiki pages." Karpathy prefers one source at a time with the human involved. Batch ingest with less supervision is also allowed. The chosen workflow should be documented "in the schema for future sessions."
2. **Query.** The LLM searches the relevant pages, reads them, and "synthesizes an answer with citations". Output can be a markdown page, table, Marp deck, matplotlib chart or canvas. Key rule: "**good answers can be filed back into the wiki as new pages.**"
3. **Lint.** A periodic health check that looks for "contradictions between pages, stale claims that newer sources have superseded, orphan pages with no inbound links, important concepts mentioned but lacking their own page, missing cross-references, data gaps that could be filled with a web search."

The gist names only these three operations. Anything else (e.g. "handoff", "decide") is our extension.

## 5. index.md, log.md, tooling (VERIFIED, gist)

- **index.md** is "content-oriented … a catalog of everything in the wiki — each page listed with a link, a one-line summary, and optionally metadata like date or source count. Organized by category". "The LLM updates it on every ingest." For queries, the LLM reads the index first and then drills into pages. The gist reports this "works surprisingly well at moderate scale (~100 sources, ~hundreds of pages)" without embedding RAG.
- **log.md** is "chronological … an append-only record of what happened and when — ingests, queries, lint passes."
- **Parseable prefix:** "`## [2026-04-02] ingest | Article Title`". With that prefix, "`grep "^## \[" log.md | tail -5` gives you the last 5 entries."
- **Search tooling (optional):** [qmd](https://github.com/tobi/qmd) is described as "a local search engine for markdown files with hybrid BM25/vector search and LLM re-ranking, all on-device", with both a CLI and an MCP server. The gist also says a naive self-written search script is an alternative. (The repo URL returned HTTP 200 on 2026-10-08. I did not verify qmd's features, Windows support or license: UNCERTAIN.)
- **Tips:** Obsidian Web Clipper; download images locally to `raw/assets/`; Obsidian graph view to spot hubs and orphans; Marp for decks; Dataview queries over **YAML frontmatter**; "The wiki is just a git repo of markdown files."
- **Why it works:** "The tedious part of maintaining a knowledge base is not the reading or the thinking — it's the bookkeeping." It is related to Vannevar Bush's Memex (1945).

## 6. Adaptation for Ferrum (PROPOSAL, not yet owner-approved)

Ferrum has several needs that the gist does not cover: a multi-session, multi-day software + research project with phase gates, owner approvals, ADRs, interruption/resume, and code that changes underneath the docs. The mapping below keeps Karpathy's three layers and three operations and adds a few clearly labelled extensions.

### 6.1 Layer mapping

| Karpathy layer | Ferrum location | Contents |
|---|---|---|
| Raw sources (immutable) | `wiki/raw/` | `00-master-prompt.md`, `01-scoping-decisions.md`, `research/*.md` (fetched-source notes with URL + access date + VERIFIED/UNCERTAIN), later `raw/owner/YYYY-MM-DD-*.md` (owner answers/approvals verbatim), `raw/bench/<run-id>/` (benchmark outputs, never edited). **New owner decisions = new raw file, never edits.** This matches what 01-scoping-decisions.md already states. |
| Wiki (LLM-owned) | `wiki/` (non-raw) | `index.md`, `log.md`, `overview.md` (current state + thesis), `decisions/ADR-NNNN-*.md`, `phases/P0..Pn.md`, `components/*.md` (shell, policy engine, resource manager, telemetry, harness), `risks.md`, `questions.md` (open questions for owner), `sessions/` handoffs, `verification.md` (UNVERIFIED claims → phase where verified). |
| Schema | `CLAUDE.md` at repo root (Claude Code auto-loads it) | Wiki conventions, the operations below, integrity rules (no fabrication; UNVERIFIED tagging), resume protocol, gate rules. Co-evolved; every change logged. |

Code is a fourth, *non-wiki* artifact. Wiki pages link to code paths and commit hashes. Code is never treated as the source of truth for decisions. ADRs are.

### 6.2 Operations (Karpathy's three plus four Ferrum extensions)

| Op | Origin | Ferrum behaviour |
|---|---|---|
| ingest | gist | New raw file (research note, owner answer, benchmark run) → update affected component/ADR/risk pages, index, log. Contradictions with existing pages get flagged in-page and listed in `questions.md`. |
| query | gist | Answer from the wiki with citations to pages and raw files. Valuable answers (comparisons, analyses) are filed back as pages. |
| lint | gist | Run at the end of every session and at every phase gate. Checks: gist checks + every `UNVERIFIED` tag has a target phase + no ADR references a superseded ADR without a link + component pages mention only code paths that exist + index lists every page. |
| decide | **extension** | Writes `decisions/ADR-NNNN-title.md` (Context / Options / Decision / Consequences / Status: proposed→accepted→superseded / Evidence links into `raw/`). `proposed` → `accepted` only after an owner approval recorded in `raw/owner/` and/or `plan/approvals.json` (Q14). |
| handoff | **extension** | Writes `wiki/sessions/YYYY-MM-DD-sNN.md` before a session ends or when the context is near its limit: phase, active task, done/in-progress/next, uncommitted state, open questions, exact next command. Also overwrites a single `wiki/NOW.md` pointer. |
| resume | **extension** | Fresh session reads `CLAUDE.md` → `wiki/NOW.md` → last 5 log entries (`grep "^## \[" wiki/log.md \| tail -5`) → latest handoff → `index.md` → then works. |
| gate | **extension** | Phase exit requires: tests defined in `phases/Pn.md` pass with evidence saved in `raw/`, lint is clean, and an owner approval is recorded. Then the log gets a `gate` entry. |

### 6.3 Log format (extends the gist's prefix)

```
## [2026-10-08] ingest | llm-wiki-pattern research note
## [2026-10-08] decide | ADR-0003 child-webview hosting (proposed)
## [2026-10-09] gate | P0 -> P1 approved by owner
## [2026-10-09] handoff | session s03, context exhausted mid P1.2
```
Allowed ops: `ingest | query | lint | decide | handoff | resume | gate | code`. Keeping this exact prefix means the gist's `grep` recipe works unchanged. On Windows it works in Git Bash, which is already installed.

### 6.4 Keeping the wiki current as code evolves

- Each code change that alters behaviour or interfaces appends a `code` log entry and updates the relevant `components/*.md` page in the same commit. The `CLAUDE.md` schema states this rule. A git pre-commit or CI check could enforce it later (UNVERIFIED feasibility; P1+).
- Component pages carry frontmatter fields such as `last_verified_commit`. Lint flags pages whose referenced files changed after that commit.
- The interactive_plan Next.js app should *read* `wiki/` (index, ADRs, phases, log) rather than duplicate content. Then the visualization and the wiki cannot drift. Approvals still go to `plan/approvals.json` (Q14) plus a log `gate`/`decide` entry.

### 6.5 Tooling for Ferrum

- Start with index.md + grep only. The gist says this suffices at roughly 100 sources / hundreds of pages, and Ferrum will be well below that in early phases.
- Obsidian is optional. The owner may use it to browse, but nothing should depend on it.
- qmd: defer. Its Windows support is UNVERIFIED and its dependencies are unknown. Re-evaluate only if index navigation becomes inadequate.
- YAML frontmatter on every wiki page (`id, type, status, phase, updated, sources`). The Next.js app can parse it, much as Dataview would.

## 7. Divergences / risks to flag to the owner

1. **"LLM owns the wiki" vs owner approvals.** In the gist the human reads and the LLM writes. Ferrum needs approvals on decisions. Karpathy's "humans in the loop reviewing updates" (Business/team bullet) supports the idea, but the ADR status flow and gate mechanism are our extension, not part of the pattern.
2. **Raw is immutable.** Benchmark data and owner decisions fit naturally in raw. Code does not, so code needs the explicit sync rule in §6.4. Otherwise the wiki will drift.
3. **No resume/handoff semantics in the gist.** The resume protocol is entirely our design. The log and index give a good basis for it, but it must be specified in `CLAUDE.md`.
4. **Scale.** The index-only approach is endorsed only at "moderate scale". That should be fine for this project. This is not a risk now.
5. **No contradiction with the owner's decisions or the initial risk list was found.** The gist is tool-agnostic and explicitly names CLAUDE.md as the schema file for Claude Code, which matches the owner's setup.
