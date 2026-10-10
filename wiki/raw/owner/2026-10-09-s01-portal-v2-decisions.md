# RAW SOURCE — Owner decisions for plan portal v2 (session s01, 2026-10-09)

> Immutable raw source. Transcribed by Claude from the owner's AskUserQuestion answers in chat, following
> the owner feedback in `2026-10-09-s01-plan-app-feedback.md`.

| Question | Owner answer |
|---|---|
| How Claude records approvals given in Claude Code | **"I record, with change detection"** — when the owner approves in Claude Code, Claude writes the approval to the approvals file with a fingerprint (content hash) of the page; later edits make it show as outdated and Claude re-asks before dependent work. Owner's exact words are also saved in the wiki. (Supersedes the rule that only the plan app writes approvals.) |
| Source of the portal's plain-language JSON | Owner (free text): **"Create claude script right ? When you write to wiki, write to JSON, essentially an LLM pipeline internally working in this repo"** |
| How the wiki→JSON step is enforced | **"Skill + safety-net hook"** — a repo skill describes the translation; Claude runs it in the same edit; a Claude Code hook blocks the end of a turn if a wiki page changed without its JSON; a check script validates JSON completeness/shape. |
| PowerShell for check scripts | **PowerShell 7** (installed 2026-10-09 via winget: 7.6.6, `pwsh.exe` app alias in `%LOCALAPPDATA%\Microsoft\WindowsApps`). |
| Architecture grouping | **4 groups**: Application · Benchmark · Testing & quality · Research & analysis; planning tooling as a footnote. Architecture view leads with a layered diagram of the Rust app. |
| Already-committed files containing real IPs | **"Mask files now, rewrite history before first push"** — mask existing evidence now (sanctioned edit of raw evidence, logged); real values go to a gitignored local map; before the first GitHub push Claude asks once to approve a history rewrite. |
| Overview layout | **Option A — briefing, top tabs** (design canvas https://claude.ai/artifact/HR2ghDZ5kMejNL6MKFkBsk, board "Overview · Option A") |
| Phase popup, Roadmap, Architecture, Log boards | **"Yes, build from these"** — use the mockups as the spec for portal v2; wording tweaks later. |
