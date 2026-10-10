#Requires -Version 7.0
<#
.SYNOPSIS
  Gate check for phase P0 (Planning): everything that must be true before P0 can end.

.DESCRIPTION
  What it checks, in four parts:
    1. The wiki check runs once (zero errors) and is shared with the task checks below.
    2. The first twelve tasks are checked again, from saving your starting documents to the page
       fingerprints: research notes, rules, architecture, decisions, research plan, index and log,
       raw-file fingerprints, Node, the plan app skeleton and the wiki reader.
    3. The test-gate rows of the P0 page: style and type checks, unit tests, browser tests, production
       build, fingerprint cross-check and wiki check, plus the saved outputs of the first full run.
       Together they cover the four portal-building tasks, so those task checks are not run again here.
    4. Housekeeping: the portal text is in step with the wiki, no real machine values are in any committed
       file, the tool tests pass, and every check script can be read by PowerShell.
    Steps only you can do are listed as YOURS: your walkthrough of the portal, the open questions, your
    approvals of the P1 pages and your approval to end P0. They never make this script fail; P0 ends only
    when you have done them.
  Why            : every later phase builds on this plan → all its checks must pass in one run, with the
                   output saved → you read the portal and approve in Claude Code → only then does P1 start.
  What it changes: nothing in the repo (tests use temporary copies; builds write ignored folders). With
                   -SaveEvidence it also saves the whole printout, masked, as evidence.
  How long       : about 5 minutes (the browser tests take about 2).
  How to run     : pwsh -NoProfile -File scripts/gates/p0-gate.ps1
                   (close any portal you started yourself first: the browser tests use port 3418)
  Result         : PASS (every automatic check is fine; your own steps may still be open), FAIL (something
                   is wrong) or NOT READY (something still waits).
  Tell Claude    : if it says PASS: "P0 gate passed" (and, when you are ready, your approvals).
                   If it says FAIL: "P0 gate failed", and paste the FAIL lines.
  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (scripts/lib/Ferrum.Check.psm1). Part 2 runs
                   the task scripts p0.1 to p0.12; part 3 covers p0.13 to p0.16 and asserts the p0.16
                   evidence files; YOURS = p0.17 (approvals) and p0.18 (exit). -SaveEvidence writes
                   wiki/raw/evidence/phase-p0-planning/p0-gate.txt (a time stamp is added if it exists).
                   scripts/run-all-checks.ps1 -Phase P0 starts this same script.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'P0-gate' -Title 'Planning: end-of-phase gate' -Phase 'phase-p0-planning' `
    -Why 'the plan app and the wiki must be fully checked before any Ferrum code is written.'

$pwsh = (Get-Process -Id $PID).Path

try {
    # --- Part 1: one wiki check, shared with the task scripts ---------------------------------------
    Write-Section 'Part 1 - Wiki check (run once, reused below)'
    Invoke-Step 'Wiki check: zero errors' {
        $lint = Initialize-SharedWikiLint
        Assert-NoLintErrors -Report $lint
        "$($lint.summary.pages) pages: 0 errors, $($lint.summary.warnings) warnings (each reviewed in the log)"
    }

    # --- Part 2: the finished tasks, re-checked ------------------------------------------------------
    Write-Section 'Part 2 - The first twelve tasks, checked again'
    Invoke-TaskChecks -Phase 'phase-p0-planning' -Skip 'p0.13', 'p0.14', 'p0.15', 'p0.16', 'p0.17', 'p0.18'

    # --- Part 3: the test-gate rows of the P0 page ----------------------------------------------------
    Write-Section 'Part 3 - Test gate (also covers the four portal-building tasks)'
    Invoke-Step 'Style and type checks' { [void](Assert-NpmScript 'typecheck'); [void](Assert-NpmScript 'lint'); 'typecheck and code style: exit 0' }
    Invoke-Step 'Unit tests' {
        $r = Assert-NpmScript 'test'
        "$(($r.Output -split "`r?`n" | Where-Object { $_ -match '^\s+Tests\s' } | Select-Object -Last 1).Trim())"
    }
    Invoke-Step 'Browser tests (production build, this computer only)' {
        $r = Assert-NpmScript 'test:e2e'
        "$(($r.Output -split "`r?`n" | Where-Object { $_ -match '^\s+\d+ passed' } | Select-Object -Last 1).Trim())"
    }
    Invoke-Step 'Production build' { [void](Assert-NpmScript 'build'); 'npm run build: exit 0' }
    Invoke-Step 'Fingerprint cross-check' {
        $r = Invoke-ChildScript 'scripts/verify/p0.12-fingerprints.ps1'
        Add-LogText $r.Output
        if ($r.ExitCode -ne 0) { Stop-Fail ("The fingerprint check failed at: " + ((Get-StepProblems $r.Output) -join '; ')) }
        'the app, the rulebook program and PowerShell agree (task check p0.12)'
    }
    Invoke-Step 'Wiki check' { Assert-NoLintErrors -Report (Get-WikiLint); 'zero errors (part 1)' }
    Invoke-Step 'Saved outputs of the first full run' {
        # Task p0.16's second step: the outputs of the first full plan-app run are kept as evidence.
        $dir = 'wiki/raw/evidence/phase-p0-planning/interactive-plan'
        foreach ($f in 'IP-9-verify.txt', 'IP-9-perf.txt', 'playwright-report.zip', 'IP-10-final-lint.json') {
            [void](Assert-RepoFile "$dir/$f" -What 'A saved output of the first full run')
        }
        'all four files are there (task check p0.16)'
    }
    Add-YourStep 'Your walkthrough' 'Open the portal, look at every tab, and tell Claude what does not match the plan or is unclear.'
    Add-YourStep 'Open questions' 'Answer or defer each question Claude asks with the approval waves.'

    # --- Part 4: housekeeping ------------------------------------------------------------------------
    Write-Section 'Part 4 - Housekeeping'
    Invoke-Step 'Portal text is in step with the wiki' {
        $r = Invoke-Native -FilePath $pwsh -ArgumentList @('-NoProfile', '-NonInteractive', '-File', (Get-RepoPath 'tools/portal-sync-check.ps1'))
        if ($r.ExitCode -ne 0) { Stop-Fail "The portal check found problems:`n$(Get-Tail $r.Output 8)" }
        (Get-Tail $r.Output 1)
    }
    Invoke-Step 'No real machine values in committed files' {
        $r = Invoke-Native -FilePath $pwsh -ArgumentList @('-NoProfile', '-NonInteractive', '-File', (Get-RepoPath 'tools/mask.ps1'), '--scan')
        if ($r.ExitCode -eq 2) { Stop-Fail "The masking tool could not run (is the local map .env.local-map missing?):`n$(Get-Tail $r.Output 3)" }
        if ($r.ExitCode -ne 0) { Stop-Fail "Real values found (the lines show the file, not the value):`n$(Get-Tail $r.Output 8)" }
        (Get-Tail $r.Output 1)
    }
    Invoke-Step 'Tool tests pass (Python tools and the portal checker)' {
        $py = Invoke-Native -FilePath 'python' -ArgumentList @('-m', 'unittest', 'discover', '-s', 'tools', '-p', 'test_*.py')
        if ($py.ExitCode -ne 0) { Stop-Fail "Python tool tests failed:`n$(Get-Tail $py.Output 8)" }
        $ps = Invoke-Native -FilePath $pwsh -ArgumentList @('-NoProfile', '-NonInteractive', '-File', (Get-RepoPath 'tools/test-portal-sync-check.ps1'))
        if ($ps.ExitCode -ne 0) { Stop-Fail "Portal checker tests failed:`n$(Get-Tail $ps.Output 8)" }
        "$(($py.Output -split "`r?`n" | Where-Object { $_ -match '^Ran ' }) -join '') (Python); $(Get-Tail $ps.Output 1)"
    }
    Invoke-Step 'Every check script can be read by PowerShell' {
        $r = Invoke-ChildScript 'scripts/test-check-scripts.ps1'
        if ($r.ExitCode -ne 0) { Stop-Fail "The script test found problems:`n$(Get-Tail $r.Output 8)" }
        ($r.Output -split "`r?`n" | Where-Object { $_ -match '^\s+\d+ (files parsed|scripts linked)' } | ForEach-Object Trim) -join '; '
    }
    Add-YourStep 'Your approvals (task p0.17)' 'Approve the P1 pages in Claude Code, wave by wave; Claude records each approval.'
    Add-YourStep 'Your exit approval (task p0.18)' 'When everything above passes and you are satisfied, tell Claude "I approve the P0 exit".'
}
finally { Clear-SharedWikiLint }

Complete-Check -SaveEvidence:$SaveEvidence -EvidencePath 'wiki/raw/evidence/phase-p0-planning/p0-gate.txt' `
    -WhenPassed 'All automatic P0 checks passed in one run.' -TellClaude 'P0 gate passed'
