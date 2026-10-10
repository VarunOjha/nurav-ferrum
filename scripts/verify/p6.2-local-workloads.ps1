#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p6.2 (P6 Benchmarks): Ten local test workloads.  DRAFT: not ready until P6.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P6 starts; until then it only lists them and
                   ends NOT READY.
  What it checks : (planned) Each workload has its page and an equivalence check; content is identical
                   across two server starts.
  Why            : Results must not depend on live websites → build ten local workloads (simple page,
                   heavy web app, huge page, scrolling, many navigations, video, graphics, several active
                   tabs, many background tabs, close and restore) → every product sees exactly the same
                   content.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p6.2-local-workloads.ps1
  Result         : NOT READY until P6 starts (this is a draft); then PASS or FAIL.
  Tell Claude    : nothing. "Not ready until P6" is the expected result for now.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). The planned command, from the verify field of the phase
                   page:
    Each workload has a wl-* page with status implemented, a fixture_path that exists and an equivalence
    check; a test confirms deterministic content (same content hash across two server starts).
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p6.2' -Title 'Ten local test workloads' -Phase 'phase-p6-benchmark-harness' `
    -Why 'every product sees exactly the same content.'

# TODO(P6): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Each workload has its page and an equivalence check' 'Planned check; written when P6 starts.'
Add-TodoStep 'Content is identical across two server starts' 'Planned check; written when P6 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P6'
