#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p4.17 (P4 Security): Security settings screen.  DRAFT: not ready until P4.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P4 starts; until then it only lists them and
                   ends NOT READY.
  What it checks : (planned) A block and a grant persist after restart and are enforced; revoking works;
                   websites cannot call these commands.
  Why            : You manage blocked sites and permissions → add them to the settings screen through
                   checked app commands → websites still cannot touch them.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p4.17-security-settings-screen.ps1
  Result         : NOT READY until P4 starts (this is a draft); then PASS or FAIL.
  Tell Claude    : nothing. "Not ready until P4" is the expected result for now.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). The planned command, from the verify field of the phase
                   page:
    Integration test adds a blocklist domain and a camera grant through the settings UI host commands,
    restarts, and asserts both persisted and enforced (blocked navigation logged; grant honoured, then
    revoked); the p2.3 IPC denial test shows remote tabs cannot call these commands.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p4.17' -Title 'Security settings screen' -Phase 'phase-p4-security' `
    -Why 'websites still cannot touch them.'

# TODO(P4): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'A block and a grant persist after restart and are enforced' 'Planned check; written when P4 starts.'
Add-TodoStep 'Revoking works' 'Planned check; written when P4 starts.'
Add-TodoStep 'Websites cannot call these commands' 'Planned check; written when P4 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P4'
