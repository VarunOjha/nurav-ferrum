#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p1.15 (P1 Foundation): Warn when code changes without its page.

.DESCRIPTION
  What it checks : in a throw-away copy of the repo, with the before-commit check installed
                   (scripts/hooks/pre-commit), a commit that changes code in crates/core without changing its
                   wiki page prints the warning, and a commit that changes both prints no warning; the rulebook
                   no longer marks this enforcement as unverified (SCHEMA section 9.8).
  Why            : code and its wiki page must change together → a check before each commit warns when they
                   do not, so the plan never drifts from the code.
  What it changes: nothing in the repo. The copy is made in your temp folder and deleted afterwards.
  How long       : about 10 seconds.
  How to run     : pwsh -NoProfile -File scripts/verify/p1.15-code-page-warning.ps1
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p1.15 check failed".
  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1).
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p1.15' -Title 'Warn when code changes without its page' -Phase 'phase-p1-foundation' `
    -Why 'the plan must never drift from the code.'

$hook = 'scripts/hooks/pre-commit'

Invoke-Step 'Code-only commit warns; code-plus-page commit does not' {
    [void](Assert-RepoFile $hook 'The before-commit check')
    [void](Assert-RepoFile 'crates/core' 'The crates/core library (from p1.4)')
    $tmp = Join-Path ([IO.Path]::GetTempPath()) "ferrum-hook-test-$PID"
    $git = { param([string[]]$a) Invoke-Native -FilePath 'git' -ArgumentList (@('-C', $tmp) + $a) }
    try {
        $c = Invoke-Native -FilePath 'git' -ArgumentList @('clone', '--quiet', '--local', '--no-hardlinks', (Get-RepoRoot), $tmp)
        if ($c.ExitCode -ne 0) { Stop-Fail "Could not make a temporary copy: $($c.Output)" }
        Copy-Item -LiteralPath (Get-RepoPath $hook) -Destination (Join-Path $tmp '.git/hooks/pre-commit') -Force
        [void](& $git @('config', 'user.name', 'check')); [void](& $git @('config', 'user.email', 'check@localhost'))
        Add-Content -LiteralPath (Join-Path $tmp 'crates/core/src/lib.rs') -Value '// hook test'
        [void](& $git @('add', '-A'))
        $one = & $git @('commit', '-m', 'test: code only')
        if ($one.Output -notmatch '(?i)warn') { Stop-Fail "A code-only commit printed no warning:`n$(Get-Tail $one.Output 6)" }
        Add-Content -LiteralPath (Join-Path $tmp 'crates/core/src/lib.rs') -Value '// hook test 2'
        Add-Content -LiteralPath (Join-Path $tmp 'wiki/architecture/components/comp-core.md') -Value ''
        [void](& $git @('add', '-A'))
        $two = & $git @('commit', '-m', 'test: code and page')
        if ($two.ExitCode -ne 0) { Stop-Fail "A code-plus-page commit was refused:`n$(Get-Tail $two.Output 6)" }
        if ($two.Output -match '(?i)warn') { Stop-Fail "A code-plus-page commit still warned:`n$(Get-Tail $two.Output 6)" }
        'warning shown only for the code-only commit'
    }
    finally { Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue }
}

Invoke-Step 'The rulebook no longer marks this as unverified' {
    $t = Read-RepoText 'wiki/SCHEMA.md'
    if ($t -match 'pre-commit hook or CI can enforce this is `UNVERIFIED\[phase-p1-foundation\]`') { Stop-Fail 'The rule book still says this warning is untested (SCHEMA section 9.8 still marks it as not checked yet).' }
    'SCHEMA section 9.8 updated'
}

Complete-Check -SaveEvidence:$SaveEvidence
