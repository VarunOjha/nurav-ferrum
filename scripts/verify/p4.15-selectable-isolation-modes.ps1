#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p4.15 (P4 Security): Selectable isolation modes.

.DESCRIPTION
  What it checks : (1) unit tests: the settings file accepts the three modes (shared, per-site, per-site-udf), gives
                   each site its own data folder only in per-site-udf (empty and private tabs stay with the shell), and
                   refuses an unknown mode; (2) the code: Ferrum makes a separate WebView2 environment for a site's own
                   data folder, with the same browser options as the shell's, and closes every tab view before it exits;
                   (3) live tests: the same two test sites run in each mode. Each site's cookie, localStorage and
                   IndexedDB stay with that site; a site moved to another named profile sees an empty store under
                   per-site and per-site-udf but its own data under shared; the browser processes are counted per mode;
                   a mode change in the settings file applies after a restart; an unknown mode is refused (Ferrum starts
                   with the standard mode and logs why).
  Why            : Isolation has a cost → three modes set in the settings file (shared, a profile per site, a data
                   folder per site), observed rather than assumed → P6 can compare them.
  What it changes: nothing (builds the app and the test pages in target/; test data under the smoke-test folder).
                   With -SaveEvidence it also writes the process counts per mode to
                   wiki/raw/evidence/phase-p4-security/isolation-modes.md.
  How long       : about three minutes (builds, then Ferrum opens and closes by itself six times).
  How to run     : pwsh -NoProfile -File scripts/verify/p4.15-selectable-isolation-modes.ps1
  Result         : PASS (every checked step is fine) or FAIL (the line says what).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p4.15 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers: scripts/lib/Ferrum.Check.psm1).
    Do not use the PC while the live tests run. Phase-page verify field: Integration test runs the same two-site
    fixture in each mode and asserts the expected storage separation (cookies, localStorage, IndexedDB); process
    inspection records browser-process count per mode to raw/evidence/phase-p4-security/isolation-modes.md; mode switch
    takes effect after restart and is rejected for invalid values; any mode found infeasible is recorded as such with
    the observed error, not silently dropped.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p4.15' -Title 'Selectable isolation modes' -Phase 'phase-p4-security' `
    -Why 'P6 can compare them.'

$cargoBin = Join-Path $env:USERPROFILE '.cargo/bin'
if ((Test-Path -LiteralPath $cargoBin) -and ($env:PATH -notlike "*$cargoBin*")) { $env:PATH = "$cargoBin;$env:PATH" }

Invoke-Step 'Unit tests: three modes accepted, own folders only in per-site-udf, unknown mode refused' {
    $r = Assert-Cargo @('test', '--locked', '-p', 'ferrum-core', '--test', 'profiles')
    foreach ($n in 'per_site_udf_mode_gives_each_site_profile_its_own_folder', 'an_unknown_isolation_mode_is_refused', 'settings_choose_the_profile') {
        if ($r.Output -notmatch "(?m)^test (\S+::)?$n \.\.\. ok") { Stop-Fail "Test '$n' did not run or did not pass." }
    }
    'three unit tests passed'
}

Invoke-Step 'The code makes a site environment with the shell''s options and closes every view before exit' {
    $wv = Read-RepoText 'crates/webview-manager/src/webview2.rs'
    foreach ($n in 'CreateCoreWebView2EnvironmentWithOptions', 'set_additional_browser_arguments\(SHELL_BROWSER_ARGUMENTS', 'pub fn close_all_views') {
        if ($wv -notmatch $n) { Stop-Fail "webview2.rs does not contain $n." }
    }
    if ((Read-RepoText 'apps/desktop/src-tauri/src/main.rs') -notmatch 'ExitRequested[\s\S]{0,120}close_all_views\(\)') {
        Stop-Fail 'main.rs does not close the tab views when Ferrum is asked to exit.'
    }
    'site environment made with the shell''s browser arguments; views closed on exit'
}

$script:Modes = @()
Invoke-Step 'Live tests: the two-site fixture in each mode; restart and unknown-mode cases' {
    $r = Invoke-FerrumSmoke -Spec @('isolation-modes')
    $script:Modes = @($r.Output -split "`r?`n" | Where-Object { $_ -match 'ISOLATION-MODE ' } |
        ForEach-Object { $_.Substring($_.IndexOf('ISOLATION-MODE ') + 15) | ConvertFrom-Json })
    Add-LogText (Get-Tail $r.Output 10)
    if ($r.ExitCode -ne 0 -or $r.Output -notmatch '4 passed') { Stop-Fail "The live tests failed:`n$(Get-Tail $r.Output 30)" }
    $got = ($script:Modes | ForEach-Object mode) -join ','
    if ($got -ne 'shared,per-site,per-site-udf') { Stop-Fail "Process counts were not printed for all three modes (got: $got)." }
    foreach ($m in $script:Modes) { Add-LogText ("ISOLATION-MODE " + ($m | ConvertTo-Json -Compress -Depth 4)) }
    'isolation-modes: 4 passed (shared, per-site, per-site-udf; restart and unknown mode)'
}

if ($SaveEvidence -and $script:Modes.Count -eq 3) {
    $rows = foreach ($m in $script:Modes) {
        $k = $m.kinds
        '| `{0}` | {1} | {2} | {3} | {4} | {5} | {6} | {7} |' -f $m.mode, $m.cfg, ($m.environments -join ', '), $m.browsers,
            $k.renderer, $k.gpu, $k.utility, $m.processes
    }
    $md = @(
        '# p4.15 isolation modes: processes per mode (observed)', '',
        ('Run: {0} at commit {1}, debug build, by `scripts/verify/p4.15-selectable-isolation-modes.ps1 -SaveEvidence`.' -f (Get-Date -Format 'yyyy-MM-dd HH:mm'), (Get-GitCommit)),
        'Fixture: two test sites (site-a.localhost, site-b.localhost) open in two tabs, plus the empty start tab; counts from',
        'WebView2 GetProcessExtendedInfos of every environment (test hook `test_processes`). One run each; not a measurement',
        'of cost (that is P6, exp-isolation-overhead).', '',
        '| Mode | Configuration | Environments | Browser processes | Renderers | GPU | Utility | All processes |',
        '|---|---|---|---|---|---|---|---|'
    ) + $rows + @('', 'No mode was found infeasible in this run: all three passed their storage tests (check-p4.15.txt).', '')
    $written = Save-Evidence -Path 'wiki/raw/evidence/phase-p4-security/isolation-modes.md' -Text ($md -join "`n")
    Write-Host "Evidence saved (masked): $written" -ForegroundColor Cyan
}

Complete-Check -SaveEvidence:$SaveEvidence
