#Requires -Version 7.0
<#
.SYNOPSIS
  Runs one of the Ferrum app's built-in self-tests (FERRUM_SELFTEST=<name>) against the local HTTPS test server.

.DESCRIPTION
  Used by the P2 check scripts. It builds the shell and the app (debug), starts the local test server
  (fixture-server, task p2.1) with a self-stop timer, runs the app in self-test mode, waits for both to finish by
  themselves (nothing is killed) and returns the self-test's JSON result. Needs the local development certificate
  installed (p2.1) and port 8443 free.
  Dot-source after Ferrum.Check.psm1:  . scripts/lib/Ferrum.SelfTest.ps1; $r = Invoke-FerrumSelfTest -Name nav
#>
Set-StrictMode -Version Latest

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
    $out = Join-Path ([IO.Path]::GetTempPath()) "ferrum-selftest-$Name-$PID.json"
    $server = Start-Process -FilePath (Get-RepoPath 'target/debug/fixture-server.exe') -ArgumentList 'serve', '--port', '8443', '--exit-after', "$ServerSeconds" -PassThru -WindowStyle Hidden
    Start-Sleep -Seconds 2
    $env:FERRUM_SELFTEST = $Name; $env:FERRUM_SELFTEST_OUT = $out
    try {
        $app = Start-Process -FilePath (Get-RepoPath 'target/debug/ferrum-desktop.exe') -PassThru
        if (-not $app.WaitForExit($AppTimeoutSeconds * 1000)) { Stop-Fail "The app did not finish its '$Name' self-test within $AppTimeoutSeconds s (left running; close it by hand)." }
    }
    finally { Remove-Item Env:FERRUM_SELFTEST, Env:FERRUM_SELFTEST_OUT -ErrorAction SilentlyContinue }
    [void]$server.WaitForExit(($ServerSeconds + 15) * 1000)
    if (-not (Test-Path -LiteralPath $out)) { Stop-Fail "The '$Name' self-test wrote no result." }
    $raw = Get-Content -LiteralPath $out -Raw
    [pscustomobject]@{ Raw = $raw; Result = ($raw | ConvertFrom-Json) }
}
