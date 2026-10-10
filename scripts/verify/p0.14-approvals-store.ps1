#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p0.14 (P0 Planning): Build the approvals store.

.DESCRIPTION
  What it checks : the tests for approval states (pending, approved, approved with only bookkeeping
                   changes, outdated, changes requested, rejected, invalid), for reading the approvals file
                   and for the request gate all pass; the browser security tests show that requests from
                   other computers or other websites are refused and that the portal accepts reads only.
                   Since approvals are given in Claude Code, Claude records them with a small recorder
                   program, so its tests run too. (The app's own approvals store and its write API were removed with the
                   read-only portal in task p0.17, 2026-10-09.)
  Why            : approvals must not be lost or forged → every state is tested, only Claude's recorder
                   writes them, and only this computer can reach the portal.
  What it changes: nothing in the repo. Tests use temporary copies; browser tests write ignored folders only.
  How long       : about 1 minute.
  How to run     : pwsh -NoProfile -File scripts/verify/p0.14-approvals-store.ps1
                   (close any plan app you started yourself first: the tests use port 3418)
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p0.14 check failed".
  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). Recorder: tools/approvals_record.py (adr-0023).
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p0.14' -Title 'Build the approvals store' -Phase 'phase-p0-planning' `
    -Why 'approvals must not be lost or forged.'

Invoke-Step 'Approval state, approvals-file and request-gate tests pass' {
    $r = Assert-NpmScript 'test' -Extra @('tests/unit/state.test.ts', 'tests/unit/approvals-file.test.ts', 'tests/unit/security.test.ts')
    $line = ($r.Output -split "`r?`n" | Where-Object { $_ -match '^\s+Tests\s' } | Select-Object -Last 1)
    "unit tests: $($line.Trim())"
}

Invoke-Step "Claude's approval recorder and checker pass their tests" {
    $r = Invoke-Native -FilePath 'python' -ArgumentList @('-m', 'unittest', 'tools/test_approvals_record.py', 'tools/test_approvals_check.py')
    if ($r.ExitCode -ne 0) { Stop-Fail "Python tests failed:`n$(Get-Tail $r.Output 8)" }
    ($r.Output -split "`r?`n" | Where-Object { $_ -match '^Ran \d+ tests' } | Select-Object -Last 1)
}

Invoke-Step 'Requests from other computers and websites are refused' {
    $r = Assert-NpmScript 'test:e2e' -Extra @('security.spec')
    $line = ($r.Output -split "`r?`n" | Where-Object { $_ -match '^\s+\d+ passed' } | Select-Object -Last 1)
    "browser security tests: $($line.Trim())"
}

Complete-Check -SaveEvidence:$SaveEvidence
