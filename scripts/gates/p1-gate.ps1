#Requires -Version 7.0
<#
.SYNOPSIS
  Gate check for phase P1 (Foundation): everything that must be true before P1 can end.

.DESCRIPTION
  What it checks, in four parts:
    1. P1 was allowed to start: your approvals of the P1 pages are recorded and no open question blocks it
       (tools/approvals_check.py --gate phase-p1-foundation).
    2. The task checks p1.1 to p1.17 (toolchain, machine inventory, ignore rules and licences, Rust
       workspace, the four experiments, the design decisions, wiki history checks, GitHub workflow,
       dependency audit, public docs, literature review, code-and-page warning). p1.16 is this gate's
       own review step and runs last.
    3. The test-gate rows of the P1 page, on one commit: Rust formatting and code warnings, Rust tests,
       licences and security alerts, the wiki check, the plan-app checks, the local check script and the
       test-robot experiment.
    4. Your part, listed as YOURS: the admin prompts of the installs, the Alt+Tab and resize checks of
       experiment 1, your choice of profile route, and the GitHub run (or deferring it).
  Why            : tools confirmed → the empty project builds and passes every automatic check → each risky
                   assumption has a written verdict → you review the evidence and settle the design → only
                   then does P2 start.
  What it changes: nothing in the repo (builds write ignored folders). With -SaveEvidence it saves, masked,
                   each command's output under the names the P1 page lists (cargo-fmt.txt, cargo-clippy.txt,
                   cargo-test.txt, cargo-deny.txt, wiki-lint.txt, ci-local.txt) and the whole printout as
                   p1-gate.txt, all in wiki/raw/evidence/phase-p1-foundation/.
  How long       : about 10 minutes once P1 exists (Rust builds, plan-app tests, experiments).
                   Before P1 starts it finishes in about a minute and reports FAIL: that is expected.
  How to run     : pwsh -NoProfile -File scripts/run-all-checks.ps1 -Phase P1
  Result         : PASS = exit 0 (your YOURS items may still be open), FAIL = exit 1, NOT READY = exit 2.
  Tell Claude    : before P1 has started: nothing. After: "P1 gate passed", or "P1 gate failed" and the
                   FAIL lines.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'P1-gate' -Title 'Foundation: end-of-phase gate' -Phase 'phase-p1-foundation' `
    -Why 'P2 starts only on a project that builds cleanly and a design settled from evidence.'

$ev = 'wiki/raw/evidence/phase-p1-foundation'
$pwsh = (Get-Process -Id $PID).Path

# Saves one command's output as its own evidence file when -SaveEvidence is given.
function Save-Output([string]$Name, $Result) {
    if ($SaveEvidence -and $Result) {
        $text = "Command output saved by scripts/gates/p1-gate.ps1 on $(Get-Date -Format 'yyyy-MM-dd HH:mm') at commit $(Get-GitCommit)`nExit code: $($Result.ExitCode)`n`n$($Result.Output)"
        Write-Note ("saved " + (Save-Evidence -Path "$ev/$Name" -Text $text))
    }
}

try {
    # --- Part 1: was P1 allowed to start? -------------------------------------------------------------
    Write-Section 'Part 1 - P1 was allowed to start'
    Invoke-Step 'Your approvals for P1 are recorded and no question blocks it' {
        $r = Invoke-Native -FilePath 'python' -ArgumentList @('tools/approvals_check.py', '--gate', 'phase-p1-foundation')
        Add-LogText $r.Output
        $line = ($r.Output -split "`r?`n" | Where-Object { $_ -match '^ENTRY GATE:' } | Select-Object -Last 1)
        if ($line -match 'PASS') { return 'entry gate: PASS' }
        $n = @(($line -replace '^ENTRY GATE: BLOCKED by ', '') -split ',\s*').Count
        Stop-Wait "P1 has not been allowed to start yet: $n approval(s) or question(s) still open (run: python tools/approvals_check.py --gate phase-p1-foundation)."
    }

    # --- Part 2: every task check ---------------------------------------------------------------------
    Write-Section 'Part 2 - Task checks p1.1 to p1.17'
    Invoke-Step 'Wiki check (run once, reused by the task checks)' {
        $lint = Initialize-SharedWikiLint
        Assert-NoLintErrors -Report $lint
        "$($lint.summary.pages) pages: 0 errors"
    }
    Invoke-TaskChecks -Phase 'phase-p1-foundation' -Skip 'p1.16'

    # --- Part 3: the test-gate rows, on this one commit -----------------------------------------------
    Write-Section 'Part 3 - Test gate on one commit'
    Invoke-Step 'Formatting and code warnings' {
        $f = Assert-Cargo @('fmt', '--all', '--', '--check'); Save-Output 'cargo-fmt.txt' $f
        $c = Assert-Cargo @('clippy', '--workspace', '--all-targets', '--locked', '--', '-D', 'warnings'); Save-Output 'cargo-clippy.txt' $c
        'cargo fmt --check and cargo clippy -D warnings: exit 0'
    }
    Invoke-Step 'Tests' { $t = Assert-Cargo @('test', '--workspace', '--locked'); Save-Output 'cargo-test.txt' $t; 'cargo test: exit 0' }
    Invoke-Step 'Licences and alerts' { $d = Assert-Cargo @('deny', 'check'); Save-Output 'cargo-deny.txt' $d; 'cargo deny check: exit 0' }
    Invoke-Step 'Wiki check' {
        $r = Invoke-Npm -Arguments @('run', 'lint:wiki')
        Save-Output 'wiki-lint.txt' $r
        if ($r.ExitCode -ne 0) { Stop-Fail "The wiki check failed:`n$(Get-Tail $r.Output 8)" }
        (($r.Output -split "`r?`n" | Where-Object { $_ -match '^lint: ' } | Select-Object -Last 1))
    }
    Invoke-Step 'Plan app checks' {
        foreach ($s in 'lint', 'typecheck', 'test', 'build') { [void](Assert-NpmScript $s) }
        'style, types, unit tests and build: exit 0'
    }
    Invoke-Step 'Local check script' {
        [void](Assert-RepoFile 'scripts/ci-local.ps1' 'The local check script')
        $r = Invoke-ChildScript 'scripts/ci-local.ps1'
        Save-Output 'ci-local.txt' $r
        if ($r.ExitCode -ne 0) { Stop-Fail "scripts/ci-local.ps1 failed (exit $($r.ExitCode)):`n$(Get-Tail $r.Output 8)" }
        'scripts/ci-local.ps1: exit 0'
    }
    Invoke-Step 'Test robot experiment' {
        $r = Invoke-ChildScript 'scripts/verify/p1.8-spike-test-robot.ps1' -ArgumentList @('-Run')
        Add-LogText $r.Output
        if ($r.ExitCode -ne 0) { Stop-Fail ("The test robot did not finish cleanly. Failed at: " + ((Get-StepProblems $r.Output) -join '; ')) }
        'Playwright drove the experiment app'
    }

    # --- Part 4: your part, then the review step (p1.16) --------------------------------------------
    Write-Section 'Part 4 - Your part, then the review step (task p1.16)'
    Add-YourStep 'Admin prompts' 'You confirmed the Windows admin prompts of the installs Claude ran, and each finished (or you reported the error).'
    Add-YourStep 'Experiment 1 by hand' 'You tried Alt+Tab keyboard focus and resizing the window of experiment 1 and told Claude the outcome.'
    Add-YourStep 'Design choice' 'You read the four experiment reports, chose the profile route and confirmed (or changed) the one-window design.'
    Add-YourStep 'GitHub' 'You pushed and reported the GitHub check result, or said "defer GitHub".'
    Invoke-TaskChecks -Phase 'phase-p1-foundation' -Skip ((Get-Content -LiteralPath (Get-RepoPath 'plan/portal/phases/phase-p1-foundation.json') -Raw | ConvertFrom-Json).tasks.id | Where-Object { $_ -ne 'p1.16' })
}
finally { Clear-SharedWikiLint }

Complete-Check -SaveEvidence:$SaveEvidence -EvidencePath "$ev/p1-gate.txt" -WhenPassed 'All automatic P1 checks passed on one commit.'
