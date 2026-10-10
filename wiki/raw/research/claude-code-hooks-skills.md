---
id: research-claude-code-hooks-skills
type: research-note
title: Claude Code Stop hooks and project skills (format and semantics used by the portal pipeline)
updated: 2026-10-09
sources:
  - https://code.claude.com/docs/en/hooks
  - https://code.claude.com/docs/en/hooks.md
  - https://code.claude.com/docs/en/skills
---

# Claude Code Stop hooks and project skills — research note

> Immutable raw source (research). Access date for every source: **2026-10-09**.
> Status legend: **VERIFIED** = read directly in the cited official documentation on 2026-10-09.
> **OBSERVED** = seen on this machine on 2026-10-09 (pwsh 7.6.6). **UNCERTAIN** = inference.
> Used by the wiki-to-portal pipeline (adr-0024, task p0.17).

## 1. Stop hook input (VERIFIED, hooks.md "Stop input")

> In addition to the common input fields, Stop hooks receive `stop_hook_active`, `last_assistant_message`,
> `background_tasks`, and `session_crons`. The `stop_hook_active` field is `true` when Claude Code is already
> continuing as a result of a stop hook. Check this value or process the transcript to avoid blocking on a
> condition that will never resolve.

> Claude Code applies an 8-consecutive-continuation cap: after stop hooks have continued the turn eight times
> in a row, Claude Code overrides the next block and ends the turn. The count of consecutive continuations
> resets each time Claude calls a tool.

The documented example input includes `"hook_event_name": "Stop"` and `"stop_hook_active": true`.
Command hooks "receive JSON data via stdin and communicate results through exit codes, stdout, and stderr".
Stop has no matcher support and fires on every occurrence.

## 2. Exit codes and blocking (VERIFIED)

| Exit code | Behaviour (quoted from the exit-code table) |
|---|---|
| 0 | "Success. Claude Code applies any JSON output fields. The action goes ahead unless those fields block it" |
| 2 | "Blocking error." For Stop: "Prevents Claude from stopping, continues the conversation." |
| other | "Non-blocking error. Shows a `<hook name> hook error` notice with the first line of stderr. The action proceeds" |

> A hook that blocks by exiting 2 routes the same way as `reason`: Claude receives the stderr message as the
> explanation for why it should continue.

Alternative (not used): exit 0 with JSON `{"decision": "block", "reason": "..."}`.

## 3. Windows command form (VERIFIED)

- Exec form: "A command hook runs as exec form when `args` is set". "Claude Code resolves `command` as an
  executable on `PATH` and spawns it directly with `args` as the argument vector. There is no shell".
  Path placeholders such as `${CLAUDE_PROJECT_DIR}` "are substituted into `command` and into each `args`
  element as plain strings". "Prefer exec form for any hook that references a path placeholder."
- "On Windows, exec form requires `command` to resolve to a real executable such as a `.exe`."
- `${CLAUDE_PROJECT_DIR}`: "the project root where the session started".
- Shell form alternative: `"shell": "powershell"`; "Claude Code auto-detects `pwsh.exe`, the PowerShell 7
  and later executable, and falls back to `powershell.exe` for Windows PowerShell 5.1."
- Field `timeout` exists on command hooks (example value 600, seconds).

OBSERVED: `pwsh.exe` is an app alias in `%LOCALAPPDATA%\Microsoft\WindowsApps`, which is on the user `Path`
(registry `HKCU\Environment`). UNCERTAIN: that the Claude Code process always inherits that `Path`; if it
does not, the hook fails as a non-blocking error (section 2) rather than blocking.

## 4. Project skills (VERIFIED, skills page)

- Location: `.claude/skills/<skill-name>/SKILL.md`.
- YAML frontmatter between `---` markers; "All fields are optional". `name` defaults to the directory name;
  `description` is "Recommended" ("Claude uses this to decide when to apply the skill"); `when_to_use` is
  appended to it; "the combined `description` and `when_to_use` text is truncated at 1,536 characters".
- Other fields: `allowed-tools` (e.g. `Bash(git add *)`), `disable-model-invocation`, `user-invocable`,
  `paths`, `context`, `model`, `effort`, `shell`, `hooks`, `metadata`.
- Guidance: "Keep `SKILL.md` under 500 lines"; supporting files may sit next to it and be referenced.

## 5. PowerShell `Test-Json` (OBSERVED, pwsh 7.6.6)

- `Test-Json -Json <text> -Schema <text>` validates draft 2020-12 schemas with `$defs` and local `$ref`
  (`#/$defs/...`), and reports one error per failure with a JSON pointer, e.g.
  "Required properties ["id"] are not present at '/items/1'".
- A `$ref` to another schema file (`common.schema.json#/$defs/source`), with `-Schema` or `-SchemaFile`,
  failed with "Cannot parse the JSON schema."
- With `anyOf: [X, {type: null}]`, a failure elsewhere in the document also lists the non-matching branch
  of every `anyOf` as separate errors; `"type": ["string", "null"]` avoids that noise.
