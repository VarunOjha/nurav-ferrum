#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p5.10 (P5 Measurement): Network log: coverage and cost.

.DESCRIPTION
  What it checks : (1) coverage, live with the log on: one tab visits test pages that make each kind of request (a
                   page, its stylesheet, script and image, a frame of another site, a fetch, the same page again, each
                   step of a redirect chain, a request that gets no answer, and a service worker's own script, its own
                   request, a request it answers itself and one it passes on); for each kind the table says whether the
                   log has an entry. The kinds already shown in p5.9 must stay covered; the others are recorded as
                   found. (2) a rough cost trial: the same page loaded 30 times with the log off and 30 times on;
                   page load time and Ferrum's CPU time per load. (3) the component page has the coverage table.
  Why            : Some requests may be missed (embedded frames, redirects, background workers) → test each kind and
                   run a small cost trial → the paper states exactly what the log covers.
  What it changes: nothing. It starts Ferrum three times; it closes by itself (nothing is killed).
  How long       : about 5 minutes (longer the first time, while Rust compiles).
  How to run     : pwsh -NoProfile -File scripts/verify/p5.10-network-log-coverage.ps1   (do not use the PC meanwhile)
  Result         : PASS or FAIL (the line says what).
  Tell Claude    : "p5.10 check passed", or paste the FAIL lines.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers: scripts/lib/Ferrum.Check.psm1).
    -SaveEvidence also writes wiki/raw/evidence/phase-p5-telemetry/netlog-coverage-p5.10.json and
    netlog-cost-p5.10.json.
    Phase-page verify field: Coverage table on comp-network-logger cites the test outputs; overhead pilot raw output
    saved.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p5.10' -Title 'Network log: coverage and cost' -Phase 'phase-p5-telemetry' `
    -Why 'the paper states exactly what the log covers.'

$cargoBin = Join-Path $env:USERPROFILE '.cargo/bin'
if ((Test-Path -LiteralPath $cargoBin) -and ($env:PATH -notlike "*$cargoBin*")) { $env:PATH = "$cargoBin;$env:PATH" }
$script:Coverage = $null
$script:Cost = $null

function Get-JsonLine($Output, [string]$Tag) {
    $line = ($Output -split "`r?`n" | Where-Object { $_ -match "$Tag " } | Select-Object -Last 1)
    if (-not $line) { Stop-Fail "The live run printed no $Tag line." }
    $line.Substring($line.IndexOf("$Tag ") + $Tag.Length + 1) | ConvertFrom-Json
}

Invoke-Step 'Coverage: which kinds of request the log sees (known kinds must stay covered)' {
    $r = Invoke-FerrumSmoke -Spec @('network-log-coverage')
    Add-LogText (Get-Tail $r.Output 20)
    if ($r.ExitCode -ne 0 -or $r.Output -notmatch '1 passed') { Stop-Fail "The live test failed:`n$(Get-Tail $r.Output 30)" }
    $script:Coverage = Get-JsonLine $r.Output 'COVERAGE-JSON'
    $rows = foreach ($x in $script:Coverage.rows) { '{0}: {1}' -f $x.kind, $(if ($x.covered) { 'covered' } else { 'not covered' }) }
    $rows -join "`n"
}

Invoke-Step 'Cost trial: 30 loads with the log off, 30 with it on (rough pilot, no limits)' {
    $r = Invoke-FerrumSmoke -Spec @('network-log-cost')
    Add-LogText (Get-Tail $r.Output 6)
    if ($r.ExitCode -ne 0 -or $r.Output -notmatch '1 passed') { Stop-Fail "The live trial failed:`n$(Get-Tail $r.Output 30)" }
    $script:Cost = Get-JsonLine $r.Output 'NETLOG-COST'
    $rows = foreach ($x in $script:Cost.runs) {
        'log {0}: load {1:0.0} ms median ({2:0.0} to {3:0.0}), Ferrum process {4:0.0} ms CPU per load, all its processes {5:0.0} ms per load' -f `
            $(if ($x.log) { 'on ' } else { 'off' }), $x.load_ms_median, $x.load_ms_min, $x.load_ms_max, $x.host_cpu_ms_per_load, $x.tree_cpu_ms_per_load
    }
    $rows -join "`n"
}

Invoke-Step 'The component page has the coverage table' {
    $t = Read-RepoText 'wiki/architecture/components/comp-network-logger.md'
    if ($t -notmatch '## Coverage and cost \(p5\.10\)') { Stop-Fail 'comp-network-logger has no coverage section.' }
    'comp-network-logger has the coverage and cost section'
}

if ($SaveEvidence -and $script:Coverage -and $script:Cost) {
    [void](Save-Evidence -Path 'wiki/raw/evidence/phase-p5-telemetry/netlog-coverage-p5.10.json' -Text ($script:Coverage | ConvertTo-Json -Depth 6))
    [void](Save-Evidence -Path 'wiki/raw/evidence/phase-p5-telemetry/netlog-cost-p5.10.json' -Text ($script:Cost | ConvertTo-Json -Depth 6))
}
Complete-Check -SaveEvidence:$SaveEvidence
