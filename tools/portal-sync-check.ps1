#Requires -Version 7.0
<#
.SYNOPSIS
  Checks that the plan portal's plain-language JSON (plan/portal/) still matches the wiki.

.DESCRIPTION
  Why: the portal shows only JSON that Claude writes next to each wiki change (adr-0024). If a wiki page
  changes and its JSON does not, the owner reads out-of-date text. This script finds that.

  What it checks, in order:
    1. Shape     - every portal JSON file parses and matches its schema in plan/portal/schema/  (BAD-JSON, BAD-SHAPE, MISSING-FILE)
    2. Freshness - every record's source.content_hash equals the page's current hash          (STALE, ORPHAN)
    3. Coverage  - every page the pipeline translates has a record, every question and every
                   log heading has an entry                                                    (MISSING, UNCOVERED)
    4. Refs      - every id written in portal text has an explainer in refs.json               (UNKNOWN-REF, DUP-ID)
    5. Scripts   - every check-script path named in the JSON exists                            (MISSING-SCRIPT)
    6. Consistency - a copy of a record in another file says the same thing: refs.json explainers
                   (title, status, summary) follow their phase, task, decision, risk, question,
                   research item, part or layer; the Overview's open-question count and list follow
                   questions.json; a phase's progress counts its tasks marked Done; roadmap rows follow
                   the phase files; layer and group lists follow each part's own layer and group; each
                   log entry id is used once; a log entry's or question's time of day follows the
                   '- time:' or '- asked:' line on its wiki page                               (MISMATCH)
    7. Labels    - every decision, log entry, question, risk and research item has one category
                   and two different tags from the single list in plan/portal/taxonomy.json
                   (decisions, questions and risks share the topics; a research item's category
                   is its kind and must fit its list); a decision, risk or research item names a
                   phase the portal has a file for                                             (BAD-LABEL)
  The rules (which pages, which files, which id shapes) live in plan/portal/pipeline.json.

  Exit codes: 0 = clean, 1 = problems found (or the config is broken).

  Hook mode (-Hook): used by the Claude Code Stop hook in .claude/settings.json. It does nothing (exit 0)
  unless the flag file plan/portal/.hook-enabled exists, or when Claude is already continuing because of
  this hook (stop_hook_active = true). Otherwise it runs the checks and, if anything is wrong, exits 2 with
  a plain message on stderr, which makes Claude fix the JSON before ending its turn. If the checker itself
  crashes in hook mode it exits 1 (a non-blocking hook error), so a broken checker never traps a session.

.PARAMETER Root
  Repository root. Default: $env:CLAUDE_PROJECT_DIR in hook mode, else the folder above tools/.

.PARAMETER Hook
  Run as the Claude Code Stop hook (reads the hook's JSON input from stdin).

.PARAMETER Hash
  Print the SCHEMA section 10.2 content_hash of one file (repo-relative path) and exit. Use it to fill
  source.content_hash after translating a page.

.EXAMPLE
  pwsh tools/portal-sync-check.ps1
.EXAMPLE
  pwsh tools/portal-sync-check.ps1 -Hash wiki/phases/phase-p1-foundation.md
#>
[CmdletBinding()]
param(
    [string]$Root,
    [switch]$Hook,
    [string]$Hash
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)

# --- Where is the repo? ---------------------------------------------------------------------------
if (-not $Root) {
    if ($Hook -and $env:CLAUDE_PROJECT_DIR) { $Root = $env:CLAUDE_PROJECT_DIR }
    else { $Root = Split-Path -Parent $PSScriptRoot }
}
$Root = [IO.Path]::GetFullPath($Root)
$PortalDir = Join-Path $Root 'plan/portal'

# --- SCHEMA 10.2 content hash: sha256 over the bytes with CRLF and CR turned into LF --------------
# Latin1 maps every byte to one char and back, so the replacement works on raw bytes (UTF-8 safe:
# the bytes 0x0D and 0x0A never occur inside a multi-byte UTF-8 character).
function Get-PortalContentHash([string]$FullPath) {
    $bytes = [IO.File]::ReadAllBytes($FullPath)
    $latin1 = [Text.Encoding]::Latin1
    $norm = $latin1.GetString($bytes).Replace("`r`n", "`n").Replace("`r", "`n")
    $sha = [Security.Cryptography.SHA256]::HashData($latin1.GetBytes($norm))
    return 'sha256:' + [Convert]::ToHexString($sha).ToLowerInvariant()
}

if ($Hash) {
    $full = Join-Path $Root $Hash
    if (-not (Test-Path -LiteralPath $full -PathType Leaf)) { Write-Error "No such file: $Hash"; exit 1 }
    Get-PortalContentHash $full
    exit 0
}

function ConvertTo-RepoPath([string]$Full) {
    return [IO.Path]::GetRelativePath($Root, $Full).Replace('\', '/')
}

# Expand "dir/name-*.ext" relative to $Base (wildcards only in the last part).
function Get-MatchingFiles([string]$Base, [string]$Pattern) {
    $dir = Split-Path -Parent $Pattern
    $leaf = Split-Path -Leaf $Pattern
    $full = if ($dir) { Join-Path $Base $dir } else { $Base }
    if (-not (Test-Path -LiteralPath $full -PathType Container)) { return @() }
    return @(Get-ChildItem -LiteralPath $full -File | Where-Object { $_.Name -like $leaf } | Sort-Object Name)
}

# One pass over a parsed JSON document (iterative, no per-node function calls: the checker must stay fast
# enough for the Stop hook). Collects what the later checks need:
#   Sources  - every object with source.wiki_path (pointer, path, hash)
#   Scripts  - every 'script' value (a path string, or an object with a 'path')
#   Fields   - for each name in $FieldNames, every string value of that key anywhere in the document
#   Strings  - every string that is portal text (not under a key listed in skip_keys), with its pointer
function Get-DocFacts($Doc, $SkipKeys, [string[]]$FieldNames) {
    $sources = [System.Collections.Generic.List[object]]::new()
    $scripts = [System.Collections.Generic.List[object]]::new()
    $strings = [System.Collections.Generic.List[object]]::new()
    $fields = @{}
    foreach ($f in $FieldNames) { $fields[$f] = [System.Collections.Generic.HashSet[string]]::new() }
    $stack = [System.Collections.Generic.Stack[object]]::new()
    $stack.Push(@($Doc, '', $true))
    while ($stack.Count -gt 0) {
        $item = $stack.Pop()
        $n = $item[0]; $ptr = $item[1]; $isText = $item[2]
        if ($n -is [string]) {
            if ($isText) { $strings.Add(@($ptr, $n)) }
        }
        elseif ($n -is [System.Collections.IDictionary]) {
            $src = $n['source']
            if ($src -is [System.Collections.IDictionary] -and $src.Contains('wiki_path')) {
                $sources.Add(@{ Pointer = $ptr; Path = [string]$src['wiki_path']; Hash = [string]$src['content_hash'] })
            }
            foreach ($f in $FieldNames) {
                if ($n.Contains($f)) { foreach ($v in @($n[$f])) { if ($v -is [string]) { [void]$fields[$f].Add($v) } } }
            }
            $keys = @($n.Keys)
            for ($i = $keys.Count - 1; $i -ge 0; $i--) {
                $k = [string]$keys[$i]
                $child = $n[$k]
                if ($k -eq 'script') {
                    if ($child -is [string]) { $scripts.Add(@{ Path = $child; Pointer = "$ptr/$k" }) }
                    elseif ($child -is [System.Collections.IDictionary] -and $child['path'] -is [string]) {
                        $scripts.Add(@{ Path = $child['path']; Pointer = "$ptr/$k/path" })
                    }
                }
                $stack.Push(@($child, "$ptr/$k", ($isText -and -not $SkipKeys.Contains($k))))
            }
        }
        elseif ($n -is [System.Collections.IList]) {
            for ($i = $n.Count - 1; $i -ge 0; $i--) { $stack.Push(@($n[$i], "$ptr/$i", $isText)) }
        }
    }
    $sources.Reverse()
    $scripts.Reverse()
    return @{ Sources = $sources; Scripts = $scripts; Strings = $strings; Fields = $fields }
}

# Every id written in portal text: [words](ref:id) links and bare id-shaped words. All strings of one
# document are joined with a line break (no pattern can match across it), so each pattern runs once per
# file instead of once per string; a match's offset maps back to the pointer of its string.
function Find-RefHits($Strings, $Patterns, $LinkRx) {
    $hits = [System.Collections.Generic.List[object]]::new()
    if ($Strings.Count -eq 0) { return , $hits }
    $sb = [System.Text.StringBuilder]::new()
    $starts = [int[]]::new($Strings.Count)
    for ($i = 0; $i -lt $Strings.Count; $i++) {
        $starts[$i] = $sb.Length
        [void]$sb.Append($Strings[$i][1]).Append("`n")
    }
    $all = $sb.ToString()
    foreach ($rx in @($LinkRx) + $Patterns) {
        $isLink = [object]::ReferenceEquals($rx, $LinkRx)
        foreach ($m in $rx.Matches($all)) {
            $at = [Array]::BinarySearch($starts, $m.Index)
            if ($at -lt 0) { $at = (-bnot $at) - 1 }
            $id = if ($isLink) { $m.Groups[1].Value } else { $m.Value }
            $hits.Add(@{ Id = $id; Pointer = $Strings[$at][0] })
        }
    }
    return , $hits
}

# Cross-file consistency (MISMATCH). Some portal text is a copy of another record: a refs.json explainer
# repeats its phase, task, decision, risk, question, research item, part or layer; the Overview repeats
# the open questions; roadmap rows repeat the phase files; a phase's progress counts its tasks. The copy
# must say what the record says. Returns a list of @{ Where; Message }.
function Get-PortalMismatches($Docs, $RefsById, [string]$RefsFile) {
    $out = [System.Collections.Generic.List[object]]::new()
    $add = { param($w, $m) $out.Add(@{ Where = $w; Message = $m }) }
    function Get-Doc([string]$Name) { if ($Docs.Contains($Name) -and $Docs[$Name] -is [System.Collections.IDictionary]) { return $Docs[$Name] } return $null }
    # An explainer field must equal one of the allowed values (or, with -Prefix, start with one).
    function Test-Ref([string]$Id, [string]$Field, [object[]]$Allowed, [string]$Record, [switch]$Prefix) {
        if (-not $RefsById.ContainsKey($Id)) {
            & $add "plan/portal/$RefsFile" "$Record has '$Id' but refs.json has no explainer for it, so its popup would be empty. Add one."
            return
        }
        $entry = $RefsById[$Id]
        $have = $entry.Ref[$Field]
        foreach ($want in $Allowed) {
            if ($Prefix) { if ($have -is [string] -and $want -is [string] -and $have.StartsWith($want, [StringComparison]::Ordinal)) { return } }
            elseif ($have -ceq $want) { return }
        }
        $should = if ($Prefix) { "start with '$($Allowed[0])'" } else { "be '$($Allowed[0])'" }
        & $add "plan/portal/$RefsFile at /refs/$($entry.Index)/$Field" "The explainer of '$Id' says '$have', but $Record says otherwise: it should $should. Update the explainer from the record."
    }

    # Phases: progress counts the tasks marked Done; explainers of the phase and its tasks follow the file.
    $phaseDocs = @{}
    foreach ($rel in @($Docs.Keys | Where-Object { $_ -like 'phases/*.json' })) {
        $ph = $Docs[$rel]
        if ($ph -isnot [System.Collections.IDictionary] -or -not $ph.Contains('id') -or -not $ph.Contains('tasks')) { continue }
        $phaseDocs[[string]$ph['id']] = $ph
        $tasks = @($ph['tasks'] | Where-Object { $_ -is [System.Collections.IDictionary] })
        $done = @($tasks | Where-Object { $_['status'] -eq 'Done' }).Count
        if ($ph['progress']['done'] -ne $done) {
            & $add "plan/portal/$rel at /progress/done" "progress.done is $($ph['progress']['done']) but $done tasks are marked Done. Make them agree."
        }
        if ($ph['progress']['total'] -ne $tasks.Count) {
            & $add "plan/portal/$rel at /progress/total" "progress.total is $($ph['progress']['total']) but the phase lists $($tasks.Count) tasks."
        }
        $record = "plan/portal/$rel"
        Test-Ref $ph['id'] 'title' @("$($ph['short']) $($ph['title'])") $record
        Test-Ref $ph['id'] 'status' @($ph['status']) $record
        Test-Ref $ph['id'] 'summary' @($ph['summary'], "Goal: $($ph['one_line_goal']). $($ph['summary'])") $record
        foreach ($t in $tasks) {
            Test-Ref $t['id'] 'title' @($t['title'], "$($ph['short']) task: $($t['title'])") $record
            Test-Ref $t['id'] 'status' @($t['status']) $record
            Test-Ref $t['id'] 'summary' @($t['chain']) $record
        }
    }

    # Roadmap rows repeat each phase file; the stages hold every phase exactly once.
    $roadmap = Get-Doc 'roadmap.json'
    if ($roadmap) {
        $i = 0
        foreach ($row in @($roadmap['phases'])) {
            $ph = $phaseDocs[[string]$row['id']]
            if ($ph) {
                $pairs = @(
                    @('short', $row['short'], $ph['short']), @('name', $row['name'], $ph['title']),
                    @('one_line_goal', $row['one_line_goal'], $ph['one_line_goal']), @('status', $row['status'], $ph['status']),
                    @('tasks_done', $row['tasks_done'], $ph['progress']['done']), @('tasks_total', $row['tasks_total'], $ph['progress']['total']))
                foreach ($p in $pairs) {
                    if ("$($p[1])" -cne "$($p[2])") {
                        & $add "plan/portal/roadmap.json at /phases/$i/$($p[0])" "The roadmap row says '$($p[1])' but phases/$($row['id']).json says '$($p[2])'."
                    }
                }
            }
            $i++
        }
        $inStages = @($roadmap['stages'] | ForEach-Object { @($_['phases']) })
        foreach ($row in @($roadmap['phases'])) {
            $n = @($inStages | Where-Object { $_ -eq $row['id'] }).Count
            if ($n -ne 1) { & $add 'plan/portal/roadmap.json at /stages' "$($row['id']) appears in $n stages; every phase belongs to exactly one stage." }
        }
    }

    # Questions: the Overview's count and list repeat questions.json; explainers follow each question.
    $questions = Get-Doc 'questions.json'
    $overview = Get-Doc 'overview.json'
    if ($questions) {
        $byId = @{}
        foreach ($q in @($questions['items'] | Where-Object { $_ -is [System.Collections.IDictionary] })) {
            $byId[[string]$q['id']] = $q
            $st = [string]$q['status']
            $label = if ($st) { $st.Substring(0, 1).ToUpperInvariant() + $st.Substring(1) } else { $st }
            Test-Ref $q['id'] 'status' @($label) 'plan/portal/questions.json'
            Test-Ref $q['id'] 'summary' @($q['question']) 'plan/portal/questions.json' -Prefix
        }
        if ($overview -and $overview['questions_for_you'] -is [System.Collections.IDictionary]) {
            $open = @($questions['items'] | Where-Object { $_ -is [System.Collections.IDictionary] -and $_['status'] -eq 'open' }).Count
            $qfy = $overview['questions_for_you']
            if ($qfy['open'] -ne $open) {
                & $add 'plan/portal/overview.json at /questions_for_you/open' "The Overview says $($qfy['open']) open questions but questions.json has $open."
            }
            $i = 0
            foreach ($it in @($qfy['items'])) {
                $q = $byId[[string]$it['id']]
                $where = "plan/portal/overview.json at /questions_for_you/items/$i"
                if (-not $q) { & $add $where "$($it['id']) is not in questions.json." }
                elseif ($q['status'] -ne 'open') { & $add $where "$($it['id']) is listed as waiting for you, but its status in questions.json is '$($q['status'])'." }
                elseif ($q['question'] -cne $it['question']) { & $add "$where/question" "The question text of $($it['id']) differs from questions.json; copy it from there." }
                $i++
            }
        }
    }
    # Overview rows that state a phase's progress ("16 of 18 tasks") repeat the phase file.
    if ($overview) {
        $i = 0
        foreach ($row in @($overview['where_we_are'])) {
            if ($row -is [System.Collections.IDictionary]) {
                $m = [regex]::Match([string]$row['state'], '(\d+) of (\d+) tasks')
                $ph = if ($row.Contains('ref')) { $phaseDocs[[string]$row['ref']] } else { $null }
                if ($m.Success -and $ph -and ([int]$m.Groups[1].Value -ne $ph['progress']['done'] -or [int]$m.Groups[2].Value -ne $ph['progress']['total'])) {
                    & $add "plan/portal/overview.json at /where_we_are/$i/state" "It says '$($m.Value)' but phases/$($row['ref']).json has $($ph['progress']['done']) of $($ph['progress']['total'])."
                }
            }
            $i++
        }
    }

    # Log entries: each id once (the Log tab uses it as the entry's anchor).
    $log = Get-Doc 'log.json'
    if ($log) {
        $seenIds = @{}
        $i = 0
        foreach ($e in @($log['entries'])) {
            if ($e -is [System.Collections.IDictionary]) {
                $eid = [string]$e['id']
                if ($seenIds.ContainsKey($eid)) { & $add "plan/portal/log.json at /entries/$i/id" "The entry id '$eid' is already used by entry $($seenIds[$eid]); give this entry its own id." }
                else { $seenIds[$eid] = $i }
            }
            $i++
        }
    }

    # Decisions, risks, research items: explainers follow the record.
    $decisions = Get-Doc 'decisions.json'
    if ($decisions) {
        foreach ($d in @($decisions['items'] | Where-Object { $_ -is [System.Collections.IDictionary] })) {
            Test-Ref $d['id'] 'title' @("Decision $($d['number']): $($d['title'])") 'plan/portal/decisions.json'
            Test-Ref $d['id'] 'status' @($d['status']) 'plan/portal/decisions.json'
            Test-Ref $d['id'] 'summary' @($d['summary']) 'plan/portal/decisions.json' -Prefix
        }
    }
    $risks = Get-Doc 'risks.json'
    if ($risks) {
        foreach ($r in @($risks['items'] | Where-Object { $_ -is [System.Collections.IDictionary] })) {
            foreach ($f in 'title', 'status', 'summary') { Test-Ref $r['id'] $f @($r[$f]) 'plan/portal/risks.json' }
        }
    }
    $research = Get-Doc 'research.json'
    if ($research) {
        foreach ($sec in 'questions', 'hypotheses', 'experiments', 'metrics', 'workloads') {
            if (-not $research.Contains($sec)) { continue }
            foreach ($r in @($research[$sec] | Where-Object { $_ -is [System.Collections.IDictionary] })) {
                foreach ($f in 'title', 'status') { Test-Ref $r['id'] $f @($r[$f]) 'plan/portal/research.json' }
            }
        }
    }

    # Architecture: explainers follow parts and layers; layer and group lists follow each part's own layer and group.
    $arch = Get-Doc 'architecture.json'
    if ($arch) {
        $comps = @($arch['components'] | Where-Object { $_ -is [System.Collections.IDictionary] })
        foreach ($c in $comps) {
            foreach ($f in 'title', 'status', 'summary') { Test-Ref $c['id'] $f @($c[$f]) 'plan/portal/architecture.json' }
        }
        $i = 0
        foreach ($l in @($arch['layers'] | Where-Object { $_ -is [System.Collections.IDictionary] })) {
            Test-Ref $l['id'] 'title' @($l['name']) 'plan/portal/architecture.json'
            Test-Ref $l['id'] 'summary' @($l['summary']) 'plan/portal/architecture.json'
            $want = @($comps | Where-Object { $_['layer'] -eq $l['id'] } | ForEach-Object { [string]$_['id'] } | Sort-Object)
            $have = @(@($l['components']) | Sort-Object)
            if (($want -join ',') -cne ($have -join ',')) {
                & $add "plan/portal/architecture.json at /layers/$i/components" "The layer lists [$($have -join ', ')] but the parts that name this layer are [$($want -join ', ')]."
            }
            $i++
        }
        $i = 0
        foreach ($g in @($arch['groups'] | Where-Object { $_ -is [System.Collections.IDictionary] })) {
            Test-Ref $g['id'] 'title' @($g['name']) 'plan/portal/architecture.json'
            $want = @($comps | Where-Object { $_['group'] -eq $g['id'] } | ForEach-Object { [string]$_['id'] } | Sort-Object)
            $have = @(@($g['components']) | Sort-Object)
            if (($want -join ',') -cne ($have -join ',')) {
                & $add "plan/portal/architecture.json at /groups/$i/components" "The group lists [$($have -join ', ')] but the parts that name this group are [$($want -join ', ')]."
            }
            $i++
        }
        # The browser design (optional) must point at a decision that decisions.json lists.
        $bd = $arch['browser_design']
        if ($bd -is [System.Collections.IDictionary] -and $bd['decision'] -is [string]) {
            $decIds = @(if ($decisions) { @($decisions['items'] | Where-Object { $_ -is [System.Collections.IDictionary] } | ForEach-Object { [string]$_['id'] }) })
            if ($decIds -notcontains $bd['decision']) {
                & $add "plan/portal/architecture.json at /browser_design/decision" "The browser design names the decision '$($bd['decision'])', but decisions.json has no such decision. Point it at the decision that records the design."
            }
        }
    }
    return , $out
}

# Labels (BAD-LABEL). Decisions, log entries, questions, risks and research items carry one category and
# two tags, chosen from the single list in taxonomy.json (the owner's plans of 2026-10-10). The schemas
# only say "a short name" and "two different names", so the list lives in one place; this check holds the
# records to it. Decisions, questions and risks use the same topics ('decision_categories'); a research
# item's category is its kind ('research_categories') and must match the list it sits in. A decision, a
# risk and a research item name a phase, and a log entry may name one: it must be a phase the portal has a
# file for. Returns a list of @{ Where; Message }.
function Get-LabelProblems($Docs, [string]$TaxFile) {
    $out = [System.Collections.Generic.List[object]]::new()
    if (-not $Docs.Contains($TaxFile) -or $Docs[$TaxFile] -isnot [System.Collections.IDictionary]) { return , $out }  # MISSING-FILE / BAD-JSON already said why
    $tax = $Docs[$TaxFile]
    $lists = @{}
    foreach ($ln in 'decision_categories', 'log_categories', 'research_categories', 'tags') {
        $set = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
        $i = 0
        foreach ($t in @($tax[$ln])) {
            $nm = if ($t -is [System.Collections.IDictionary]) { $t['name'] } else { $null }
            if ($nm -is [string] -and -not $set.Add($nm)) {
                $out.Add(@{ Where = "plan/portal/$TaxFile at /$ln/$i/name"; Message = "'$nm' is listed twice in $ln; keep one." })
            }
            $i++
        }
        $lists[$ln] = $set
    }
    $phaseIds = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
    foreach ($rel in @($Docs.Keys | Where-Object { $_ -like 'phases/*.json' })) {
        if ($Docs[$rel] -is [System.Collections.IDictionary] -and $Docs[$rel]['id'] -is [string]) { [void]$phaseIds.Add($Docs[$rel]['id']) }
    }

    # One record: category, two tags, phase.
    function Test-Labels($Rec, [string]$Where, [string]$What, [string]$CatList, [bool]$NeedPhase) {
        $cats = $lists[$CatList]
        if (-not $Rec.Contains('category') -or $Rec['category'] -isnot [string] -or $Rec['category'] -eq '') {
            $out.Add(@{ Where = "$Where/category"; Message = "$What has no category. Give it exactly one from '$CatList' in $TaxFile." })
        }
        elseif (-not $cats.Contains($Rec['category'])) {
            $out.Add(@{ Where = "$Where/category"; Message = "$What has the category '$($Rec['category'])', which is not in '$CatList' in $TaxFile. Use one of: $(@($cats) -join ', ')." })
        }
        $tags = $null
        if ($Rec.Contains('tags')) { $tags = $Rec['tags'] }   # plain assignment: 'if' output would unroll a one-item array
        if ($tags -isnot [System.Collections.IList]) {
            $out.Add(@{ Where = "$Where/tags"; Message = "$What has no tags. Give it exactly 2 different tags from 'tags' in $TaxFile." })
        }
        else {
            if ($tags.Count -ne 2) {
                $out.Add(@{ Where = "$Where/tags"; Message = "$What has $($tags.Count) tags; it needs exactly 2 different tags from $TaxFile." })
            }
            $seenTags = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
            foreach ($t in $tags) {
                if ($t -isnot [string] -or -not $lists['tags'].Contains($t)) {
                    $out.Add(@{ Where = "$Where/tags"; Message = "$What has the tag '$t', which is not in 'tags' in $TaxFile. Pick one from the list, or add the tag there on purpose and note it in the log." })
                }
                elseif (-not $seenTags.Add($t)) {
                    $out.Add(@{ Where = "$Where/tags"; Message = "$What has the tag '$t' twice; its 2 tags must be different." })
                }
            }
        }
        if ($Rec.Contains('phase')) {
            if ($Rec['phase'] -isnot [string] -or -not $phaseIds.Contains($Rec['phase'])) {
                $out.Add(@{ Where = "$Where/phase"; Message = "$What names the phase '$($Rec['phase'])', but the portal has no phase file for it (plan/portal/phases/)." })
            }
        }
        elseif ($NeedPhase) {
            $out.Add(@{ Where = "$Where/phase"; Message = "$What does not say which phase it mainly affects. Add a 'phase'." })
        }
    }

    $decisions = if ($Docs.Contains('decisions.json')) { $Docs['decisions.json'] } else { $null }
    if ($decisions -is [System.Collections.IDictionary]) {
        $i = 0
        foreach ($d in @($decisions['items'])) {
            if ($d -is [System.Collections.IDictionary]) { Test-Labels $d "plan/portal/decisions.json at /items/$i" "Decision $($d['id'])" 'decision_categories' $true }
            $i++
        }
    }
    $log = if ($Docs.Contains('log.json')) { $Docs['log.json'] } else { $null }
    if ($log -is [System.Collections.IDictionary]) {
        $i = 0
        foreach ($e in @($log['entries'])) {
            if ($e -is [System.Collections.IDictionary]) { Test-Labels $e "plan/portal/log.json at /entries/$i" "Log entry $($e['id'])" 'log_categories' $false }
            $i++
        }
    }
    # Questions and risks: the same six topics as decisions. A question names the phases it holds up in
    # 'blocks' instead of one 'phase'; a risk names the phase that handles it.
    $questions = if ($Docs.Contains('questions.json')) { $Docs['questions.json'] } else { $null }
    if ($questions -is [System.Collections.IDictionary]) {
        $i = 0
        foreach ($q in @($questions['items'])) {
            if ($q -is [System.Collections.IDictionary]) { Test-Labels $q "plan/portal/questions.json at /items/$i" "Question $($q['id'])" 'decision_categories' $false }
            $i++
        }
    }
    $risks = if ($Docs.Contains('risks.json')) { $Docs['risks.json'] } else { $null }
    if ($risks -is [System.Collections.IDictionary]) {
        $i = 0
        foreach ($r in @($risks['items'])) {
            if ($r -is [System.Collections.IDictionary]) { Test-Labels $r "plan/portal/risks.json at /items/$i" "Risk $($r['id'])" 'decision_categories' $true }
            $i++
        }
    }
    # Research: five lists shown as one; the category is the kind, so it must fit the list it sits in.
    $research = if ($Docs.Contains('research.json')) { $Docs['research.json'] } else { $null }
    if ($research -is [System.Collections.IDictionary]) {
        $kinds = [ordered]@{ questions = 'Research question'; hypotheses = 'Prediction'; experiments = 'Experiment'; metrics = 'Measure'; workloads = 'Test site' }
        foreach ($sec in $kinds.Keys) {
            if (-not $research.Contains($sec)) { continue }
            $i = 0
            foreach ($r in @($research[$sec])) {
                if ($r -is [System.Collections.IDictionary]) {
                    $where = "plan/portal/research.json at /$sec/$i"
                    $what = "Research item $($r['id'])"
                    Test-Labels $r $where $what 'research_categories' $true
                    if ($r.Contains('category') -and $r['category'] -is [string] -and $lists['research_categories'].Contains($r['category']) -and $r['category'] -cne $kinds[$sec]) {
                        $out.Add(@{ Where = "$where/category"; Message = "$what sits in the '$sec' list, so its category must be '$($kinds[$sec])', not '$($r['category'])'." })
                    }
                }
                $i++
            }
        }
    }
    return , $out
}

# Time of day (MISMATCH). From 2026-10-10 on, a wiki log entry may carry a '- time: HH:MM' line (SCHEMA §12)
# and a question's '- asked:' line may end in a time ('- asked: 2026-10-10 21:41'). The portal copies it into
# 'time'. A log.json entry takes the time of the first wiki entry it covers; a question takes the time of
# its own section. Times are never invented: no time on the wiki page means no 'time' in the JSON.
# Returns a list of @{ Where; Message }.
function Get-TimeMismatches($Docs, [string]$Root, $Config) {
    $out = [System.Collections.Generic.List[object]]::new()
    $timeRx = [regex]::new('^- time:\s*(.*?)\s*$')
    $askedRx = [regex]::new('^- asked:\s*\S+(?:\s+(\S+))?\s*$')
    foreach ($rule in @($Config['sections'])) {
        $pageFull = Join-Path $Root $rule['page']
        if (-not (Test-Path -LiteralPath $pageFull -PathType Leaf)) { continue }
        $doc = if ($Docs.Contains($rule['into'])) { $Docs[$rule['into']] } else { $null }
        if ($doc -isnot [System.Collections.IDictionary]) { continue }
        $isLog = $rule['field'] -eq 'covers'
        $headRx = [regex]::new($rule['heading'])
        $times = @{}          # captured heading text -> time string ('' when the section has none)
        $cur = $null
        foreach ($line in [IO.File]::ReadAllLines($pageFull)) {
            $m = $headRx.Match($line)
            if ($m.Success) {
                $cur = $m.Groups[1].Value
                if (-not $times.ContainsKey($cur)) { $times[$cur] = '' }
                continue
            }
            if ($line.StartsWith('#')) { $cur = $null; continue }
            if ($null -eq $cur) { continue }
            $tm = if ($isLog) { $timeRx.Match($line) } else { $askedRx.Match($line) }
            if ($tm.Success -and $tm.Groups[1].Success -and $times[$cur] -eq '') { $times[$cur] = $tm.Groups[1].Value }
        }
        $listKey = if ($doc.Contains('entries')) { 'entries' } else { 'items' }
        if (-not $doc.Contains($listKey)) { continue }
        $i = 0
        foreach ($rec in @($doc[$listKey])) {
            if ($rec -isnot [System.Collections.IDictionary]) { $i++; continue }
            $key = $null
            if ($isLog) {
                if ($rec.Contains('covers') -and $rec['covers'] -is [System.Collections.IList] -and $rec['covers'].Count -gt 0) { $key = [string]$rec['covers'][0] }
            }
            elseif ($rec.Contains($rule['field']) -and $rec[$rule['field']] -is [string]) { $key = $rec[$rule['field']] }
            if ($null -eq $key -or -not $times.ContainsKey($key)) { $i++; continue }   # the coverage checks say why
            $wikiTime = $times[$key]
            $jsonTime = if ($rec.Contains('time') -and $null -ne $rec['time']) { [string]$rec['time'] } else { '' }
            if ($wikiTime -cne $jsonTime) {
                $where = "plan/portal/$($rule['into']) at /$listKey/$i/time"
                $what = if ($isLog) { "Log entry $($rec['id'])" } else { "Question $($rec['id'])" }
                $src = if ($isLog) { "'$key' in $($rule['page'])" } else { "$key in $($rule['page'])" }
                $msg = if ($wikiTime -eq '') { "$what shows the time '$jsonTime', but $src has no time. Remove 'time'; times are never invented." }
                elseif ($jsonTime -eq '') { "$what has no time, but $src says $wikiTime. Copy it into 'time'." }
                else { "$what shows the time '$jsonTime', but $src says $wikiTime." }
                $out.Add(@{ Where = $where; Message = $msg })
            }
            $i++
        }
    }
    return , $out
}

function Invoke-PortalSyncCheck {
    $problems = [System.Collections.Generic.List[object]]::new()
    function Add-Problem([string]$Code, [string]$Where, [string]$Message) {
        $problems.Add([pscustomobject]@{ Code = $Code; Where = $Where; Message = $Message })
    }

    # 0. Config ------------------------------------------------------------------------------------
    $configPath = Join-Path $PortalDir 'pipeline.json'
    if (-not (Test-Path -LiteralPath $configPath)) {
        Add-Problem 'CONFIG' 'plan/portal/pipeline.json' 'The pipeline config is missing, so nothing can be checked.'
        return , $problems
    }
    $config = Get-Content -LiteralPath $configPath -Raw -Encoding utf8 | ConvertFrom-Json -AsHashtable
    $schemaDir = Join-Path $PortalDir 'schema'
    $commonDefs = (Get-Content -LiteralPath (Join-Path $schemaDir 'common.schema.json') -Raw -Encoding utf8 |
            ConvertFrom-Json -AsHashtable)['$defs']
    $skipKeys = [System.Collections.Generic.HashSet[string]]::new([string[]]$config['skip_keys'])

    # 1. Shape: parse and validate every portal file ------------------------------------------------
    $docs = [ordered]@{}          # 'decisions.json' -> parsed hashtable
    $schemaCache = @{}
    foreach ($entry in $config['files']) {
        $pattern = $entry['path']
        $matched = @(Get-MatchingFiles $PortalDir $pattern)
        if ($matched.Count -eq 0 -and $pattern -notmatch '\*') {
            Add-Problem 'MISSING-FILE' "plan/portal/$pattern" 'This portal file does not exist yet.'
            continue
        }
        if (-not $schemaCache.ContainsKey($entry['schema'])) {
            $s = Get-Content -LiteralPath (Join-Path $schemaDir $entry['schema']) -Raw -Encoding utf8 | ConvertFrom-Json -AsHashtable
            $defs = [ordered]@{}
            foreach ($k in $commonDefs.Keys) { $defs[$k] = $commonDefs[$k] }
            if ($s.Contains('$defs')) { foreach ($k in $s['$defs'].Keys) { $defs[$k] = $s['$defs'][$k] } }
            $s['$defs'] = $defs
            $s.Remove('$id')
            $schemaCache[$entry['schema']] = ($s | ConvertTo-Json -Depth 100)
        }
        foreach ($f in $matched) {
            $rel = [IO.Path]::GetRelativePath($PortalDir, $f.FullName).Replace('\', '/')
            $text = Get-Content -LiteralPath $f.FullName -Raw -Encoding utf8
            try { $doc = $text | ConvertFrom-Json -AsHashtable }
            catch {
                Add-Problem 'BAD-JSON' "plan/portal/$rel" "This file is not valid JSON: $($_.Exception.Message)"
                continue
            }
            $docs[$rel] = $doc
            $errs = $null
            $ok = Test-Json -Json $text -Schema $schemaCache[$entry['schema']] -ErrorVariable errs -ErrorAction SilentlyContinue
            if (-not $ok) {
                foreach ($e in $errs) {
                    $msg = $e.Exception.Message -replace '^The JSON is not valid with the schema: ', ''
                    Add-Problem 'BAD-SHAPE' "plan/portal/$rel" "Does not match $($entry['schema']): $msg"
                }
            }
        }
    }

    # One pass over every document collects sources, script paths, section fields and portal text.
    $fieldNames = @($config['sections'] | ForEach-Object { [string]$_['field'] } | Select-Object -Unique)
    $facts = @{}
    foreach ($rel in $docs.Keys) { $facts[$rel] = Get-DocFacts $docs[$rel] $skipKeys $fieldNames }

    # 2. Freshness: every record with a source must match its page's current hash -------------------
    $hashCache = @{}
    $sourcesByFile = @{}          # 'decisions.json' -> set of wiki paths it translates
    $recordCount = 0
    foreach ($rel in $docs.Keys) {
        $set = [System.Collections.Generic.HashSet[string]]::new()
        $sourcesByFile[$rel] = $set
        foreach ($s in $facts[$rel].Sources) {
            $recordCount++
            [void]$set.Add($s.Path)
            $where = "plan/portal/$rel at $($s.Pointer)"
            $full = Join-Path $Root $s.Path
            if (-not $hashCache.ContainsKey($s.Path)) {
                $hashCache[$s.Path] = if (Test-Path -LiteralPath $full -PathType Leaf) { Get-PortalContentHash $full } else { $null }
            }
            if ($null -eq $hashCache[$s.Path]) {
                Add-Problem 'ORPHAN' $where "Translated from $($s.Path), which no longer exists. Remove this record or point it at the page that replaced it."
                continue
            }
            if ($hashCache[$s.Path] -ne $s.Hash) {
                Add-Problem 'STALE' $where "$($s.Path) changed after this record was written. Re-translate it with the wiki-to-portal skill."
            }
        }
    }

    # 3. Coverage: every translated page has a record; every question / log heading has an entry ----
    foreach ($rule in $config['translate']) {
        foreach ($page in @(Get-MatchingFiles $Root $rule['pages'])) {
            $pagePath = ConvertTo-RepoPath $page.FullName
            $into = $rule['into'].Replace('{stem}', [IO.Path]::GetFileNameWithoutExtension($page.Name))
            if (-not $sourcesByFile.ContainsKey($into)) {
                Add-Problem 'MISSING' "plan/portal/$into" "$pagePath has no plain-language record: the file plan/portal/$into is missing or unreadable."
            }
            elseif (-not $sourcesByFile[$into].Contains($pagePath)) {
                Add-Problem 'MISSING' "plan/portal/$into" "$pagePath has no plain-language record here yet. Translate it with the wiki-to-portal skill."
            }
        }
    }
    foreach ($rule in $config['sections']) {
        $pageFull = Join-Path $Root $rule['page']
        if (-not (Test-Path -LiteralPath $pageFull -PathType Leaf)) { continue }
        if (-not $docs.Contains($rule['into'])) { continue }   # already reported as MISSING-FILE / BAD-JSON
        $have = $facts[$rule['into']].Fields[[string]$rule['field']]
        $rx = [regex]::new($rule['heading'])
        foreach ($line in [IO.File]::ReadAllLines($pageFull)) {
            $m = $rx.Match($line)
            if ($m.Success -and -not $have.Contains($m.Groups[1].Value)) {
                Add-Problem 'UNCOVERED' "plan/portal/$($rule['into'])" "No entry covers '$($m.Groups[1].Value)' from $($rule['page'])."
            }
        }
    }

    # 4. Refs: every id written in portal text must have an explainer in refs.json -----------------
    $known = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
    $refsFile = $config['refs_file']
    $refCount = 0
    $refsById = @{}
    if ($docs.Contains($refsFile) -and $docs[$refsFile] -is [System.Collections.IDictionary] -and $docs[$refsFile].Contains('refs')) {
        $i = 0
        foreach ($r in @($docs[$refsFile]['refs'])) {
            if ($r -isnot [System.Collections.IDictionary]) { $i++; continue }
            if ($r['id'] -is [string] -and -not $refsById.ContainsKey($r['id'])) { $refsById[$r['id']] = @{ Ref = $r; Index = $i } }
            $names = @($r['id'])
            if ($r.Contains('aliases')) { $names += @($r['aliases']) }
            foreach ($nm in $names) {
                if ($nm -isnot [string]) { continue }
                if (-not $known.Add($nm)) { Add-Problem 'DUP-ID' "plan/portal/$refsFile at /refs/$i" "'$nm' is explained twice; keep one entry." }
            }
            $i++
        }
        $refCount = $i
    }
    $patterns = @($config['id_patterns'] | ForEach-Object { [regex]::new($_['regex']) })
    $linkRx = [regex]::new('\]\(ref:([^)\s]+)\)')
    $seen = [System.Collections.Generic.HashSet[string]]::new()
    foreach ($rel in $docs.Keys) {
        foreach ($h in (Find-RefHits $facts[$rel].Strings $patterns $linkRx)) {
            if ($known.Contains($h.Id)) { continue }
            if (-not $seen.Add("$rel|$($h.Id)")) { continue }
            Add-Problem 'UNKNOWN-REF' "plan/portal/$rel at $($h.Pointer)" "'$($h.Id)' looks like an id but refs.json has no explainer for it. Add one, or rephrase in plain words."
        }
    }

    # 5. Scripts: every check-script path must exist ------------------------------------------------
    foreach ($rel in $docs.Keys) {
        foreach ($s in $facts[$rel].Scripts) {
            if (-not (Test-Path -LiteralPath (Join-Path $Root $s.Path) -PathType Leaf)) {
                Add-Problem 'MISSING-SCRIPT' "plan/portal/$rel at $($s.Pointer)" "The check script $($s.Path) does not exist. Write it, or set the field to null until it exists."
            }
        }
    }

    # 6. Consistency: text copied from one record into another file must say the same thing ---------
    # A refs.json explainer, the Overview's question count and a phase's progress are copies of another
    # record. They carry no source of their own, so freshness (2) cannot see them; these checks can.
    foreach ($m in (Get-PortalMismatches $docs $refsById $refsFile)) { Add-Problem 'MISMATCH' $m.Where $m.Message }
    foreach ($m in (Get-TimeMismatches $docs $Root $config)) { Add-Problem 'MISMATCH' $m.Where $m.Message }

    # 7. Labels: one category and two tags from taxonomy.json on every labelled record ----------------
    $taxFile = if ($config.Contains('taxonomy_file')) { [string]$config['taxonomy_file'] } else { 'taxonomy.json' }
    foreach ($m in (Get-LabelProblems $docs $taxFile)) { Add-Problem 'BAD-LABEL' $m.Where $m.Message }

    $script:Stats = @{ Files = $docs.Count; Records = $recordCount; Refs = $refCount }
    return , $problems
}

function Format-Summary($problems) {
    $byCode = $problems | Group-Object Code | ForEach-Object { "$($_.Count) $($_.Name)" }
    return "portal-sync: $($problems.Count) problem(s) - " + ($byCode -join ', ')
}

# --- Hook mode --------------------------------------------------------------------------------------
if ($Hook) {
    try {
        $inputJson = $null
        if ([Console]::IsInputRedirected) { $inputJson = [Console]::In.ReadToEnd() }
        $flag = Join-Path $PortalDir '.hook-enabled'
        if (-not (Test-Path -LiteralPath $flag -PathType Leaf)) { exit 0 }      # installed but switched off
        if ($inputJson) {
            $hookInput = $inputJson | ConvertFrom-Json -AsHashtable
            if ($hookInput -and $hookInput['stop_hook_active'] -eq $true) { exit 0 } # already continuing: never loop
        }
        $problems = Invoke-PortalSyncCheck
        if ($problems.Count -eq 0) { exit 0 }
        $lines = @(
            'The plan portal JSON no longer matches the wiki, so the owner would read out-of-date text.',
            'Before ending the turn, use the wiki-to-portal skill (.claude/skills/wiki-to-portal/SKILL.md) to fix these, then run: pwsh tools/portal-sync-check.ps1',
            (Format-Summary $problems)
        )
        $lines += @($problems | Select-Object -First 15 | ForEach-Object { "  $($_.Code)  $($_.Where)  $($_.Message)" })
        if ($problems.Count -gt 15) { $lines += "  ... and $($problems.Count - 15) more (run the checker to see all)." }
        [Console]::Error.WriteLine(($lines -join "`n"))
        exit 2
    }
    catch {
        [Console]::Error.WriteLine("portal-sync hook could not run: $($_.Exception.Message)")
        exit 1
    }
}

# --- Normal mode --------------------------------------------------------------------------------------
$problems = Invoke-PortalSyncCheck
if ($problems.Count -eq 0) {
    Write-Output ("portal-sync: clean - {0} files, {1} translated records, {2} refs" -f $script:Stats.Files, $script:Stats.Records, $script:Stats.Refs)
    exit 0
}
foreach ($p in $problems) { Write-Output ("{0,-14} {1}`n               {2}" -f $p.Code, $p.Where, $p.Message) }
Write-Output (Format-Summary $problems)
exit 1
