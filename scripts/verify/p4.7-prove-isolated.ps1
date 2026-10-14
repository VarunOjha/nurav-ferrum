#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p4.7 (P4 Security): what separate site profiles keep apart and what they share, proven by tests.

.DESCRIPTION
  What it checks : (1) the code: tab views can be private (InPrivate), a site's data can be cleared in its own profile
                   only, private tabs stay out of the history and the saved session, and Ctrl+Shift+N opens one;
                   (2) live test with Ferrum and the local test sites: a cookie, localStorage and IndexedDB written by
                   site A are not visible to the same site in another profile (and return in its own profile);
                   clearing site A leaves site B intact; a private tab sees no normal data, is not in the history and
                   forgets its own data; the running processes show one browser process for all profiles and no
                   renderer shared by two sites' pages; (3) the shared-resources list on the tab and view manager page
                   cites this evidence.
  Why            : profiles share browser processes → test what is truly separate (cookies, storage, databases) and
                   list what is shared → no claim of full isolation without evidence.
  What it changes: nothing (builds the app and the test pages in target/; test data under the smoke-test folder).
  How long       : about two minutes (builds, then Ferrum opens and closes by itself).
  How to run     : pwsh -NoProfile -File scripts/verify/p4.7-prove-isolated.ps1
  Result         : PASS (every checked step is fine) or FAIL (the line says what).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p4.7 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers: scripts/lib/Ferrum.Check.psm1).
    The live test prints the process inventory (PROCESS-INVENTORY line), saved with -SaveEvidence. Phase-page verify
    field: Security tests: cookies, localStorage and IndexedDB written by site A are not readable by site B in a
    different profile; clearing profile A leaves profile B intact; shared-resource list on comp-webview-manager cites
    the evidence.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p4.7' -Title 'Prove what is isolated' -Phase 'phase-p4-security' `
    -Why 'no claim of full isolation without evidence.'

$cargoBin = Join-Path $env:USERPROFILE '.cargo/bin'
if ((Test-Path -LiteralPath $cargoBin) -and ($env:PATH -notlike "*$cargoBin*")) { $env:PATH = "$cargoBin;$env:PATH" }

Invoke-Step 'Code: private views, per-profile clearing, private tabs kept out of history and session' {
    $wv = Read-RepoText 'crates/webview-manager/src/webview2.rs'
    foreach ($need in 'SetIsInPrivateModeEnabled(private)', 'ClearBrowsingDataAll', 'GetProcessExtendedInfos') {
        if (-not $wv.Contains($need)) { Stop-Fail "webview2.rs no longer has '$need'." }
    }
    $content = Read-RepoText 'apps/desktop/src-tauri/src/content.rs'
    if ($content -notmatch '!private') { Stop-Fail 'content.rs no longer keeps private tabs out of the history.' }
    if ((Read-RepoText 'apps/desktop/src-tauri/src/session.rs') -notmatch '!i\.private') { Stop-Fail 'session.rs saves private tabs.' }
    $r = Assert-Cargo @('test', '--locked', '-p', 'ferrum-core', '--test', 'shortcuts')
    if ((Read-RepoText 'crates/core/tests/shortcuts.rs') -notmatch 'NewPrivateTab') { Stop-Fail 'No test for Ctrl+Shift+N.' }
    'present; shortcut tests passed'
}

$script:Inventory = ''
Invoke-Step 'Live test: storage kept per profile, clearing one site, private tabs, process inventory' {
    $r = Invoke-FerrumSmoke -Spec 'isolation'
    $line = ($r.Output -split "`r?`n" | Where-Object { $_ -match 'PROCESS-INVENTORY ' } | Select-Object -First 1)
    if ($line) { $script:Inventory = $line.Substring($line.IndexOf('PROCESS-INVENTORY ')) }
    Add-LogText (Get-Tail $r.Output 12)
    if ($r.ExitCode -ne 0 -or $r.Output -notmatch '4 passed') { Stop-Fail "The live test failed:`n$(Get-Tail $r.Output 30)" }
    if (-not $script:Inventory) { Stop-Fail 'The live test printed no process inventory.' }
    Add-LogText $script:Inventory
    'isolation: 4 passed; process inventory recorded'
}

Invoke-Step 'The shared-resources list on the tab and view manager page cites the evidence' {
    $page = Read-RepoText 'wiki/architecture/components/comp-webview-manager.md'
    if ($page -notmatch 'evidence/phase-p4-security/check-p4\.7') { Stop-Fail 'comp-webview-manager does not cite check-p4.7 evidence.' }
    if ($page -notmatch '(?i)shared') { Stop-Fail 'comp-webview-manager has no shared-resources list.' }
    'cited'
}

Complete-Check -SaveEvidence:$SaveEvidence
