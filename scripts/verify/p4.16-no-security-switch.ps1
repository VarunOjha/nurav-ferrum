#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p4.16 (P4 Security): Benchmark-only 'no security' switch.  DRAFT: not ready until P4.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P4 starts; until then it only lists them and
                   ends NOT READY.
  What it checks : (planned) With the switch everything is allowed; the release build is scanned and the
                   switch is absent.
  Why            : Measuring security's cost needs a version without it → a build-time switch for local
                   test pages only, proven absent from release builds → no risk of shipping it.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p4.16-no-security-switch.ps1
  Result         : NOT READY until P4 starts (this is a draft); then PASS or FAIL.
  Tell Claude    : nothing. "Not ready until P4" is the expected result for now.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). The planned command, from the verify field of the phase
                   page:
    Unit test under the feature asserts allow-all; a CI security-static check builds the release profile
    and proves the feature and its symbols are absent (feature list of the release build plus a
    string/symbol scan of the binary), output saved to
    raw/evidence/phase-p4-security/nosecurity-absent.txt; the build refuses to start the ablation binary
    without an explicit benchmark-mode argument.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p4.16' -Title 'Benchmark-only ''no security'' switch' -Phase 'phase-p4-security' `
    -Why 'no risk of shipping it.'

# TODO(P4): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'With the switch everything is allowed' 'Planned check; written when P4 starts.'
Add-TodoStep 'The release build is scanned and the switch is absent' 'Planned check; written when P4 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P4'
