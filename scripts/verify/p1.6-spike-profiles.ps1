#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p1.6 (P1 Foundation): Experiment 2, a separate profile per site.

.DESCRIPTION
  What it checks : the experiment report (spike-s2-profiles.md) has a table with one row per route (a) to (d)
                   and these columns or words: whether creating the view works, whether two profiles share one
                   browser process, whether a cookie from site A stays out of site B, and the upkeep cost; and
                   at least two routes were actually run, including route (d), the separate data folder.
                   Report format this script expects: a markdown table whose header has "Route" and
                   "Executed"; each route row starts with "(a)" ... "(d)"; "Executed" is "yes" or "no".
  Why            : per-site isolation needs a profile chosen when a view is created, and Tauri does not offer
                   that → pick a route that keeps cookies apart before tabs are built.
  What it changes: nothing. It only reads files.
  How long       : about 2 seconds.
  How to run     : pwsh -NoProfile -File scripts/verify/p1.6-spike-profiles.ps1
  Result         : PASS = exit 0, FAIL = exit 1, NOT READY = exit 2 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p1.6 check failed".
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p1.6' -Title 'Experiment 2: a separate profile per site' -Phase 'phase-p1-foundation' `
    -Why 'a route that keeps cookies apart must be chosen before tabs are built.'

$report = 'wiki/raw/evidence/phase-p1-foundation/spike-s2-profiles.md'

Invoke-Step 'The report compares all four routes on every criterion' {
    $t = Read-RepoText $report
    $rows = @($t -split "`n" | Where-Object { $_ -match '^\|\s*\(([a-d])\)' })
    $routes = @($rows | ForEach-Object { if ($_ -match '^\|\s*\(([a-d])\)') { $Matches[1] } } | Sort-Object -Unique)
    if ($routes.Count -ne 4) { Stop-Fail "Expected table rows for routes (a) to (d); found: $($routes -join ', ')." }
    $words = [ordered]@{ 'view creation' = '(?i)creat'; 'shared browser process' = '(?i)BrowserProcessId'; 'cookie separation' = '(?i)cookie'; 'upkeep cost' = '(?i)(maintenance|unsafe)' }
    $missing = @($words.Keys | Where-Object { $t -notmatch $words[$_] })
    if ($missing.Count) { Stop-Fail "The report does not cover: $($missing -join ', ')." }
    '4 routes x 4 criteria'
}

Invoke-Step 'At least two routes were really run, including (d)' {
    $lines = @((Read-RepoText $report) -split "`n")
    $header = $lines | Where-Object { $_ -match '^\|.*Route.*\|' -and $_ -match '(?i)Executed' } | Select-Object -First 1
    if (-not $header) { Stop-Fail 'The route table has no "Executed" column.' }
    $cols = @($header.Trim('|') -split '\|' | ForEach-Object { $_.Trim() })
    $ix = [array]::FindIndex([string[]]$cols, [Predicate[string]] { param($c) $c -match '(?i)^executed' })
    $ran = @($lines | Where-Object { $_ -match '^\|\s*\(([a-d])\)' } | Where-Object {
            $cells = @($_.Trim().Trim('|') -split '\|' | ForEach-Object { $_.Trim() }); $cells.Count -gt $ix -and $cells[$ix] -match '(?i)^yes' } |
        ForEach-Object { if ($_ -match '^\|\s*\(([a-d])\)') { $Matches[1] } })
    if ($ran.Count -lt 2 -or $ran -notcontains 'd') { Stop-Fail "Routes run: $(if ($ran.Count) { $ran -join ', ' } else { 'none' }); need (d) plus at least one of (a), (b), (c)." }
    "routes run: $($ran -join ', ')"
}

Complete-Check -SaveEvidence:$SaveEvidence
