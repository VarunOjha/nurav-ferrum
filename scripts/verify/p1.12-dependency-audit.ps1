#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p1.12 (P1 Foundation): Check dependency licences and alerts.

.DESCRIPTION
  What it checks : the licence and alert rules file (deny.toml) exists; the exact-version lock files
                   (Cargo.lock and interactive_plan/package-lock.json) are committed; the licence and security
                   alert check (cargo deny check) passes; the plan app's security audit (npm audit) was saved
                   with each finding explained (npm-audit.txt).
  Why            : third-party code can carry unsuitable licences or known security holes → we only use what we
                   may and should.
  What it changes: nothing in the repo. cargo-deny may download the public security alert list.
  How long       : about 30 seconds.
  How to run     : pwsh -NoProfile -File scripts/verify/p1.12-dependency-audit.ps1
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p1.12 check failed".
  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1).
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p1.12' -Title 'Check dependency licences and alerts' -Phase 'phase-p1-foundation' `
    -Why 'we only use third-party code we may use and that has no known holes.'

Invoke-Step 'Licence and alert rules file exists' { [void](Assert-RepoFile 'deny.toml' 'The licence and alert rules file'); 'deny.toml' }

Invoke-Step 'Lock files are committed' {
    $missing = @(foreach ($f in 'Cargo.lock', 'interactive_plan/package-lock.json') {
        $r = Invoke-Native -FilePath 'git' -ArgumentList @('ls-files', '--error-unmatch', $f)
        if ($r.ExitCode -ne 0) { $f }
    })
    if ($missing.Count) { Stop-Fail "Not committed: $($missing -join ', ')." }
    'Cargo.lock, interactive_plan/package-lock.json'
}

Invoke-Step 'Licence and security alert check passes' {
    $r = Assert-Cargo @('deny', 'check')
    (Get-Tail $r.Output 1)
}

Invoke-Step 'Plan-app security audit saved, findings explained' {
    [void](Assert-RepoFile 'wiki/raw/evidence/phase-p1-foundation/npm-audit.txt' 'The saved plan-app audit (npm-audit.txt)')
    'npm-audit.txt'
}

Complete-Check -SaveEvidence:$SaveEvidence
