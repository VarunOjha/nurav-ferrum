#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p2.6 (P2 First working app): Show a website and track it.

.DESCRIPTION
  What it checks : the content view is a WebView2 controller Ferrum creates itself (decision 29), with all raw
                   WebView2 code in the one audited module (decision 19): unsafe code is denied everywhere else and
                   every unsafe block there carries a safety comment (checked by the code checker). Then the app's
                   built-in navigation self-test: the content view visits two local test pages over HTTPS, and for
                   each the app reports "navigation starting" → "address changed" → "navigation completed" (success,
                   HTTP 200) in that order, and the shell receives the same events in the same order.
  Why            : the shell must always know where the page is → the content view reports its address and
                   loading state → the address bar and the spinner are always right.
  What it changes: nothing in git. Builds go to ignored folders. The test server and the app run for under a
                   minute and stop by themselves.
  How long       : about a minute.
  How to run     : pwsh -NoProfile -File scripts/verify/p2.6-show-website.ps1
                   Needs the local development certificate (task p2.1) and port 8443 free.
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p2.6 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1, scripts/lib/Ferrum.SelfTest.ps1). Phase-page verify field:
                   integration test navigates to two fixture pages and asserts the shell receives URL and
                   load-state events in order.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p2.6' -Title 'Show a website and track it' -Phase 'phase-p2-minimal-container' `
    -Why 'the address bar and spinner are always right.'

Invoke-Step 'Raw WebView2 code is confined to one audited module' {
    $lib = Read-RepoText 'crates/webview-manager/src/lib.rs'
    if ($lib -notmatch '#!\[deny\(unsafe_code\)\]' -or $lib -notmatch '#!\[deny\(clippy::undocumented_unsafe_blocks\)\]') { Stop-Fail 'webview-manager must deny unsafe code and undocumented unsafe blocks at its root.' }
    $withUnsafe = @(Get-ChildItem -LiteralPath (Get-RepoPath 'crates'), (Get-RepoPath 'apps/desktop/src-tauri/src') -Recurse -Filter '*.rs' |
            Where-Object { (Get-Content -LiteralPath $_.FullName -Raw) -match 'unsafe\s*\{|allow\(unsafe_code\)' } |
            ForEach-Object { [IO.Path]::GetRelativePath((Get-RepoRoot), $_.FullName).Replace('\', '/') })
    if ($withUnsafe.Count -ne 1 -or $withUnsafe[0] -ne 'crates/webview-manager/src/webview2.rs') { Stop-Fail "Unsafe code outside the audited module: $($withUnsafe -join ', ')." }
    [void](Assert-Cargo @('clippy', '--locked', '-p', 'ferrum-webview-manager', '--all-targets', '--', '-D', 'warnings'))
    'unsafe only in crates/webview-manager/src/webview2.rs; clippy (incl. undocumented_unsafe_blocks) clean'
}

Invoke-Step 'Self-test: two pages, events in order, the shell receives them' {
    $st = Invoke-FerrumSelfTest -Name 'nav'
    $r = $st.Result
    Add-LogText $st.Raw
    if ($SaveEvidence) {
        $dest = 'wiki/raw/evidence/phase-p2-minimal-container/p2.6-nav-selftest.json'
        if (-not (Test-Path -LiteralPath (Get-RepoPath $dest))) { [void](Save-Evidence -Path $dest -Text $st.Raw) }
    }
    if (-not $r.content_ready) { Stop-Fail 'The content view was not created.' }
    $bad = @($r.pages | Where-Object { -not $_.in_order } | ForEach-Object url)
    if ($bad.Count) { Stop-Fail "Events not in order for: $($bad -join ', ')." }
    if (-not $r.shell_received_in_order) { Stop-Fail 'The shell did not receive the events in order.' }
    "$(@($r.pages).Count) pages in order; the shell received $($r.shell_events) events in order"
}

Complete-Check -SaveEvidence:$SaveEvidence
