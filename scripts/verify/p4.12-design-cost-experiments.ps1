#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p4.12 (P4 Security): overhead experiment designs and the microbenchmark harness.

.DESCRIPTION
  What it checks : (1) the microbenchmark harness builds and runs (a short run in its own build folder) and prints one
                   CSV line per batch for every case; (2) the saved harness run exists and says it is not a result;
                   (3) both experiment pages (security cost, isolation cost) name their workloads, metrics and
                   analysis plan, describe what P4 built for them, and state no measured result.
  Why            : P6 measures what security and isolation cost → the experiments and the timing tool are fixed now →
                   the measurements later follow a plan written before any data exists.
  What it changes: nothing in the repo (builds in target/bench, never target/release).
  How long       : about two minutes (an optimised build, then a few seconds of timing).
  How to run     : pwsh -NoProfile -File scripts/verify/p4.12-design-cost-experiments.ps1
  Result         : PASS (every checked step is fine) or FAIL (the line says what).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p4.12 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers: scripts/lib/Ferrum.Check.psm1).
    Phase-page verify field: Microbenchmarks run and save raw output as evidence of harness operation only (no
    claims); experiment pages updated with workloads, metrics and analysis plan; owner approves them (recorded in
    plan/approvals.json after this check, not by it).
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p4.12' -Title 'Overhead experiment designs and the microbenchmark harness' -Phase 'phase-p4-security' `
    -Why 'the measurements later follow a plan written before any data exists.'

$cargoBin = Join-Path $env:USERPROFILE '.cargo/bin'
if ((Test-Path -LiteralPath $cargoBin) -and ($env:PATH -notlike "*$cargoBin*")) { $env:PATH = "$cargoBin;$env:PATH" }

Invoke-Step 'The harness builds and runs (short run, own build folder)' {
    $r = Assert-Cargo @('run', '--release', '--locked', '-p', 'ferrum-security', '--example', 'microbench', '--target-dir', 'target/bench', '--', '--batches', '2', '--iters', '1000')
    $rows = @($r.Output -split "`r?`n" | Where-Object { $_ -match '^(navigation|permission),' })
    # 5 addresses x 3 rule-list sizes + 2 sites x 3 grant-list sizes = 21 cases, 2 batches each.
    if ($rows.Count -ne 42) { Stop-Fail "Expected 42 batch lines (21 cases x 2), got $($rows.Count):`n$(Get-Tail $r.Output 10)" }
    if ($r.Output -notmatch 'harness operation only, not a result') { Stop-Fail 'The harness does not say its output is not a result.' }
    '21 cases x 2 batches printed as CSV'
}

Invoke-Step 'The saved harness run exists and is marked "not a result"' {
    $f = 'wiki/raw/evidence/phase-p4-security/microbench-harness-run.txt'
    Assert-RepoFile $f
    $t = Read-RepoText $f
    if ($t -notmatch 'NOT a measurement result') { Stop-Fail "$f is not marked as harness operation only." }
    $n = @($t -split "`n" | Where-Object { $_ -match '^(navigation|permission),' }).Count
    "$n batch lines; marked as evidence of harness operation only"
}

Invoke-Step 'Both experiment pages: workloads, metrics, analysis plan, what P4 built; no results' {
    foreach ($p in 'wiki/research/experiments/exp-security-overhead.md', 'wiki/research/experiments/exp-isolation-overhead.md') {
        $fm = Get-Frontmatter $p
        $text = (Read-RepoText $p) -replace "`r`n", "`n"
        # Lists (workloads, metrics, configurations) need at least one entry; the analysis plan needs text.
        foreach ($k in 'workloads', 'metrics', 'configurations') {
            if ($text -notmatch "(?m)^${k}:\n  - \S") { Stop-Fail "$p has no $k listed." }
        }
        if (-not $fm.Contains('analysis') -or -not $fm['analysis']) { Stop-Fail "$p has no analysis plan." }
        if ($fm['status'] -ne 'designed') { Stop-Fail "$p status is '$($fm['status'])', expected 'designed' (no runs before P6)." }
        if ($fm.Contains('results_ref')) { Stop-Fail "$p has results_ref: no results may exist before P6." }
        $t = Read-RepoText $p
        if ($t -notmatch '\(built in p4\.12\)|What P4 built for it') { Stop-Fail "$p does not describe what P4 built for it." }
    }
    'exp-security-overhead and exp-isolation-overhead: designed, no results, P4 parts described'
}

Complete-Check -SaveEvidence:$SaveEvidence
