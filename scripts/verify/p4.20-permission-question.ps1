#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p4.20 (P4 Security): sites ask before using the camera, microphone, location, notifications or
  clipboard, like Chrome.

.DESCRIPTION
  What it checks : (1) the research note on WebView2 permission requests exists, with access dates; (2) the rules and
                   settings tests: the five kinds are asked about, every other kind refused; Always and Never cover
                   their site and kind only; this-time answers; quiet after closed questions; http pages and other-site
                   reports refused; never answers and closed questions read, checked and saved; the settings screen
                   keeps them; the question's text; (3) the source: requests wait with a WebView2 deferral, a closed
                   view refuses its waiting requests, only the shell may answer; (4) live, with harmless test pages:
                   the bar names the site; Allow this time, Always allow, Never allow, close and the private tab's
                   answers; quiet after three closes; an http page and another site's frame its page did not allow get
                   no question; a frame its page allowed is asked about under the page's site (owner answer Q-228);
                   loading another page refuses a waiting request; the camera is only ever refused; the earlier
                   settings and audit tests; (5) a website cannot answer its own question (IPC self-test).
  Why            : sites were refused silently, so video calls failed without a reason → Ferrum asks like Chrome and
                   remembers only Always and Never → you decide per site, and Settings shows every remembered answer.
  What it changes: nothing (builds the app and the test pages in target/debug; test data in throwaway folders under the
                   smoke-test folder and the temp folder). Never switches on the camera or microphone.
  How long       : about five minutes (builds, then Ferrum opens and closes by itself several times).
  How to run     : pwsh -NoProfile -File scripts/verify/p4.20-permission-question.ps1
  Result         : PASS (every checked step is fine) or FAIL (the line says what).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p4.20 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers: scripts/lib/Ferrum.Check.psm1).
    Do not use the PC while the live tests run (they click the shell). Phase-page verify field: A research note in
    raw/research (access dates) confirms that WebView2 can hold a permission request until it is answered, and the live
    test records which origin it reports for a frame's request (owner answer Q-228: like Chrome); unit tests for the
    decision (question, allow once, always, never, quiet time, http page, other-site frame, private tab); live tests with
    harmless test pages: the bar appears with the site's name, Allow this time and Always allow grant notifications and
    the clipboard (Always allow then shows in Settings and needs no new question), Never allow and close refuse (also for
    the camera, which is never switched on), an http page and another site's frame the page did not allow get no bar, a
    frame the page allowed is asked about under the page's site, navigating away refuses the waiting request, a private
    tab saves nothing; every case is in the security log.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p4.20' -Title 'Sites ask before using your camera and more' -Phase 'phase-p4-security' `
    -Why 'you decide per site, and Settings shows every remembered answer.'

$cargoBin = Join-Path $env:USERPROFILE '.cargo/bin'
if ((Test-Path -LiteralPath $cargoBin) -and ($env:PATH -notlike "*$cargoBin*")) { $env:PATH = "$cargoBin;$env:PATH" }

function Assert-Passed {
    param([string]$Output, [string[]]$Names)
    foreach ($n in $Names) {
        if ($Output -notmatch "(?m)^test (\S+::)?$([regex]::Escape($n)) \.\.\. ok") { Stop-Fail "Test '$n' did not run or did not pass." }
    }
}

Invoke-Step 'Research note: holding a request (deferral) and which site asked, with access dates' {
    $note = Read-RepoText 'wiki/raw/research/webview2-permission-question.md'
    foreach ($need in 'GetDeferral', 'accessed 2026-10-15', 'get_Uri', 'Handled') {
        if (-not $note.Contains($need)) { Stop-Fail "The research note lacks '$need'." }
    }
    if ((Read-RepoText 'wiki/decisions/adr-0034-permission-question-chrome-style.md') -notmatch 'webview2-permission-question\.md') {
        Stop-Fail 'adr-0034 does not cite the research note.'
    }
    'present, cited by adr-0034'
}

Invoke-Step 'Rules, settings and shell tests' {
    $r = Assert-Cargo @('test', '--locked', '-p', 'ferrum-security', '--lib', 'permissions::')
    Assert-Passed $r.Output @('the_five_kinds_are_asked_and_every_other_kind_is_refused_by_default',
        'always_and_never_cover_their_site_and_kind_only', 'this_time_answers_hold_in_the_tab_only',
        'a_site_is_quiet_until_its_time_has_passed', 'frames_of_another_site_and_insecure_pages_get_no_question',
        'rule_names_are_distinct')
    $c = Assert-Cargo @('test', '--locked', '-p', 'ferrum-core', '--test', 'config')
    Assert-Passed $c.Output @('never_answers_and_closed_questions_are_read_checked_and_saved')
    $a = Assert-Cargo @('test', '--locked', '-p', 'ferrum-desktop', 'settings::')
    Assert-Passed $a.Output @('never_answers_travel_with_the_row_and_quiet_times_end_when_permissions_change')
    $s = Invoke-Npm -Arguments @('run', 'test') -Folder 'apps/desktop'
    if ($s.ExitCode -ne 0 -or $s.Output -notmatch 'the permission question names the site and what it wants') {
        Stop-Fail "Shell unit tests failed or the question test did not run:`n$(Get-Tail $s.Output 15)"
    }
    'six rules tests, one settings-file test, one settings-screen test and the shell tests passed'
}

Invoke-Step 'Source: requests wait with a deferral; a closed view refuses them; only the shell may answer' {
    $wv = Read-RepoText 'crates/webview-manager/src/webview2.rs'
    foreach ($need in 'GetDeferral()', 'pub fn answer_permission', 'SetSavesInProfile(false)', 'complete_permission(w, false)') {
        if (-not $wv.Contains($need)) { Stop-Fail "webview2.rs no longer has '$need'." }
    }
    if ((Read-RepoText 'apps/desktop/src-tauri/src/content.rs') -notmatch 'crate::permission_question::on_page_load') {
        Stop-Fail 'The navigation gate does not refuse waiting requests when a page loads.'
    }
    if ((Read-RepoText 'apps/desktop/src-tauri/capabilities/shell.json') -notmatch '"allow-permission-answer"') { Stop-Fail 'The shell may not answer.' }
    if ((Read-RepoText 'tests/fixtures/server/src/lib.rs') -notmatch 'tryCall\("permission_answer"') { Stop-Fail 'The IPC probe does not try to answer.' }
    'deferral, refusal on close and on a new page, shell-only answer'
}

Invoke-Step 'Live: the question, every answer, quiet time, no-question cases, frames, private tabs; settings and audit tests' {
    $r = Invoke-FerrumSmoke -Spec @('permissions', 'security-settings', 'settings.spec', 'audit-log')
    foreach ($tag in 'PAGE-WHILE-WAITING', 'FRAME-ORIGIN-REPORTED', 'CLIPBOARD-AFTER-ALWAYS', 'CLIPBOARD-SECOND', 'CAMERA-NO-QUESTION') {
        Add-LogText (($r.Output -split "`r?`n" | Where-Object { $_ -match "^$tag " }) -join "`n")
    }
    Add-LogText (Get-Tail $r.Output 8)
    if ($r.ExitCode -ne 0 -or $r.Output -match '(?m)^\s+\d+ failed' -or $r.Output -notmatch '(?m)^\s+16 passed') {
        Stop-Fail "The live tests failed (16 expected):`n$(Get-Tail $r.Output 30)"
    }
    foreach ($t in 'Allow this time lasts until the page is loaded again', 'Always allow is saved in Settings',
        'Never allow refuses the camera', 'closing the question three times makes the site quiet',
        'a plain-HTTP page is refused without a question', 'refused unless its page allowed it',
        'a private tab offers Allow this time and Block', 'a waiting request is refused when the tab loads another page') {
        if ($r.Output -notmatch [regex]::Escape($t)) { Stop-Fail "The test '$t' did not run." }
    }
    $frame = ($r.Output -split "`r?`n" | Where-Object { $_ -match '^FRAME-ORIGIN-REPORTED ' } | Select-Object -First 1)
    "16 passed (permissions 10, security-settings 3, settings 2, audit-log 1); $frame"
}

Invoke-Step 'A website cannot answer its own question (IPC self-test)' {
    $st = Invoke-FerrumSelfTest -Name 'ipc'
    $rep = $st.Result.tauri_view.report
    if (-not $rep) { Stop-Fail 'The probe page reported nothing.' }
    $v = $rep.PSObject.Properties['permission_command']
    if (-not $v) { Stop-Fail 'The probe did not try permission_answer.' }
    if ($v.Value.ok -ne $false -or $v.Value.error -notmatch 'not allowed') { Stop-Fail "A website's permission_answer call was not refused: $($v.Value | ConvertTo-Json -Compress)" }
    if ($st.Result.pass -ne $true) { Stop-Fail 'The IPC self-test did not pass.' }
    "refused: $($v.Value.error)"
}

Complete-Check -SaveEvidence:$SaveEvidence
