#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p4.2 (P4 Security): Rules engine.  DRAFT: not ready until P4.

.DESCRIPTION
  Status         : DRAFT. Its real checks are written when P4 starts; until then it only lists them and
                   ends NOT READY (exit 2).
  What it checks : (planned) Tests per rule plus random inputs; every decision branch covered (report
                   saved).
  Why            : Navigation needs one decision point → plain Rust rules: block and allow lists, HTTPS
                   upgrade, ask for other link types, deny anything unreadable → safe by default, every
                   decision explained.
  What it changes: nothing.
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/verify/p4.2-rules-engine.ps1
  Result         : NOT READY = exit 2 until P4; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P4" is the expected result for now.

  For Claude - the planned command, from the verify field of the phase page:
    Table-driven unit tests per rule (including allowlist override of a blocklist suffix rule,
    equal-specificity block, and allowlist-only mode denying a non-listed HTTPS host) plus randomised
    input tests (no panic, unparseable input always denied); 100 percent of decision branches covered by
    tests (coverage report saved).
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p4.2' -Title 'Rules engine' -Phase 'phase-p4-security' `
    -Why 'safe by default, every decision explained.'

# TODO(P4): replace each planned step below with an Invoke-Step that really checks it.
Add-TodoStep 'Tests per rule plus random inputs' 'Planned check; written when P4 starts.'
Add-TodoStep 'Every decision branch covered (report saved)' 'Planned check; written when P4 starts.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P4'
