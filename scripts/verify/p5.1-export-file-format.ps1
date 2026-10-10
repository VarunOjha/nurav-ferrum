#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p5.1 (P5 Measurement): Export file format and run labels.  DRAFT: not ready until P5.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P5 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) Each record type saves and reloads unchanged; a checker accepts good files
                   and rejects a damaged one.
  Why            : Every later result is read from files → define one versioned format (plain data files)
                   that labels each run with code version, Windows build, WebView2 version and settings →
                   any number can be traced to the exact setup that made it.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p5.1-export-file-format.ps1
  Result         : NOT READY = exit 2 until P5; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P5" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    Unit tests: every record type round-trips; a schema validator (Rust test or Python script) accepts
    generated files and rejects a corrupted fixture.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p5.1' -Title 'Export file format and run labels' -Phase 'phase-p5-telemetry' `
    -Why 'any number can be traced to the exact setup that made it.'

# TODO(P5): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Each record type saves and reloads unchanged' 'Planned check; written when P5 starts.'
Add-TodoStep 'A checker accepts good files and rejects a damaged one' 'Planned check; written when P5 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P5'
