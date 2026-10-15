#Requires -Version 7.0
<#
.SYNOPSIS
  Ferrum's security test suite (P4 task p4.11): every security test in one command, apart from performance tests.

.DESCRIPTION
  What it checks : the ten security areas of the master prompt (section 11) and the additions of the security testing
                   page, each by its tests (the table below, also on wiki/quality/qual-security-testing-plan.md §5):
                   (1) the security engine's tests, including the allowlist cases; (2) the other Rust and shell unit
                   tests; (3) the IPC self-test (a website tries every way into the app); (4) the live security tests
                   (Playwright against a test build, local test pages, plus Microsoft's SmartScreen demo page);
                   (5) the release build scan (no "no security" benchmark switch); (6) the app never sets a debugging
                   port itself.
  Why            : a security claim needs a test → one command runs every security test → you can rerun all of them
                   after any change and see each area's result.
  What it changes: nothing in the repo (builds in target/debug and target/security-static, never target/release; test
                   data in the smoke-test folder and the temp folder). The live tests open one Microsoft demo page.
  How long       : about fifteen minutes (builds, unit tests, then Ferrum opens and closes by itself many times).
  How to run     : pwsh -NoProfile -File scripts/security-suite.ps1   (add -SaveEvidence to keep the result)
  Result         : PASS (every area's tests passed) or FAIL (the line says which area).
  Tell Claude    : "security suite passed", or paste the FAIL lines.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers: scripts/lib/Ferrum.Check.psm1).
    Do not use the PC while the live tests run. Needs internet for the SmartScreen demo page. Evidence:
    wiki/raw/evidence/phase-p4-security/security-suite.txt (P4 test gate).
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot 'lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'security-suite' -Title 'Security test suite (master prompt section 11, items 1 to 10)' -Phase 'phase-p4-security' `
    -Why 'you can rerun every security test after any change and see each area''s result.'

$cargoBin = Join-Path $env:USERPROFILE '.cargo/bin'
if ((Test-Path -LiteralPath $cargoBin) -and ($env:PATH -notlike "*$cargoBin*")) { $env:PATH = "$cargoBin;$env:PATH" }

# Item -> tests. Rust tests by name, live tests by spec file (apps/desktop/tests/smoke/<name>.spec.ts).
$map = [ordered]@{
    '1 Blocked-domain navigation (SEC-01)'            = @{ rust = @('allowlist_more_specific_than_block_wins', 'allowlist_only_mode_denies_everything_not_listed'); live = @('security-navigation', 'security-settings') }
    '2 External protocol handling (SEC-02)'           = @{ rust = @(); live = @('external-schemes', 'new-windows-links') }
    '3 Unauthorized native command invocation (SEC-03)' = @{ rust = @(); live = @('app-origin'); selftest = $true }
    '4 Cross-origin access attempts (SEC-04)'         = @{ rust = @(); live = @('cross-origin') }
    '5 Permission denial (SEC-05)'                    = @{ rust = @(); live = @('permissions', 'security-settings') }
    '6 Session data isolation (SEC-06)'               = @{ rust = @(); live = @('isolation', 'isolation-modes', 'profiles') }
    '7 Download handling (SEC-07)'                    = @{ rust = @(); live = @('safe-downloads', 'downloads') }
    '8 Redirect-based policy bypass (SEC-08)'         = @{ rust = @(); live = @('security-navigation', 'redirects') }
    '9 Malformed URL handling (SEC-09)'               = @{ rust = @(); live = @('security-navigation') }
    '10 Recovery after renderer crashes (SEC-10)'     = @{ rust = @(); live = @('crash-recovery') }
    'Additions: audit log (SEC-14), SmartScreen'      = @{ rust = @(); live = @('audit-log', 'smartscreen') }
}
Add-LogText ("Item -> tests:`n" + (($map.Keys | ForEach-Object {
                $m = $map[$_]
                $parts = @($m.live | ForEach-Object { "$_.spec" }) + @($m.rust) + $(if ($m.ContainsKey('selftest')) { @('IPC self-test') } else { @() })
                "  $_ : $($parts -join ', ')"
            }) -join "`n"))

Invoke-Step 'Security engine tests (rules, allowlist and blocklist, malformed addresses; 100 percent branch coverage in p4.2)' {
    $r = Assert-Cargo @('test', '--locked', '-p', 'ferrum-security')
    foreach ($n in @($map.Values | ForEach-Object { $_.rust }) | Sort-Object -Unique) {
        if ($r.Output -notmatch "(?m)^test (\S+::)?$n \.\.\. ok") { Stop-Fail "Test '$n' did not run or did not pass." }
    }
    (($r.Output -split "`r?`n" | Where-Object { $_ -match '^test result' }) -join '; ')
}

Invoke-Step 'Other unit tests: app, tab and view manager, core; shell' {
    $r = Assert-Cargo @('test', '--locked', '-p', 'ferrum-desktop', '-p', 'ferrum-webview-manager', '-p', 'ferrum-core')
    $s = Invoke-Npm -Arguments @('run', 'test') -Folder 'apps/desktop'
    if ($s.ExitCode -ne 0) { Stop-Fail "Shell unit tests failed:`n$(Get-Tail $s.Output 15)" }
    $passed = 0; foreach ($m in [regex]::Matches($r.Output, '(?m)^test result: ok\. (\d+) passed')) { $passed += [int]$m.Groups[1].Value }
    "$passed Rust tests passed; shell: $((($s.Output -split "`r?`n") | Where-Object { $_ -match '^ℹ pass' }) -join '')"
}

Invoke-Step 'Item 3: IPC self-test, a website tries every way into the app' {
    $st = Invoke-FerrumSelfTest -Name 'ipc'
    $r = $st.Result
    if ($null -eq $r.tauri_view.report) { Stop-Fail 'The probe page did not load in the Tauri view.' }
    if (-not $r.tauri_view.all_calls_refused) { Stop-Fail 'A bridge call from the website was NOT refused.' }
    if (-not $r.content_view.no_bridge) { Stop-Fail 'A Ferrum-created tab view exposes a bridge.' }
    'every probed call refused; tab views have no bridge (own throwaway settings and data folder)'
}

Invoke-Step 'Live security tests (items 1 to 10, audit log, SmartScreen)' {
    $specs = @($map.Values | ForEach-Object { $_.live }) | Sort-Object -Unique
    $r = Invoke-FerrumSmoke -Spec $specs
    Add-LogText (Get-Tail $r.Output 12)
    if ($r.ExitCode -ne 0 -or $r.Output -match '(?m)^\s+\d+ failed') { Stop-Fail "Live security tests failed:`n$(Get-Tail $r.Output 40)" }
    foreach ($s in $specs) {
        if ($r.Output -notmatch [regex]::Escape("$s.spec.ts")) { Stop-Fail "Spec $s.spec.ts did not run." }
    }
    (($r.Output -split "`r?`n" | Where-Object { $_ -match '^\s+\d+ passed' } | Select-Object -Last 1).Trim()) + " ($($specs.Count) spec files)"
}

Invoke-Step 'Release build scan: no "no security" benchmark switch (SEC-12; own build folder)' {
    $r = Invoke-ChildScript 'scripts/security-static-check.ps1'
    Add-LogText (Get-Tail $r.Output 12)
    if ($r.ExitCode -ne 0) { Stop-Fail "The release build scan failed:`n$(Get-Tail $r.Output 20)" }
    'release build has no bench-nosecurity feature or marker texts; positive control found them in the benchmark build'
}

Invoke-Step 'The app never sets a debugging port itself (SEC-11)' {
    $hits = foreach ($root in 'apps/desktop/src-tauri/src', 'crates') {
        Get-ChildItem -LiteralPath (Get-RepoPath $root) -Recurse -Filter '*.rs' | Where-Object FullName -notmatch '\\target\\' |
            Select-String -Pattern 'remote-debugging-port' | ForEach-Object { "$($_.Path):$($_.LineNumber)" }
    }
    if ($hits) { Stop-Fail "The app's code mentions the debugging port:`n$($hits -join "`n")" }
    'no remote-debugging-port in the app''s code (tests and benchmarks set it for their own runs only)'
}

Complete-Check -SaveEvidence:$SaveEvidence -EvidencePath 'wiki/raw/evidence/phase-p4-security/security-suite.txt' -TellClaude 'security suite passed'
