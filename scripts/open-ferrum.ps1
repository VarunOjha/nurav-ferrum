#Requires -Version 7.0
<#
.SYNOPSIS
  Opens the release build of Ferrum for a hands-on review.

.DESCRIPTION
  What it does   : starts target\release\ferrum-desktop.exe (the release build the last gate made) with your normal
                   settings and data. If the release build is missing it says so and builds nothing.
  Why            : the end-of-phase checklists (docs/testing/manual-checklist-p3.md) are done on the release build.
  What it changes: nothing in the project; Ferrum keeps its own settings and data in %APPDATA% and %LOCALAPPDATA%.
  How long       : Ferrum opens in a few seconds; close it with the window's X when you are done.
  How to run     : pwsh -NoProfile -File scripts/open-ferrum.ps1
  Tell Claude    : your checklist results.
#>
[CmdletBinding()]
param()
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$exe = Join-Path $PSScriptRoot '..\target\release\ferrum-desktop.exe'
if (-not (Test-Path -LiteralPath $exe)) {
    Write-Host 'The release build is missing. Ask Claude to build it (npm run tauri -- build --no-bundle in apps/desktop).'
    exit 2
}
Start-Process -FilePath (Resolve-Path -LiteralPath $exe)
Write-Host 'Ferrum is open. Work through docs/testing/manual-checklist-p3.md, then close Ferrum and tell Claude the results.'
