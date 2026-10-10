#Requires -Version 7.0
<#
.SYNOPSIS
  Tests the check scripts themselves: can PowerShell read every one, and do they all follow the house rules?

.DESCRIPTION
  What it checks : (1) every PowerShell file in scripts/ and tools/ parses with no syntax error;
                   (2) every task and gate script starts with "#Requires -Version 7.0", has the plain-language
                   header (what it checks, why, what it changes, how long, what to tell Claude), uses strict
                   mode and stops on errors, and loads the shared module;
                   (3) every task and phase in plan/portal/phases/*.json names its script, the file exists
                   with the agreed name (scripts/verify/<task-id>-<slug>.ps1, scripts/gates/p<N>-gate.ps1),
                   and no script in those folders is left without a task;
                   (4) the part of each header you read has no rule codes, exit codes or tool paths (those go
                   in its "For Claude" field); (5) a broken approvals file is reported as broken;
                   (6) with -RunDrafts: every draft script (P2 to P8) runs and ends NOT READY (exit 2).
  Why            : a script that cannot even be read would fail only on the day you need it → this catches it
                   at once, and keeps the portal's script links honest.
  What it changes: nothing. It only reads files (with -RunDrafts it also runs the drafts, which change nothing).
  How long       : about 5 seconds; with -RunDrafts about 2 minutes.
  How to run     : pwsh -NoProfile -File scripts/test-check-scripts.ps1 [-RunDrafts]
  Result         : PASS = exit 0, FAIL = exit 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "script test failed".
#>
[CmdletBinding()]
param([switch]$SaveEvidence, [switch]$RunDrafts)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'scripts' -Title 'The check scripts themselves' -Why 'a broken check script must be caught before the day it is needed.'

$root = Get-RepoRoot
$rel = { param($p) [IO.Path]::GetRelativePath($root, $p).Replace('\', '/') }
$allPs = @(Get-ChildItem -LiteralPath (Get-RepoPath 'scripts'), (Get-RepoPath 'tools') -Recurse -File -Include '*.ps1', '*.psm1' |
    Where-Object { $_.FullName -notmatch '[\\/]fixtures[\\/]' })
$checkScripts = @(Get-ChildItem -LiteralPath (Get-RepoPath 'scripts/verify'), (Get-RepoPath 'scripts/gates') -File -Filter '*.ps1')

Invoke-Step 'Every PowerShell file parses without errors' {
    $bad = @(foreach ($f in $allPs) {
        $tokens = $null; $errors = $null
        [void][System.Management.Automation.Language.Parser]::ParseFile($f.FullName, [ref]$tokens, [ref]$errors)
        foreach ($e in $errors) { "$(& $rel $f.FullName):$($e.Extent.StartLineNumber): $($e.Message)" }
    })
    if ($bad.Count) { Stop-Fail ($bad -join "`n") }
    "$($allPs.Count) files parsed (scripts/ and tools/)"
}

Invoke-Step 'Every check script follows the house rules' {
    $need = [ordered]@{
        'starts with #Requires -Version 7.0' = '\A#Requires -Version 7\.0'
        'has a .SYNOPSIS' = '(?m)^\.SYNOPSIS'
        'says what it checks' = 'What it checks'
        'says why' = '(?m)^\s+Why\s+:'
        'says what it changes' = 'What it changes'
        'says how long it takes' = 'How long'
        'says what to tell Claude' = 'Tell Claude'
        'ends its header with notes for Claude' = '(?m)^\s+For Claude\s+:'
        'uses strict mode' = 'Set-StrictMode -Version Latest'
        'stops on errors' = "\`$ErrorActionPreference = 'Stop'"
        'loads the shared module' = 'Ferrum\.Check\.psm1'
        'ends with Complete-Check' = 'Complete-Check'
    }
    $bad = @(foreach ($f in $checkScripts) {
        $t = [IO.File]::ReadAllText($f.FullName)
        foreach ($k in $need.Keys) { if ($t -notmatch $need[$k]) { "$(& $rel $f.FullName): breaks the rule '$k'" } }
    })
    if ($bad.Count) { Stop-Fail (($bad | Select-Object -First 15) -join "`n") }
    "$($checkScripts.Count) task and gate scripts"
}

Invoke-Step 'The part of each header you read has no rule codes, exit codes or tool paths' {
    # Review 2026-10-09: the owner reads the header (the phase popup shows a gate's header inline).
    # Codes like INDEX-MISSING, exit numbers and module paths belong in the "For Claude" field at its end.
    $bad = @(foreach ($f in $checkScripts) {
        $t = [IO.File]::ReadAllText($f.FullName).Replace("`r`n", "`n")
        $h = $t.Substring($t.IndexOf('<#'), $t.IndexOf('#>') - $t.IndexOf('<#'))
        $cut = $h.IndexOf('For Claude')
        $owner = if ($cut -ge 0) { $h.Substring(0, $cut) } else { $h }
        foreach ($rx in '\b[A-Z]{2,}(?:-[A-Z]+)+\b', '\bexit [0-9]\b', '\.psm1\b', '\b[a-z_]+\.py\b', '\(rule ') {
            $m = [regex]::Match($owner, $rx)
            if ($m.Success) { "$(& $rel $f.FullName): '$($m.Value)' in the part you read" }
        }
    })
    if ($bad.Count) { Stop-Fail (($bad | Select-Object -First 15) -join "`n") }
    "$($checkScripts.Count) headers: plain words before 'For Claude'"
}

Invoke-Step 'A broken approvals file is reported as broken, not as "waiting for you"' {
    $tmp = Join-Path ([IO.Path]::GetTempPath()) ("ferrum approvals test " + [guid]::NewGuid().ToString('N').Substring(0, 8))
    try {
        New-Item -ItemType Directory -Path (Join-Path $tmp 'tools'), (Join-Path $tmp 'plan'), (Join-Path $tmp 'wiki') -Force | Out-Null
        Copy-Item -LiteralPath (Get-RepoPath 'tools/approvals_check.py') -Destination (Join-Path $tmp 'tools')
        [IO.File]::WriteAllText((Join-Path $tmp 'plan/approvals.json'), '{ "approvals": ')
        $result = $null
        try { [void](Get-ApprovalStates -Root $tmp); $result = 'no error' }
        catch { $result = "$($_.Exception.Data['ferrum']): $($_.Exception.Message)" }
        if ($result -notmatch '^FAIL: The approvals file could not be read') { Stop-Fail "Expected a FAIL about the approvals file, got: $result" }
        'a broken plan/approvals.json gives FAIL "The approvals file could not be read"'
    }
    finally { Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue }
}

Invoke-Step 'Every task and phase names an existing script with the agreed name' {
    $named = [System.Collections.Generic.HashSet[string]]::new()
    $bad = @(foreach ($pf in Get-ChildItem -LiteralPath (Get-RepoPath 'plan/portal/phases') -Filter 'phase-p*.json') {
        $ph = Get-Content -LiteralPath $pf.FullName -Raw | ConvertFrom-Json
        $n = $ph.short.Substring(1)
        foreach ($t in $ph.tasks) {
            if (-not $t.script) { "$($t.id): no script listed"; continue }
            if ($t.script -notmatch ('^scripts/verify/' + [regex]::Escape($t.id) + '-[a-z0-9]+(-[a-z0-9]+)*\.ps1$')) { "$($t.id): name '$($t.script)' does not follow scripts/verify/<task-id>-<slug>.ps1" }
            if (-not (Test-Path -LiteralPath (Get-RepoPath $t.script))) { "$($t.id): $($t.script) does not exist" }
            [void]$named.Add($t.script)
        }
        $g = $ph.test_gate.script
        if ($g -ne "scripts/gates/p$n-gate.ps1") { "$($ph.id): gate script is '$g', expected scripts/gates/p$n-gate.ps1" }
        elseif (-not (Test-Path -LiteralPath (Get-RepoPath $g))) { "$($ph.id): $g does not exist" }
        [void]$named.Add("$g")
    })
    $orphans = @($checkScripts | ForEach-Object { & $rel $_.FullName } | Where-Object { -not $named.Contains($_) } | ForEach-Object { "$_ belongs to no task or phase" })
    $all = $bad + $orphans
    if ($all.Count) { Stop-Fail (($all | Select-Object -First 15) -join "`n") }
    "$($named.Count) scripts linked from the portal files"
}

if ($RunDrafts) {
    Invoke-Step 'Every draft script runs and ends NOT READY' {
        $drafts = @($checkScripts | Where-Object { (Select-String -LiteralPath $_.FullName -Pattern 'DRAFT: not ready until' -Quiet) })
        $bad = @(foreach ($d in $drafts) {
            $r = Invoke-ChildScript (& $rel $d.FullName)
            if ($r.ExitCode -ne 2 -or $r.Output -notmatch 'Not ready until P[2-8]') { "$(& $rel $d.FullName): exit $($r.ExitCode)" }
        })
        if ($bad.Count) { Stop-Fail ($bad -join "`n") }
        "$($drafts.Count) drafts: all exit 2 with 'Not ready until P<n>'"
    }
}

Complete-Check -SaveEvidence:$SaveEvidence
