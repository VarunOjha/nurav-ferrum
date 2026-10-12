#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p3.16 (P3 Tabs and sessions): The fixes from your first P3 review.

.DESCRIPTION
  What it checks : (1) the shell's unit tests, with the rules for tab icons and for "this tab showed a page"; (2) the
                   smoke test "downloads": a download a site opens in a new window completes, its extra tab closes and
                   no error panel shows; (3) the smoke test "tabs": a page's own icon appears in its tab, a page
                   without one shows none; (4) the program file carries the new app icon (orange, not the old dark
                   square).
  Why            : in your review a download looked failed (its new tab showed an error), tabs had no site icons and
                   the app icon was barely visible → each fix has a test → the problems stay fixed.
  What it changes: nothing in git.
  How long       : about 1 minute after the first build.
  How to run     : pwsh -NoProfile -File scripts/verify/p3.16-review-fixes.ps1
                   Needs the local development certificate (task p2.1) and ports 8443 and 9339 free.
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p3.16 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1, scripts/lib/Ferrum.SelfTest.ps1). Phase-page verify field:
    Shell unit tests cover the icon and page rules; smoke tests: a download opened in a new window completes, its
    extra tab closes and no error panel shows; a page's own icon appears in its tab, a page without one shows none;
    the program file carries the new icon (orange, not the old dark square).
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p3.16' -Title 'The fixes from your first P3 review' -Phase 'phase-p3-tabs-sessions' `
    -Why 'the problems you found stay fixed.'

Invoke-Step 'Shell unit tests (icon and page rules included)' {
    $t = Assert-NpmScript 'test' -Folder 'apps/desktop'
    foreach ($name in "tab icons are the app's PNG data addresses only", 'a tab showed a page only after a web page loaded') {
        if ($t.Output -notmatch [regex]::Escape($name)) { Stop-Fail "The unit test '$name' did not run." }
    }
    'npm test: pass (both new tests included)'
}

Invoke-Step 'Smoke tests: download in a new window, site icons' {
    $r = Invoke-FerrumSmoke -Spec 'downloads.spec', 'tabs.spec'
    Add-LogText (Get-Tail $r.Output 10)
    if ($r.ExitCode -ne 0 -or $r.Output -match '\d+ failed') { Stop-Fail "The smoke tests failed:`n$(Get-Tail $r.Output 20)" }
    foreach ($name in 'a download opened in a new window', "a tab shows its site's icon") {
        if ($r.Output -notmatch [regex]::Escape($name)) { Stop-Fail "The smoke test '$name' did not run." }
    }
    "downloads + tabs: $(([regex]::Match($r.Output, '\d+ passed')).Value)"
}

Invoke-Step 'The program file carries the new app icon' {
    # The smoke step above built target/debug/ferrum-desktop.exe; its icon is read back from the file itself.
    Add-Type -AssemblyName System.Drawing
    $exe = Get-RepoPath 'target/debug/ferrum-desktop.exe'
    if (-not (Test-Path -LiteralPath $exe)) { Stop-Fail 'target/debug/ferrum-desktop.exe is missing.' }
    $bmp = [System.Drawing.Icon]::ExtractAssociatedIcon($exe).ToBitmap()
    try {
        # A point on the orange tile, away from the white F (upper right).
        $p = $bmp.GetPixel([int]($bmp.Width * 0.85), [int]($bmp.Height * 0.2))
    } finally { $bmp.Dispose() }
    if (-not ($p.R -ge 180 -and $p.G -ge 50 -and $p.G -le 150 -and $p.B -le 80)) {
        Stop-Fail "The program's icon is not the new orange one (sampled colour R$($p.R) G$($p.G) B$($p.B))."
    }
    "orange tile (sampled R$($p.R) G$($p.G) B$($p.B))"
}

Complete-Check -SaveEvidence:$SaveEvidence
