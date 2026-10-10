#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p6.1 (P6 Benchmarks): Bare Tauri app to compare against.  DRAFT: not ready until P6.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P6 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) It builds and loads a test page; a version comparison with Ferrum shows only
                   intended differences.
  Why            : We must show what Ferrum adds over plain Tauri → build a minimal app on the same Tauri
                   and WebView2 versions with no Ferrum features → differences can be credited to Ferrum's
                   design.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p6.1-bare-tauri-app.ps1
  Result         : NOT READY = exit 2 until P6; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P6" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    Builds in release; a smoke script loads a fixture page in it; its dependency versions diff against
    Ferrum's shows only intended differences (saved as evidence).
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p6.1' -Title 'Bare Tauri app to compare against' -Phase 'phase-p6-benchmark-harness' `
    -Why 'differences can be credited to Ferrum''s design.'

# TODO(P6): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'It builds and loads a test page' 'Planned check; written when P6 starts.'
Add-TodoStep 'A version comparison with Ferrum shows only intended differences' 'Planned check; written when P6 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P6'
