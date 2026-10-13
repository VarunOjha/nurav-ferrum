#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p4.4 (P4 Security): links to other apps always ask first; risky link types are always refused.

.DESCRIPTION
  What it checks : (1) the rules: four link types known to be abused (ms-msdt, search-ms, ms-appinstaller,
                   ms-officecmd) are always refused, and with a list of allowed types in settings an unlisted type is
                   refused; (2) the settings: the list is read, saved and checked, and is empty by default (any type
                   may be offered, always with a click, your answer to Q-224); (3) the code: every request to open
                   another app, and the click that confirms it, passes the rules; (4) live test with Ferrum and the
                   local test pages: a custom link shows the confirmation bar and nothing is launched without the
                   click (the launcher is replaced by a test stand-in that only writes a line); risky links never
                   get the bar; an unlisted type is refused and a listed one opens only after the click.
  Why            : a click on a link can start another program on the PC → Ferrum always asks, refuses the types
                   attackers have used, and lets you narrow the list → no program starts silently.
  What it changes: nothing (builds the app and the test pages in target/; test data under the smoke-test folder).
  How long       : about two minutes (builds, then Ferrum opens and closes by itself twice).
  How to run     : pwsh -NoProfile -File scripts/verify/p4.4-ask-before-opening.ps1
  Result         : PASS (every checked step is fine) or FAIL (the line says what).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p4.4 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers: scripts/lib/Ferrum.Check.psm1).
    Do not use the PC while the live test runs. Phase-page verify field: Security test: custom-scheme fixture triggers
    the confirmation; without consent the OS handler is never invoked (launcher mocked).
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p4.4' -Title 'Ask before opening other apps' -Phase 'phase-p4-security' `
    -Why 'no program starts silently.'

$cargoBin = Join-Path $env:USERPROFILE '.cargo/bin'
if ((Test-Path -LiteralPath $cargoBin) -and ($env:PATH -notlike "*$cargoBin*")) { $env:PATH = "$cargoBin;$env:PATH" }

function Assert-Passed {
    param([string]$Output, [string[]]$Names)
    foreach ($n in $Names) {
        if ($Output -notmatch "(?m)^test (\S+::)?$([regex]::Escape($n)) \.\.\. ok") { Stop-Fail "Test '$n' did not run or did not pass." }
    }
}

Invoke-Step 'Rules: risky link types always refused; unlisted types refused when a list is set' {
    $r = Assert-Cargo @('test', '--locked', '-p', 'ferrum-security', '--lib')
    Assert-Passed $r.Output @('risky_and_unlisted_link_types_are_refused', 'external_schemes_follow_settings')
    $src = Read-RepoText 'crates/security/src/policy.rs'
    foreach ($s in 'ms-appinstaller', 'ms-msdt', 'search-ms', 'ms-officecmd') {
        if ($src -notmatch "RISKY_SCHEMES[^;]*`"$([regex]::Escape($s))`"") { Stop-Fail "The always-refused list no longer has $s." }
    }
    'engine tests passed; four always-refused types listed'
}

Invoke-Step 'Settings: the list of allowed types is read, saved and checked; empty by default' {
    $c = Assert-Cargo @('test', '--locked', '-p', 'ferrum-core', '--test', 'config')
    Assert-Passed $c.Output @('site_lists_are_read_and_saved', 'missing_file_gives_defaults')
    $a = Assert-Cargo @('test', '--locked', '-p', 'ferrum-desktop', 'policy::')
    Assert-Passed $a.Output @('link_type_list_is_read_and_checked')
    'settings and app tests passed'
}

Invoke-Step 'Every request to open another app, and its confirmation, passes the rules' {
    $ext = Read-RepoText 'apps/desktop/src-tauri/src/external.rs'
    $req = [regex]::Match($ext, '(?s)pub fn request\(.*?\n\}').Value
    if ($req -notmatch 'policy::decide') { Stop-Fail 'external::request does not ask the rules.' }
    $conf = [regex]::Match($ext, '(?s)pub fn external_open_confirm\(.*?\n\}').Value
    if ($conf -notmatch 'policy::decide') { Stop-Fail 'external_open_confirm does not ask the rules again at the click.' }
    if ($ext -notmatch 'LAUNCHER_LOG') { Stop-Fail 'The test stand-in for the launcher is gone; the live test could start real programs.' }
    'request and confirmation both call the rules'
}

Invoke-Step 'Live test: confirmation bar, nothing launched without the click, risky and unlisted types refused' {
    $r = Invoke-FerrumSmoke -Spec 'external-schemes'
    Add-LogText (Get-Tail $r.Output 10)
    if ($r.ExitCode -ne 0 -or $r.Output -notmatch '3 passed') { Stop-Fail "The live test failed:`n$(Get-Tail $r.Output 30)" }
    'external-schemes: 3 passed'
}

Complete-Check -SaveEvidence:$SaveEvidence
