#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p0.12 (P0 Planning): Fingerprint pages exactly like the reference.

.DESCRIPTION
  What it checks : (1) the plan app's fingerprint tests pass on the shared test cases (Windows and old Mac
                   line endings, pages with and without a header, bookkeeping fields present or absent);
                   (2) on every real wiki page plus STATUS.md and CLAUDE.md, the reference program printed in
                   the rulebook (wiki/SCHEMA.md section 10.2) and this PowerShell check compute the same
                   fingerprint.
  Why            : approvals are tied to page fingerprints → if two tools disagreed, a changed page could
                   keep an old approval.
  What it changes: nothing. It only reads files.
  How long       : about 10 seconds.
  How to run     : pwsh -NoProfile -File scripts/verify/p0.12-fingerprints.ps1
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p0.12 check failed".
  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1).
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p0.12' -Title 'Fingerprint pages exactly like the reference' -Phase 'phase-p0-planning' `
    -Why 'a changed page must never keep an old approval.'

Invoke-Step "The plan app's fingerprint tests pass" {
    $r = Assert-NpmScript 'test' -Extra @('tests/unit/hash.vectors.test.ts')
    $line = ($r.Output -split "`r?`n" | Where-Object { $_ -match '^\s+Tests\s' } | Select-Object -Last 1)
    "test cases: $($line.Trim())"
}

Invoke-Step 'Reference program and this check agree on every real page' {
    $root = Get-RepoRoot
    $paths = @(Get-ChildItem -LiteralPath (Get-RepoPath 'wiki') -Recurse -File -Filter '*.md' | Where-Object { $_.FullName -notmatch '[\\/]raw[\\/]' } |
        ForEach-Object { [IO.Path]::GetRelativePath($root, $_.FullName).Replace('\', '/') }) + @('STATUS.md', 'CLAUDE.md')
    # A small Python runner executes the rulebook's own program once per file and prints "path<TAB>hash".
    $runner = @'
import sys, io, re, contextlib
src = open('wiki/SCHEMA.md', encoding='utf-8').read()
code = re.search(r"```python\n(import hashlib.*?)```", src, re.S).group(1)
for p in open(sys.argv[1], encoding='utf-8').read().split('\n'):
    if not p:
        continue
    sys.argv = ['reference', p]
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        exec(code, {})
    print(p + '\t' + buf.getvalue().split()[0])
'@
    $tmpPy = Join-Path ([IO.Path]::GetTempPath()) "ferrum-ref-$PID.py"
    $tmpList = Join-Path ([IO.Path]::GetTempPath()) "ferrum-ref-$PID.txt"
    [IO.File]::WriteAllText($tmpPy, $runner)
    [IO.File]::WriteAllText($tmpList, ($paths -join "`n"))
    try { $r = Invoke-Native -FilePath 'python' -ArgumentList @($tmpPy, $tmpList) }
    finally { Remove-Item -LiteralPath $tmpPy, $tmpList -Force -ErrorAction SilentlyContinue }
    if ($r.ExitCode -ne 0) { Stop-Fail "The reference program failed:`n$(Get-Tail $r.Output 6)" }
    $diff = @()
    $n = 0
    foreach ($line in $r.Output -split "`r?`n") {
        if ($line -notmatch '^(.+)\t(sha256:[0-9a-f]{64})$') { continue }
        $n++
        if ((Get-ContentHash $Matches[1]) -ne $Matches[2]) { $diff += $Matches[1] }
    }
    if ($n -ne $paths.Count) { Stop-Fail "The reference program answered for $n of $($paths.Count) files." }
    if ($diff.Count) { Stop-Fail "Fingerprints differ for: $($diff -join ', ')" }
    "$n files, identical fingerprints"
}

Complete-Check -SaveEvidence:$SaveEvidence
