#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p3.17 (P3 feature set): the design you chose is recorded and kept unchanged.

.DESCRIPTION
  What it checks : (1) your answers and your pick are saved word for word (raw/owner/...-feature-set-design-answers.md
                   and ...-feature-set-design-pick.md) and listed in the fingerprint list (MANIFEST) with matching
                   fingerprints; (2) the frozen copy of the chosen design (look A Graphite, logos 4 to 9, the canvas
                   index) is there and unchanged since it was saved; (3) the look decision (adr-0033) is accepted and
                   your approval of it is current.
  Why            : everything p3.18 to p3.22 built follows this design → it must stay exactly as you chose it.
  What it changes: nothing.
  How long       : a few seconds.
  How to run     : pwsh -NoProfile -File scripts/verify/p3.17-design.ps1
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p3.17 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers: scripts/lib/Ferrum.Check.psm1).
    Phase-page verify field: Owner's answers and choice transcribed in raw/owner/; the chosen design frozen under
    raw/evidence/phase-p3-tabs-sessions/design/; a look ADR records the choice; no application code changes.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p3.17' -Title 'The design you chose, recorded' -Phase 'phase-p3-tabs-sessions' `
    -Why 'everything after it follows this design.'

$files = @(
    'owner/2026-10-12-s02-feature-set-request.md',
    'owner/2026-10-12-s02-feature-set-design-answers.md',
    'owner/2026-10-12-s02-feature-set-design-pick.md',
    'evidence/phase-p3-tabs-sessions/design/look-a-graphite.dc.html',
    'evidence/phase-p3-tabs-sessions/design/logos-4-to-9.dc.html',
    'evidence/phase-p3-tabs-sessions/design/canvas.json'
)

Invoke-Step 'Your words and the frozen design: present and unchanged' {
    $manifest = Get-ManifestEntries
    foreach ($f in $files) {
        $path = Get-RepoPath "wiki/raw/$f"
        if (-not (Test-Path -LiteralPath $path)) { Stop-Fail "wiki/raw/$f is missing." }
        if (-not $manifest.ContainsKey($f)) { Stop-Fail "wiki/raw/$f is not in the fingerprint list (MANIFEST)." }
        $hash = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($manifest[$f] -ne $hash) { Stop-Fail "wiki/raw/$f changed since it was saved." }
    }
    "$($files.Count) files present, fingerprints match"
}

Invoke-Step 'The pick names look A Graphite and logo 8' {
    $pick = Read-RepoText 'wiki/raw/owner/2026-10-12-s02-feature-set-design-pick.md'
    if ($pick -notmatch [regex]::Escape('Well, A graphite, but 8 split title for icon for now')) { Stop-Fail 'The owner''s pick is not quoted word for word.' }
    $html = Read-RepoText 'wiki/raw/evidence/phase-p3-tabs-sessions/design/logos-4-to-9.dc.html'
    if ($html -notmatch "v\('split', '8 · Split tile'") { Stop-Fail 'The frozen logo board has no logo 8 (split tile).' }
    'quoted pick; logo 8 in the frozen board'
}

Invoke-Step 'The look decision (adr-0033) is accepted and your approval is current' {
    $fm = Get-Frontmatter 'wiki/decisions/adr-0033-graphite-look-split-tile-logo-themes.md'
    if ($fm.status -ne 'accepted') { Stop-Fail "adr-0033 is $($fm.status), not accepted." }
    $state = Get-ApprovalState 'adr-0033'
    if ($state -notin 'APPROVED', 'APPROVED_VOLATILE_DRIFT') { Stop-Wait "Your approval of adr-0033 is $state." }
    "adr-0033 accepted; approval $state"
}

Complete-Check -SaveEvidence:$SaveEvidence
