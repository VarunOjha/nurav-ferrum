#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p4.5 (P4 Security): Permission prompts.  DRAFT: not ready until P4.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P4 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) Each kind is denied by default; a grant works and can be revoked.
  Why            : Camera, microphone, location, notifications and clipboard are sensitive → deny by
                   default, allow per site, never stored inside WebView2 → you control access.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p4.5-permission-prompts.ps1
  Result         : NOT READY = exit 2 until P4; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P4" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    Security tests: fixture requests each permission kind; default deny observed in page script; a
    per-site grant is honoured and revocable.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p4.5' -Title 'Permission prompts' -Phase 'phase-p4-security' `
    -Why 'you control access.'

# TODO(P4): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Each kind is denied by default' 'Planned check; written when P4 starts.'
Add-TodoStep 'A grant works and can be revoked' 'Planned check; written when P4 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P4'
