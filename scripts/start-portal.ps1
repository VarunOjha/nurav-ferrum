#Requires -Version 7.0
<#
.SYNOPSIS
  Starts the plan portal on this computer and opens it in your browser.

.DESCRIPTION
  What it does   : 1. finds Node.js (it is installed but not always on PATH);
                   2. installs the portal's packages the first time (npm ci);
                   3. checks that nothing else already uses the port;
                   4. builds the portal (about 1 minute);
                   5. starts it on http://127.0.0.1:3417/ and opens that page in your browser.
  Why            : the portal is how you follow the project → one command, the same every time, instead of
                   remembering folders, PATH fixes and npm commands.
  What it changes: nothing in the plan. It only writes the portal's build folder (interactive_plan/.next) and,
                   the first time, its packages (interactive_plan/node_modules). Both are ignored by git.
                   The portal is read-only: it shows the plan, it never edits it.
  Who can see it : only this computer. It listens on 127.0.0.1, so other machines on your network cannot open it.
  How long       : about 1 minute to start (a few minutes the very first time). It then keeps running.
  How to stop    : press Ctrl+C in this window (or close the window).
  How to run     : pwsh -NoProfile -File scripts/start-portal.ps1
                   pwsh -NoProfile -File scripts/start-portal.ps1 -Port 3500     (use another port)
                   pwsh -NoProfile -File scripts/start-portal.ps1 -NoBrowser     (do not open the browser)
                   pwsh -NoProfile -File scripts/start-portal.ps1 -CheckOnly     (steps 1-3 only, start nothing)
  Tell Claude    : nothing if the portal opens. If it stops with a red message, paste that message and say
                   "the portal did not start".

.PARAMETER Port
  The port to use. Default 3417.

.PARAMETER NoBrowser
  Start the portal but do not open the browser.

.PARAMETER CheckOnly
  Only check that Node.js, the packages and the port are ready; build and start nothing. Exit 0 = ready.
#>
[CmdletBinding()]
param(
    [ValidateRange(1024, 65535)][int]$Port = 3417,
    [switch]$NoBrowser,
    [switch]$CheckOnly
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$app = Join-Path $root 'interactive_plan'
$url = "http://127.0.0.1:$Port/"

function Say([string]$Text) { Write-Host $Text -ForegroundColor Cyan }
function Stop-WithMessage([string]$Text) { Write-Host $Text -ForegroundColor Red; exit 1 }

# --- Step 1: find Node.js ---------------------------------------------------------------------------
# Node is installed in C:\Program Files\nodejs but that folder is not always on PATH. We look on PATH
# first, then in the standard folder, and add it to PATH for this window only (nothing permanent).
Say 'Step 1 of 5: looking for Node.js'
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    $standard = Join-Path $env:ProgramFiles 'nodejs'
    if (Test-Path -LiteralPath (Join-Path $standard 'node.exe')) {
        $env:PATH = "$standard;$env:PATH"
        $node = Get-Command node -ErrorAction SilentlyContinue
    }
}
if (-not $node) { Stop-WithMessage 'Node.js was not found. Ask Claude to install Node 24 (it runs the installer; you click the Windows prompt).' }
$version = (& node --version).Trim()
if ($version -notmatch '^v(\d+)\.(\d+)') { Stop-WithMessage "Could not read the Node.js version ('$version')." }
$major = [int]$Matches[1]; $minor = [int]$Matches[2]
if ($major -lt 24 -or ($major -eq 24 -and $minor -lt 15) -or $major -ge 27) {
    Stop-WithMessage "Node.js $version is installed, but the portal needs Node 24.15 or newer (below 27). Ask Claude to update it."
}
Write-Host "  found Node.js $version"

# --- Step 2: install the portal's packages the first time ----------------------------------------------
# npm ci installs exactly the versions recorded in package-lock.json, so every machine gets the same code.
Say 'Step 2 of 5: checking the portal packages'
if (-not (Test-Path -LiteralPath (Join-Path $app 'node_modules/next/package.json'))) {
    if ($CheckOnly) { Stop-WithMessage '  packages are not installed yet (run without -CheckOnly to install them).' }
    Write-Host '  first run: installing packages (a few minutes)'
    Push-Location -LiteralPath $app
    try { & npm ci --no-audit --no-fund; if ($LASTEXITCODE -ne 0) { Stop-WithMessage 'Installing the packages failed (see the lines above).' } }
    finally { Pop-Location }
} else {
    Write-Host '  packages already installed'
}

# --- Step 3: make sure the port is free ----------------------------------------------------------------
# If something already listens on the port, it is most likely the portal you started earlier: we just
# open the page instead of starting a second copy.
Say "Step 3 of 5: checking that port $Port is free"
$busy = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
if ($busy.Count -gt 0) {
    if ($CheckOnly) { Stop-WithMessage "  port $Port is already in use (maybe the portal is already running at $url)." }
    Write-Host "  port $Port is already in use: the portal is probably running already. Opening $url" -ForegroundColor Yellow
    if (-not $NoBrowser) { Start-Process $url }
    exit 0
}
Write-Host "  port $Port is free"
if ($CheckOnly) { Write-Host 'Ready: Node.js, packages and port are fine. Nothing was started (-CheckOnly).' -ForegroundColor Green; exit 0 }

# --- Step 4: build the portal ----------------------------------------------------------------------------
# A fresh build each time, so the portal always shows the latest plan text Claude wrote.
Say 'Step 4 of 5: building the portal (about 1 minute)'
Push-Location -LiteralPath $app
try { & npm run build; if ($LASTEXITCODE -ne 0) { Stop-WithMessage 'The build failed (see the lines above).' } }
finally { Pop-Location }

# --- Step 5: start it and open the browser -----------------------------------------------------------------
# scripts/serve.mjs always binds 127.0.0.1 (this computer only) on PLAN_PORT. We wait until the page
# answers, open it, then keep the server running in this window until you press Ctrl+C.
Say "Step 5 of 5: starting the portal at $url"
$env:PLAN_PORT = [string]$Port
$server = Start-Process -FilePath $node.Source -ArgumentList 'scripts/serve.mjs', 'start' -WorkingDirectory $app -NoNewWindow -PassThru
$ready = $false
foreach ($i in 1..60) {
    if ($server.HasExited) { break }
    try { $null = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2; $ready = $true; break } catch { Start-Sleep -Milliseconds 500 }
}
if (-not $ready) {
    if (-not $server.HasExited) { Stop-Process -Id $server.Id -ErrorAction SilentlyContinue }
    Stop-WithMessage 'The portal did not answer within 30 seconds (see the lines above).'
}
Write-Host ''
Write-Host "The portal is running at $url" -ForegroundColor Green
Write-Host 'Leave this window open while you use it. Press Ctrl+C here to stop it.'
if (-not $NoBrowser) { Start-Process $url }
Wait-Process -Id $server.Id
