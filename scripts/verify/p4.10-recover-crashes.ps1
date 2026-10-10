#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p4.10 (P4 Security): Recover from crashes.  DRAFT: not ready until P4.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P4 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) A deliberate crash shows the crashed state; reload works; the shell stays
                   responsive.
  Why            : Page processes crash → show a crashed tab, allow reload, keep the shell alive → one bad
                   site cannot take Ferrum down.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p4.10-recover-crashes.ps1
  Result         : NOT READY = exit 2 until P4; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P4" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    Test deliberately crashes a tab renderer (method from spike S3) and asserts the crashed state, then
    reload succeeds; shell stays responsive.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p4.10' -Title 'Recover from crashes' -Phase 'phase-p4-security' `
    -Why 'one bad site cannot take Ferrum down.'

# TODO(P4): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'A deliberate crash shows the crashed state' 'Planned check; written when P4 starts.'
Add-TodoStep 'Reload works' 'Planned check; written when P4 starts.'
Add-TodoStep 'The shell stays responsive' 'Planned check; written when P4 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P4'
