#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p5.2 (P5 Measurement): Count only Ferrum's own processes.  DRAFT: not ready until P5.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P5 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) A test runs Ferrum next to another WebView2 app: every Ferrum process is
                   counted, none of the other app's.
  Why            : Other apps on the PC also use WebView2 → find Ferrum's processes through Ferrum's own
                   WebView2 setup, never by program name → other apps' memory never leaks into Ferrum's
                   numbers.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p5.2-count-ferrum-processes.ps1
  Result         : NOT READY = exit 2 until P5; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P5" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    Integration test runs Ferrum alongside another WebView2 host (the S1 spike app) and asserts the other
    host's PIDs are excluded and every Ferrum WebView2 PID is included (cross-checked with a process
    snapshot).
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p5.2' -Title 'Count only Ferrum''s own processes' -Phase 'phase-p5-telemetry' `
    -Why 'other apps'' memory never leaks into Ferrum''s numbers.'

# TODO(P5): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'A test runs Ferrum next to another WebView2 app: every Ferrum process is counted, none of the other app''s' 'Planned check; written when P5 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P5'
