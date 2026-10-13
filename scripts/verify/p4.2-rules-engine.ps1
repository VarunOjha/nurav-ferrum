#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p4.2 (P4 Security): the rules engine that decides which addresses may load.

.DESCRIPTION
  What it checks : (1) the engine's rule tests pass, including the three cases the plan names: a more specific
                   allow rule beats a block rule, equal specificity blocks, and allowlist-only mode denies a site
                   that is not listed; (2) the randomised tests pass: thousands of random inputs, no crash, anything
                   unreadable is denied, a blocked site stays blocked however its address is written; (3) the tests
                   reach 100 percent of the engine's code (regions, functions and lines; coverage report saved);
                   (4) the engine is pure: no file, network or unsafe code, and no Tauri.
  Why            : navigation needs one decision point → plain Rust rules: block and allow lists, HTTP warning or
                   upgrade, ask before other apps, deny anything unreadable → safe by default, every decision
                   explained.
  What it changes: nothing (builds the tests in target/).
  How long       : about a minute (two test builds, one with coverage).
  How to run     : pwsh -NoProfile -File scripts/verify/p4.2-rules-engine.ps1
  Result         : PASS (every checked step is fine) or FAIL (the line says what).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p4.2 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers: scripts/lib/Ferrum.Check.psm1).
    Needs cargo-llvm-cov and the llvm-tools component (rust-toolchain.toml). -SaveEvidence also saves the
    coverage summary to wiki/raw/evidence/phase-p4-security/policy-coverage.txt.
    Phase-page verify field: Table-driven unit tests per rule (including allowlist override of a blocklist suffix
    rule, equal-specificity block, and allowlist-only mode denying a non-listed HTTPS host) plus randomised input
    tests (no panic, unparseable input always denied); 100 percent of decision branches covered by tests
    (coverage report saved).
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p4.2' -Title 'Rules engine' -Phase 'phase-p4-security' `
    -Why 'safe by default, every decision explained.'

$cargoBin = Join-Path $env:USERPROFILE '.cargo/bin'
if ((Test-Path -LiteralPath $cargoBin) -and ($env:PATH -notlike "*$cargoBin*")) { $env:PATH = "$cargoBin;$env:PATH" }

$script:TestOutput = ''
$script:Coverage = ''

function Assert-TestsRan {
    param([string[]]$Names)
    foreach ($n in $Names) {
        if ($script:TestOutput -notmatch "(?m)^test (\S+::)?$([regex]::Escape($n)) \.\.\. ok") { Stop-Fail "Test '$n' did not run or did not pass." }
    }
}

Invoke-Step 'Rule tests pass, including the three named cases' {
    $r = Assert-Cargo @('test', '-p', 'ferrum-security', '--', '--test-threads=1')
    $script:TestOutput = $r.Output
    $passed = ([regex]::Matches($r.Output, 'test result: ok\. (\d+) passed') | ForEach-Object { [int]$_.Groups[1].Value } | Measure-Object -Sum).Sum
    if ($r.Output -match 'test result: FAILED') { Stop-Fail 'A test failed.' }
    Assert-TestsRan @('allowlist_more_specific_than_block_wins', 'equal_specificity_blocks',
        'allowlist_only_mode_denies_everything_not_listed', 'table_of_rules_with_default_settings',
        'blocklist_matches_every_spelling_of_a_host', 'http_policy_warn_or_upgrade')
    "$passed tests passed"
}

Invoke-Step 'Randomised inputs: no crash, unreadable denied, blocked stays blocked' {
    if (-not $script:TestOutput) { Stop-Fail 'The tests did not run (see the step above).' }
    Assert-TestsRan @('seed_corpus_never_panics_and_unparseable_is_denied', 'any_string_is_decided_without_panic',
        'address_like_strings_are_decided_without_panic', 'blocked_host_is_denied_regardless_of_rest',
        'parsed_web_urls_always_have_a_host')
    $cases = [regex]::Match((Read-RepoText 'crates/security/tests/random_inputs.rs'), 'cases:\s*(\d+)')
    if (-not $cases.Success -or [int]$cases.Groups[1].Value -lt 1000) { Stop-Fail 'The randomised tests run fewer than 1000 cases each.' }
    "4 random properties x $($cases.Groups[1].Value) cases plus the seed corpus"
}

Invoke-Step 'Tests reach 100 percent of the engine code (coverage report)' {
    if (-not (Find-Tool 'cargo-llvm-cov')) { Stop-Fail 'cargo-llvm-cov is not installed. Install: cargo install cargo-llvm-cov --locked' }
    $j = Assert-Cargo @('llvm-cov', '-p', 'ferrum-security', '--json', '--summary-only')
    $start = $j.Output.IndexOf('{"data"')
    if ($start -lt 0) { Stop-Fail 'cargo llvm-cov gave no JSON report.' }
    # The JSON report is one line; cargo's own progress text (standard error) follows it.
    $report = ($j.Output.Substring($start) -split "`r?`n")[0] | ConvertFrom-Json
    $files = @($report.data[0].files | Where-Object { $_.filename -match 'crates[\\/]security[\\/]src[\\/]' })
    if ($files.Count -lt 2) { Stop-Fail "The report covers $($files.Count) engine files, expected policy.rs and rules.rs." }
    $short = @()
    foreach ($f in $files) {
        $name = Split-Path -Leaf $f.filename
        foreach ($k in 'regions', 'functions', 'lines') {
            $s = $f.summary.$k
            if ($s.count -gt 0 -and $s.covered -lt $s.count) { $short += "$name $k $($s.covered)/$($s.count)" }
        }
    }
    $t = Assert-Cargo @('llvm-cov', 'report', '-p', 'ferrum-security', '--summary-only')
    $script:Coverage = $t.Output
    Add-LogText $t.Output
    if ($short) { Stop-Fail ('Not fully covered: ' + ($short -join '; ')) }
    $tot = $report.data[0].totals
    'regions {0}/{1}, functions {2}/{3}, lines {4}/{5}' -f $tot.regions.covered, $tot.regions.count, $tot.functions.covered, $tot.functions.count, $tot.lines.covered, $tot.lines.count
}

Invoke-Step 'The engine is pure: no files, network, unsafe code or Tauri' {
    $src = Get-ChildItem -LiteralPath (Get-RepoPath 'crates/security/src') -Filter '*.rs' -Recurse
    foreach ($f in $src) {
        $t = [IO.File]::ReadAllText($f.FullName)
        foreach ($bad in 'std::fs', 'std::net', 'std::process', 'tauri::', 'use tauri', 'unsafe ', 'std::env') {
            if ($t.Contains($bad)) { Stop-Fail "$($f.Name) uses '$bad'." }
        }
    }
    if ((Read-RepoText 'crates/security/src/lib.rs') -notmatch '#!\[forbid\(unsafe_code\)\]') { Stop-Fail 'lib.rs no longer forbids unsafe code.' }
    $toml = Read-RepoText 'crates/security/Cargo.toml'
    $deps = [regex]::Match($toml, '(?ms)^\[dependencies\]\s*\n(.*?)(?=^\[|\z)').Groups[1].Value
    $names = @([regex]::Matches($deps, '(?m)^([A-Za-z0-9_-]+)\s*=') | ForEach-Object { $_.Groups[1].Value })
    $extra = @($names | Where-Object { $_ -notin 'ferrum-core', 'url' })
    if ($extra) { Stop-Fail ('Unexpected build dependencies: ' + ($extra -join ', ')) }
    "$($src.Count) source files; build dependencies: $($names -join ', ')"
}

if ($SaveEvidence -and $script:Coverage) {
    $head = "Policy engine coverage (p4.2), cargo llvm-cov on commit $(Get-GitCommit), $(Get-Date -Format 'yyyy-MM-dd HH:mm').`n" +
        "Regions count each decision arm separately. LLVM branch coverage needs a nightly compiler; the pinned stable`n" +
        "toolchain reports none, so the Branches columns are empty.`n`n"
    $written = Save-Evidence -Path 'wiki/raw/evidence/phase-p4-security/policy-coverage.txt' -Text ($head + $script:Coverage)
    Write-Note "Coverage report saved: $written"
}

Complete-Check -SaveEvidence:$SaveEvidence
