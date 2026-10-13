#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p4.1 (P4 Security): the threat model covers every place where trust changes.

.DESCRIPTION
  What it checks : (1) every component-page edge marked as crossing a trust boundary is listed, exactly once per
                   edge, in the threat model on the security testing plan page (section 7.2) and in SECURITY.md;
                   (2) each listed edge has a control and a test id (SEC-NN) or says "not enforced"; (3) every
                   threat in section 7.3 has a control and a test id or "not enforced", and its edges and the
                   tests it names exist; (4) the ten security test areas of the brief (SEC-01 to SEC-10) each
                   cover at least one threat; (5) both documents have their "not enforced" list.
  Why            : controls need a reason → list what we protect, who attacks and where trust changes, and map each
                   threat to a control and a test, or "not enforced" → every later task traces to a threat.
  What it changes: nothing.
  How long       : a few seconds.
  How to run     : pwsh -NoProfile -File scripts/verify/p4.1-threat-model.ps1
  Result         : PASS (every checked step is fine) or FAIL (something is missing; the line says what).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p4.1 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers: scripts/lib/Ferrum.Check.psm1).
    Phase-page verify field: SECURITY.md and the security quality page list every boundary edge from the component
    pages (edges with crosses_trust_boundary true) and map each threat to a control and a test id or to
    'not enforced'.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p4.1' -Title 'Threat model' -Phase 'phase-p4-security' `
    -Why 'every later task traces to a threat.'

$planPath = 'wiki/quality/qual-security-testing-plan.md'
$arrow = [char]0x2192

function Get-BoundaryEdges {
    <# Edges with crosses_trust_boundary: true from every component page, as "from → to (kind)" keys. #>
    $edges = [System.Collections.Generic.List[string]]::new()
    $dir = Get-RepoPath 'wiki/architecture/components'
    foreach ($file in Get-ChildItem -LiteralPath $dir -Filter 'comp-*.md' | Sort-Object Name) {
        $t = [IO.File]::ReadAllText($file.FullName) -replace "`r`n", "`n"
        $end = $t.IndexOf("`n---`n", 3)
        if (-not $t.StartsWith("---`n") -or $end -lt 0) { Stop-Fail "$($file.Name) has no frontmatter." }
        $fm = $t.Substring(4, $end - 4)
        if ($fm -notmatch '(?m)^id:\s*(\S+)') { Stop-Fail "$($file.Name) has no id." }
        $from = $Matches[1]
        $m = [regex]::Match($fm, '(?ms)^connects:\s*\n(.*?)(?=^\S|\z)')
        if (-not $m.Success) { continue }
        foreach ($item in ($m.Groups[1].Value -split '(?m)^  - ') | Select-Object -Skip 1) {
            if ($item -notmatch '(?m)^\s*crosses_trust_boundary:\s*true\b') { continue }
            if ($item -notmatch '(?m)^(?:\s*)to:\s*(\S+)') { Stop-Fail "$from has a boundary edge without 'to'." }
            $to = $Matches[1]
            if ($item -notmatch '(?m)^\s*kind:\s*(\S+)') { Stop-Fail "$from has a boundary edge to $to without 'kind'." }
            $edges.Add(('{0} {1} {2} ({3})' -f $from, $arrow, $to, $Matches[1]))
        }
    }
    , $edges
}

function Get-TableRows {
    <# Rows of a markdown table whose first cell matches $IdPattern, as arrays of trimmed cells. #>
    param([string]$Text, [string]$IdPattern)
    $rows = [System.Collections.Generic.List[object]]::new()
    foreach ($line in ($Text -replace "`r`n", "`n") -split "`n") {
        if ($line -match "^\|\s*($IdPattern)\s*\|") {
            $cells = @($line.Trim().Trim('|') -split '\|' | ForEach-Object { $_.Trim() })
            $rows.Add($cells)
        }
    }
    , $rows
}

function Get-Section {
    <# Text from a heading line to the next heading of the same or a higher level. #>
    param([string]$Text, [string]$Heading)
    $t = $Text -replace "`r`n", "`n"
    $i = $t.IndexOf("`n$Heading`n")
    if ($i -lt 0) { Stop-Fail "Section '$Heading' is missing." }
    $level = ($Heading -split ' ')[0]
    $rest = $t.Substring($i + 1 + $Heading.Length)
    $next = [regex]::Match($rest, "(?m)^#{1,$($level.Length)} ")
    if ($next.Success) { $rest.Substring(0, $next.Index) } else { $rest }
}

function Assert-EdgeTable {
    <# The edge table lists each boundary edge exactly as often as the component pages do, each with a control and a test. #>
    param([string]$Where, [object[]]$Rows, [System.Collections.Generic.List[string]]$Edges, [int]$ControlCol, [string[]]$KnownTests)
    $want = @{}; foreach ($e in $Edges) { $want[$e] = 1 + [int]$want[$e] }
    $have = @{}
    foreach ($r in $Rows) {
        $key = $r[1]
        $have[$key] = 1 + [int]$have[$key]
        if (-not $r[$ControlCol]) { Stop-Fail "$Where, edge $($r[0]): no control." }
        $test = $r[-1]
        if ($test -ne 'not enforced' -and $test -notmatch '^SEC-\d\d$') { Stop-Fail "$Where, edge $($r[0]): test is '$test', not a SEC-NN id or 'not enforced'." }
        if ($test -ne 'not enforced' -and $test -notin $KnownTests) { Stop-Fail "$Where, edge $($r[0]): test $test is not in the test catalogue." }
    }
    foreach ($k in $want.Keys) {
        if ([int]$have[$k] -ne $want[$k]) { Stop-Fail ("{0}: edge '{1}' listed {2} time(s), component pages have it {3} time(s)." -f $Where, $k, [int]$have[$k], $want[$k]) }
    }
    foreach ($k in $have.Keys) {
        if (-not $want.ContainsKey($k)) { Stop-Fail "${Where}: edge '$k' is not a boundary edge on any component page." }
    }
}

$script:Edges = $null
$script:Plan = $null
$script:Tests = @()

Invoke-Step 'Boundary edges read from the component pages' {
    $script:Edges = Get-BoundaryEdges
    if ($script:Edges.Count -eq 0) { Stop-Fail 'No component page has an edge marked crosses_trust_boundary: true.' }
    $script:Plan = Read-RepoText $planPath
    $script:Tests = @([regex]::Matches($script:Plan, '(?m)^### (SEC-\d\d) ') | ForEach-Object { $_.Groups[1].Value })
    "$($script:Edges.Count) edges; test catalogue SEC ids: $($script:Tests.Count)"
}

Invoke-Step 'Security testing plan: every edge listed with a control and a test (section 7.2)' {
    if (-not $script:Edges) { Stop-Fail 'The edges could not be read (see the step above).' }
    $sec = Get-Section $script:Plan '### 7.2 Trust-boundary edges'
    $rows = Get-TableRows $sec 'E\d\d'
    Assert-EdgeTable -Where $planPath -Rows $rows -Edges $script:Edges -ControlCol 4 -KnownTests $script:Tests
    "$($rows.Count) edge rows match the component pages"
}

Invoke-Step 'SECURITY.md: every edge listed with a control and a test' {
    if (-not $script:Edges) { Stop-Fail 'The edges could not be read (see the step above).' }
    $sec = Get-Section (Read-RepoText 'SECURITY.md') '### Where trust changes'
    $rows = Get-TableRows $sec 'E\d\d'
    Assert-EdgeTable -Where 'SECURITY.md' -Rows $rows -Edges $script:Edges -ControlCol 2 -KnownTests $script:Tests
    "$($rows.Count) edge rows match the component pages"
}

Invoke-Step 'Every threat has a control and a test or "not enforced" (section 7.3)' {
    if (-not $script:Plan) { Stop-Fail 'The plan page could not be read (see the first step).' }
    $threats = Get-TableRows (Get-Section $script:Plan '### 7.3 Threats, controls and tests') 'T\d\d [^|]+'
    $edgeRows = Get-TableRows (Get-Section $script:Plan '### 7.2 Trust-boundary edges') 'E\d\d'
    $edgeIds = @($edgeRows | ForEach-Object { $_[0] })
    $threatIds = [System.Collections.Generic.List[string]]::new()
    foreach ($r in $threats) {
        $id = ($r[0] -split ' ')[0]
        $threatIds.Add($id)
        if ($r.Count -lt 6) { Stop-Fail "Threat $id has $($r.Count) columns, expected 6." }
        if (-not $r[3]) { Stop-Fail "Threat ${id}: no control." }
        $test = $r[4]
        if ($test -ne 'not enforced') {
            if ($test -notmatch '^SEC-\d\d(, SEC-\d\d)*$') { Stop-Fail "Threat ${id}: test is '$test', not SEC-NN ids or 'not enforced'." }
            foreach ($t in $test -split ', ') { if ($t -notin $script:Tests) { Stop-Fail "Threat ${id}: test $t is not in the test catalogue." } }
        }
        if (-not $r[5]) { Stop-Fail "Threat ${id}: no state." }
        if ($r[2] -ne 'none') {
            foreach ($e in $r[2] -split ', ') { if ($e -notin $edgeIds) { Stop-Fail "Threat ${id}: edge $e is not in section 7.2." } }
        }
    }
    foreach ($r in $edgeRows) {
        foreach ($t in $r[3] -split ', ') { if ($t -notin $threatIds) { Stop-Fail "Edge $($r[0]) names threat $t, which is not in section 7.3." } }
    }
    $enforcedOrNot = @($threats | Where-Object { $_[4] -eq 'not enforced' }).Count
    "$($threats.Count) threats; $enforcedOrNot marked not enforced"
}

Invoke-Step 'The ten test areas of the brief (SEC-01 to SEC-10) each cover a threat' {
    if (-not $script:Plan) { Stop-Fail 'The plan page could not be read (see the first step).' }
    $sec = Get-Section $script:Plan '### 7.3 Threats, controls and tests'
    $missing = @(1..10 | ForEach-Object { 'SEC-{0:00}' -f $_ } | Where-Object { $sec -notmatch "\b$_\b" })
    if ($missing) { Stop-Fail ("No threat uses: " + ($missing -join ', ') + '.') }
    'SEC-01 to SEC-10 all used'
}

Invoke-Step 'Both documents list what is not enforced' {
    $a = Get-Section $script:Plan '### 7.4 Explicitly not enforced'
    $b = Get-Section (Read-RepoText 'SECURITY.md') '### Not enforced'
    $na = @([regex]::Matches($a, '(?m)^- ')).Count
    $nb = @([regex]::Matches($b, '(?m)^- ')).Count
    if ($na -lt 3) { Stop-Fail "$planPath section 7.4 lists only $na items." }
    if ($nb -lt 3) { Stop-Fail "SECURITY.md 'Not enforced' lists only $nb items." }
    "plan page $na items, SECURITY.md $nb items"
}

Complete-Check -SaveEvidence:$SaveEvidence
