#Requires -Version 7.0
<#
.SYNOPSIS
  Tests for tools/portal-sync-check.ps1 (the wiki -> portal JSON checker) and its Stop-hook mode.

.DESCRIPTION
  Why: the checker is the safety net that keeps the owner's portal text in step with the wiki. If it
  silently missed a stale or missing record, nobody would notice. These tests break a tiny fake repo on
  purpose, one way at a time, and check that the checker reports each break.

  How: tools/fixtures/portal-sync/clean/ is a small, correct fake repo (a few wiki pages and their
  portal JSON). Each case copies it to a temporary folder whose name contains a space (like the real
  repo path), adds the real plan/portal/schema/ and plan/portal/pipeline.json, changes one thing, runs
  the checker in a separate pwsh process and checks the exit code and the message.

  No installs needed: plain PowerShell 7. Python is used only for the hash cross-check, if present.
  Exit code: 0 = all cases passed, 1 = at least one failed.

.EXAMPLE
  pwsh tools/test-portal-sync-check.ps1
#>
[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)

$Repo = Split-Path -Parent $PSScriptRoot
$Checker = Join-Path $PSScriptRoot 'portal-sync-check.ps1'
$Fixture = Join-Path $PSScriptRoot 'fixtures/portal-sync/clean'
$Pwsh = (Get-Process -Id $PID).Path
$TmpBase = Join-Path ([IO.Path]::GetTempPath()) ("portal sync test " + [guid]::NewGuid().ToString('N').Substring(0, 8))
$script:Failed = 0
$script:Passed = 0

# --- Helpers ---------------------------------------------------------------------------------------

# A fresh copy of the clean fixture plus the real schemas and pipeline config.
function New-Fixture([string]$Name) {
    $dir = Join-Path $TmpBase $Name
    Copy-Item -LiteralPath $Fixture -Destination $dir -Recurse
    Copy-Item -LiteralPath (Join-Path $Repo 'plan/portal/schema') -Destination (Join-Path $dir 'plan/portal/schema') -Recurse
    Copy-Item -LiteralPath (Join-Path $Repo 'plan/portal/pipeline.json') -Destination (Join-Path $dir 'plan/portal/pipeline.json')
    return $dir
}

# Run the checker as its own process (as Claude Code would) and capture exit code, stdout, stderr.
function Invoke-Checker([string]$Root, [string[]]$Extra = @(), [string]$Stdin = $null, [hashtable]$Env = @{}, [switch]$NoRoot) {
    $psi = [Diagnostics.ProcessStartInfo]::new($Pwsh)
    foreach ($a in @('-NoProfile', '-NonInteractive', '-File', $Checker)) { $psi.ArgumentList.Add($a) }
    if (-not $NoRoot) { $psi.ArgumentList.Add('-Root'); $psi.ArgumentList.Add($Root) }
    foreach ($a in $Extra) { $psi.ArgumentList.Add($a) }
    foreach ($k in $Env.Keys) { $psi.Environment[$k] = $Env[$k] }
    $psi.RedirectStandardInput = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.UseShellExecute = $false
    $p = [Diagnostics.Process]::Start($psi)
    if ($Stdin) { $p.StandardInput.Write($Stdin) }
    $p.StandardInput.Close()
    $out = $p.StandardOutput.ReadToEndAsync()
    $err = $p.StandardError.ReadToEndAsync()
    $p.WaitForExit()
    return [pscustomobject]@{ Code = $p.ExitCode; Out = $out.Result; Err = $err.Result }
}

function Test-Case([string]$Name, [scriptblock]$Body) {
    try {
        & $Body
        $script:Passed++
        Write-Output "PASS  $Name"
    }
    catch {
        $script:Failed++
        Write-Output "FAIL  $Name`n      $($_.Exception.Message)"
    }
}

function Assert-True([bool]$Condition, [string]$Message) { if (-not $Condition) { throw $Message } }

function Assert-Result($R, [int]$Code, [string[]]$Contains = @()) {
    $all = $R.Out + "`n" + $R.Err
    Assert-True ($R.Code -eq $Code) "expected exit $Code, got $($R.Code). Output:`n$all"
    foreach ($c in $Contains) { Assert-True ($all.Contains($c)) "expected output to contain '$c'. Output:`n$all" }
}

function Edit-Json([string]$Path, [scriptblock]$Change) {
    $doc = Get-Content -LiteralPath $Path -Raw -Encoding utf8 | ConvertFrom-Json -AsHashtable
    & $Change $doc
    Set-Content -LiteralPath $Path -Value ($doc | ConvertTo-Json -Depth 50) -Encoding utf8NoBOM
}

function Add-Text([string]$Path, [string]$Text) { [IO.File]::AppendAllText($Path, $Text) }

$HookOff = '{"session_id":"test","hook_event_name":"Stop","stop_hook_active":false}'
$HookOn = '{"session_id":"test","hook_event_name":"Stop","stop_hook_active":true}'

New-Item -ItemType Directory -Path $TmpBase | Out-Null
try {
    # --- Normal mode ---------------------------------------------------------------------------------
    Test-Case 'clean fixture passes (exit 0)' {
        $d = New-Fixture 'clean'
        Assert-Result (Invoke-Checker $d) 0 @('portal-sync: clean')
    }

    Test-Case 'STALE: a translated wiki page changed after its JSON was written' {
        $d = New-Fixture 'stale'
        Add-Text (Join-Path $d 'wiki/phases/phase-p1-foundation.md') "`nA new paragraph.`n"
        Assert-Result (Invoke-Checker $d) 1 @('STALE', 'wiki/phases/phase-p1-foundation.md', 'phases/phase-p1-foundation.json', 'roadmap.json')
    }

    Test-Case 'MISSING: a new decision page has no record' {
        $d = New-Fixture 'missing'
        Set-Content -LiteralPath (Join-Path $d 'wiki/decisions/adr-0008-new.md') -Value "---`nid: adr-0008`n---`n" -Encoding utf8NoBOM
        Assert-Result (Invoke-Checker $d) 1 @('MISSING', 'wiki/decisions/adr-0008-new.md')
    }

    Test-Case 'MISSING: a new phase page has no phase file' {
        $d = New-Fixture 'missing phase'
        Set-Content -LiteralPath (Join-Path $d 'wiki/phases/phase-p2-minimal-container.md') -Value "---`nid: phase-p2-minimal-container`n---`n" -Encoding utf8NoBOM
        Assert-Result (Invoke-Checker $d) 1 @('MISSING', 'plan/portal/phases/phase-p2-minimal-container.json')
    }

    Test-Case 'BAD-SHAPE: a decision without a title, a task chain without an arrow' {
        $d = New-Fixture 'bad shape'
        Edit-Json (Join-Path $d 'plan/portal/decisions.json') { param($j) $j['items'][0].Remove('title') }
        Edit-Json (Join-Path $d 'plan/portal/phases/phase-p1-foundation.json') { param($j) $j['tasks'][0]['chain'] = 'No arrow here' }
        Assert-Result (Invoke-Checker $d) 1 @('BAD-SHAPE', 'decisions.json', '"title"', 'phase-p1-foundation.json', '/tasks/0/chain')
    }

    Test-Case 'BAD-JSON: a file that is not JSON' {
        $d = New-Fixture 'bad json'
        Set-Content -LiteralPath (Join-Path $d 'plan/portal/risks.json') -Value '{ "id": ' -Encoding utf8NoBOM
        Assert-Result (Invoke-Checker $d) 1 @('BAD-JSON', 'risks.json')
    }

    Test-Case 'BAD-SHAPE and UNKNOWN-REF: a task without "why", a task "how" naming an unexplained id' {
        $d = New-Fixture 'task what why how'
        Edit-Json (Join-Path $d 'plan/portal/phases/phase-p1-foundation.json') {
            param($j) $j['tasks'][0].Remove('why'); $j['tasks'][0]['how'] = 'Follow adr-0098 step by step.'
        }
        Assert-Result (Invoke-Checker $d) 1 @('BAD-SHAPE', 'phase-p1-foundation.json', '"why"', 'UNKNOWN-REF', "'adr-0098'", '/tasks/0/how')
    }

    Test-Case 'UNKNOWN-REF: a bare id and a ref link with no explainer' {
        $d = New-Fixture 'unknown ref'
        Edit-Json (Join-Path $d 'plan/portal/decisions.json') {
            param($j) $j['items'][0]['summary'] = 'Builds on adr-0099 and on [the base layer](ref:layer-nope).'
        }
        Assert-Result (Invoke-Checker $d) 1 @('UNKNOWN-REF', "'adr-0099'", "'layer-nope'")
    }

    Test-Case 'ids inside paths, code and log headings are not portal text (no false alarm)' {
        $d = New-Fixture 'skip keys'
        Edit-Json (Join-Path $d 'plan/portal/overview.json') {
            param($j) $j['next_action']['script']['parts'][0]['code'] = 'pwsh scripts/gates/p1-gate.ps1 # adr-0099 p9.9'
        }
        Assert-Result (Invoke-Checker $d) 0 @('portal-sync: clean')
    }

    Test-Case 'UNCOVERED: a new wiki log entry has no plain-language log entry' {
        $d = New-Fixture 'uncovered log'
        Add-Text (Join-Path $d 'wiki/log.md') "`n## [2026-10-10] plan | a third entry`n`n- result: three`n"
        Assert-Result (Invoke-Checker $d) 1 @('UNCOVERED', '## [2026-10-10] plan | a third entry', 'STALE', 'wiki/log.md')
    }

    Test-Case 'UNCOVERED: a new open question has no item' {
        $d = New-Fixture 'uncovered question'
        Add-Text (Join-Path $d 'wiki/overview/ov-open-questions.md') "`n## Q-002 Another question`n`n- status: open`n"
        Assert-Result (Invoke-Checker $d) 1 @('UNCOVERED', "'Q-002'")
    }

    Test-Case 'ORPHAN: the page a record was translated from was removed' {
        $d = New-Fixture 'orphan'
        Remove-Item -LiteralPath (Join-Path $d 'wiki/risks/risk-r02-tauri-multiwebview-unstable.md')
        Assert-Result (Invoke-Checker $d) 1 @('ORPHAN', 'risk-r02-tauri-multiwebview-unstable.md')
    }

    Test-Case 'MISSING-SCRIPT: a gate script path that does not exist' {
        $d = New-Fixture 'missing script'
        Edit-Json (Join-Path $d 'plan/portal/phases/phase-p1-foundation.json') { param($j) $j['test_gate']['script'] = 'scripts/gates/nope.ps1' }
        Assert-Result (Invoke-Checker $d) 1 @('MISSING-SCRIPT', 'scripts/gates/nope.ps1')
    }

    Test-Case 'MISSING-FILE and DUP-ID' {
        $d = New-Fixture 'missing file'
        Remove-Item -LiteralPath (Join-Path $d 'plan/portal/research.json')
        Edit-Json (Join-Path $d 'plan/portal/refs.json') { param($j) $j['refs'][1]['aliases'] = @('P1') }
        Assert-Result (Invoke-Checker $d) 1 @('MISSING-FILE', 'plan/portal/research.json', 'DUP-ID', "'P1'")
    }

    Test-Case '-Hash equals the SCHEMA 10.2 Python reference (CRLF file)' {
        $d = New-Fixture 'hash'
        $f = Join-Path $d 'crlf.md'
        [IO.File]::WriteAllBytes($f, [Text.Encoding]::UTF8.GetBytes("---`r`nid: x`r`n---`r`nLine with arrow `u{2192} and a lone CR`rend`n"))
        $r = Invoke-Checker $d @('-Hash', 'crlf.md')
        Assert-True ($r.Code -eq 0) "exit $($r.Code): $($r.Err)"
        $py = Get-Command python -ErrorAction SilentlyContinue
        if ($py) {
            $code = "import hashlib,sys; b=open(sys.argv[1],'rb').read().replace(b'\r\n',b'\n').replace(b'\r',b'\n'); print('sha256:'+hashlib.sha256(b).hexdigest())"
            $expected = (& $py.Source -c $code $f).Trim()
        }
        else {
            # Fallback: the same bytes written with LF only must give the same hash.
            $g = Join-Path $d 'lf.md'
            [IO.File]::WriteAllBytes($g, [Text.Encoding]::UTF8.GetBytes("---`nid: x`n---`nLine with arrow `u{2192} and a lone CR`nend`n"))
            $expected = (Invoke-Checker $d @('-Hash', 'lf.md')).Out.Trim()
        }
        Assert-True ($r.Out.Trim() -eq $expected) "checker '$($r.Out.Trim())' <> reference '$expected'"
    }

    # --- Consistency between files (MISMATCH): copies that carry no source of their own ------------------
    Test-Case 'MISMATCH: the Overview counts open questions differently from questions.json' {
        $d = New-Fixture 'mismatch count'
        Edit-Json (Join-Path $d 'plan/portal/overview.json') { param($j) $j['questions_for_you']['open'] = 5 }
        Assert-Result (Invoke-Checker $d) 1 @('MISMATCH', '/questions_for_you/open', 'says 5 open questions')
    }

    Test-Case 'MISMATCH: a question listed as waiting for you is already answered (its explainer too)' {
        $d = New-Fixture 'mismatch answered'
        Edit-Json (Join-Path $d 'plan/portal/questions.json') {
            param($j) $j['items'][0]['status'] = 'answered'; $j['items'][0]['answer'] = 'Yes.'; $j['items'][0]['answered_on'] = '2026-10-09'
        }
        Assert-Result (Invoke-Checker $d) 1 @('MISMATCH', 'listed as waiting for you', "explainer of 'Q-001' says 'Open'")
    }

    Test-Case 'MISMATCH: an explainer keeps an old status after its decision changed' {
        $d = New-Fixture 'mismatch status'
        Edit-Json (Join-Path $d 'plan/portal/refs.json') {
            param($j) foreach ($r in $j['refs']) { if ($r['id'] -eq 'adr-0007') { $r['status'] = 'Proposed' } }
        }
        Assert-Result (Invoke-Checker $d) 1 @('MISMATCH', "explainer of 'adr-0007' says 'Proposed'", 'decisions.json')
    }

    Test-Case 'MISMATCH: phase progress does not count the tasks marked Done' {
        $d = New-Fixture 'mismatch progress'
        Edit-Json (Join-Path $d 'plan/portal/phases/phase-p1-foundation.json') { param($j) $j['tasks'][0]['status'] = 'Done' }
        Assert-Result (Invoke-Checker $d) 1 @('MISMATCH', '/progress/done', '1 tasks are marked Done')
    }

    Test-Case 'MISMATCH: two log entries share one id' {
        $d = New-Fixture 'mismatch log id'
        Edit-Json (Join-Path $d 'plan/portal/log.json') {
            param($j)
            $copy = [ordered]@{}
            foreach ($k in $j['entries'][0].Keys) { $copy[$k] = $j['entries'][0][$k] }
            $j['entries'] = @($j['entries']) + $copy
        }
        Assert-Result (Invoke-Checker $d) 1 @('MISMATCH', '/entries/1/id', 'already used')
    }

    Test-Case 'MISMATCH: a layer list disagrees with the layer its parts name' {
        $d = New-Fixture 'mismatch layer'
        Edit-Json (Join-Path $d 'plan/portal/architecture.json') { param($j) $j['layers'][0]['components'] = @() }
        Assert-Result (Invoke-Checker $d) 1 @('MISMATCH', '/layers/0/components')
    }

    Test-Case 'MISMATCH: the browser design names a decision that decisions.json does not list' {
        $d = New-Fixture 'mismatch browser design'
        Edit-Json (Join-Path $d 'plan/portal/architecture.json') { param($j) $j['browser_design']['decision'] = 'adr-0099' }
        Assert-Result (Invoke-Checker $d) 1 @('MISMATCH', '/browser_design/decision', 'adr-0099')
    }

    Test-Case 'BAD-SHAPE: a browser design without callouts' {
        $d = New-Fixture 'bad browser design'
        Edit-Json (Join-Path $d 'plan/portal/architecture.json') { param($j) $j['browser_design'].Remove('callouts') }
        Assert-Result (Invoke-Checker $d) 1 @('BAD-SHAPE', 'architecture.json', '"callouts"')
    }

    # --- Labels (BAD-LABEL): one category and two tags from taxonomy.json -----------------------------
    Test-Case 'BAD-LABEL: a decision with no category' {
        $d = New-Fixture 'label no category'
        Edit-Json (Join-Path $d 'plan/portal/decisions.json') { param($j) $j['items'][0].Remove('category') }
        Assert-Result (Invoke-Checker $d) 1 @('BAD-LABEL', '/items/0/category', 'Decision adr-0007 has no category')
    }

    Test-Case 'BAD-LABEL: a log entry with a category that is not in the list' {
        $d = New-Fixture 'label unknown category'
        Edit-Json (Join-Path $d 'plan/portal/log.json') { param($j) $j['entries'][0]['category'] = 'Improved' }
        Assert-Result (Invoke-Checker $d) 1 @('BAD-LABEL', '/entries/0/category', "category 'Improved', which is not in 'log_categories'")
    }

    Test-Case 'BAD-LABEL: a decision category used on a log entry (the two lists are separate)' {
        $d = New-Fixture 'label wrong list'
        Edit-Json (Join-Path $d 'plan/portal/log.json') { param($j) $j['entries'][0]['category'] = 'The app' }
        Assert-Result (Invoke-Checker $d) 1 @('BAD-LABEL', "category 'The app', which is not in 'log_categories'")
    }

    Test-Case 'BAD-LABEL: three tags, and one tag' {
        $d = New-Fixture 'label tag count'
        Edit-Json (Join-Path $d 'plan/portal/decisions.json') { param($j) $j['items'][0]['tags'] = @('web views', 'Tauri', 'tabs') }
        Edit-Json (Join-Path $d 'plan/portal/log.json') { param($j) $j['entries'][0]['tags'] = @('wiki') }
        Assert-Result (Invoke-Checker $d) 1 @('BAD-LABEL', 'Decision adr-0007 has 3 tags', 'Log entry log-2026-10-09-1 has 1 tags', 'exactly 2')
    }

    Test-Case 'BAD-LABEL: no tags at all' {
        $d = New-Fixture 'label no tags'
        Edit-Json (Join-Path $d 'plan/portal/log.json') { param($j) $j['entries'][0].Remove('tags') }
        Assert-Result (Invoke-Checker $d) 1 @('BAD-LABEL', 'log-2026-10-09-1 has no tags')
    }

    Test-Case 'BAD-LABEL: a tag that is not in the list' {
        $d = New-Fixture 'label unknown tag'
        Edit-Json (Join-Path $d 'plan/portal/decisions.json') { param($j) $j['items'][0]['tags'] = @('web views', 'Web Views 2') }
        Assert-Result (Invoke-Checker $d) 1 @('BAD-LABEL', "the tag 'Web Views 2', which is not in 'tags'")
    }

    Test-Case 'BAD-LABEL: the same tag twice' {
        $d = New-Fixture 'label duplicate tag'
        Edit-Json (Join-Path $d 'plan/portal/log.json') { param($j) $j['entries'][0]['tags'] = @('wiki', 'wiki') }
        Assert-Result (Invoke-Checker $d) 1 @('BAD-LABEL', "the tag 'wiki' twice")
    }

    Test-Case 'BAD-LABEL: a decision naming a phase with no phase file, and one with no phase' {
        $d = New-Fixture 'label phase'
        Edit-Json (Join-Path $d 'plan/portal/decisions.json') {
            param($j)
            $copy = [ordered]@{}
            foreach ($k in $j['items'][0].Keys) { $copy[$k] = $j['items'][0][$k] }
            $copy.Remove('phase')
            $j['items'][0]['phase'] = 'phase-p9-nope'
            $j['items'] = @($j['items']) + $copy
        }
        Assert-Result (Invoke-Checker $d) 1 @('BAD-LABEL', "the phase 'phase-p9-nope'", '/items/1/phase', 'mainly affects')
    }

    Test-Case 'BAD-LABEL: a name listed twice in taxonomy.json' {
        $d = New-Fixture 'label taxonomy dup'
        Edit-Json (Join-Path $d 'plan/portal/taxonomy.json') { param($j) $j['tags'] = @($j['tags']) + @{ name = 'wiki'; explains = 'Again.' } }
        Assert-Result (Invoke-Checker $d) 1 @('BAD-LABEL', "'wiki' is listed twice in tags")
    }

    # --- Labels on questions, risks and research items (owner plan of 2026-10-10) ------------------------
    Test-Case 'BAD-LABEL: a question with no category or tags' {
        $d = New-Fixture 'label question none'
        Edit-Json (Join-Path $d 'plan/portal/questions.json') { param($j) $j['items'][0].Remove('category'); $j['items'][0].Remove('tags') }
        Assert-Result (Invoke-Checker $d) 1 @('BAD-LABEL', '/items/0/category', 'Question Q-001 has no category', 'Question Q-001 has no tags', 'BAD-SHAPE')
    }

    Test-Case 'BAD-LABEL: a question with a log category (questions use the decision topics)' {
        $d = New-Fixture 'label question wrong list'
        Edit-Json (Join-Path $d 'plan/portal/questions.json') { param($j) $j['items'][0]['category'] = 'Built' }
        Assert-Result (Invoke-Checker $d) 1 @('BAD-LABEL', "Question Q-001 has the category 'Built', which is not in 'decision_categories'")
    }

    Test-Case 'BAD-LABEL: a risk with one tag, a research item with three' {
        $d = New-Fixture 'label risk research count'
        Edit-Json (Join-Path $d 'plan/portal/risks.json') { param($j) $j['items'][0]['tags'] = @('Tauri') }
        Edit-Json (Join-Path $d 'plan/portal/research.json') { param($j) $j['questions'][0]['tags'] = @('memory', 'CPU', 'benchmarks') }
        Assert-Result (Invoke-Checker $d) 1 @('BAD-LABEL', 'Risk risk-r02 has 1 tags', 'Research item rq-01 has 3 tags')
    }

    Test-Case 'BAD-LABEL: a risk with an unknown tag, a question with the same tag twice' {
        $d = New-Fixture 'label risk question tags'
        Edit-Json (Join-Path $d 'plan/portal/risks.json') { param($j) $j['items'][0]['tags'] = @('Tauri', 'reliability') }
        Edit-Json (Join-Path $d 'plan/portal/questions.json') { param($j) $j['items'][0]['tags'] = @('testing', 'testing') }
        Assert-Result (Invoke-Checker $d) 1 @('BAD-LABEL', "Risk risk-r02 has the tag 'reliability', which is not in 'tags'", "Question Q-001 has the tag 'testing' twice")
    }

    Test-Case 'BAD-LABEL: a risk with an unknown category' {
        $d = New-Fixture 'label risk category'
        Edit-Json (Join-Path $d 'plan/portal/risks.json') { param($j) $j['items'][0]['category'] = 'Danger' }
        Assert-Result (Invoke-Checker $d) 1 @('BAD-LABEL', "Risk risk-r02 has the category 'Danger', which is not in 'decision_categories'")
    }

    Test-Case 'BAD-LABEL: a research item whose kind does not fit its list' {
        $d = New-Fixture 'label research kind'
        Edit-Json (Join-Path $d 'plan/portal/research.json') { param($j) $j['questions'][0]['category'] = 'Measure' }
        Assert-Result (Invoke-Checker $d) 1 @('BAD-LABEL', '/questions/0/category', "sits in the 'questions' list, so its category must be 'Research question', not 'Measure'")
    }

    Test-Case 'BAD-LABEL: a research item with a decision topic as its category' {
        $d = New-Fixture 'label research topic'
        Edit-Json (Join-Path $d 'plan/portal/research.json') { param($j) $j['questions'][0]['category'] = 'The app' }
        Assert-Result (Invoke-Checker $d) 1 @('BAD-LABEL', "Research item rq-01 has the category 'The app', which is not in 'research_categories'")
    }

    Test-Case 'BAD-LABEL: a research item with no phase, a risk with a phase that has no file' {
        $d = New-Fixture 'label research risk phase'
        Edit-Json (Join-Path $d 'plan/portal/research.json') { param($j) $j['questions'][0].Remove('phase') }
        Edit-Json (Join-Path $d 'plan/portal/risks.json') { param($j) $j['items'][0]['phase'] = 'phase-p9-nope' }
        Assert-Result (Invoke-Checker $d) 1 @('BAD-LABEL', 'Research item rq-01 does not say which phase', "Risk risk-r02 names the phase 'phase-p9-nope'")
    }

    Test-Case 'BAD-SHAPE: taxonomy.json without the research kinds' {
        $d = New-Fixture 'label taxonomy research'
        Edit-Json (Join-Path $d 'plan/portal/taxonomy.json') { param($j) $j.Remove('research_categories') }
        Assert-Result (Invoke-Checker $d) 1 @('BAD-SHAPE', 'taxonomy.json', 'research_categories', 'BAD-LABEL')
    }

    # --- Time of day (optional, HH:MM, from 2026-10-10 on) ---------------------------------------------
    Test-Case 'BAD-SHAPE: a time of day that is not HH:MM (log entry 9:15, question 24:00)' {
        $d = New-Fixture 'time format'
        Edit-Json (Join-Path $d 'plan/portal/log.json') { param($j) $j['entries'][0]['time'] = '9:15' }
        Edit-Json (Join-Path $d 'plan/portal/questions.json') { param($j) $j['items'][0]['time'] = '24:00' }
        $r = Invoke-Checker $d
        Assert-Result $r 1 @('BAD-SHAPE', 'log.json', 'questions.json')
        Assert-True ($r.Out.Contains('/entries/0/time') -and $r.Out.Contains('/items/0/time')) "expected both time fields named. Output:`n$($r.Out)"
    }

    Test-Case 'MISMATCH: a log entry time that differs from its wiki "- time:" line' {
        $d = New-Fixture 'time log differs'
        Edit-Json (Join-Path $d 'plan/portal/log.json') { param($j) $j['entries'][0]['time'] = '09:16' }
        Assert-Result (Invoke-Checker $d) 1 @('MISMATCH', '/entries/0/time', "shows the time '09:16'", 'says 09:15')
    }

    Test-Case 'MISMATCH: a question without the time its "- asked:" line has' {
        $d = New-Fixture 'time question missing'
        Edit-Json (Join-Path $d 'plan/portal/questions.json') { param($j) $j['items'][0].Remove('time') }
        Assert-Result (Invoke-Checker $d) 1 @('MISMATCH', '/items/0/time', 'Question Q-001 has no time', 'says 21:41', "Copy it into 'time'")
    }

    Test-Case 'MISMATCH: a time in the JSON that the wiki page does not have (never invented)' {
        $d = New-Fixture 'time invented'
        $log = Join-Path $d 'wiki/log.md'
        [IO.File]::WriteAllText($log, ([IO.File]::ReadAllText($log) -replace '- time: 09:15\n', ''))
        Assert-Result (Invoke-Checker $d) 1 @('MISMATCH', "shows the time '09:15'", 'has no time', 'never invented')
    }

    Test-Case 'MISSING-FILE: taxonomy.json removed' {
        $d = New-Fixture 'label taxonomy missing'
        Remove-Item -LiteralPath (Join-Path $d 'plan/portal/taxonomy.json')
        Assert-Result (Invoke-Checker $d) 1 @('MISSING-FILE', 'plan/portal/taxonomy.json')
    }

    # --- Hook mode -----------------------------------------------------------------------------------
    Test-Case 'hook: switched off (no flag file) -> exit 0 even when stale' {
        $d = New-Fixture 'hook off'
        Add-Text (Join-Path $d 'wiki/phases/phase-p1-foundation.md') "`nchanged`n"
        $r = Invoke-Checker $d @('-Hook') $HookOff
        Assert-Result $r 0
        Assert-True ([string]::IsNullOrWhiteSpace($r.Err)) "expected no message, got: $($r.Err)"
    }

    Test-Case 'hook: on, stale, stop_hook_active=false -> exit 2 (block) with a plain message' {
        $d = New-Fixture 'hook block'
        New-Item -ItemType File -Path (Join-Path $d 'plan/portal/.hook-enabled') | Out-Null
        Add-Text (Join-Path $d 'wiki/phases/phase-p1-foundation.md') "`nchanged`n"
        $r = Invoke-Checker $d @('-Hook') $HookOff
        Assert-Result $r 2 @('no longer matches the wiki', 'wiki-to-portal', 'STALE')
        Assert-True ($r.Err.Contains('STALE')) 'the reason must be on stderr (Claude Code shows stderr to Claude on exit 2)'
    }

    Test-Case 'hook: on, stale, stop_hook_active=true -> exit 0 (never loops)' {
        $d = New-Fixture 'hook active'
        New-Item -ItemType File -Path (Join-Path $d 'plan/portal/.hook-enabled') | Out-Null
        Add-Text (Join-Path $d 'wiki/phases/phase-p1-foundation.md') "`nchanged`n"
        Assert-Result (Invoke-Checker $d @('-Hook') $HookOn) 0
    }

    Test-Case 'hook: on, clean -> exit 0' {
        $d = New-Fixture 'hook clean'
        New-Item -ItemType File -Path (Join-Path $d 'plan/portal/.hook-enabled') | Out-Null
        Assert-Result (Invoke-Checker $d @('-Hook') $HookOff) 0
    }

    Test-Case 'hook: finds the repo through CLAUDE_PROJECT_DIR (as configured in .claude/settings.json)' {
        $d = New-Fixture 'hook env'
        New-Item -ItemType File -Path (Join-Path $d 'plan/portal/.hook-enabled') | Out-Null
        Add-Text (Join-Path $d 'wiki/decisions/adr-0007-child-webviews.md') "`nchanged`n"
        Assert-Result (Invoke-Checker $d @('-Hook') $HookOff @{ CLAUDE_PROJECT_DIR = $d } -NoRoot) 2 @('STALE', 'adr-0007-child-webviews.md')
    }

    # --- Speed on the real repo ----------------------------------------------------------------------
    # The Stop hook's timeout is 30 s (.claude/settings.json). A full check of the real repo took 2.2 to
    # 2.4 s on 2026-10-09 after the single-pass rewrite (4 to 8 s before it). The limit is a third of the
    # hook timeout, so a busy machine does not make this test flaky while a real slowdown is still caught.
    Test-Case 'speed: a full check of the real repo takes under 10 seconds' {
        $sw = [Diagnostics.Stopwatch]::StartNew()
        $r = Invoke-Checker $Repo
        $sw.Stop()
        Assert-True ($r.Code -in 0, 1) "checker crashed: exit $($r.Code) $($r.Err)"
        Assert-True ($sw.Elapsed.TotalSeconds -lt 10) "took $([math]::Round($sw.Elapsed.TotalSeconds, 2)) s"
        Write-Output ("      real repo: {0:N2} s, exit {1}, {2}" -f $sw.Elapsed.TotalSeconds, $r.Code, ($r.Out.Trim() -split "`n")[-1])
    }
}
finally {
    Remove-Item -LiteralPath $TmpBase -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Output ''
Write-Output "test-portal-sync-check: $script:Passed passed, $script:Failed failed"
if ($script:Failed -gt 0) { exit 1 }
exit 0
