# RAW SOURCE — Owner approval of the "same pattern for every list" plan (session s01, 2026-10-10)

> Immutable raw source. Transcribed by Claude on 2026-10-10. Owner words verbatim (Claude Code chat).
> Request and answers: [2026-10-10-s01-browse-v2-request.md](2026-10-10-s01-browse-v2-request.md),
> [answers-1](2026-10-10-s01-browse-v2-answers-1.md), [answers-2](2026-10-10-s01-browse-v2-answers-2.md),
> [answers-3](2026-10-10-s01-browse-v2-answers-3.md).

## 1. The owner's words (verbatim)

> Approved

## 2. The plan Claude showed (summary of the chat message the owner approved)

- **One pattern for Log, Questions, Decisions, Risks and Research:** cards closed by default (one line: title, date and time when known,
  status, category, 2 tags; click to open details) with one Open all / Close all button; search (every word must appear); filters
  (category, tags, phase, status, a date range where dates differ; a filter with one choice is hidden); a Sort dropdown (newest, oldest,
  by phase, A to Z, plus tab extras); 20 per page with numbers and Previous / Next; "Showing x–y of n" with Clear filters; search,
  filters, sort and page kept in the web address (open cards are not).
- **Per tab:** Log (41) starts newest first. Questions (54) start newest first with the Status filter on Open; category = decision topics.
  Decisions (28) start newest first, extra sort by number. Risks (25) start highest risk first (likelihood × impact), table becomes
  cards showing "Risk L × I = S", category = decision topics. Research (70) becomes one list starting by phase, category = kind
  (question, prediction, experiment, measure, test site); the rest of the Research tab stays.
- **Time from now on:** new log entries and new questions store a 24-hour local time (for example 21:41), shown next to the date; older
  items keep the date only, same-day ties keep their written order. SCHEMA §12 gets a `time` body line; the step-by-step pages and the
  wiki-to-portal skill learn the rule.
- **Labels:** each question, risk and research item gets exactly 2 tags from the existing 26; no silent new tags (items where fewer than
  2 fit are listed for the owner); the checker rejects wrong labels.
- **Also:** delete the unused `LogFilter.tsx` and its two style rules (owner allowed it); new Ref ids, none renumbered, changed blocks
  listed; Overview unchanged except its "Questions for you" link opens Questions on Open.
- **Build:** two agents (data and labels; screens) → full checks in a separate copy with screenshots → review from the owner's view
  including label fit → fixes. Local commits only. No app work; still P0.
