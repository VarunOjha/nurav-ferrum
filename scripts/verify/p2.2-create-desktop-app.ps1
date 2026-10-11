#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p2.2 (P2 First working app): Create the desktop app.

.DESCRIPTION
  What it checks : the Ferrum app in apps/desktop builds in release mode with the pinned Tauri command-line tool;
                   the built app opens a window that shows the shell (a picture of the window is saved), and it
                   closes by itself (test switch FERRUM_EXIT_AFTER); the Tauri tool, Vite and TypeScript are
                   pinned exactly; the app crate forbids unsafe code.
  Why            : the first real Ferrum needs a home → create the Tauri app with the shell in TypeScript → later
                   tasks fill it in.
  What it changes: nothing in git. Builds go to ignored folders (target/, apps/desktop/dist/). A window opens for
                   about 10 seconds and closes by itself.
  How long       : about 1 minute (a first release build takes about 3 minutes).
  How to run     : pwsh -NoProfile -File scripts/verify/p2.2-create-desktop-app.ps1
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p2.2 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). Phase-page verify field: release build via the pinned Tauri CLI
                   exits 0 (output saved); app window opens and shows the shell (screenshot saved).
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Capture-Window.ps1')

Start-Check -Id 'p2.2' -Title 'Create the desktop app' -Phase 'phase-p2-minimal-container' `
    -Why 'every later task builds on the real app.'

$app = 'apps/desktop'
$exe = 'target/release/ferrum-desktop.exe'

Invoke-Step 'Tauri tool, Vite and TypeScript are pinned exactly; the app forbids unsafe code' {
    $bad = Get-InexactVersions "$app/package.json" -Only '@tauri-apps/cli', '@tauri-apps/api', 'vite', 'typescript'
    if ($bad.Count) { Stop-Fail "Not pinned exactly: $($bad -join ', ')." }
    if ((Read-RepoText "$app/src-tauri/src/main.rs") -notmatch '#!\[forbid\(unsafe_code\)\]') { Stop-Fail 'apps/desktop/src-tauri/src/main.rs does not forbid unsafe code.' }
    'pins exact; #![forbid(unsafe_code)]'
}

Invoke-Step 'Release build with the pinned Tauri tool' {
    $r = Invoke-Npm -Arguments @('run', 'tauri', '--', 'build', '--no-bundle') -Folder $app
    Add-LogText (Get-Tail $r.Output 6)
    if ($r.ExitCode -ne 0) { Stop-Fail "tauri build failed (exit $($r.ExitCode)):`n$(Get-Tail $r.Output 10)" }
    if (-not (Test-Path -LiteralPath (Get-RepoPath $exe))) { Stop-Fail "The build finished but $exe is missing." }
    'npm run tauri -- build --no-bundle: exit 0'
}

Invoke-Step 'The window opens, shows the shell, and closes by itself' {
    $pic = Join-Path ([IO.Path]::GetTempPath()) "ferrum-p2.2-window-$PID.png"
    $env:FERRUM_EXIT_AFTER = '10'
    try {
        $p = Start-Process -FilePath (Get-RepoPath $exe) -PassThru
        Start-Sleep -Seconds 4
        $shot = Save-WindowPicture -ProcessId $p.Id -Path $pic
        if (-not $p.WaitForExit(30000)) { Stop-Fail 'The app did not close by itself within 30 s (it is left running; close it by hand).' }
        if ($p.ExitCode -ne 0) { Stop-Fail "The app exited with code $($p.ExitCode)." }
    }
    finally { Remove-Item Env:FERRUM_EXIT_AFTER -ErrorAction SilentlyContinue }
    # The toolbar band must not be blank: sample a grid of pixels over it (below the title bar) and require
    # several distinct colours (buttons, the address bar, its border and its text).
    $bmp = [System.Drawing.Bitmap]::FromFile($pic)
    try {
        $colours = @(for ($y = [int]($bmp.Height * 0.06); $y -lt [int]($bmp.Height * 0.14); $y += 3) {
                for ($x = 20; $x -lt [int]($bmp.Width * 0.5); $x += 3) { $bmp.GetPixel($x, $y).ToArgb() }
            }) | Sort-Object -Unique
    }
    finally { $bmp.Dispose() }
    if ($colours.Count -lt 5) { Stop-Fail "The toolbar band looks blank ($($colours.Count) colour(s)); picture: $pic" }
    if ($SaveEvidence) {
        $dest = Get-RepoPath 'wiki/raw/evidence/phase-p2-minimal-container/p2.2-window-check.png'
        if (-not (Test-Path -LiteralPath $dest)) { Copy-Item -LiteralPath $pic -Destination $dest }
    }
    "window $($shot.Width)x$($shot.Height); toolbar shows $($colours.Count) colours; exited by itself (code 0)"
}

Complete-Check -SaveEvidence:$SaveEvidence
