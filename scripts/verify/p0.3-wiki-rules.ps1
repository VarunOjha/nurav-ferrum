#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p0.3 (P0 Planning): Write the wiki rules and live status.

.DESCRIPTION
  What it checks : the rulebook (wiki/SCHEMA.md) exists and its own fingerprint program (the short Python
                   script printed inside it) runs and gives the same fingerprint as this check computes;
                   Claude's start-up guide (CLAUDE.md) points to the rulebook; the live status file
                   (STATUS.md) has every field a new session needs.
  Why            : many sessions and helpers edit the wiki → one rulebook and one status file let any
                   session pick up where the last stopped, and fingerprints make approvals tamper-evident.
  What it changes: nothing. It only reads files (unless you add -SaveEvidence).
  How long       : about 2 seconds.
  How to run     : pwsh -NoProfile -File scripts/verify/p0.3-wiki-rules.ps1
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p0.3 check failed".
  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1).
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p0.3' -Title 'Write the wiki rules and live status' -Phase 'phase-p0-planning' `
    -Why 'one rulebook and one live status file let any session resume safely.'

Invoke-Step "The rulebook's own fingerprint program runs and agrees with this check" {
    $schema = Read-RepoText 'wiki/SCHEMA.md'
    # The reference program is the python block in section 10.2 that starts with "import hashlib".
    $m = [regex]::Match($schema, '```python\n(import hashlib[\s\S]*?)```')
    if (-not $m.Success) { Stop-Fail 'The Python fingerprint program was not found in wiki/SCHEMA.md section 10.2.' }
    $tmp = Join-Path ([IO.Path]::GetTempPath()) "ferrum-hash-$PID.py"
    [IO.File]::WriteAllText($tmp, $m.Groups[1].Value)
    try { $r = Invoke-Native -FilePath 'python' -ArgumentList @($tmp, (Get-RepoPath 'wiki/SCHEMA.md')) }
    finally { Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue }
    if ($r.ExitCode -ne 0) { Stop-Fail "The fingerprint program failed: $(Get-Tail $r.Output 4)" }
    $parts = $r.Output.Trim() -split '\s+'
    if ($parts.Count -ne 2) { Stop-Fail "Expected two fingerprints, got: $($r.Output)" }
    if ($parts[0] -ne (Get-ContentHash 'wiki/SCHEMA.md')) { Stop-Fail 'The Python program and this check disagree on the fingerprint of SCHEMA.md.' }
    "content fingerprint $($parts[0].Substring(0, 19))..."
}

Invoke-Step 'CLAUDE.md points to the rulebook' {
    if ((Read-RepoText 'CLAUDE.md') -notmatch '\(wiki/SCHEMA\.md\)') { Stop-Fail 'CLAUDE.md has no link to wiki/SCHEMA.md.' }
    'link found'
}

Invoke-Step 'STATUS.md has every field a new session needs' {
    $fm = Get-Frontmatter 'STATUS.md'
    $need = 'id', 'type', 'session', 'current_phase', 'current_task', 'next_action', 'blocked_on', 'last_handoff', 'updated'
    $missing = @($need | Where-Object { -not $fm.Contains($_) })
    if ($missing.Count) { Stop-Fail "STATUS.md is missing: $($missing -join ', ')." }
    if ($fm['id'] -ne 'status-live') { Stop-Fail "STATUS.md id is '$($fm['id'])', expected status-live." }
    "phase $($fm['current_phase']), task $($fm['current_task'])"
}

Complete-Check -SaveEvidence:$SaveEvidence
