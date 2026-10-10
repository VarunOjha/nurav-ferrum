#Requires -Version 7.0
<#
.SYNOPSIS
  Gate check for phase P8 (Research paper): what must be true before P8 can end.  DRAFT: not ready until P8.

.DESCRIPTION
  Status         : DRAFT. The real gate is written when P8 starts; until then it only lists the planned
                   checks and ends NOT READY (exit 2).
  What it checks : (planned) every task check of P8, then: Statistics tests; Same input, same output;
                   Paper builds; Numbers from scripts; Citation check; Traceability table; Wiki check.
                   Your own checks are listed as YOURS.
  Why            : Analysis tests pass and a rerun gives identical output → the paper builds → every
                   number comes from a script → every citation checks out → every conclusion traces to
                   data → you read the whole paper and approve.
  What it changes: nothing (once real, -SaveEvidence saves the printout as masked evidence).
  How long       : under a second while it is a draft.
  How to run     : pwsh -NoProfile -File scripts/run-all-checks.ps1 -Phase P8
  Result         : NOT READY = exit 2 until P8; then PASS = 0, FAIL = 1 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing. "Not ready until P8" is the expected result for now.

  For Claude - the planned automatic gate items, from the test_gate of the phase page:
    - analysis: pytest
    - Analysis rerun determinism check (p8.2)
    - Manuscript build (latexmk or chosen command)
    - Numeric provenance check (p8.3)
    - Citation verification script (p8.8)
    - Traceability matrix completeness check (p8.4)
    - cd interactive_plan && npm run lint:wiki
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'P8-gate' -Title 'Research paper: end-of-phase gate' -Phase 'phase-p8-research-paper' `
    -Why 'only a passing gate and your approval let the next phase start.'

# TODO(P8): run every task script of P8 with Invoke-ChildScript, then turn each row into an Invoke-Step.
Add-TodoStep 'Every task check of P8 passes' 'Planned: runs each scripts/verify/p8.*.ps1 in turn.'
Add-TodoStep 'Statistics tests' 'Planned: The analysis code passes its tests.'
Add-TodoStep 'Same input, same output' 'Planned: Rerunning the analysis gives byte-identical results.'
Add-TodoStep 'Paper builds' 'Planned: The manuscript compiles to a PDF without errors.'
Add-TodoStep 'Numbers from scripts' 'Planned: No result in the paper was typed by hand.'
Add-TodoStep 'Citation check' 'Planned: Every reference is verified; none is banned.'
Add-TodoStep 'Traceability table' 'Planned: Every conclusion links back to its raw data.'
Add-TodoStep 'Wiki check' 'Planned: The plan pages are consistent and have no broken links.'
Add-YourStep 'Your full read' 'You stand behind every claim as a human author.'
Add-YourStep 'Your limits review' 'You checked the limitations and the failed experiments.'
Add-YourStep 'Your sign-off' 'You approved the AI-use statement and the reproduction guide.'

Complete-Check -SaveEvidence:$SaveEvidence -NotReadyUntil 'P8'
