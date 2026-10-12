#Requires -Version 7.0
<#
.SYNOPSIS
  Gate check for phase P2 (First working app): what must be true before P2 can end.

.DESCRIPTION
  What it checks : Part 1, your approvals for P2 are current (pages changed during P2 need your new look; until
                   then this part says WAIT). Part 2, every P2 task check passes. Part 3, the test-gate rows of the
                   phase page on this one commit: formatting and code warnings, Rust tests, licences and alerts,
                   shell checks (lint, types, unit tests), the release build, the bridge lockdown test (no website
                   can call the app), the whole smoke suite and the wiki check. Part 4 lists your part: the manual
                   checklist and your review.
  Why            : every website view could reach the app's channel → first prove websites are refused, then
                   prove navigation with small tests, the smoke suite and a release build → you try it on real
                   sites → only then do tabs start in P3.
  What it changes: nothing in git. With -SaveEvidence each test-gate row's output is saved as its own masked
                   evidence file (cargo-fmt.txt, cargo-clippy.txt, cargo-test.txt, cargo-deny.txt,
                   shell-tests.txt, release-build.txt, ipc-denial.txt, smoke.txt, wiki-lint.txt) and the whole
                   printout as p2-gate.txt, in wiki/raw/evidence/phase-p2-minimal-container/.
  How long       : about 20 minutes (each task check builds and runs the app; the release build alone takes about
                   a minute). Please do not type into Ferrum windows while it runs (the developer-tools check
                   presses keys in Ferrum, and only while Ferrum is the active window).
  How to run     : pwsh -NoProfile -File scripts/gates/p2-gate.ps1
                   Needs the local development certificate (task p2.1) and ports 8443 and 9339 free.
  Result         : PASS (every automatic check passed), FAIL (something is wrong) or NOT READY (something
                   still waits, for example your approvals).
  Tell Claude    : "P2 gate passed", or paste the FAIL or WAIT lines.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1, scripts/lib/Ferrum.SelfTest.ps1). scripts/run-all-checks.ps1
                   -Phase P2 starts this same script. The automatic gate items, from the test_gate of the phase page:
    - cargo fmt --all -- --check
    - cargo clippy --workspace --all-targets -- -D warnings
    - cargo test --workspace
    - cargo deny check
    - apps/desktop shell: npm run lint && npm run typecheck && npm run test
    - Tauri release build of apps/desktop
    - IPC denial integration test (p2.3)
    - Smoke suite (p2.15) covering p2.7 to p2.13
    - cd interactive_plan && npm run lint:wiki
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'P2-gate' -Title 'First working app: end-of-phase gate' -Phase 'phase-p2-minimal-container' `
    -Why 'only a passing gate and your approval let the next phase start.'

$ev = 'wiki/raw/evidence/phase-p2-minimal-container'

# Saves one command's output as its own evidence file when -SaveEvidence is given.
function Save-Output([string]$Name, $Result) {
    if ($SaveEvidence -and $Result) {
        $text = "Command output saved by scripts/gates/p2-gate.ps1 on $(Get-Date -Format 'yyyy-MM-dd HH:mm') at commit $(Get-GitCommit)`nExit code: $($Result.ExitCode)`n`n$($Result.Output)"
        Write-Note ("saved " + (Save-Evidence -Path "$ev/$Name" -Text $text))
    }
}

try {
    # --- Part 1: approvals ---------------------------------------------------------------------------------
    Write-Section 'Part 1 - Your approvals for P2 are current'
    Invoke-Step 'Approvals for P2 recorded and current; no question blocks it' {
        $r = Invoke-Native -FilePath 'python' -ArgumentList @('tools/approvals_check.py', '--gate', 'phase-p2-minimal-container')
        Add-LogText $r.Output
        $line = ($r.Output -split "`r?`n" | Where-Object { $_ -match '^ENTRY GATE:' } | Select-Object -Last 1)
        if ($line -match 'PASS') { return 'all P2 approvals current' }
        Stop-Wait "Some P2 pages changed during the phase and need your new look ($($line -replace '^ENTRY GATE: BLOCKED by ', ''))."
    }

    # --- Part 2: every task check ------------------------------------------------------------------------
    Write-Section 'Part 2 - Every P2 task, checked'
    Invoke-Step 'Wiki check (run once, reused by the task checks)' {
        $lint = Initialize-SharedWikiLint
        Assert-NoLintErrors -Report $lint
        "$($lint.summary.pages) pages: 0 errors"
    }
    Invoke-TaskChecks -Phase 'phase-p2-minimal-container' -Skip 'p2.18'

    # --- Part 3: the test-gate rows, on this one commit ----------------------------------------------------
    Write-Section 'Part 3 - Test gate on one commit'
    Invoke-Step 'Formatting and code warnings' {
        $f = Assert-Cargo @('fmt', '--all', '--', '--check'); Save-Output 'cargo-fmt.txt' $f
        $c = Assert-Cargo @('clippy', '--workspace', '--all-targets', '--locked', '--', '-D', 'warnings'); Save-Output 'cargo-clippy.txt' $c
        'cargo fmt --check and cargo clippy -D warnings: exit 0'
    }
    Invoke-Step 'Rust tests' { $t = Assert-Cargo @('test', '--workspace', '--locked'); Save-Output 'cargo-test.txt' $t; 'cargo test --workspace: exit 0' }
    Invoke-Step 'Licences and alerts' { $d = Assert-Cargo @('deny', 'check'); Save-Output 'cargo-deny.txt' $d; 'cargo deny check: exit 0' }
    Invoke-Step 'Shell checks (lint, types, unit tests)' {
        $out = foreach ($s in 'lint', 'typecheck', 'test') {
            $r = Assert-NpmScript $s -Folder 'apps/desktop'
            "### npm run $s (exit $($r.ExitCode))`n$($r.Output)"
        }
        Save-Output 'shell-tests.txt' ([pscustomobject]@{ ExitCode = 0; Output = ($out -join "`n`n") })
        'npm run lint, typecheck, test: exit 0'
    }
    Invoke-Step 'Release build' {
        $b = Assert-NpmScript 'build' -Folder 'apps/desktop'
        $r = Invoke-Npm -Arguments @('run', 'tauri', '--', 'build', '--no-bundle') -Folder 'apps/desktop'
        Save-Output 'release-build.txt' $r
        if ($r.ExitCode -ne 0) { Stop-Fail "The release build failed:`n$(Get-Tail $r.Output 10)" }
        [void]$b
        'npm run tauri -- build --no-bundle: exit 0 (target/release/ferrum-desktop.exe)'
    }
    Invoke-Step 'Bridge lockdown test (no website can call the app)' {
        $r = Invoke-ChildScript 'scripts/verify/p2.3-lock-bridge-app.ps1'
        Save-Output 'ipc-denial.txt' $r
        if ($r.ExitCode -ne 0) { Stop-Fail ("The bridge lockdown test did not pass: " + ((Get-StepProblems $r.Output) -join '; ')) }
        'p2.3 IPC denial test: PASS'
    }
    Invoke-Step 'Whole smoke suite' {
        $r = Invoke-FerrumSmoke -Spec ''
        Save-Output 'smoke.txt' $r
        if ($r.ExitCode -ne 0) { Stop-Fail "The smoke suite failed:`n$(Get-Tail $r.Output 12)" }
        ([regex]::Match($r.Output, '\d+ passed')).Value
    }
    Invoke-Step 'Wiki check' {
        $r = Invoke-Npm -Arguments @('run', 'lint:wiki')
        Save-Output 'wiki-lint.txt' $r
        if ($r.ExitCode -ne 0) { Stop-Fail "The wiki check failed:`n$(Get-Tail $r.Output 8)" }
        (($r.Output -split "`r?`n" | Where-Object { $_ -match '^lint: ' } | Select-Object -Last 1))
    }

    # --- Part 4: your part -------------------------------------------------------------------------------
    Write-Section 'Part 4 - Your part (task p2.18)'
    Add-YourStep 'Your checklist' 'You tried the release build: five HTTPS sites, a mail link, a restart, going offline and Alt+Tab (docs/testing/manual-checklist-p2.md), and told Claude the results.'
    Add-YourStep 'Your review' 'You looked at the changed pages and the evidence, and said whether P2 is signed off.'
}
finally { Clear-SharedWikiLint }

Complete-Check -SaveEvidence:$SaveEvidence -EvidencePath "$ev/p2-gate.txt" -WhenPassed 'All automatic P2 checks passed on one commit.' -TellClaude 'P2 gate passed'
