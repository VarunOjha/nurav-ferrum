#Requires -Version 7.0
<#
.SYNOPSIS
  Opens spike S1 (experiment 1) for your hand checks: Alt+Tab focus, window resize, text shortcuts.

.DESCRIPTION
  What it does   : builds the throw-away experiment app if it is not built yet, then opens it in normal
                   ("manual") mode: one window, a dark tab bar at the top, three coloured tabs below.
  What it changes: nothing in git. Build output goes to ignored folders (dist/, src-tauri/target/).
  How long       : a few seconds (first build: about 2 minutes).
  How to run     : pwsh -NoProfile -File spikes/s1-multiwebview/run-manual.ps1   (from the repo folder)
  When done      : close the window with its X button. The script then ends by itself.
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$exe = Join-Path $PSScriptRoot 'src-tauri/target/debug/ferrum-spike-s1.exe'
if (-not (Test-Path -LiteralPath $exe)) {
    $env:Path = "$env:ProgramFiles\nodejs;$env:USERPROFILE\.cargo\bin;$env:Path"
    npm install --no-fund --no-audit
    npm run build
    Push-Location src-tauri; cargo build --locked; Pop-Location
}
$env:FERRUM_SPIKE_MODE = 'manual'
Write-Host 'Experiment 1 is open. Do the checks, then close its window with the X button.' -ForegroundColor Cyan
& $exe
Write-Host 'Window closed. Tell Claude what you saw.' -ForegroundColor Cyan
