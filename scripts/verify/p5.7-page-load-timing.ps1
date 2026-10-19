#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p5.7 (P5 Measurement): Navigation timing.

.DESCRIPTION
  What it checks : (1) the rules that turn one page load into a record: redirect hops counted, same or other site
                   than the page before, times in order, a stale or failed page reading not used (unit tests);
                   (2) live: Ferrum loads the test site's redirect pages (301, 302, 303, 307, 308 and a two-step
                   chain), a redirect to another site and plain loads; each record has the right redirect count and
                   site label, and its times are in order (start, first response, page content ready, page loaded).
                   The page times are read by Ferrum from the page through the browser engine's developer interface;
                   page script never sends them.
  Why            : "How fast does a page load" needs the same moments for every load → record start, first reply,
                   content ready, loaded, redirects and site change → page loads can be compared fairly later.
  What it changes: nothing. It starts Ferrum, which closes by itself (nothing is killed).
  How long       : about 2 minutes (longer the first time, while Rust compiles).
  How to run     : pwsh -NoProfile -File scripts/verify/p5.7-page-load-timing.ps1   (do not use the PC meanwhile)
  Result         : PASS or FAIL (the line says what).
  Tell Claude    : "p5.7 check passed", or paste the FAIL lines.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers: scripts/lib/Ferrum.Check.psm1).
    Phase-page verify field: Integration test with the P2 redirect fixtures asserts the redirect count and ordering
    of timestamps.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p5.7' -Title 'Navigation timing' -Phase 'phase-p5-telemetry' `
    -Why 'page loads can be compared fairly later.'

$cargoBin = Join-Path $env:USERPROFILE '.cargo/bin'
if ((Test-Path -LiteralPath $cargoBin) -and ($env:PATH -notlike "*$cargoBin*")) { $env:PATH = "$cargoBin;$env:PATH" }

Invoke-Step 'The navigation records: redirects counted, site label, times in order' {
    $r = Assert-Cargo @('test', '--locked', '-p', 'ferrum-telemetry', 'navigation::')
    foreach ($n in 'redirect_hops_count_and_the_record_is_ordered_on_the_run_clock', 'origin_label_compares_with_the_previous_page',
        'outcomes_gate_cancels_and_unknown_completions', 'a_stale_or_unordered_page_entry_is_not_used_or_refused',
        'origins_of_addresses') {
        if ($r.Output -notmatch "(?m)^test (\S+::)?$n \.\.\. ok") { Stop-Fail "Test '$n' did not run or did not pass." }
    }
    'five unit tests passed'
}

Invoke-Step 'The metric page defines the in-app record' {
    $t = Read-RepoText 'wiki/research/metrics/metric-nav-latency.md'
    if ($t -notmatch '## In-app record \(p5\.7\)') { Stop-Fail 'metric-nav-latency has no in-app record section.' }
    'the navigation latency page describes the in-app record'
}

Invoke-Step 'Live: redirect fixtures, another site and plain loads give ordered records with the right counts' {
    $r = Invoke-FerrumSmoke -Spec @('nav-timing')
    $out = $r.Output -split "`r?`n"
    $at = [array]::FindLastIndex([string[]]$out, [Predicate[string]] { param($l) $l -match 'NAVTIMING:' })
    Add-LogText (Get-Tail $r.Output 20)
    if ($r.ExitCode -ne 0 -or $r.Output -notmatch '1 passed') { Stop-Fail "The live test failed:`n$(Get-Tail $r.Output 30)" }
    if ($at -lt 0) { Stop-Fail 'The live test printed no NAVTIMING lines.' }
    $rows = @($out[($at + 1)..($out.Count - 1)] | Where-Object { $_ -match ' -> ' } | ForEach-Object { $_.Trim() })
    if ($rows.Count -ne 10) { Stop-Fail "Expected 10 navigation lines, got $($rows.Count)." }
    "10 navigations recorded:`n" + ($rows -join "`n")
}

Complete-Check -SaveEvidence:$SaveEvidence
