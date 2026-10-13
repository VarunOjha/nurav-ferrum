#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p3.15 (P3 Tabs and sessions): The sidebar with open tabs and history.

.DESCRIPTION
  What it checks : (1) the shell's unit tests (the sidebar's history list among them); (2) the smoke test "sidebar":
                   opening it shrinks the active tab's view to its right and closing it grows the view back (the two
                   never overlap); choosing a tab activates it; a history entry (found with the search box) opens in the
                   active tab; Ctrl+Shift+S toggles it with focus in the toolbar and with focus inside a page.
  Why            : with many tabs you need an overview → a panel beside the page, never over it (pages are drawn on
                   top of the toolbar's window) → tabs and history at a glance without hiding the page.
  What it changes: nothing in git.
  How long       : about 30 seconds after the first build. The page part presses real keys: Ferrum comes to the
                   front for a moment; please do not type meanwhile.
  How to run     : pwsh -NoProfile -File scripts/verify/p3.15-sidebar-tabs-history.ps1
                   Needs the local development certificate (task p2.1) and ports 8443 and 9339 free.
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p3.15 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1, scripts/lib/Ferrum.SelfTest.ps1). Phase-page verify field:
    Smoke test toggles the sidebar and asserts the active tab's WebView bounds shrink and grow so the two never
    overlap; selecting a tab or history entry in the sidebar activates or navigates it; keyboard toggle works with
    focus in a tab; shell unit tests cover the sidebar component.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p3.15' -Title 'The sidebar with open tabs and history' -Phase 'phase-p3-tabs-sessions' `
    -Why 'tabs and history at a glance without hiding the page.'

Invoke-Step 'Shell unit tests (sidebar history list included)' {
    $t = Assert-NpmScript 'test' -Folder 'apps/desktop'
    if ($t.Output -notmatch 'sidebar history lists each address once') { Stop-Fail 'The sidebar unit test did not run.' }
    'npm test: pass (sidebar test included)'
}

Invoke-Step 'Smoke test: bounds shrink and grow, tab and history choices, Ctrl+Shift+S from the toolbar and a page' {
    $r = Invoke-FerrumSmoke -Spec 'sidebar'
    Add-LogText (Get-Tail $r.Output 7)
    if ($r.Output -match 'was not the active window') { Stop-Wait 'Ferrum was not the active window when keys were due; run the check again without using the PC meanwhile.' }
    if ($r.ExitCode -ne 0 -or $r.Output -notmatch '\b3 passed') { Stop-Fail "The smoke test failed:`n$(Get-Tail $r.Output 20)" }
    'sidebar: 3 passed'
}

Complete-Check -SaveEvidence:$SaveEvidence
