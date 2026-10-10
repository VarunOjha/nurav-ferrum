#Requires -Version 7.0
<#
.SYNOPSIS
  Shared helpers for every Ferrum check script (scripts/verify/ and scripts/gates/).

.DESCRIPTION
  Why: the owner asked for one re-runnable PowerShell 7 script per task and per phase gate (adr-0025).
  This module makes them all look and behave the same, so each script only lists its own checks.

  What every check script gets from here:
    - one line per check step, with one of five plain result words:
        PASS   the step was checked and is fine
        FAIL   the step was checked and something is wrong (the line says what)
        WAIT   the step cannot pass yet: it waits for you (an approval) or for earlier work
        TODO   the step is only planned; its real check is written when its phase starts
        YOURS  a step only you can do by hand (the line says what to do); it never fails the script
    - a short summary and a "What to tell Claude" line at the end;
    - the same exit codes everywhere:
        0 = every step that was checked passed (YOURS steps may still be open)
        1 = at least one step FAILED
        2 = nothing failed, but at least one step is WAIT or TODO (not ready yet)
    - optional evidence saving (-SaveEvidence on the script): the whole printout is passed through the
      masking tool (tools/mask.ps1, adr-0027) and written as a NEW file under wiki/raw/evidence/. Raw files
      are never overwritten: if the name exists, a time stamp is added.

  Nothing here changes repo files, except Save-Evidence when a script is run with -SaveEvidence.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:RepoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$script:State = $null
$script:Utf8 = [System.Text.UTF8Encoding]::new($false)

# Tools that are installed but not always on PATH (Node in "Program Files", Rust in the user folder).
foreach ($extra in @((Join-Path $env:ProgramFiles 'nodejs'), (Join-Path $HOME '.cargo\bin'))) {
    if ((Test-Path -LiteralPath $extra) -and (($env:PATH -split ';') -notcontains $extra)) { $env:PATH = "$env:PATH;$extra" }
}

# --- 1. Starting, steps and results --------------------------------------------------------------

function Get-RepoRoot { $script:RepoRoot }

function Get-RepoPath {
    <# Full path of a repo-relative path (forward or back slashes). #>
    param([Parameter(Mandatory)][string]$Path)
    [IO.Path]::GetFullPath((Join-Path $script:RepoRoot $Path))
}

function Write-CheckLine {
    <# Prints a line and keeps it for the evidence file. #>
    param([string]$Text = '', [string]$Color)
    if ($Color) { Write-Host $Text -ForegroundColor $Color } else { Write-Host $Text }
    if ($script:State) { [void]$script:State.Log.AppendLine($Text) }
}

function Start-Check {
    <# Begins a check: prints its id, title and why it matters. Call once at the top of a script. #>
    param(
        [Parameter(Mandatory)][string]$Id,
        [Parameter(Mandatory)][string]$Title,
        [string]$Why,
        [string]$Phase
    )
    [Console]::OutputEncoding = $script:Utf8
    $script:State = [pscustomobject]@{
        Id = $Id; Title = $Title; Phase = $Phase; Started = Get-Date
        Steps = [System.Collections.Generic.List[object]]::new()
        Log = [System.Text.StringBuilder]::new()
        NotStarted = $false; Short = ''
    }
    # The portal's phase file says whether the phase has started (failures are then expected).
    if ($Phase) {
        $pj = Get-RepoPath "plan/portal/phases/$Phase.json"
        if (Test-Path -LiteralPath $pj) {
            $phaseInfo = Get-Content -LiteralPath $pj -Raw | ConvertFrom-Json
            $script:State.Short = $phaseInfo.short
            $script:State.NotStarted = ($phaseInfo.status -eq 'Not started')
        }
    }
    Write-CheckLine ("Ferrum check {0}: {1}" -f $Id, $Title) 'Cyan'
    if ($Why) { Write-CheckLine "Why: $Why" }
    Write-CheckLine ("Run at {0:yyyy-MM-dd HH:mm} on commit {1}" -f (Get-Date), (Get-GitCommit))
    if ($script:State.NotStarted) { Write-CheckLine ("Note: {0} has not started yet, so FAIL or NOT READY results are expected." -f $script:State.Short) 'Yellow' }
    Write-CheckLine ('-' * 72)
}

function Stop-Fail {
    <# Ends the current step as FAIL with a plain message. #>
    param([Parameter(Mandatory)][string]$Message)
    $ex = [System.InvalidOperationException]::new($Message)
    $ex.Data['ferrum'] = 'FAIL'
    throw $ex
}

function Stop-Wait {
    <# Ends the current step as WAIT: not wrong, just not ready (waits for the owner or earlier work). #>
    param([Parameter(Mandatory)][string]$Message)
    $ex = [System.InvalidOperationException]::new($Message)
    $ex.Data['ferrum'] = 'WAIT'
    throw $ex
}

function Add-StepResult {
    param([string]$Name, [string]$Result, [string]$Detail, [double]$Seconds = 0)
    $script:State.Steps.Add([pscustomobject]@{ Name = $Name; Result = $Result; Detail = $Detail; Seconds = $Seconds })
    $color = @{ PASS = 'Green'; FAIL = 'Red'; WAIT = 'Yellow'; TODO = 'DarkYellow'; YOURS = 'Magenta' }[$Result]
    $time = if ($Seconds -ge 1) { ' ({0:0} s)' -f $Seconds } else { '' }
    $text = '  {0,-5}  {1}{2}' -f $Result, $Name, $time
    if ($Detail) { $text += "`n         " + (($Detail -split "`r?`n") -join "`n         ") }
    Write-CheckLine $text $color
}

function Invoke-Step {
    <#
      Runs one check step. The script block either returns a short detail text (PASS), or calls
      Stop-Fail / Stop-Wait. Any other error inside the block also counts as FAIL, with the error text,
      so a broken step never crashes the whole script.
    #>
    param([Parameter(Mandatory)][string]$Name, [Parameter(Mandatory)][scriptblock]$Check)
    $t0 = Get-Date
    try {
        $out = @(& $Check)
        $detail = if ($out.Count -gt 0) { [string]$out[-1] } else { '' }
        Add-StepResult $Name 'PASS' $detail ((Get-Date) - $t0).TotalSeconds
    }
    catch {
        $kind = $_.Exception.Data['ferrum']
        $secs = ((Get-Date) - $t0).TotalSeconds
        if ($kind -eq 'FAIL' -or $kind -eq 'WAIT') { Add-StepResult $Name $kind $_.Exception.Message $secs }
        else { Add-StepResult $Name 'FAIL' ("The check itself hit an error: " + $_.Exception.Message) $secs }
    }
}

function Add-YourStep {
    <# Lists a manual step for the owner. It never fails the script. #>
    param([Parameter(Mandatory)][string]$Name, [Parameter(Mandatory)][string]$WhatYouDo)
    Add-StepResult $Name 'YOURS' $WhatYouDo
}

function Add-TodoStep {
    <# Lists a planned check that is not written yet (later phases). #>
    param([Parameter(Mandatory)][string]$Name, [Parameter(Mandatory)][string]$PlannedCheck)
    Add-StepResult $Name 'TODO' $PlannedCheck
}

function Write-Note {
    <# Adds an indented note line (also kept in the evidence). #>
    param([Parameter(Mandatory)][string]$Text)
    Write-CheckLine ('         ' + $Text) 'DarkGray'
}

function Get-CheckExitCode {
    $r = @($script:State.Steps | ForEach-Object Result)
    if ($r -contains 'FAIL') { return 1 }
    if ($r -contains 'WAIT' -or $r -contains 'TODO') { return 2 }
    return 0
}

function Complete-Check {
    <#
      Prints the summary and what to tell Claude, saves evidence if asked, and exits with the shared code.
      -NotReadyUntil 'P3' marks a draft script of a later phase.
      -EvidencePath: repo-relative file for -SaveEvidence (default: the phase evidence folder).
    #>
    param(
        [switch]$SaveEvidence,
        [string]$EvidencePath,
        [string]$NotReadyUntil,
        [string]$WhenPassed
    )
    $s = $script:State
    $count = { param($w) @($s.Steps | Where-Object Result -eq $w).Count }
    $code = Get-CheckExitCode
    $secs = ((Get-Date) - $s.Started).TotalSeconds
    Write-CheckLine ('-' * 72)
    $tally = (@('PASS', 'FAIL', 'WAIT', 'TODO', 'YOURS') | ForEach-Object { $n = & $count $_; if ($n) { "$n $_" } }) -join ', '
    switch ($code) {
        0 { Write-CheckLine ("RESULT: PASS - {0} ({1}; {2:0} s)" -f $s.Id, $tally, $secs) 'Green' }
        1 { Write-CheckLine ("RESULT: FAIL - {0} ({1}; {2:0} s)" -f $s.Id, $tally, $secs) 'Red' }
        2 { Write-CheckLine ("RESULT: NOT READY - {0} ({1}; {2:0} s)" -f $s.Id, $tally, $secs) 'Yellow' }
    }
    $yours = @($s.Steps | Where-Object Result -eq 'YOURS')
    if ($code -eq 0) {
        Write-CheckLine ($(if ($WhenPassed) { $WhenPassed } else { 'Everything this script can check is fine.' }))
        if ($yours.Count) { Write-CheckLine ("Still yours to do by hand: " + (($yours | ForEach-Object Name) -join '; ') + '.') }
        Write-CheckLine ('What to tell Claude: nothing is needed. If you ran it for a review, say "{0} check passed".' -f $s.Id)
    }
    elseif ($code -eq 1) {
        $first = @($s.Steps | Where-Object Result -eq 'FAIL')[0]
        if ($s.NotStarted) {
            Write-CheckLine ("This is expected: {0} has not started, so its work does not exist yet." -f $s.Short)
            Write-CheckLine 'What to tell Claude: nothing.'
        }
        else {
            Write-CheckLine ('What to tell Claude: "{0} check failed at: {1}", and paste the FAIL lines above.' -f $s.Id, $first.Name)
        }
    }
    else {
        if ($NotReadyUntil) {
            Write-CheckLine ("Not ready until {0}: this is a draft. Its real checks are written when {0} starts." -f $NotReadyUntil)
            Write-CheckLine 'What to tell Claude: nothing. This result is expected for now.'
        }
        else {
            $wait = @($s.Steps | Where-Object { $_.Result -in 'WAIT', 'TODO' } | ForEach-Object Name)
            Write-CheckLine ("Not finished yet, and nothing is broken. Waiting on: " + ($wait -join '; ') + '.')
            Write-CheckLine 'What to tell Claude: nothing, unless you expected this to be finished.'
        }
    }
    if ($SaveEvidence) {
        if (-not $EvidencePath) {
            $phase = if ($s.Phase) { $s.Phase } else { 'misc' }
            $EvidencePath = 'wiki/raw/evidence/{0}/check-{1}.txt' -f $phase, $s.Id
        }
        $written = Save-Evidence -Path $EvidencePath -Text $s.Log.ToString()
        Write-Host "Evidence saved (masked): $written" -ForegroundColor Cyan
        Write-Host 'Claude adds its fingerprint line to wiki/raw/MANIFEST.sha256 when it commits it.'
    }
    exit $code
}

# --- 2. Running programs ---------------------------------------------------------------------------

function Find-Tool {
    <# Full path of a program on PATH, or $null. #>
    param([Parameter(Mandatory)][string]$Name)
    $c = Get-Command $Name -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($c) { $c.Source } else { $null }
}

function Invoke-Native {
    <#
      Runs a program and returns { ExitCode, Output } (standard output, then error output). It never
      throws for a non-zero exit code; the caller decides. -InputText is sent to the program's stdin.
    #>
    param(
        [Parameter(Mandatory)][string]$FilePath,
        [string[]]$ArgumentList = @(),
        [string]$WorkingDirectory = $script:RepoRoot,
        [hashtable]$Environment = @{},
        [string]$InputText,
        [int]$TimeoutSeconds = 1800
    )
    $exe = if (Test-Path -LiteralPath $FilePath -PathType Leaf) { $FilePath } else { Find-Tool $FilePath }
    if (-not $exe) { Stop-Fail "The program '$FilePath' is not installed or not on PATH." }
    $psi = [System.Diagnostics.ProcessStartInfo]::new()
    $psi.FileName = $exe
    foreach ($a in $ArgumentList) { $psi.ArgumentList.Add($a) }
    $psi.WorkingDirectory = $WorkingDirectory
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.RedirectStandardInput = [bool]$InputText
    $psi.StandardOutputEncoding = $script:Utf8
    $psi.StandardErrorEncoding = $script:Utf8
    if ($InputText) { $psi.StandardInputEncoding = $script:Utf8 }
    foreach ($k in $Environment.Keys) { $psi.Environment[$k] = [string]$Environment[$k] }
    $p = [System.Diagnostics.Process]::Start($psi)
    $outTask = $p.StandardOutput.ReadToEndAsync()
    $errTask = $p.StandardError.ReadToEndAsync()
    if ($InputText) { $p.StandardInput.Write($InputText); $p.StandardInput.Close() }
    if (-not $p.WaitForExit($TimeoutSeconds * 1000)) {
        try { $p.Kill($true) } catch { }
        Stop-Fail "'$FilePath $($ArgumentList -join ' ')' did not finish within $TimeoutSeconds s and was stopped."
    }
    $p.WaitForExit()
    $text = $outTask.Result
    if ($errTask.Result) { $text = $text.TrimEnd() + "`n" + $errTask.Result }
    [pscustomobject]@{ ExitCode = $p.ExitCode; Output = $text.TrimEnd() }
}

function Add-LogText {
    <# Keeps text for the evidence file without printing it (gates keep each task script's full output). #>
    param([Parameter(Mandatory)][AllowEmptyString()][string]$Text)
    if ($script:State) { [void]$script:State.Log.AppendLine($Text) }
}

function Invoke-TaskChecks {
    <#
      Gate helper: runs the check script of every task of a phase (paths from plan/portal/phases/<phase>.json),
      each in a fresh PowerShell, and adds one step per task. A task script that ends NOT READY gives WAIT.
      -Skip lists task ids not to run (for example tasks whose checks the gate repeats itself).
    #>
    param([Parameter(Mandatory)][string]$Phase, [string[]]$Skip = @())
    $pj = Get-Content -LiteralPath (Get-RepoPath "plan/portal/phases/$Phase.json") -Raw | ConvertFrom-Json
    foreach ($task in $pj.tasks) {
        if ($task.id -in $Skip) { continue }
        $name = "Task $($task.id): $($task.title)"
        Invoke-Step $name {
            if (-not $task.script) { Stop-Fail 'No check script is listed for this task in the portal file.' }
            $r = Invoke-ChildScript $task.script
            Add-LogText ("    --- output of {0} (exit {1}) ---`n{2}`n    --- end of {0} ---" -f $task.script, $r.ExitCode, $r.Output)
            $lines = @($r.Output -split "`r?`n")
            $result = ($lines | Where-Object { $_ -match '^RESULT: ' } | Select-Object -Last 1)
            $bad = Get-StepProblems $r.Output
            switch ($r.ExitCode) {
                0 { "$($task.script): $result" }
                2 { Stop-Wait ("Waiting on: " + ($bad -join '; ')) }
                default { Stop-Fail ("Failed at: " + $(if ($bad.Count) { $bad -join '; ' } else { Get-Tail $r.Output 4 }) + "  (details: $($task.script))") }
            }
        }
    }
}

function Get-StepProblems {
    <# Names of the FAIL and WAIT steps in another check script's printout. #>
    param([string]$Output)
    , @($Output -split "`r?`n" | Where-Object { $_ -match '^\s+(FAIL|WAIT)\s+(.+?)(\s+\(\d+ s\))?$' } | ForEach-Object {
            if ($_ -match '^\s+(FAIL|WAIT)\s+(.+?)(\s+\(\d+ s\))?$') { if ($Matches[1] -eq 'WAIT') { "$($Matches[2]) (waiting)" } else { $Matches[2] } } })
}

function Initialize-SharedWikiLint {
    <# Gate helper: runs the wiki check once and lets every task script started afterwards reuse its report. #>
    $rel = ".lint/ferrum-gate-$PID.json"
    $full = Get-RepoPath "interactive_plan/$rel"
    $r = Invoke-Npm -Arguments @('run', 'lint:wiki:json') -Environment @{ WIKI_LINT_OUT = $rel }
    if (-not (Test-Path -LiteralPath $full)) { Stop-Fail ("The wiki check did not produce its report (exit $($r.ExitCode)):`n" + (Get-Tail $r.Output)) }
    $env:FERRUM_CHECK_LINT_JSON = $full
    Get-Content -LiteralPath $full -Raw | ConvertFrom-Json
}

function Clear-SharedWikiLint {
    if ($env:FERRUM_CHECK_LINT_JSON -and (Test-Path -LiteralPath $env:FERRUM_CHECK_LINT_JSON)) { Remove-Item -LiteralPath $env:FERRUM_CHECK_LINT_JSON -Force }
    $env:FERRUM_CHECK_LINT_JSON = $null
}

function Write-Section {
    <# A plain heading between the parts of a gate. #>
    param([Parameter(Mandatory)][string]$Title)
    Write-CheckLine ''
    Write-CheckLine $Title 'Cyan'
}

function Get-Tail {
    <# The last lines of a long output, for FAIL messages. #>
    param([string]$Text, [int]$Lines = 12)
    $all = @($Text -split "`r?`n" | Where-Object { $_.Trim() -ne '' })
    ($all | Select-Object -Last $Lines) -join "`n"
}

function Invoke-Npm {
    <# Runs npm through node (works even when npm.cmd is awkward to start). Default folder: interactive_plan. #>
    param([Parameter(Mandatory)][string[]]$Arguments, [string]$Folder = 'interactive_plan', [hashtable]$Environment = @{}, [int]$TimeoutSeconds = 1800)
    $node = Find-Tool 'node'
    if (-not $node) { Stop-Fail 'Node.js is not installed (expected in C:\Program Files\nodejs).' }
    $cli = Join-Path (Split-Path -Parent $node) 'node_modules\npm\bin\npm-cli.js'
    if (-not (Test-Path -LiteralPath $cli)) { Stop-Fail "npm is missing next to node ($cli)." }
    Invoke-Native -FilePath $node -ArgumentList (@($cli) + $Arguments) -WorkingDirectory (Get-RepoPath $Folder) -Environment $Environment -TimeoutSeconds $TimeoutSeconds
}

function Assert-NpmScript {
    <# Runs 'npm run <name>' in the plan app; FAIL with the last output lines if it does not exit 0. #>
    param([Parameter(Mandatory)][string]$Name, [string]$Folder = 'interactive_plan', [string[]]$Extra = @())
    $args2 = @('run', $Name) + $(if ($Extra.Count) { @('--') + $Extra } else { @() })
    $r = Invoke-Npm -Arguments $args2 -Folder $Folder
    if ($r.ExitCode -ne 0) { Stop-Fail ("'npm run $Name' failed (exit $($r.ExitCode)). Last lines:`n" + (Get-Tail $r.Output)) }
    $r
}

function Assert-CargoWorkspace {
    <# FAIL with a plain message when the Rust workspace (root Cargo.toml) does not exist yet. #>
    param([string]$Folder = '.', [string]$What = 'The Rust workspace')
    $toml = Join-Path (Get-RepoPath $Folder) 'Cargo.toml'
    if (-not (Test-Path -LiteralPath $toml)) { Stop-Fail "$What does not exist yet (no $Folder/Cargo.toml), so this cannot run." }
}

function Assert-Cargo {
    <# Runs cargo with the given arguments in a folder; FAIL with the last output lines unless it exits 0. #>
    param([Parameter(Mandatory)][string[]]$Arguments, [string]$Folder = '.')
    Assert-CargoWorkspace -Folder $Folder -What $(if ($Folder -eq '.') { 'The Rust workspace' } else { "The Rust project in $Folder" })
    $r = Invoke-Native -FilePath 'cargo' -ArgumentList $Arguments -WorkingDirectory (Get-RepoPath $Folder)
    if ($r.ExitCode -ne 0) { Stop-Fail ("'cargo $($Arguments -join ' ')' failed (exit $($r.ExitCode)). Last lines:`n" + (Get-Tail $r.Output)) }
    $r
}

function Invoke-ChildScript {
    <# Runs another check script in a fresh PowerShell 7 and returns { ExitCode, Output }. Used by gates. #>
    param([Parameter(Mandatory)][string]$Path, [string[]]$ArgumentList = @())
    $pwsh = (Get-Process -Id $PID).Path
    Invoke-Native -FilePath $pwsh -ArgumentList (@('-NoProfile', '-NonInteractive', '-File', (Get-RepoPath $Path)) + $ArgumentList)
}

function Get-GitCommit {
    try {
        $r = Invoke-Native -FilePath 'git' -ArgumentList @('rev-parse', '--short', 'HEAD')
        $dirty = Invoke-Native -FilePath 'git' -ArgumentList @('status', '--porcelain')
        if ($r.ExitCode -ne 0) { return 'unknown' }
        if ($dirty.Output.Trim()) { return "$($r.Output.Trim()) (with uncommitted changes)" }
        $r.Output.Trim()
    }
    catch { 'unknown' }
}

# --- 3. Files, fingerprints and the wiki ------------------------------------------------------------

function Assert-RepoFile {
    <# FAIL (or WAIT with -Wait) if a repo file or folder does not exist. Returns the full path. #>
    param([Parameter(Mandatory)][string]$Path, [string]$What, [switch]$Wait)
    $full = Get-RepoPath $Path
    if (-not (Test-Path -LiteralPath $full)) {
        $msg = if ($What) { "$What is missing ($Path)." } else { "$Path is missing." }
        if ($Wait) { Stop-Wait $msg } else { Stop-Fail $msg }
    }
    $full
}

function Read-RepoText {
    param([Parameter(Mandatory)][string]$Path)
    [IO.File]::ReadAllText((Assert-RepoFile $Path), $script:Utf8)
}

function Get-NormalisedBytes {
    <# SCHEMA section 10.2 N(bytes): CRLF and lone CR become LF; nothing else changes. #>
    param([Parameter(Mandatory)][string]$FullPath)
    # Latin-1 maps every byte to one character and back, so this is an exact byte-level replace.
    $latin1 = [System.Text.Encoding]::Latin1
    $s = $latin1.GetString([IO.File]::ReadAllBytes($FullPath)).Replace("`r`n", "`n").Replace("`r", "`n")
    , $latin1.GetBytes($s)
}

function Get-ContentHash {
    <# SCHEMA section 10.2 content_hash of a repo file: "sha256:" + hex of sha256 over N(bytes). #>
    param([Parameter(Mandatory)][string]$Path)
    $bytes = Get-NormalisedBytes (Assert-RepoFile $Path)
    'sha256:' + [Convert]::ToHexString([System.Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant()
}

function Get-ManifestEntries {
    <# wiki/raw/MANIFEST.sha256 as a hashtable: path relative to wiki/raw/ -> hex hash. #>
    $map = @{}
    foreach ($line in (Read-RepoText 'wiki/raw/MANIFEST.sha256') -split "`n") {
        if ($line -match '^([0-9a-f]{64})  (.+?)\s*$') { $map[$Matches[2]] = $Matches[1] }
    }
    $map
}

function Get-Frontmatter {
    <# Top-level "key: value" lines of a page's YAML header (enough for checks; lists stay as text). #>
    param([Parameter(Mandatory)][string]$Path)
    $t = (Read-RepoText $Path) -replace "`r`n", "`n"
    $fm = [ordered]@{}
    if (-not $t.StartsWith("---`n")) { return $fm }
    $end = $t.IndexOf("`n---`n", 3)
    if ($end -lt 0) { return $fm }
    foreach ($line in $t.Substring(4, $end - 4) -split "`n") {
        if ($line -match '^([A-Za-z_][\w-]*):\s*(.*)$') { $fm[$Matches[1]] = $Matches[2].Trim().Trim('"') }
    }
    $fm
}

function Get-WikiLint {
    <#
      Runs the wiki check of the plan app (npm run lint:wiki:json) and returns its JSON report.
      A gate runs it once and shares the report with its task scripts through FERRUM_CHECK_LINT_JSON.
    #>
    $cached = $env:FERRUM_CHECK_LINT_JSON
    if ($cached -and (Test-Path -LiteralPath $cached)) { return Get-Content -LiteralPath $cached -Raw | ConvertFrom-Json }
    $rel = ".lint/ferrum-check-$PID.json"
    $out = Get-RepoPath "interactive_plan/$rel"
    $r = Invoke-Npm -Arguments @('run', 'lint:wiki:json') -Environment @{ WIKI_LINT_OUT = $rel }
    if (-not (Test-Path -LiteralPath $out)) {
        Stop-Fail ("The wiki check did not produce its report (exit $($r.ExitCode)). Last lines:`n" + (Get-Tail $r.Output))
    }
    $json = Get-Content -LiteralPath $out -Raw | ConvertFrom-Json
    Remove-Item -LiteralPath $out -Force
    $json
}

function Get-LintFindings {
    <# Findings of the wiki check, filtered by rule code(s) and severity. #>
    param([Parameter(Mandatory)]$Report, [string[]]$Codes, [string]$Severity)
    , @($Report.findings | Where-Object { (-not $Codes -or $_.code -in $Codes) -and (-not $Severity -or $_.severity -eq $Severity) })
}

function Assert-NoLintErrors {
    <# FAIL if the wiki check reports errors for the given rule codes (all codes when none given). #>
    param([Parameter(Mandatory)]$Report, [string[]]$Codes)
    $bad = Get-LintFindings -Report $Report -Codes $Codes -Severity 'error'
    if ($bad.Count) {
        Stop-Fail ("The wiki check found $($bad.Count) error(s):`n" + (($bad | Select-Object -First 8 | ForEach-Object { "$($_.code) $($_.path): $($_.message)" }) -join "`n"))
    }
}

function Get-ApprovalStates {
    <#
      Effective approval state of every key in plan/approvals.json, computed by tools/approvals_check.py
      (SCHEMA section 10.3). Keys not in the file are PENDING.
    #>
    $r = Invoke-Native -FilePath 'python' -ArgumentList @('tools/approvals_check.py')
    $map = @{}
    foreach ($line in $r.Output -split "`r?`n") {
        if ($line -match '^\s{2}(APPROVED_VOLATILE_DRIFT|APPROVED|STALE|PENDING|REJECTED|CHANGES_REQUESTED|INVALID)\s+(\S+)\s*$') { $map[$Matches[2]] = $Matches[1] }
    }
    $map
}

function Get-ApprovalState {
    param([Parameter(Mandatory)][string]$Key, [hashtable]$States)
    if (-not $States) { $States = Get-ApprovalStates }
    if ($States.ContainsKey($Key)) { $States[$Key] } else { 'PENDING' }
}

function Assert-Approved {
    <# WAIT unless every key is APPROVED (or approved with only bookkeeping changes). #>
    param([Parameter(Mandatory)][string[]]$Keys, [string]$What = 'your approval')
    $states = Get-ApprovalStates
    $missing = @($Keys | Where-Object { (Get-ApprovalState $_ $states) -notin 'APPROVED', 'APPROVED_VOLATILE_DRIFT' })
    if ($missing.Count) {
        Stop-Wait ("Waiting for {0} in Claude Code. Not approved yet: {1}." -f $What, (($missing | ForEach-Object { "$_ ($(Get-ApprovalState $_ $states))" }) -join ', '))
    }
    "Approved: $($Keys -join ', ')"
}

function Test-LogHeading {
    <# True if wiki/log.md has a heading matching the pattern (for example a 'gate' entry). #>
    param([Parameter(Mandatory)][string]$Pattern)
    [bool]((Read-RepoText 'wiki/log.md') -split "`n" | Where-Object { $_ -match '^## \[' -and $_ -match $Pattern })
}

function Get-VersionNumber {
    <# First "a.b(.c)" version in a text, as [version], or $null. #>
    param([string]$Text)
    if ($Text -match '(\d+)\.(\d+)(?:\.(\d+))?') {
        [version]('{0}.{1}.{2}' -f $Matches[1], $Matches[2], $(if ($Matches[3]) { $Matches[3] } else { 0 }))
    }
    else { $null }
}

function Get-InexactVersions {
    <# Names in a package.json whose versions are not exact (contain ^, ~, *, x, >, <, or a range). #>
    param([Parameter(Mandatory)][string]$PackageJson, [string[]]$Only)
    $j = Read-RepoText $PackageJson | ConvertFrom-Json -AsHashtable
    $bad = @()
    foreach ($sec in 'dependencies', 'devDependencies') {
        if (-not $j.ContainsKey($sec)) { continue }
        foreach ($k in $j[$sec].Keys) {
            if ($Only -and $k -notin $Only) { continue }
            if ($j[$sec][$k] -notmatch '^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$') { $bad += "$k $($j[$sec][$k])" }
        }
    }
    , $bad
}

# --- 4. Evidence ------------------------------------------------------------------------------------

function Save-Evidence {
    <#
      Writes text as a NEW evidence file after masking real machine values with tools/mask.ps1 --stdin.
      If the file exists, a time stamp is added to the name (raw files are never overwritten).
      Returns the repo-relative path written.
    #>
    param([Parameter(Mandatory)][string]$Path, [Parameter(Mandatory)][string]$Text)
    $full = Get-RepoPath $Path
    if (Test-Path -LiteralPath $full) {
        $stamp = Get-Date -Format 'yyyyMMdd-HHmm'
        $full = Join-Path (Split-Path -Parent $full) ("{0}.{1}{2}" -f [IO.Path]::GetFileNameWithoutExtension($full), $stamp, [IO.Path]::GetExtension($full))
        if (Test-Path -LiteralPath $full) { throw "Evidence file already exists: $full" }
    }
    $pwsh = (Get-Process -Id $PID).Path
    $m = Invoke-Native -FilePath $pwsh -ArgumentList @('-NoProfile', '-NonInteractive', '-File', (Get-RepoPath 'tools/mask.ps1'), '--stdin') -InputText ($Text -replace "`r`n", "`n")
    if ($m.ExitCode -ne 0) {
        throw "Evidence NOT saved: the masking tool failed (exit $($m.ExitCode)). If the local map is missing, run: pwsh tools/mask.ps1 --refresh-map`n$($m.Output)"
    }
    $masked = $m.Output -replace "`r`n", "`n"
    if (-not $masked.EndsWith("`n")) { $masked += "`n" }
    [void](New-Item -ItemType Directory -Force -Path (Split-Path -Parent $full))
    [IO.File]::WriteAllText($full, $masked, $script:Utf8)
    [IO.Path]::GetRelativePath($script:RepoRoot, $full).Replace('\', '/')
}

Export-ModuleMember -Function Get-RepoRoot, Get-RepoPath, Write-CheckLine, Start-Check, Stop-Fail, Stop-Wait, Invoke-Step,
    Add-YourStep, Add-TodoStep, Write-Note, Complete-Check, Find-Tool, Invoke-Native, Get-Tail, Add-LogText, Invoke-TaskChecks,
    Initialize-SharedWikiLint, Clear-SharedWikiLint, Write-Section, Get-StepProblems, Invoke-Npm, Assert-NpmScript,
    Assert-CargoWorkspace, Assert-Cargo, Invoke-ChildScript, Get-GitCommit, Assert-RepoFile, Read-RepoText, Get-ContentHash, Get-ManifestEntries, Get-Frontmatter,
    Get-WikiLint, Get-LintFindings, Assert-NoLintErrors, Get-ApprovalStates, Get-ApprovalState, Assert-Approved,
    Test-LogHeading, Get-VersionNumber, Get-InexactVersions, Save-Evidence
