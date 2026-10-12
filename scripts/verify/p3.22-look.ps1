#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p3.22 (P3 feature set): the Graphite look, themes as data, accent and density, the new-tab page and
  the split-tile logo (adr-0033).

.DESCRIPTION
  What it checks : (1) the settings tests: theme, accent and density with their defaults, unknown names refused;
                   (2) the shell's unit tests: every theme defines every colour for light and dark; the stylesheet
                   writes no colour of its own and uses only tokens a theme sets; (3) the smoke test "look": light or
                   dark follows Windows, Graphite's colours, accent and density change at once from Settings and are
                   saved, an empty tab shows the new-tab page, the shell loads only its own fonts and files, less
                   motion when Windows asks; plus the smoke tests the new look could disturb (bookmarks, address-bar
                   search, settings, sidebar, tabs, loading errors, start-up); (4) the program file carries the
                   split-tile logo (orange top-left, graphite bottom-right).
  Why            : you chose the Graphite look and logo 8, and asked that themes can be configured later → the look
                   must match the design, and every colour must come from a theme.
  What it changes: nothing in git. With -SaveEvidence it also copies the dark and light screenshots of the shell to
                   wiki/raw/evidence/phase-p3-tabs-sessions/design/ for your comparison with the frozen design.
  How long       : about 5 minutes after the first build.
  How to run     : pwsh -NoProfile -File scripts/verify/p3.22-look.ps1
                   Needs the local development certificate (task p2.1) and ports 8443 and 9339 free.
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p3.22 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1, scripts/lib/Ferrum.SelfTest.ps1). Phase-page verify field:
    Shell unit tests and smoke suite pass; a test fails if any shell colour is written outside the theme tokens;
    switching accent and density changes the shell without restart; screenshots in light and dark saved and compared
    with the frozen design by the owner; the program file carries the split-tile icon; no remote fonts or images are
    loaded by the shell (CSP unchanged).
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p3.22' -Title 'The Graphite look and the split-tile logo' -Phase 'phase-p3-tabs-sessions' `
    -Why 'the look must match your pick, and every colour must come from a theme.'

Invoke-Step 'Settings tests: theme, accent, density' {
    $r = Assert-Cargo @('test', '--locked', '-p', 'ferrum-core', '--test', 'config')
    if ($r.Output -notmatch 'appearance_theme_accent_density \.\.\. ok') { Stop-Fail 'The settings test for the look did not pass.' }
    'appearance_theme_accent_density: ok'
}

Invoke-Step 'Shell unit tests: themes are data, no colour outside a theme' {
    $t = Assert-NpmScript 'test' -Folder 'apps/desktop'
    foreach ($name in 'every theme defines every colour token for light and dark', 'style.css writes no colour of its own',
        'every token style.css uses is one a look sets') {
        if ($t.Output -notmatch [regex]::Escape($name)) { Stop-Fail "The unit test '$name' did not run." }
    }
    'npm test: pass'
}

Invoke-Step 'Smoke tests: the look, and the parts it could disturb' {
    $r = Invoke-FerrumSmoke -Spec 'look.spec', 'bookmarks.spec', 'address-search.spec', 'settings.spec', 'sidebar.spec', 'tabs.spec', 'loading-errors.spec', 'startup.spec'
    Add-LogText (Get-Tail $r.Output 14)
    if ($r.ExitCode -ne 0 -or $r.Output -match '\d+ failed') { Stop-Fail "The smoke tests failed:`n$(Get-Tail $r.Output 30)" }
    foreach ($name in 'light or dark follows Windows', 'an empty tab shows the new-tab page', 'accent colour and density change at once',
        'the shell loads only its own fonts and files') {
        if ($r.Output -notmatch [regex]::Escape($name)) { Stop-Fail "The smoke test '$name' did not run." }
    }
    if ($SaveEvidence) {
        $dir = Get-RepoPath 'wiki/raw/evidence/phase-p3-tabs-sessions/design'
        foreach ($n in 'look-dark.png', 'look-light.png') {
            $src = Join-Path (Get-RepoPath 'apps/desktop/tests/smoke/test-results') $n
            if (-not (Test-Path -LiteralPath $src)) { Stop-Fail "The screenshot $n was not made." }
            Copy-Item -LiteralPath $src -Destination (Join-Path $dir "p3.22-$n") -Force
        }
    }
    "look and neighbours: $(([regex]::Match($r.Output, '\d+ passed')).Value)"
}

Invoke-Step 'The program file carries the split-tile logo' {
    Add-Type -AssemblyName System.Drawing
    $exe = Get-RepoPath 'target/debug/ferrum-desktop.exe'
    if (-not (Test-Path -LiteralPath $exe)) { Stop-Fail 'target/debug/ferrum-desktop.exe is missing.' }
    $bmp = [System.Drawing.Icon]::ExtractAssociatedIcon($exe).ToBitmap()
    try {
        $o = $bmp.GetPixel([int]($bmp.Width * 0.25), [int]($bmp.Height * 0.12))
        $g = $bmp.GetPixel([int]($bmp.Width * 0.9), [int]($bmp.Height * 0.6))
    } finally { $bmp.Dispose() }
    if (-not ($o.R -ge 180 -and $o.G -ge 60 -and $o.G -le 170 -and $o.B -le 90)) { Stop-Fail "The top-left of the icon is not orange (R$($o.R) G$($o.G) B$($o.B))." }
    if (-not ($g.R -le 90 -and $g.G -le 90 -and $g.B -le 100 -and [math]::Abs($g.R - $g.B) -le 30)) { Stop-Fail "The bottom-right of the icon is not graphite (R$($g.R) G$($g.G) B$($g.B))." }
    "orange (R$($o.R) G$($o.G) B$($o.B)) and graphite (R$($g.R) G$($g.G) B$($g.B))"
}

Complete-Check -SaveEvidence:$SaveEvidence
