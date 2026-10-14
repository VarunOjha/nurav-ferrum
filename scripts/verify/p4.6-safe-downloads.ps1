#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p4.6 (P4 Security): downloads land safely in your download folder and are never opened by Ferrum.

.DESCRIPTION
  What it checks : (1) the rules: a site's file name is cleaned (no folder parts such as ..\, no hidden or
                   direction-changing characters, no characters Windows forbids, no device names such as CON, a length
                   limit) and program types (exe, msi, scripts, shortcuts, disk images, ...) are recognised; (2) the
                   code: the app saves under the cleaned name in the configured folder only, marks program files, and
                   has no code that opens a downloaded file; (3) live test with Ferrum and the local test server: a
                   name that tries to climb out of the folder lands inside it, a program file shows the warning and is
                   not opened, a right-to-left mark cannot hide ".exe", a device name is not used.
  Why            : a site names its download, and a crafted name can hide a program or try to write outside the
                   folder → Ferrum cleans the name, keeps the file in your folder and warns about programs → nothing
                   lands elsewhere or runs by itself.
  What it changes: nothing (builds the app and the test pages in target/; test data under the smoke-test folder).
  How long       : about two minutes (builds, then Ferrum opens and closes by itself).
  How to run     : pwsh -NoProfile -File scripts/verify/p4.6-safe-downloads.ps1
  Result         : PASS (every checked step is fine) or FAIL (the line says what).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p4.6 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers: scripts/lib/Ferrum.Check.psm1).
    Do not use the PC while the live test runs. Phase-page verify field: Security tests with fixtures offering a
    path-traversal filename and an executable type: file lands sanitised in the configured folder and the warning shows.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p4.6' -Title 'Safe downloads' -Phase 'phase-p4-security' `
    -Why 'nothing lands elsewhere or runs by itself.'

$cargoBin = Join-Path $env:USERPROFILE '.cargo/bin'
if ((Test-Path -LiteralPath $cargoBin) -and ($env:PATH -notlike "*$cargoBin*")) { $env:PATH = "$cargoBin;$env:PATH" }

Invoke-Step 'Rules: file names cleaned; program types recognised' {
    $r = Assert-Cargo @('test', '--locked', '-p', 'ferrum-security', '--lib', 'downloads::')
    foreach ($n in 'names_are_cleaned', 'long_names_keep_their_extension', 'program_types_are_recognised') {
        if ($r.Output -notmatch "(?m)^test (\S+::)?$n \.\.\. ok") { Stop-Fail "Test '$n' did not run or did not pass." }
    }
    'three engine tests passed'
}

Invoke-Step 'The app saves under the cleaned name, marks programs, and never opens a download' {
    $dl = Read-RepoText 'apps/desktop/src-tauri/src/downloads.rs'
    if ($dl -notmatch 'clean_file_name\(suggested\)') { Stop-Fail 'downloads.rs does not clean the suggested name.' }
    if ($dl -notmatch 'is_program\(') { Stop-Fail 'downloads.rs does not mark program files.' }
    $src = Get-ChildItem -LiteralPath (Get-RepoPath 'apps/desktop/src-tauri/src') -Filter '*.rs'
    foreach ($f in $src) {
        $t = [IO.File]::ReadAllText($f.FullName)
        foreach ($bad in 'ShellExecute', 'open_path', 'opener::', 'explorer.exe') {
            if ($t.Contains($bad)) { Stop-Fail "$($f.Name) contains '$bad': a downloaded file could be opened." }
        }
    }
    $wv = Read-RepoText 'crates/webview-manager/src/webview2.rs'
    if ($wv -notmatch 'SetHandled\(true\)') { Stop-Fail "WebView2's own download pop-up (with its Open button) is no longer turned off." }
    'cleaned name, program flag, no open call'
}

Invoke-Step 'Live test: climbing name, program warning, hidden extension, device name' {
    $r = Invoke-FerrumSmoke -Spec 'safe-downloads'
    Add-LogText (Get-Tail $r.Output 12)
    if ($r.ExitCode -ne 0 -or $r.Output -notmatch '4 passed') { Stop-Fail "The live test failed:`n$(Get-Tail $r.Output 30)" }
    'safe-downloads: 4 passed'
}

Complete-Check -SaveEvidence:$SaveEvidence
