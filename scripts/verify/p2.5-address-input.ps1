#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p2.5 (P2 First working app): Clean up address-bar input.

.DESCRIPTION
  What it checks : the address-bar function in crates/core (address::normalize) passes its table of cases, with at
                   least one case per input class: address without a scheme, https, http upgraded or warned,
                   links to other apps (confirm or deny), extra spaces, international domain names, IPv6,
                   javascript:, data:, file:, malformed input, plain words and empty input; and a separate test
                   proves malformed input never leads to loading a page. The function is pure (no I/O).
  Why            : people type all kinds of things into the address bar → one tested function decides what is
                   loaded → nothing malformed or dangerous is ever loaded.
  What it changes: nothing in git.
  How long       : about 10 seconds.
  How to run     : pwsh -NoProfile -File scripts/verify/p2.5-address-input.ps1
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p2.5 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). Phase-page verify field: table-driven unit tests with at least
                   one case per listed input class pass; malformed input never yields a navigation.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p2.5' -Title 'Clean up address-bar input' -Phase 'phase-p2-minimal-container' `
    -Why 'malformed input never navigates.'

$tests = 'crates/core/tests/address.rs'

Invoke-Step 'The case table covers every input class' {
    $t = Read-RepoText $tests
    $classes = 'scheme-less', 'https', 'http-upgrade', 'http-warn', 'external', 'whitespace', 'idn', 'ipv6',
    'javascript', 'data', 'file', 'malformed', 'plain-word', 'empty'
    $missing = @($classes | Where-Object { $t -notmatch "\(\s*`"$([regex]::Escape($_))`"," })
    if ($missing.Count) { Stop-Fail "No case for: $($missing -join ', ')." }
    $n = ([regex]::Matches($t, '\(\s*"[a-z0-9-]+",\s*"')).Count
    "$($classes.Count) classes, $n cases"
}

Invoke-Step 'The function is pure (no file, network or clock use)' {
    $src = Read-RepoText 'crates/core/src/address.rs'
    if ($src -match 'std::(fs|net|time|env)|tokio|reqwest') { Stop-Fail 'address.rs uses I/O or time; it must be pure.' }
    'no I/O in address.rs'
}

Invoke-Step 'Tests pass: every case, and malformed input never navigates' {
    $r = Assert-Cargo @('test', '--locked', '-p', 'ferrum-core', '--test', 'address')
    foreach ($name in 'every_input_class', 'malformed_never_navigates') {
        if ($r.Output -notmatch "test $name \.\.\. ok") { Stop-Fail "Test $name did not pass." }
    }
    'every_input_class ok; malformed_never_navigates ok'
}

Complete-Check -SaveEvidence:$SaveEvidence
