#Requires -Version 7.0
<#
.SYNOPSIS
  Gate check for phase P4 (Security): what must be true before P4 can end.

.DESCRIPTION
  What it checks : (1) your approvals for P4 are current; (2) every P4 task check passes; (3) the test gate on one
                   commit: formatting and code warnings, Rust tests, licences and alerts, rules coverage, the security
                   suite, earlier tests again (P3 suite, P2 app tests, bridge lockdown), shell checks, a release build,
                   the no-security switch absent from it, the isolation modes, the wiki check; (4) your part (YOURS).
  Why            : Security claims need proof → attack-style tests try the known bypasses, every rule branch is
                   covered, and the release build is scanned → you accept the 'not enforced' list → only then does P5
                   start.
  What it changes: nothing in the repo; builds in target/debug, target/gate-release, target/security-static,
                   target/p4.16 and target/bench, never in target/release (where your own Ferrum may run). With
                   -SaveEvidence each test-gate row is saved as its own masked evidence file.
  How long       : about an hour. Leave the PC alone: some tests press real keys and need Ferrum in front.
                   Needs internet for Microsoft's SmartScreen demo page.
  How to run     : pwsh -NoProfile -File scripts/gates/p4-gate.ps1
  Result         : PASS, FAIL (the line says what) or NOT READY (waiting on something, the line says what).
  Tell Claude    : "P4 gate passed", or paste the FAIL or WAIT lines.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers: scripts/lib/Ferrum.Check.psm1).
    scripts/run-all-checks.ps1 -Phase P4 starts this same script. Test-gate items of the phase page:
    - cargo fmt --all -- --check; cargo clippy --workspace --all-targets -- -D warnings; cargo test --workspace;
      cargo deny check; policy engine coverage (p4.2); security suite (p4.11); P3 integration suite, P2 smoke suite and
      IPC denial test (regression); apps/desktop npm run lint, typecheck, test; Tauri release build; release build
      security-static check (p4.16); isolation-mode integration test (p4.15); npm run lint:wiki.
    The p4.2, p4.15 and p4.16 checks run in part 3 with -SaveEvidence (they write their own evidence files); p4.11 is the
    security suite of part 3; p4.14 is this gate. The wiki check has one known error (a raw-file history edit in commit
    ff7292e, removed by the history cleanup the owner has to approve, Q-221): that error alone gives WAIT, not PASS.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'P4-gate' -Title 'Security: end-of-phase gate' -Phase 'phase-p4-security' `
    -Why 'only a passing gate and your approval let the next phase start.'

$ev = 'wiki/raw/evidence/phase-p4-security'
$cargoBin = Join-Path $env:USERPROFILE '.cargo/bin'
if ((Test-Path -LiteralPath $cargoBin) -and ($env:PATH -notlike "*$cargoBin*")) { $env:PATH = "$cargoBin;$env:PATH" }

# Saves one command's output as its own evidence file when -SaveEvidence is given.
function Save-Output([string]$Name, $Result) {
    if ($SaveEvidence -and $Result) {
        $text = "Command output saved by scripts/gates/p4-gate.ps1 on $(Get-Date -Format 'yyyy-MM-dd HH:mm') at commit $(Get-GitCommit)`nExit code: $($Result.ExitCode)`n`n$($Result.Output)"
        Write-Note ("saved " + (Save-Evidence -Path "$ev/$Name" -Text $text))
    }
}
# Runs a task check with -SaveEvidence (when the gate saves evidence) and turns its result into this step's result.
function Invoke-TaskCheckWithEvidence([string]$Script) {
    $r = Invoke-ChildScript $Script -ArgumentList $(if ($SaveEvidence) { @('-SaveEvidence') } else { @() })
    Add-LogText ("    --- output of {0} (exit {1}) ---`n{2}`n    --- end of {0} ---" -f $Script, $r.ExitCode, $r.Output)
    $bad = Get-StepProblems $r.Output
    switch ($r.ExitCode) {
        0 { return (($r.Output -split "`r?`n" | Where-Object { $_ -match '^RESULT: ' } | Select-Object -Last 1)) }
        2 { Stop-Wait ("Waiting on: " + ($bad -join '; ')) }
        default { Stop-Fail ("Failed at: " + ($bad -join '; ') + "  (details: $Script)") }
    }
}

try {
    # --- Part 1: approvals ---------------------------------------------------------------------------------
    Write-Section 'Part 1 - Your approvals for P4 are current'
    Invoke-Step 'Approvals for P4 recorded and current; no question blocks it' {
        $r = Invoke-Native -FilePath 'python' -ArgumentList @('tools/approvals_check.py', '--gate', 'phase-p4-security')
        Add-LogText $r.Output
        $line = ($r.Output -split "`r?`n" | Where-Object { $_ -match '^ENTRY GATE:' } | Select-Object -Last 1)
        if ($line -match 'PASS') { return 'all P4 approvals current' }
        Stop-Wait "Some P4 pages changed during the phase and need your new look ($($line -replace '^ENTRY GATE: BLOCKED by ', ''))."
    }

    # --- Part 2: every task check ------------------------------------------------------------------------
    Write-Section 'Part 2 - Every P4 task, checked'
    Invoke-TaskChecks -Phase 'phase-p4-security' -Skip 'p4.2', 'p4.11', 'p4.14', 'p4.15', 'p4.16'

    # --- Part 3: the test-gate rows, on this one commit ----------------------------------------------------
    Write-Section 'Part 3 - Test gate on one commit'
    Invoke-Step 'Formatting and code warnings' {
        $f = Assert-Cargo @('fmt', '--all', '--', '--check'); Save-Output 'cargo-fmt.txt' $f
        $c = Assert-Cargo @('clippy', '--workspace', '--all-targets', '--locked', '--', '-D', 'warnings'); Save-Output 'cargo-clippy.txt' $c
        'cargo fmt --check and cargo clippy -D warnings: exit 0'
    }
    Invoke-Step 'Rust tests' { $t = Assert-Cargo @('test', '--workspace', '--locked'); Save-Output 'cargo-test.txt' $t; 'cargo test --workspace: exit 0' }
    Invoke-Step 'Licences and alerts' { $d = Assert-Cargo @('deny', 'check'); Save-Output 'cargo-deny.txt' $d; 'cargo deny check: exit 0' }
    Invoke-Step 'Rules coverage (task p4.2 check, coverage report saved)' { Invoke-TaskCheckWithEvidence 'scripts/verify/p4.2-rules-engine.ps1' }
    Invoke-Step 'Security suite (items 1 to 10; result saved)' {
        $r = Invoke-ChildScript 'scripts/security-suite.ps1' -ArgumentList $(if ($SaveEvidence) { @('-SaveEvidence') } else { @() })
        Add-LogText (($r.Output -split "`r?`n" | Where-Object { $_ -match '^\s+(PASS|FAIL|WAIT)|^RESULT|Evidence saved' }) -join "`n")
        if ($r.ExitCode -ne 0) { Stop-Fail ("The security suite did not pass: " + ((Get-StepProblems $r.Output) -join '; ')) }
        ($r.Output -split "`r?`n" | Where-Object { $_ -match '^RESULT' } | Select-Object -First 1)
    }
    Invoke-Step 'Earlier tests again: P3 suite (npm run p3), P2 app tests (npm run p2), bridge lockdown (p2.3)' {
        $pkg = Read-RepoText 'apps/desktop/tests/smoke/package.json' | ConvertFrom-Json
        $p3 = Invoke-FerrumSmoke -Spec @($pkg.scripts.p3 -split '\s+' | Where-Object { $_ -like '*.spec' })
        $p2 = Invoke-FerrumSmoke -Spec @($pkg.scripts.p2 -split '\s+' | Where-Object { $_ -like '*.spec' })
        $i = Invoke-ChildScript 'scripts/verify/p2.3-lock-bridge-app.ps1'
        Save-Output 'regression.txt' ([pscustomobject]@{
                ExitCode = [int]($p3.ExitCode -ne 0 -or $p2.ExitCode -ne 0 -or $i.ExitCode -ne 0)
                Output   = "### npm run p3 (exit $($p3.ExitCode))`n$($p3.Output)`n`n### npm run p2 (exit $($p2.ExitCode))`n$($p2.Output)`n`n### scripts/verify/p2.3-lock-bridge-app.ps1 (exit $($i.ExitCode))`n$($i.Output)"
            })
        if ($p3.Output -match 'was not the active window') { Stop-Wait 'Ferrum was not the active window when keys were due; run the gate again without using the PC meanwhile.' }
        if ($p3.ExitCode -ne 0 -or $p3.Output -match '\d+ failed') { Stop-Fail "The P3 suite failed:`n$(Get-Tail $p3.Output 12)" }
        if ($p2.ExitCode -ne 0 -or $p2.Output -match '\d+ failed') { Stop-Fail "The P2 app tests failed:`n$(Get-Tail $p2.Output 12)" }
        if ($i.ExitCode -ne 0) { Stop-Fail ("The bridge lockdown test did not pass: " + ((Get-StepProblems $i.Output) -join '; ')) }
        "npm run p3: $(([regex]::Match($p3.Output, '\d+ passed')).Value); npm run p2: $(([regex]::Match($p2.Output, '\d+ passed')).Value); p2.3: PASS"
    }
    Invoke-Step 'Shell checks (lint, types, unit tests)' {
        $out = foreach ($s in 'lint', 'typecheck', 'test') {
            $r = Assert-NpmScript $s -Folder 'apps/desktop'
            "### npm run $s (exit $($r.ExitCode))`n$($r.Output)"
        }
        Save-Output 'shell-tests.txt' ([pscustomobject]@{ ExitCode = 0; Output = ($out -join "`n`n") })
        'npm run lint, typecheck, test: exit 0'
    }
    Invoke-Step 'Release build (own folder target/gate-release; target/release is not touched)' {
        $mine = Get-RepoPath 'target/release/ferrum-desktop.exe'
        $before = if (Test-Path -LiteralPath $mine) { (Get-Item -LiteralPath $mine).LastWriteTimeUtc } else { $null }
        [void](Assert-NpmScript 'build' -Folder 'apps/desktop')
        $r = Invoke-Npm -Arguments @('run', 'tauri', '--', 'build', '--no-bundle') -Folder 'apps/desktop' `
            -Environment @{ CARGO_TARGET_DIR = (Get-RepoPath 'target/gate-release') }
        Save-Output 'release-build.txt' $r
        if ($r.ExitCode -ne 0) { Stop-Fail "The release build failed:`n$(Get-Tail $r.Output 10)" }
        $exe = Get-RepoPath 'target/gate-release/release/ferrum-desktop.exe'
        if (-not (Test-Path -LiteralPath $exe)) { Stop-Fail "The release program is not in target/gate-release:`n$(Get-Tail $r.Output 6)" }
        $after = if (Test-Path -LiteralPath $mine) { (Get-Item -LiteralPath $mine).LastWriteTimeUtc } else { $null }
        if ($before -ne $after) { Stop-Fail 'target/release/ferrum-desktop.exe changed during the gate: the build used the wrong folder.' }
        'npm run tauri -- build --no-bundle: exit 0 (target/gate-release/release/ferrum-desktop.exe; target/release unchanged)'
    }
    Invoke-Step 'No-security switch absent from the release build (task p4.16 check, result saved)' { Invoke-TaskCheckWithEvidence 'scripts/verify/p4.16-no-security-switch.ps1' }
    Invoke-Step 'Isolation modes (task p4.15 check, result saved)' { Invoke-TaskCheckWithEvidence 'scripts/verify/p4.15-selectable-isolation-modes.ps1' }
    Invoke-Step 'Wiki check' {
        $r = Invoke-Npm -Arguments @('run', 'lint:wiki')
        Save-Output 'wiki-lint.txt' $r
        if ($r.ExitCode -eq 0) { return (($r.Output -split "`r?`n" | Where-Object { $_ -match '^lint: ' } | Select-Object -Last 1)) }
        $errors = @($r.Output -split "`r?`n" | Where-Object { $_ -match '^ERROR ' } | Sort-Object -Unique)
        $known = '^ERROR RAW-IMMUTABLE wiki/raw/MANIFEST\.sha256\s+commit ff7292e '
        if ($errors.Count -eq 1 -and $errors[0] -match $known) {
            Stop-Wait 'Only the known wiki error remains (commit ff7292e changed MANIFEST.sha256; removed by the history cleanup you approve before the first upload, question Q-221).'
        }
        Stop-Fail "The wiki check failed:`n$(($errors | Select-Object -First 10) -join "`n")"
    }

    # --- Part 4: your part -------------------------------------------------------------------------------
    Write-Section 'Part 4 - Your part (your review)'
    Add-YourStep 'Your checks' 'You read the threat model and the "not enforced" list in SECURITY.md, blocked a site in Settings (also through a link from another site), saw Ferrum''s question for a camera or location request on a real site (Never allow refuses, Allow this time works), and kept a downloaded program through Microsoft''s pop-up (docs/testing/manual-checklist-p4.md).'
    Add-YourStep 'Your review' 'You looked at the changed pages and the evidence, and said whether P4 is signed off.'
}
finally { Clear-SharedWikiLint }

Complete-Check -SaveEvidence:$SaveEvidence -EvidencePath "$ev/p4-gate.txt" -WhenPassed 'All automatic P4 checks passed on one commit.' -TellClaude 'P4 gate passed'
