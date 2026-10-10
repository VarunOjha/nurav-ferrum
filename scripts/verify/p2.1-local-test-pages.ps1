#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p2.1 (P2 First working app): Build local test pages.  DRAFT: not ready until P2.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P2 starts; until then it only lists them and
                   ends NOT READY.
  What it checks : (planned) Server tests pass; each test page returns its documented status.
  Why            : Real websites change → a local server with fixed pages (redirects, pop-ups, cookies,
                   slow and error pages) → navigation tests give the same answer every run.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p2.1-local-test-pages.ps1
  Result         : NOT READY until P2 starts (this is a draft); then PASS or FAIL.
  Tell Claude    : nothing. "Not ready until P2" is the expected result for now.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). The planned command, from the verify field of the phase
                   page:
    The fixture server is a Rust crate at tests/fixtures/server (axum or hyper; exact version pinned at P2
    start, UNVERIFIED[phase-p2-minimal-container]); 'cargo test --locked -p fixture-server' passes; each
    fixture URL returns the documented status code (curl -sI output saved). P6 workloads may reuse this
    server.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p2.1' -Title 'Build local test pages' -Phase 'phase-p2-minimal-container' `
    -Why 'navigation tests give the same answer every run.'

# TODO(P2): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Server tests pass' 'Planned check; written when P2 starts.'
Add-TodoStep 'Each test page returns its documented status' 'Planned check; written when P2 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P2'
