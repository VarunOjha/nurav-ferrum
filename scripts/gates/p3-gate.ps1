#Requires -Version 7.0
<#
.SYNOPSIS
  Gate check for phase P3 (Tabs and sessions): what must be true before P3 can end.

.DESCRIPTION
  What it checks : Part 1, your approvals for P3 are current. Part 2, every P3 task check passes. Part 3, the
                   test-gate rows of the phase page on this one commit: formatting and code warnings, Rust tests,
                   licences and alerts, shell checks (lint, types, unit tests), the release build, the P3 integration
                   suite (npm run p3), the earlier tests again (P2's app tests, npm run p2, and the bridge lockdown
                   test) and the wiki check. Part 4 lists your part: the manual checklist and your review.
  Why            : tabs multiply every P2 behaviour → rerun P2's tests plus the new suite, and test restore after a
                   forced end → you use it for a real working session → only then does security work start in P4.
  What it changes: nothing in git. With -SaveEvidence each test-gate row's output is saved as its own masked evidence
                   file (cargo-fmt.txt, cargo-clippy.txt, cargo-test.txt, cargo-deny.txt, shell-tests.txt,
                   release-build.txt, integration.txt, regression-smoke.txt, wiki-lint.txt) and the whole printout as
                   p3-gate.txt, in wiki/raw/evidence/phase-p3-tabs-sessions/.
  How long       : about 25 minutes. Some checks press real keys in Ferrum and bring it to the front for a few
                   seconds at a time: please do not type while it runs, and close any Ferrum window you opened
                   yourself first (the release build cannot replace a running program).
  How to run     : pwsh -NoProfile -File scripts/gates/p3-gate.ps1
                   Needs the local development certificate (task p2.1) and ports 8443 and 9339 free.
  Result         : PASS (every automatic check passed), FAIL (something is wrong) or NOT READY (something
                   still waits, for example your approvals).
  Tell Claude    : "P3 gate passed", or paste the FAIL or WAIT lines.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1, scripts/lib/Ferrum.SelfTest.ps1). scripts/run-all-checks.ps1
                   -Phase P3 starts this same script. The automatic gate items, from the test_gate of the phase page:
    - cargo fmt --all -- --check
    - cargo clippy --workspace --all-targets -- -D warnings
    - cargo test --workspace
    - cargo deny check
    - apps/desktop shell: npm run lint && npm run typecheck && npm run test
    - Tauri release build of apps/desktop
    - P3 integration suite (p3.11)
    - P2 smoke suite and IPC denial test (regression)
    - cd interactive_plan && npm run lint:wiki
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'P3-gate' -Title 'Tabs and sessions: end-of-phase gate' -Phase 'phase-p3-tabs-sessions' `
    -Why 'only a passing gate and your approval let the next phase start.'

$ev = 'wiki/raw/evidence/phase-p3-tabs-sessions'

# Saves one command's output as its own evidence file when -SaveEvidence is given.
function Save-Output([string]$Name, $Result) {
    if ($SaveEvidence -and $Result) {
        $text = "Command output saved by scripts/gates/p3-gate.ps1 on $(Get-Date -Format 'yyyy-MM-dd HH:mm') at commit $(Get-GitCommit)`nExit code: $($Result.ExitCode)`n`n$($Result.Output)"
        Write-Note ("saved " + (Save-Evidence -Path "$ev/$Name" -Text $text))
    }
}

try {
    # --- Part 1: approvals ---------------------------------------------------------------------------------
    Write-Section 'Part 1 - Your approvals for P3 are current'
    Invoke-Step 'Approvals for P3 recorded and current; no question blocks it' {
        $r = Invoke-Native -FilePath 'python' -ArgumentList @('tools/approvals_check.py', '--gate', 'phase-p3-tabs-sessions')
        Add-LogText $r.Output
        $line = ($r.Output -split "`r?`n" | Where-Object { $_ -match '^ENTRY GATE:' } | Select-Object -Last 1)
        if ($line -match 'PASS') { return 'all P3 approvals current' }
        Stop-Wait "Some P3 pages changed during the phase and need your new look ($($line -replace '^ENTRY GATE: BLOCKED by ', ''))."
    }

    # --- Part 2: every task check ------------------------------------------------------------------------
    Write-Section 'Part 2 - Every P3 task, checked'
    Invoke-Step 'Wiki check (run once, reused by the task checks)' {
        $lint = Initialize-SharedWikiLint
        Assert-NoLintErrors -Report $lint
        "$($lint.summary.pages) pages: 0 errors"
    }
    Invoke-TaskChecks -Phase 'phase-p3-tabs-sessions' -Skip 'p3.13'

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
        [void](Assert-NpmScript 'build' -Folder 'apps/desktop')
        $r = Invoke-Npm -Arguments @('run', 'tauri', '--', 'build', '--no-bundle') -Folder 'apps/desktop'
        Save-Output 'release-build.txt' $r
        if ($r.ExitCode -ne 0) { Stop-Fail "The release build failed (a Ferrum window still open locks the program file):`n$(Get-Tail $r.Output 10)" }
        'npm run tauri -- build --no-bundle: exit 0 (target/release/ferrum-desktop.exe)'
    }
    Invoke-Step 'P3 integration suite (npm run p3)' {
        $pkg = Read-RepoText 'apps/desktop/tests/smoke/package.json' | ConvertFrom-Json
        $specs = @($pkg.scripts.p3 -split '\s+' | Where-Object { $_ -like '*.spec' })
        $r = Invoke-FerrumSmoke -Spec $specs
        Save-Output 'integration.txt' $r
        if ($r.Output -match 'was not the active window') { Stop-Wait 'Ferrum was not the active window when keys were due; run the gate again without using the PC meanwhile.' }
        if ($r.ExitCode -ne 0 -or $r.Output -match '\d+ failed') { Stop-Fail "The P3 suite failed:`n$(Get-Tail $r.Output 12)" }
        "npm run p3: $(([regex]::Match($r.Output, '\d+ passed')).Value)"
    }
    Invoke-Step 'Earlier tests again: P2 app tests (npm run p2) and the bridge lockdown test' {
        $pkg = Read-RepoText 'apps/desktop/tests/smoke/package.json' | ConvertFrom-Json
        $specs = @($pkg.scripts.p2 -split '\s+' | Where-Object { $_ -like '*.spec' })
        $s = Invoke-FerrumSmoke -Spec $specs
        $i = Invoke-ChildScript 'scripts/verify/p2.3-lock-bridge-app.ps1'
        Save-Output 'regression-smoke.txt' ([pscustomobject]@{
                ExitCode = [int]($s.ExitCode -ne 0 -or $i.ExitCode -ne 0)
                Output   = "### npm run p2 (exit $($s.ExitCode))`n$($s.Output)`n`n### scripts/verify/p2.3-lock-bridge-app.ps1 (exit $($i.ExitCode))`n$($i.Output)"
            })
        if ($s.ExitCode -ne 0 -or $s.Output -match '\d+ failed') { Stop-Fail "The P2 app tests failed:`n$(Get-Tail $s.Output 12)" }
        if ($i.ExitCode -ne 0) { Stop-Fail ("The bridge lockdown test did not pass: " + ((Get-StepProblems $i.Output) -join '; ')) }
        "npm run p2: $(([regex]::Match($s.Output, '\d+ passed')).Value); p2.3: PASS"
    }
    Invoke-Step 'Wiki check' {
        $r = Invoke-Npm -Arguments @('run', 'lint:wiki')
        Save-Output 'wiki-lint.txt' $r
        if ($r.ExitCode -ne 0) { Stop-Fail "The wiki check failed:`n$(Get-Tail $r.Output 8)" }
        (($r.Output -split "`r?`n" | Where-Object { $_ -match '^lint: ' } | Select-Object -Last 1))
    }

    # --- Part 4: your part -------------------------------------------------------------------------------
    Write-Section 'Part 4 - Your part (task p3.13)'
    Add-YourStep 'Your checklist' 'You used the release build with eight or more tabs, every shortcut, an end from Task Manager and a real download, plus the open P2 items and the new feature set (bookmarks, address-bar search, backup, look; docs/testing/manual-checklist-p3.md items 14 to 20), and told Claude the results.'
    Add-YourStep 'Your review' 'You looked at the changed pages and the evidence, and said whether P3 is signed off.'
}
finally { Clear-SharedWikiLint }

Complete-Check -SaveEvidence:$SaveEvidence -EvidencePath "$ev/p3-gate.txt" -WhenPassed 'All automatic P3 checks passed on one commit.' -TellClaude 'P3 gate passed'
