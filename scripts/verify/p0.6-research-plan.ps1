#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p0.6 (P0 Planning): Write the research plan pages.

.DESCRIPTION
  What it checks : research questions, predictions (hypotheses) and experiments link to each other in both
                   directions (rule REF-RECIPROCAL); every experiment compares only the agreed product
                   setups (cfg-...); no prediction claims data and no experiment page states results
                   (rules HYP-NO-DATA, EXP-RESULTS). Number-looking warnings are listed, not failed: they
                   are a rough heuristic and each one was reviewed in the wiki log.
  Why            : Ferrum is also a research project → nothing should be measured without a reason, and
                   no number may appear before an experiment produced it.
  What it changes: nothing. It only reads files (unless you add -SaveEvidence).
  How long       : about 6 seconds (it runs the wiki check of the plan app).
  How to run     : pwsh -NoProfile -File scripts/verify/p0.6-research-plan.ps1
  Result         : PASS = exit 0, FAIL = exit 1, NOT READY = exit 2 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p0.6 check failed".
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p0.6' -Title 'Write the research plan pages' -Phase 'phase-p0-planning' `
    -Why 'nothing is measured without a reason, and no number appears before data exists.'

Invoke-Step 'Experiments compare only the agreed product setups' {
    $exps = @(Get-ChildItem -LiteralPath (Get-RepoPath 'wiki/research/experiments') -Filter 'exp-*.md')
    foreach ($e in $exps) {
        $t = (Read-RepoText "wiki/research/experiments/$($e.Name)") -replace "`r`n", "`n"
        $m = [regex]::Match($t, '(?m)^configurations:\n((?:  - .+\n)+)')
        if (-not $m.Success) { Stop-Fail "$($e.Name) lists no product setups (configurations)." }
        $bad = @([regex]::Matches($m.Groups[1].Value, '  - (\S+)') | ForEach-Object { $_.Groups[1].Value } | Where-Object { $_ -notmatch '^cfg-' })
        if ($bad.Count) { Stop-Fail "$($e.Name) names setups that are not cfg-...: $($bad -join ', ')." }
    }
    "$($exps.Count) experiments"
}

Invoke-Step 'Wiki check: links agree both ways, no data claimed' {
    $lint = Get-WikiLint
    Assert-NoLintErrors -Report $lint -Codes 'REF-RECIPROCAL', 'HYP-NO-DATA'
    $res = Get-LintFindings -Report $lint -Codes 'EXP-RESULTS'
    if ($res.Count) { Stop-Fail ("An experiment page states results:`n" + (($res | ForEach-Object { "$($_.path): $($_.message)" }) -join "`n")) }
    $n = (Get-LintFindings -Report $lint -Codes 'INT-NUMBER-NOSRC').Count
    "REF-RECIPROCAL, HYP-NO-DATA, EXP-RESULTS: none; $n number-looking warning(s), reviewed in the wiki log"
}

Complete-Check -SaveEvidence:$SaveEvidence
