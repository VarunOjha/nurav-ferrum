#Requires -Version 7.0
<#
.SYNOPSIS
  Runs one of the Ferrum app's built-in self-tests (FERRUM_SELFTEST=<name>) against the local HTTPS test server.

.DESCRIPTION
  Used by the P2 check scripts. It builds the shell and the app (debug), starts the local test server
  (fixture-server, task p2.1) with a self-stop timer, runs the app in self-test mode, waits for both to finish by
  themselves (nothing is killed) and returns the self-test's JSON result. Needs the local development certificate
  installed (p2.1) and port 8443 free.
  Every self-test run gets its own throwaway settings file and data folder (New-SelfTestFolder), never the user's real
  ones; Ferrum refuses a self-test without them (fix found in p4.18).
  Dot-source after Ferrum.Check.psm1:  . scripts/lib/Ferrum.SelfTest.ps1; $r = Invoke-FerrumSelfTest -Name nav
#>
Set-StrictMode -Version Latest

function New-SelfTestFolder {
    <#
      A new throwaway folder for one self-test run, in the temp folder: settings that name it as Ferrum's data folder,
      and an own (empty) user settings file, so the run never reads or writes the user's real settings or WebView2 data.
      Returns { Dir, Args } (Args = the command-line arguments for Ferrum).
    #>
    param([Parameter(Mandatory)][string]$Name)
    $dir = Join-Path ([IO.Path]::GetTempPath()) "ferrum-selftest-$Name-$PID-$(Get-Random)"
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    $cfg = Join-Path $dir 'config.toml'
    Set-Content -LiteralPath $cfg -Value "[storage]`ndata_dir = $(ConvertTo-Json ($dir -replace '\\', '/'))"
    [pscustomobject]@{ Dir = $dir; Args = @('--config', $cfg, '--user-config', (Join-Path $dir 'user-config.toml')) }
}

function Invoke-FerrumSelfTest {
    param(
        [Parameter(Mandatory)][string]$Name,
        [int]$ServerSeconds = 50,
        [int]$AppTimeoutSeconds = 90
    )
    $b = Invoke-Npm -Arguments @('run', 'build') -Folder 'apps/desktop'
    if ($b.ExitCode -ne 0) { Stop-Fail "Shell build failed: $(Get-Tail $b.Output 5)" }
    [void](Assert-Cargo @('build', '--locked', '-p', 'ferrum-desktop', '-p', 'fixture-server'))
    $busy = Get-NetTCPConnection -LocalPort 8443 -State Listen -ErrorAction SilentlyContinue
    if ($busy) { Stop-Wait 'Port 8443 is in use (a test server from an earlier run may still be stopping); run the check again in a minute.' }
    $run = New-SelfTestFolder -Name $Name
    $out = Join-Path $run.Dir 'result.json'
    $server = Invoke-Native -NoWait -FilePath (Get-RepoPath 'target/debug/fixture-server.exe') -ArgumentList 'serve', '--port', '8443', '--exit-after', "$ServerSeconds"
    Start-Sleep -Seconds 2
    $app = Invoke-Native -NoWait -FilePath (Get-RepoPath 'target/debug/ferrum-desktop.exe') -ArgumentList $run.Args `
        -Environment @{ FERRUM_SELFTEST = $Name; FERRUM_SELFTEST_OUT = $out }
    if (-not $app.WaitForExit($AppTimeoutSeconds * 1000)) { Stop-Fail "The app did not finish its '$Name' self-test within $AppTimeoutSeconds s (left running; close it by hand)." }
    if ($app.ExitCode -eq 2) { Stop-Fail "Ferrum refused to start the '$Name' self-test (exit code 2: no own settings or data folder)." }
    [void]$server.WaitForExit(($ServerSeconds + 15) * 1000)
    if (-not (Test-Path -LiteralPath $out)) { Stop-Fail "The '$Name' self-test wrote no result." }
    $raw = Get-Content -LiteralPath $out -Raw
    [pscustomobject]@{ Raw = $raw; Result = ($raw | ConvertFrom-Json) }
}

function Invoke-FerrumSmoke {
    <#
      Runs smoke-test files of apps/desktop/tests/smoke (Playwright over CDP, adr-0031) after building the shell, the
      app and the test server. The suite starts and stops the test server and the app itself (nothing is killed).
      Returns { ExitCode, Output }. -Spec is one or more file-name filters (none or '' = the whole suite).
    #>
    param([string[]]$Spec = @())
    $b = Invoke-Npm -Arguments @('run', 'build') -Folder 'apps/desktop'
    if ($b.ExitCode -ne 0) { Stop-Fail "Shell build failed: $(Get-Tail $b.Output 5)" }
    [void](Assert-Cargo @('build', '--locked', '-p', 'ferrum-desktop', '-p', 'fixture-server'))
    $busy = Get-NetTCPConnection -LocalPort 8443, 8080, 9339 -State Listen -ErrorAction SilentlyContinue
    if ($busy) { Stop-Wait 'Port 8443, 8080 or 9339 is in use (an earlier test run may still be stopping); run the check again in a minute.' }
    $pwArgs = @('playwright', 'test') + @($Spec | Where-Object { $_ })
    $folder = Get-RepoPath 'apps/desktop/tests/smoke'
    if (-not (Test-Path -LiteralPath (Join-Path $folder 'node_modules'))) {
        $i = Invoke-Npm -Arguments @('install', '--no-fund', '--no-audit') -Folder 'apps/desktop/tests/smoke'
        if ($i.ExitCode -ne 0) { Stop-Fail "npm install for the smoke suite failed: $(Get-Tail $i.Output 5)" }
    }
    $npx = Join-Path (Split-Path -Parent (Find-Tool 'node')) 'npx.cmd'
    Invoke-Native -FilePath $npx -ArgumentList $pwArgs -WorkingDirectory $folder
}
