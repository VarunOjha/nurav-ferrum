#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p4.3 (P4 Security): every way to reach a site passes the site rules.

.DESCRIPTION
  What it checks : (1) the app's rule tests pass: the settings become the rules, a bad rule refuses the settings, and a
                   malformed address is refused wherever it appears; (2) the settings tests pass (the blocked and allowed
                   sites lists are read and saved; plain HTTP now gets the warning by default); (3) the code really asks
                   the rules at every place a page can go: the page itself, each redirect step, each frame and each new
                   window; (4) live test with Ferrum and the local test pages: with one test host blocked, it stays
                   blocked when typed, after a redirect from an allowed page, inside a frame and in a pop-up, and a
                   malformed address is refused; each refusal is in Ferrum's log with its rule.
  Why            : Tauri's hook misses unreadable addresses and embedded frames → also hook WebView2's own events and
                   re-check each redirect → no way around the rules by redirect, frame or pop-up.
  What it changes: nothing (builds the app and the test pages in target/; test data under the smoke-test folder).
  How long       : about three minutes (builds, then one Ferrum window opens and closes by itself).
  How to run     : pwsh -NoProfile -File scripts/verify/p4.3-check-every-navigation.ps1
  Result         : PASS (every checked step is fine) or FAIL (the line says what).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p4.3 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers: scripts/lib/Ferrum.Check.psm1).
    Do not use the PC while the live test runs (it opens a Ferrum window). Phase-page verify field: Security tests:
    blocked domain via direct navigation, via 302 redirect from an allowed fixture, via iframe, via window.open and via
    a malformed URL are all denied and logged.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p4.3' -Title 'Check every navigation path' -Phase 'phase-p4-security' `
    -Why 'no way around the rules by redirect, frame or pop-up.'

$cargoBin = Join-Path $env:USERPROFILE '.cargo/bin'
if ((Test-Path -LiteralPath $cargoBin) -and ($env:PATH -notlike "*$cargoBin*")) { $env:PATH = "$cargoBin;$env:PATH" }

function Assert-Passed {
    param([string]$Output, [string[]]$Names)
    foreach ($n in $Names) {
        if ($Output -notmatch "(?m)^test (\S+::)?$([regex]::Escape($n)) \.\.\. ok") { Stop-Fail "Test '$n' did not run or did not pass." }
    }
}

Invoke-Step 'App rule tests: settings become the rules, bad rules refused, malformed addresses refused' {
    $r = Assert-Cargo @('test', '--locked', '-p', 'ferrum-desktop', 'policy::')
    Assert-Passed $r.Output @('settings_become_the_policy', 'a_bad_rule_refuses_the_settings',
        'malformed_addresses_are_denied_in_every_context')
    'three app rule tests passed'
}

Invoke-Step 'Settings tests: site lists read and saved; HTTP warning by default' {
    $r = Assert-Cargo @('test', '--locked', '-p', 'ferrum-core', '--test', 'config')
    Assert-Passed $r.Output @('site_lists_are_read_and_saved', 'missing_file_gives_defaults',
        'version_one_file_is_migrated_and_keeps_its_behaviour')
    if ($r.Output -match 'test result: FAILED') { Stop-Fail 'A settings test failed.' }
    'settings tests passed'
}

Invoke-Step 'The code asks the rules for the page, each redirect step, each frame and each new window' {
    $wv = Read-RepoText 'crates/webview-manager/src/webview2.rs'
    foreach ($need in 'add_NavigationStarting', 'add_FrameNavigationStarting', 'remove_FrameNavigationStarting', 'frame: true', 'frame: false') {
        if (-not $wv.Contains($need)) { Stop-Fail "webview2.rs no longer has '$need'." }
    }
    $content = Read-RepoText 'apps/desktop/src-tauri/src/content.rs'
    if ($content -notmatch 'Context::Frame' -or $content -notmatch 'Context::Redirect' -or $content -notmatch 'policy::decide') {
        Stop-Fail 'The tab gate in content.rs does not ask the rules for frames and redirects.'
    }
    if ($content -match 'web_gate') { Stop-Fail 'content.rs still uses the old P2 gate (web_gate).' }
    $ext = Read-RepoText 'apps/desktop/src-tauri/src/external.rs'
    if ($ext -notmatch 'Context::NewWindow' -or $ext -notmatch 'policy::decide') { Stop-Fail 'New windows (external.rs) do not ask the rules.' }
    'page, redirect, frame and new-window paths all call the rules'
}

Invoke-Step 'Live test: blocked host refused when typed, after a redirect, in a frame, in a pop-up; malformed refused; all logged' {
    $r = Invoke-FerrumSmoke -Spec 'security-navigation'
    Add-LogText (Get-Tail $r.Output 14)
    if ($r.ExitCode -ne 0 -or $r.Output -notmatch '5 passed') { Stop-Fail "The live test failed:`n$(Get-Tail $r.Output 30)" }
    'security-navigation: 5 passed'
}

Complete-Check -SaveEvidence:$SaveEvidence
