#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p4.1 (P4 Security): Threat model.  DRAFT: not ready until P4.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P4 starts; until then it only lists them and
                   ends NOT READY.
  What it checks : (planned) The security document maps every boundary and threat to a control and a test,
                   or says not enforced.
  Why            : Controls need a reason → list what we protect, who attacks and where trust changes, and
                   map each threat to a control and test, or 'not enforced' → every later task traces to a
                   threat.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p4.1-threat-model.ps1
  Result         : NOT READY until P4 starts (this is a draft); then PASS or FAIL.
  Tell Claude    : nothing. "Not ready until P4" is the expected result for now.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). The planned command, from the verify field of the phase
                   page:
    SECURITY.md and the security quality page list every boundary edge from the component pages (edges
    with crosses_trust_boundary true) and map each threat to a control and a test id or to 'not enforced'.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p4.1' -Title 'Threat model' -Phase 'phase-p4-security' `
    -Why 'every later task traces to a threat.'

# TODO(P4): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'The security document maps every boundary and threat to a control and a test, or says not enforced' 'Planned check; written when P4 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P4'
