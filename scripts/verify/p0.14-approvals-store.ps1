#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p0.14 (P0 Planning): Build the approvals store.

.DESCRIPTION
  What it checks : the plan app's tests for approval states (pending, approved, approved with only
                   bookkeeping changes, outdated, changes requested, rejected, invalid), for safe writes of
                   the approvals file and for the request guard all pass; the browser security tests show
                   that requests from other computers or other websites are refused. Since adr-0023 Claude
                   records approvals with tools/approvals_record.py, so that tool's tests run too.
  Why            : approvals must not be lost or forged → every state is tested and only this computer
                   can reach the store.
  What it changes: nothing in the repo. Tests use temporary copies; browser tests write ignored folders only.
  How long       : about 1 minute.
  How to run     : pwsh -NoProfile -File scripts/verify/p0.14-approvals-store.ps1
                   (close any plan app you started yourself first: the tests use ports 3418-3420)
  Result         : PASS = exit 0, FAIL = exit 1, NOT READY = exit 2 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p0.14 check failed".
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p0.14' -Title 'Build the approvals store' -Phase 'phase-p0-planning' `
    -Why 'approvals must not be lost or forged.'

Invoke-Step 'Approval state, store and guard tests pass' {
    $r = Assert-NpmScript 'test' -Extra @('tests/unit/state.test.ts', 'tests/unit/store.test.ts', 'tests/unit/route.test.ts', 'tests/unit/guard.test.ts', 'tests/unit/security.test.ts')
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
