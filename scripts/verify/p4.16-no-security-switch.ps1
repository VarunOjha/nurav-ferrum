#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p4.16 (P4 Security): Benchmark-only 'no security' switch.

.DESCRIPTION
  What it checks : (1) unit tests: with the switch every web address is allowed, while Ferrum's own pages, local
                   files and links to other apps keep their rules; without it the normal rules decide; (2) the release
                   check (scripts/security-static-check.ps1): the normal release build is made without the switch and
                   contains none of its marker texts, a benchmark build with the switch contains them all, and that
                   benchmark build refuses to start without --benchmark-mode; (3) it also refuses settings without a
                   data folder of its own, so it never opens a real profile; with its own folder it starts, says in its
                   log what it is, and closes by itself; (4) CI runs the release check.
  Why            : Measuring security's cost needs a version without it → a build-time switch for local test pages
                   only, proven absent from release builds → no risk of shipping it.
  What it changes: nothing in the repo (builds in target/p4.16; the short start uses a test folder in target/p4.16/run).
                   With -SaveEvidence it also writes the release check's output to
                   wiki/raw/evidence/phase-p4-security/nosecurity-absent.txt.
  How long       : about five minutes the first time (two optimised builds), two to three minutes after.
  How to run     : pwsh -NoProfile -File scripts/verify/p4.16-no-security-switch.ps1
  Result         : PASS (every checked step is fine) or FAIL (the line says what).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p4.16 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers: scripts/lib/Ferrum.Check.psm1).
    A Ferrum window opens for a few seconds in step 3. Phase-page verify field: Unit test under the feature asserts
    allow-all; a CI security-static check builds the release profile and proves the feature and its symbols are absent
    (feature list of the release build plus a string/symbol scan of the binary), output saved to
    raw/evidence/phase-p4-security/nosecurity-absent.txt; the build refuses to start the ablation binary without an
    explicit benchmark-mode argument. Narrower than "every decision" on purpose (owner told in chat, 2026-10-14): Ferrum's
    own origin, forbidden schemes, links to other apps and permission refusals stay on in the ablation.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p4.16' -Title 'Benchmark-only no-security build' -Phase 'phase-p4-security' `
    -Why 'no risk of shipping it.'

$cargoBin = Join-Path $env:USERPROFILE '.cargo/bin'
if ((Test-Path -LiteralPath $cargoBin) -and ($env:PATH -notlike "*$cargoBin*")) { $env:PATH = "$cargoBin;$env:PATH" }
$target = 'target/p4.16'

Invoke-Step 'Unit tests: the switch allows web addresses only; without it the rules decide' {
    $r = Assert-Cargo @('test', '--locked', '-p', 'ferrum-security', '--test', 'bench_nosecurity')
    if ($r.Output -notmatch '(?m)^test this_build_is_not_the_ablation \.\.\. ok') { Stop-Fail 'The normal-build test did not pass.' }
    $r = Assert-Cargo @('test', '--locked', '-p', 'ferrum-security', '--features', 'bench-nosecurity', '--test', 'bench_nosecurity')
    foreach ($n in 'the_ablation_allows_every_web_address', 'the_ablation_keeps_ferrums_own_origin_local_files_and_other_apps_out') {
        if ($r.Output -notmatch "(?m)^test $n \.\.\. ok") { Stop-Fail "Test '$n' did not run or did not pass." }
    }
    'three unit tests passed (one normal, two with the switch)'
}

$script:Static = ''
Invoke-Step 'Release check: the normal release build has no switch; the benchmark build refuses to start without --benchmark-mode' {
    $r = Invoke-Native -FilePath (Find-Tool 'pwsh') -ArgumentList @('-NoProfile', '-File', (Get-RepoPath 'scripts/security-static-check.ps1'), '-TargetDir', $target) -WorkingDirectory (Get-RepoRoot)
    $script:Static = $r.Output
    Add-LogText $r.Output
    if ($r.ExitCode -ne 0 -or $r.Output -notmatch 'RESULT: PASS') { Stop-Fail "The release check failed:`n$(Get-Tail $r.Output 20)" }
    'no switch in the normal release program; markers found in the benchmark program; start refused without the argument'
}

Invoke-Step 'Without its own data folder the benchmark build refuses to start; with one it starts, logs what it is, and closes' {
    $run = Get-RepoPath "$target/run"
    if (Test-Path -LiteralPath $run) { Remove-Item -LiteralPath $run -Recurse -Force }
    New-Item -ItemType Directory -Path $run | Out-Null
    $exe = Get-RepoPath "$target/ferrum-desktop-bench-nosecurity.exe"
    $user = Join-Path $run 'user-config.toml'
    $env8 = @{ FERRUM_EXIT_AFTER = '8' }
    # Settings without a data folder: refused before any file is opened (it would otherwise use the real profile).
    $bare = Join-Path $run 'bare.toml'
    Set-Content -LiteralPath $bare -Value "version = 3`n" -NoNewline
    $r = Invoke-Native -FilePath $exe -ArgumentList @('--benchmark-mode', '--config', $bare, '--user-config', $user) -Environment $env8 -TimeoutSeconds 60
    if ($r.ExitCode -ne 2 -or $r.Output -notmatch 'needs --config with \[storage\] data_dir') { Stop-Fail "Started without a data folder of its own (exit $($r.ExitCode)): $(Get-Tail $r.Output 5)" }
    # Settings with the run's own data folder: starts, logs, closes by itself.
    $cfg = Join-Path $run 'config.toml'
    Set-Content -LiteralPath $cfg -Value ("version = 3`n[storage]`ndata_dir = '{0}'`n" -f $run) -NoNewline
    $r = Invoke-Native -FilePath $exe -ArgumentList @('--benchmark-mode', '--config', $cfg, '--user-config', $user) -Environment $env8 -TimeoutSeconds 60
    $log = Get-ChildItem -LiteralPath (Join-Path $run 'logs') -Filter '*.jsonl' -ErrorAction SilentlyContinue | Get-Content -Raw
    if (-not $log -or $log -notmatch 'benchmark build without site rules') { Stop-Fail "The benchmark build's log in the run folder does not say what it is (exit $($r.ExitCode))." }
    "refused without its own data folder (exit 2); with one it started, logged 'benchmark build without site rules' in the run folder, closed with exit $($r.ExitCode)"
}

Invoke-Step 'CI and the local CI script run the release check' {
    foreach ($f in '.github/workflows/ci.yml', 'scripts/ci-local.ps1') {
        if ((Read-RepoText $f) -notmatch 'scripts/security-static-check\.ps1') { Stop-Fail "$f does not run scripts/security-static-check.ps1." }
    }
    'both run it after the release build'
}

if ($SaveEvidence -and $script:Static) {
    $written = Save-Evidence -Path 'wiki/raw/evidence/phase-p4-security/nosecurity-absent.txt' -Text $script:Static
    Write-Host "Evidence saved (masked): $written" -ForegroundColor Cyan
}

Complete-Check -SaveEvidence:$SaveEvidence
