#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p4.11 (P4 Security): One security test suite.  DRAFT: not ready until P4.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P4 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) The suite passes, including allowlist cases; the mapping table is published.
  Why            : Your brief lists ten security tests → one suite mapping each to a test, kept apart from
                   speed tests → coverage is visible.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p4.11-security-test-suite.ps1
  Result         : NOT READY = exit 2 until P4; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P4" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    One command runs the suite and exits 0; the suite includes the allowlist cases (override of a
    blocklist rule, allowlist-only mode denying a non-listed host); a mapping table (item to test id) is
    on the security quality page.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p4.11' -Title 'One security test suite' -Phase 'phase-p4-security' `
    -Why 'coverage is visible.'

# TODO(P4): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'The suite passes, including allowlist cases' 'Planned check; written when P4 starts.'
Add-TodoStep 'The mapping table is published' 'Planned check; written when P4 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P4'
