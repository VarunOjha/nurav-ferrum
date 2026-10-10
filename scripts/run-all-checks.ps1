#Requires -Version 7.0
<#
.SYNOPSIS
  Runs the gate check of one phase: every check that must pass before that phase can end.

.DESCRIPTION
  What it does   : starts scripts/gates/p<N>-gate.ps1 for the phase you name. Each gate runs the check
                   script of every task of its phase, then the phase's test-gate checks, and lists your own
                   manual steps as YOURS. With -List it only shows which gates exist and which are drafts.
  Why            : one command per phase, the same every time → you can re-run any phase's checks yourself
                   and see the same result Claude saw.
  What it changes: nothing, unless you add -SaveEvidence (the gate then saves its printout, masked, under
                   wiki/raw/evidence/<phase>/; Claude commits it).
  How long       : P0 about 5 minutes; P1 about 10 minutes once P1 exists; later phases are drafts (instant).
  How to run     : pwsh -NoProfile -File scripts/run-all-checks.ps1 -Phase P0
                   pwsh -NoProfile -File scripts/run-all-checks.ps1 -List
  Result         : the gate's own exit code: 0 = PASS, 1 = FAIL, 2 = NOT READY (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : the last lines the gate prints tell you what to say; usually "P<N> gate passed" or
                   "P<N> gate failed" with the FAIL lines.

.PARAMETER Phase
  The phase: P0 to P8 (or 0 to 8, or the full id such as phase-p1-foundation).

.PARAMETER SaveEvidence
  Save the gate's printout as masked evidence.

.PARAMETER List
  Only list the gates and their state.
#>
[CmdletBinding(DefaultParameterSetName = 'Run')]
param(
    [Parameter(ParameterSetName = 'Run', Mandatory, Position = 0)][string]$Phase,
    [Parameter(ParameterSetName = 'Run')][switch]$SaveEvidence,
    [Parameter(ParameterSetName = 'List', Mandatory)][switch]$List
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$gates = Join-Path $PSScriptRoot 'gates'

if ($List) {
    Write-Host 'Phase gates (scripts/gates/):' -ForegroundColor Cyan
    foreach ($n in 0..8) {
        $file = Join-Path $gates "p$n-gate.ps1"
        if (-not (Test-Path -LiteralPath $file)) { Write-Host ("  P{0}  missing" -f $n) -ForegroundColor Red; continue }
        $state = if (Select-String -LiteralPath $file -Pattern 'DRAFT: not ready until' -Quiet) { 'draft: not ready until that phase starts' } else { 'real checks' }
        Write-Host ("  P{0}  {1}  ({2})" -f $n, "scripts/gates/p$n-gate.ps1", $state)
    }
    exit 0
}

# Accept P1, p1, 1 or phase-p1-foundation.
if ($Phase -notmatch '^(?:phase-)?[Pp]?([0-8])(?:-.*)?$') {
    Write-Host "Unknown phase '$Phase'. Use P0 to P8, for example: -Phase P1" -ForegroundColor Red
    exit 1
}
$n = $Matches[1]
$gate = Join-Path $gates "p$n-gate.ps1"
if (-not (Test-Path -LiteralPath $gate)) {
    Write-Host "The gate script for P$n is missing ($gate)." -ForegroundColor Red
    exit 1
}

Write-Host "Running the P$n gate: scripts/gates/p$n-gate.ps1" -ForegroundColor Cyan
$pwsh = (Get-Process -Id $PID).Path
$gateArgs = @('-NoProfile', '-File', $gate)
if ($SaveEvidence) { $gateArgs += '-SaveEvidence' }
Push-Location $root
try { & $pwsh @gateArgs; $code = $LASTEXITCODE }
finally { Pop-Location }
exit $code
