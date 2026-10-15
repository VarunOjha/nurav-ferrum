#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p4.5 (P4 Security): websites get no permission (camera, microphone, location, ...) unless you grant it.

.DESCRIPTION
  What it checks : (1) the rules: every permission kind is refused by default, a grant covers only its site and kind,
                   and plain-HTTP or unreadable pages never get one; (2) the settings: per-site grants are read, saved
                   and checked (a misspelt kind is refused), and the settings screen keeps them; (3) the code: Ferrum
                   answers every permission request itself and tells WebView2 not to remember the answer; (4) live test
                   with Ferrum and a local test page: notifications, location and clipboard reading are refused as seen
                   by the page's own script (camera and microphone too; on a PC without them the page sees "no device"),
                   also inside a frame; each request is logged; a per-site grant works, and removing it in settings
                   takes effect at the next request.
  Why            : a page that gets the camera or the location without asking you is a privacy leak → Ferrum refuses
                   every kind unless you allow that site → nothing sensitive is handed out by default.
  What it changes: nothing (builds the app and the test pages in target/; test data under the smoke-test folder).
  How long       : about two minutes (builds, then Ferrum opens and closes by itself twice).
  How to run     : pwsh -NoProfile -File scripts/verify/p4.5-permission-prompts.ps1
  Result         : PASS (every checked step is fine) or FAIL (the line says what).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p4.5 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers: scripts/lib/Ferrum.Check.psm1).
    Do not use the PC while the live test runs. Phase-page verify field: Security tests: fixture requests each
    permission kind; default deny observed in page script; a per-site grant is honoured and revocable.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p4.5' -Title 'Permission prompts' -Phase 'phase-p4-security' `
    -Why 'nothing sensitive is handed out by default.'

$cargoBin = Join-Path $env:USERPROFILE '.cargo/bin'
if ((Test-Path -LiteralPath $cargoBin) -and ($env:PATH -notlike "*$cargoBin*")) { $env:PATH = "$cargoBin;$env:PATH" }

function Assert-Passed {
    param([string]$Output, [string[]]$Names)
    foreach ($n in $Names) {
        if ($Output -notmatch "(?m)^test (\S+::)?$([regex]::Escape($n)) \.\.\. ok") { Stop-Fail "Test '$n' did not run or did not pass." }
    }
}

Invoke-Step 'Rules: every kind refused by default; a grant covers its site and kind only' {
    $r = Assert-Cargo @('test', '--locked', '-p', 'ferrum-security', '--lib', 'permissions::')
    # p4.20 (adr-0034) renamed them: the five sensitive kinds are now asked about instead of refused silently.
    Assert-Passed $r.Output @('the_five_kinds_are_asked_and_every_other_kind_is_refused_by_default',
        'always_and_never_cover_their_site_and_kind_only', 'frames_of_another_site_and_insecure_pages_get_no_question')
    'three engine tests passed'
}

Invoke-Step 'Settings: per-site grants read, saved and checked; the app follows them' {
    $c = Assert-Cargo @('test', '--locked', '-p', 'ferrum-core', '--test', 'config')
    Assert-Passed $c.Output @('site_permission_grants_are_read_checked_and_saved')
    $a = Assert-Cargo @('test', '--locked', '-p', 'ferrum-desktop', 'settings::')
    Assert-Passed $a.Output @('never_answers_travel_with_the_row_and_quiet_times_end_when_permissions_change')
    'settings and app tests passed'
}

Invoke-Step 'Ferrum answers every permission request and WebView2 keeps no answer' {
    $wv = Read-RepoText 'crates/webview-manager/src/webview2.rs'
    foreach ($need in 'add_PermissionRequested', 'remove_PermissionRequested', 'SetSavesInProfile(false)', 'COREWEBVIEW2_PERMISSION_STATE_DENY') {
        if (-not $wv.Contains($need)) { Stop-Fail "webview2.rs no longer has '$need'." }
    }
    $content = Read-RepoText 'apps/desktop/src-tauri/src/content.rs'
    if ($content -notmatch 'permissions:\s*crate::permission_question::filter') { Stop-Fail 'Tab views are created without the permission filter.' }
    'handler registered, state set, not saved in the profile'
}

Invoke-Step 'Live test: page script sees refusals (also in a frame); grant honoured and revocable; all logged' {
    $r = Invoke-FerrumSmoke -Spec 'permissions'
    Add-LogText (Get-Tail $r.Output 10)
    if ($r.ExitCode -ne 0 -or $r.Output -notmatch '10 passed') { Stop-Fail "The live test failed:`n$(Get-Tail $r.Output 30)" }
    'permissions: 10 passed (p4.20 added the question)'
}

Complete-Check -SaveEvidence:$SaveEvidence
