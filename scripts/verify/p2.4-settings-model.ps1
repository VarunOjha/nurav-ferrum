#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p2.4 (P2 First working app): Settings model.

.DESCRIPTION
  What it checks : the settings model in crates/core (config.toml, owner decision Q-214) passes its tests: a valid
                   file is read; a missing file gives the defaults; a wrong key, value or section is refused
                   loudly; an invalid start address is refused; an http start address is upgraded to https (or
                   kept with a warning when the setting says "warn"), and file:, data:, javascript: and other
                   schemes are refused (adr-0015); the settings fingerprint is stable. Also: the core crate
                   forbids unsafe code.
  Why            : bad settings must never crash or weaken the app → one checked settings model with safe
                   defaults → typos and unsafe start pages are caught with a clear message.
  What it changes: nothing in git (test files go to the ignored target/ folder).
  How long       : about 10 seconds.
  How to run     : pwsh -NoProfile -File scripts/verify/p2.4-settings-model.ps1
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p2.4 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). Phase-page verify field: unit tests cover valid config, missing
                   file (defaults), invalid URL, non-https start URL handling per adr-0015.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p2.4' -Title 'Settings model' -Phase 'phase-p2-minimal-container' `
    -Why 'bad settings never crash or weaken the app.'

Invoke-Step 'The core crate forbids unsafe code' {
    if ((Read-RepoText 'crates/core/src/lib.rs') -notmatch '#!\[forbid\(unsafe_code\)\]') { Stop-Fail 'crates/core/src/lib.rs does not forbid unsafe code.' }
    '#![forbid(unsafe_code)]'
}

Invoke-Step 'Settings tests pass, one per required case' {
    $r = Assert-Cargo @('test', '--locked', '-p', 'ferrum-core', '--test', 'config')
    $need = 'valid_file_is_read', 'missing_file_gives_defaults', 'invalid_start_url_is_refused',
    'http_start_url_is_upgraded_by_default', 'http_start_url_is_kept_with_a_warning_when_policy_is_warn',
    'non_web_start_urls_are_refused', 'unknown_keys_and_bad_values_fail_loudly'
    $missing = @($need | Where-Object { $r.Output -notmatch "test $_ \.\.\. ok" })
    if ($missing.Count) { Stop-Fail "Not passing (or missing): $($missing -join ', ')." }
    $line = ($r.Output -split "`r?`n" | Where-Object { $_ -match 'test result: ok' } | Select-Object -First 1).Trim()
    "$($need.Count) required cases pass ($line)"
}

Complete-Check -SaveEvidence:$SaveEvidence
