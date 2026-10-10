#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p1.2 (P1 Foundation): Record this computer's hardware.

.DESCRIPTION
  What it checks : the inventory file (wiki/raw/evidence/phase-p1-foundation/environment.md) exists and
                   covers every listed item: processor (name and cores), memory, graphics, display, power
                   plan, Windows build, web view (WebView2) version, Edge and Chrome versions. It also reads
                   the WebView2 version on this computer now and shows whether it changed since 8 October.
  Why            : benchmark numbers depend on the machine → recording it means results can be compared
                   and repeated.
  What it changes: nothing. It only reads files and one Windows registry value.
  How long       : about 2 seconds.
  How to run     : pwsh -NoProfile -File scripts/verify/p1.2-machine-inventory.ps1
  Result         : PASS = exit 0, FAIL = exit 1, NOT READY = exit 2 (scripts/lib/Ferrum.Check.psm1).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p1.2 check failed".
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p1.2' -Title "Record this computer's hardware" -Phase 'phase-p1-foundation' `
    -Why 'benchmark numbers depend on the machine they ran on.'

$inventory = 'wiki/raw/evidence/phase-p1-foundation/environment.md'

Invoke-Step 'The inventory file exists' {
    [void](Assert-RepoFile $inventory 'The machine inventory (environment.md)')
    $inventory
}

Invoke-Step 'It covers every listed item' {
    $t = Read-RepoText $inventory
    $items = [ordered]@{
        'processor' = '(?i)\b(cpu|processor)\b'; 'cores' = '(?i)\bcores?\b'; 'memory' = '(?i)\b(ram|memory)\b'
        'graphics' = '(?i)\b(gpu|graphics)\b'; 'display' = '(?i)\b(display|monitor|resolution)\b'
        'power plan' = '(?i)power (plan|scheme)'; 'Windows build' = '(?i)(os build|windows build|CurrentBuild)'
        'WebView2 version' = '(?i)webview2'; 'Edge version' = '(?i)\bedge\b'; 'Chrome version' = '(?i)\bchrome\b'
    }
    $missing = @($items.Keys | Where-Object { $t -notmatch $items[$_] })
    if ($missing.Count) { Stop-Fail "The inventory does not mention: $($missing -join ', ')." }
    "$($items.Count) items found"
}

Invoke-Step 'WebView2 version now, compared with 8 October' {
    $key = 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}'
    $now = (Get-ItemProperty -LiteralPath $key -Name pv -ErrorAction SilentlyContinue).pv
    if (-not $now) { Stop-Fail 'The WebView2 runtime version could not be read from the registry (is WebView2 installed?).' }
    $then = if ((Read-RepoText 'wiki/raw/evidence/phase-p0-planning/env-webview2-pv.txt') -match 'pv\s+REG_SZ\s+(\S+)') { $Matches[1] } else { 'unknown' }
    if ($now -eq $then) { "$now (same as on 8 October)" } else { "$now (was $then on 8 October; the inventory must say so)" }
}

Complete-Check -SaveEvidence:$SaveEvidence
