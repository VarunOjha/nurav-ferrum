#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p4.19 (P4 Security): Ferrum's own SmartScreen message.

.DESCRIPTION
  What it checks : (1) shell unit test: Ferrum's rule for a SmartScreen block (the page failed although the server
                   answered 200, connection aborted) and the message text; ordinary failures are not taken for a block;
                   (2) the source: a blank page stays in the tab's profile (SmartScreen's warning page is a blank page);
                   (3) live, per-site and per-site-udf: Microsoft's demo phishing page shows "Unsafe site blocked" with
                   the blocked address, no "Try again", one audit record for that address, and no "move this tab to
                   another site's profile" question; an ordinary page that breaks off after the server's 200 still
                   shows the usual panel with "Try again"; (4) the earlier profile and error-page tests still pass.
  Why            : SmartScreen blocks a reported site, but Ferrum's generic panel hid why → Ferrum shows its own
                   SmartScreen message → you know the site was reported as unsafe and are not invited to retry it.
  What it changes: nothing (builds the app and the test pages in target/debug; test data under the smoke-test folder).
                   Step 3 opens one Microsoft demo page on the internet, so its address goes to Microsoft's SmartScreen.
  How long       : about four minutes (builds, then Ferrum opens and closes by itself several times).
  How to run     : pwsh -NoProfile -File scripts/verify/p4.19-smartscreen-message.ps1
  Result         : PASS (every checked step is fine) or FAIL (the line says what).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p4.19 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers: scripts/lib/Ferrum.Check.psm1).
    Do not use the PC while the live tests run. Needs internet for step 3. Phase-page verify field: Live test opens
    Microsoft's demo phishing page (raw/research/smartscreen-webview2.md, 4.2) in the per-site and per-site-udf modes and
    asserts the SmartScreen panel text and no 'Try again' button; a page that fails for another reason (unreachable test
    address) still shows the generic panel with 'Try again'; the block is logged; shell unit test for the panel text.
    The "other reason" used is the test server's /page/broken (200, then the connection ends), the case closest to a
    block; unreachable and unknown hosts have no HTTP status and are covered by the unit test.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p4.19' -Title 'Ferrum''s own SmartScreen message' -Phase 'phase-p4-security' `
    -Why 'you know the site was reported as unsafe and are not invited to retry it.'

Invoke-Step 'Shell unit test: the SmartScreen rule and its message' {
    $s = Invoke-Npm -Arguments @('run', 'test') -Folder 'apps/desktop'
    if ($s.ExitCode -ne 0 -or $s.Output -notmatch 'a SmartScreen block: failed although the server answered 200') {
        Stop-Fail "Shell unit tests failed or the SmartScreen test did not run:`n$(Get-Tail $s.Output 15)"
    }
    'shell tests passed, including the SmartScreen rule'
}

Invoke-Step 'Source: a blank page stays in the tab''s profile; the block is logged and audited' {
    $c = Read-RepoText 'apps/desktop/src-tauri/src/content.rs'
    if ($c -notmatch 'current == PRIVATE_PROFILE \|\| r\.uri == BLANK') { Stop-Fail 'The navigation gate does not keep a blank page in the tab''s profile.' }
    if ($c -notmatch 'crate::audit::record\(tab, "page", &blocked, "smartscreen"\)') { Stop-Fail 'The SmartScreen block is not audited under the blocked address.' }
    'gate keeps about:blank in the tab''s profile; block audited as page / smartscreen'
}

$live = $null
Invoke-Step 'Live: the SmartScreen message (per-site, per-site-udf) and an ordinary broken page; earlier profile and error-page tests' {
    $script:live = Invoke-FerrumSmoke -Spec @('smartscreen', 'profiles', 'loading-errors')
    $r = $script:live
    Add-LogText (($r.Output -split "`r?`n" | Where-Object { $_ -match '^SMARTSCREEN-DEMO ' }) -join "`n")
    Add-LogText (Get-Tail $r.Output 8)
    if ($r.ExitCode -ne 0 -or $r.Output -match '(?m)^\s+\d+ failed') { Stop-Fail "The live tests failed:`n$(Get-Tail $r.Output 30)" }
    if ($r.Output -notmatch [regex]::Escape('an ordinary page that breaks off after the server''s 200 gets the usual panel')) { Stop-Fail 'The broken-page test did not run.' }
    $demo = @($r.Output -split "`r?`n" | Where-Object { $_ -match '^SMARTSCREEN-DEMO ' })
    if ($demo.Count -ne 2) { Stop-Fail "Expected the demo page in 2 modes, got $($demo.Count) (no internet?)." }
    $out = foreach ($line in $demo) {
        $j = ($line -replace '^SMARTSCREEN-DEMO ', '') | ConvertFrom-Json
        if (-not $j.warning_seen) { Stop-Fail "$($j.mode): SmartScreen did not block the demo page this run (tab title '$($j.tab_title)'), so the message could not be checked." }
        if ($j.panel_kind -ne 'smartscreen' -or $j.try_again_shown -or $j.audited -lt 1 -or $j.profile_question) {
            Stop-Fail "$($j.mode): panel '$($j.panel_kind)', Try again shown $($j.try_again_shown), audited $($j.audited), profile question $($j.profile_question)."
        }
        "$($j.mode): '$($j.ferrum_error_panel)'; no Try again; audited; no profile question"
    }
    ($out -join "`n         ") + "`n         " + (($r.Output -split "`r?`n" | Where-Object { $_ -match '^\s+\d+ passed' } | Select-Object -Last 1).Trim()) + ' (smartscreen, profiles, loading-errors)'
}

Complete-Check -SaveEvidence:$SaveEvidence
