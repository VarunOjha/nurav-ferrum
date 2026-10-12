#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p2.16 (P2 First working app): Update docs and part pages.

.DESCRIPTION
  What it checks : (1) the wiki check of the plan app reports no errors. (2) The pages of the three parts built in
                   P2 (application shell, WebView manager, core library) say "implemented". Each has a
                   last_verified_commit that is a real commit in this repository's history, and an "Implementation
                   status (P2)" section. (3) The README has build, run and test instructions, and SECURITY.md has
                   the section on what this first version does and its known limitations.
  Why            : the code changed a lot in this phase → the README, the security notes and the part pages must
                   say what is built and what is still limited → docs match reality.
  What it changes: nothing in git.
  How long       : about 30 seconds.
  How to run     : pwsh -NoProfile -File scripts/verify/p2.16-update-docs.ps1
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p2.16 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1). Phase-page verify field: wiki lint clean; component pages for
                   comp-app-shell, comp-webview-manager, comp-core have status implemented and a
                   last_verified_commit.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p2.16' -Title 'Update docs and part pages' -Phase 'phase-p2-minimal-container' `
    -Why 'docs match reality.'

Invoke-Step 'Wiki check clean (no errors)' {
    $report = Get-WikiLint
    Assert-NoLintErrors -Report $report
    'npm run lint:wiki: 0 errors'
}

Invoke-Step 'Shell, WebView manager and core pages marked implemented, with a real last verified commit' {
    $lines = foreach ($c in 'comp-app-shell', 'comp-webview-manager', 'comp-core') {
        $path = "wiki/architecture/components/$c.md"
        $fm = Get-Frontmatter -Path $path
        if ($fm['status'] -ne 'implemented') { Stop-Fail "$c has status '$($fm['status'])', not 'implemented'." }
        $sha = $fm['last_verified_commit']
        if (-not $sha -or $sha -notmatch '^[0-9a-f]{7,40}$') { Stop-Fail "$c has no last_verified_commit." }
        $r = Invoke-Native -FilePath (Find-Tool 'git') -ArgumentList @('merge-base', '--is-ancestor', $sha, 'HEAD') -WorkingDirectory (Get-RepoRoot)
        if ($r.ExitCode -ne 0) { Stop-Fail "$c names commit $sha, which is not in this branch's history." }
        if ((Read-RepoText $path) -notmatch '(?m)^## Implementation status \(P2') { Stop-Fail "$c has no 'Implementation status (P2' section." }
        "$c implemented @ $sha"
    }
    $lines -join '; '
}

Invoke-Step 'README build, run and test instructions; SECURITY.md first-version section' {
    $readme = Read-RepoText 'README.md'
    foreach ($need in 'npm run tauri -- build --no-bundle', 'cargo run -p ferrum-desktop', 'cargo test --workspace', 'npm run smoke', 'manual-checklist-p2.md') {
        if ($readme -notmatch [regex]::Escape($need)) { Stop-Fail "README.md does not mention '$need'." }
    }
    $sec = Read-RepoText 'SECURITY.md'
    foreach ($need in '## What the first version (M1, phase P2) does', 'Known limitations of M1') {
        if ($sec -notmatch [regex]::Escape($need)) { Stop-Fail "SECURITY.md has no '$need'." }
    }
    'README: build, run, tests, manual checklist; SECURITY.md: M1 section and known limitations'
}

Complete-Check -SaveEvidence:$SaveEvidence
