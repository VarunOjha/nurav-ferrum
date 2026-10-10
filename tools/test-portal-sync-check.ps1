#Requires -Version 7.0
<#
.SYNOPSIS
  Tests for tools/portal-sync-check.ps1 (the wiki -> portal JSON checker) and its Stop-hook mode.

.DESCRIPTION
  Why: the checker is the safety net that keeps the owner's portal text in step with the wiki. If it
  silently missed a stale or missing record, nobody would notice. These tests break a tiny fake repo on
  purpose, one way at a time, and check that the checker reports each break.

  How: tools/fixtures/portal-sync/clean/ is a small, correct fake repo (a few wiki pages and their
  portal JSON). Each case copies it to a temporary folder whose name contains a space (like the real
  repo path), adds the real plan/portal/schema/ and plan/portal/pipeline.json, changes one thing, runs
  the checker in a separate pwsh process and checks the exit code and the message.

  No installs needed: plain PowerShell 7. Python is used only for the hash cross-check, if present.
  Exit code: 0 = all cases passed, 1 = at least one failed.

.EXAMPLE
  pwsh tools/test-portal-sync-check.ps1
#>
[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)

$Repo = Split-Path -Parent $PSScriptRoot
$Checker = Join-Path $PSScriptRoot 'portal-sync-check.ps1'
$Fixture = Join-Path $PSScriptRoot 'fixtures/portal-sync/clean'
$Pwsh = (Get-Process -Id $PID).Path
$TmpBase = Join-Path ([IO.Path]::GetTempPath()) ("portal sync test " + [guid]::NewGuid().ToString('N').Substring(0, 8))
$script:Failed = 0
$script:Passed = 0

# --- Helpers ---------------------------------------------------------------------------------------

# A fresh copy of the clean fixture plus the real schemas and pipeline config.
function New-Fixture([string]$Name) {
    $dir = Join-Path $TmpBase $Name
    Copy-Item -LiteralPath $Fixture -Destination $dir -Recurse
    Copy-Item -LiteralPath (Join-Path $Repo 'plan/portal/schema') -Destination (Join-Path $dir 'plan/portal/schema') -Recurse
    Copy-Item -LiteralPath (Join-Path $Repo 'plan/portal/pipeline.json') -Destination (Join-Path $dir 'plan/portal/pipeline.json')
    return $dir
}

# Run the checker as its own process (as Claude Code would) and capture exit code, stdout, stderr.
function Invoke-Checker([string]$Root, [string[]]$Extra = @(), [string]$Stdin = $null, [hashtable]$Env = @{}, [switch]$NoRoot) {
    $psi = [Diagnostics.ProcessStartInfo]::new($Pwsh)
    foreach ($a in @('-NoProfile', '-NonInteractive', '-File', $Checker)) { $psi.ArgumentList.Add($a) }
    if (-not $NoRoot) { $psi.ArgumentList.Add('-Root'); $psi.ArgumentList.Add($Root) }
    foreach ($a in $Extra) { $psi.ArgumentList.Add($a) }
    foreach ($k in $Env.Keys) { $psi.Environment[$k] = $Env[$k] }
    $psi.RedirectStandardInput = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.UseShellExecute = $false
    $p = [Diagnostics.Process]::Start($psi)
    if ($Stdin) { $p.StandardInput.Write($Stdin) }
    $p.StandardInput.Close()
    $out = $p.StandardOutput.ReadToEndAsync()
    $err = $p.StandardError.ReadToEndAsync()
    $p.WaitForExit()
    return [pscustomobject]@{ Code = $p.ExitCode; Out = $out.Result; Err = $err.Result }
}

function Test-Case([string]$Name, [scriptblock]$Body) {
    try {
        & $Body
        $script:Passed++
        Write-Output "PASS  $Name"
    }
    catch {
        $script:Failed++
        Write-Output "FAIL  $Name`n      $($_.Exception.Message)"
    }
}

function Assert-True([bool]$Condition, [string]$Message) { if (-not $Condition) { throw $Message } }

function Assert-Result($R, [int]$Code, [string[]]$Contains = @()) {
    $all = $R.Out + "`n" + $R.Err
    Assert-True ($R.Code -eq $Code) "expected exit $Code, got $($R.Code). Output:`n$all"
    foreach ($c in $Contains) { Assert-True ($all.Contains($c)) "expected output to contain '$c'. Output:`n$all" }
}

function Edit-Json([string]$Path, [scriptblock]$Change) {
    $doc = Get-Content -LiteralPath $Path -Raw -Encoding utf8 | ConvertFrom-Json -AsHashtable
    & $Change $doc
    Set-Content -LiteralPath $Path -Value ($doc | ConvertTo-Json -Depth 50) -Encoding utf8NoBOM
}

function Add-Text([string]$Path, [string]$Text) { [IO.File]::AppendAllText($Path, $Text) }

$HookOff = '{"session_id":"test","hook_event_name":"Stop","stop_hook_active":false}'
$HookOn = '{"session_id":"test","hook_event_name":"Stop","stop_hook_active":true}'

New-Item -ItemType Directory -Path $TmpBase | Out-Null
try {
    # --- Normal mode ---------------------------------------------------------------------------------
    Test-Case 'clean fixture passes (exit 0)' {
        $d = New-Fixture 'clean'
        Assert-Result (Invoke-Checker $d) 0 @('portal-sync: clean')
    }

    Test-Case 'STALE: a translated wiki page changed after its JSON was written' {
        $d = New-Fixture 'stale'
        Add-Text (Join-Path $d 'wiki/phases/phase-p1-foundation.md') "`nA new paragraph.`n"
        Assert-Result (Invoke-Checker $d) 1 @('STALE', 'wiki/phases/phase-p1-foundation.md', 'phases/phase-p1-foundation.json', 'roadmap.json')
    }

    Test-Case 'MISSING: a new decision page has no record' {
        $d = New-Fixture 'missing'
        Set-Content -LiteralPath (Join-Path $d 'wiki/decisions/adr-0008-new.md') -Value "---`nid: adr-0008`n---`n" -Encoding utf8NoBOM
        Assert-Result (Invoke-Checker $d) 1 @('MISSING', 'wiki/decisions/adr-0008-new.md')
    }

    Test-Case 'MISSING: a new phase page has no phase file' {
        $d = New-Fixture 'missing phase'
        Set-Content -LiteralPath (Join-Path $d 'wiki/phases/phase-p2-minimal-container.md') -Value "---`nid: phase-p2-minimal-container`n---`n" -Encoding utf8NoBOM
        Assert-Result (Invoke-Checker $d) 1 @('MISSING', 'plan/portal/phases/phase-p2-minimal-container.json')
    }

    Test-Case 'BAD-SHAPE: a decision without a title, a task chain without an arrow' {
        $d = New-Fixture 'bad shape'
        Edit-Json (Join-Path $d 'plan/portal/decisions.json') { param($j) $j['items'][0].Remove('title') }
        Edit-Json (Join-Path $d 'plan/portal/phases/phase-p1-foundation.json') { param($j) $j['tasks'][0]['chain'] = 'No arrow here' }
        Assert-Result (Invoke-Checker $d) 1 @('BAD-SHAPE', 'decisions.json', '"title"', 'phase-p1-foundation.json', '/tasks/0/chain')
    }

    Test-Case 'BAD-JSON: a file that is not JSON' {
        $d = New-Fixture 'bad json'
        Set-Content -LiteralPath (Join-Path $d 'plan/portal/risks.json') -Value '{ "id": ' -Encoding utf8NoBOM
        Assert-Result (Invoke-Checker $d) 1 @('BAD-JSON', 'risks.json')
    }

    Test-Case 'UNKNOWN-REF: a bare id and a ref link with no explainer' {
        $d = New-Fixture 'unknown ref'
        Edit-Json (Join-Path $d 'plan/portal/decisions.json') {
            param($j) $j['items'][0]['summary'] = 'Builds on adr-0099 and on [the base layer](ref:layer-nope).'
        }
        Assert-Result (Invoke-Checker $d) 1 @('UNKNOWN-REF', "'adr-0099'", "'layer-nope'")
    }

    Test-Case 'ids inside paths, code and log headings are not portal text (no false alarm)' {
        $d = New-Fixture 'skip keys'
        Edit-Json (Join-Path $d 'plan/portal/overview.json') {
            param($j) $j['next_action']['script']['parts'][0]['code'] = 'pwsh scripts/gates/p1-gate.ps1 # adr-0099 p9.9'
        }
        Assert-Result (Invoke-Checker $d) 0 @('portal-sync: clean')
    }

    Test-Case 'UNCOVERED: a new wiki log entry has no plain-language log entry' {
        $d = New-Fixture 'uncovered log'
        Add-Text (Join-Path $d 'wiki/log.md') "`n## [2026-10-10] plan | a third entry`n`n- result: three`n"
        Assert-Result (Invoke-Checker $d) 1 @('UNCOVERED', '## [2026-10-10] plan | a third entry', 'STALE', 'wiki/log.md')
    }

    Test-Case 'UNCOVERED: a new open question has no item' {
        $d = New-Fixture 'uncovered question'
        Add-Text (Join-Path $d 'wiki/overview/ov-open-questions.md') "`n## Q-002 Another question`n`n- status: open`n"
        Assert-Result (Invoke-Checker $d) 1 @('UNCOVERED', "'Q-002'")
    }

    Test-Case 'ORPHAN: the page a record was translated from was removed' {
        $d = New-Fixture 'orphan'
        Remove-Item -LiteralPath (Join-Path $d 'wiki/risks/risk-r02-tauri-multiwebview-unstable.md')
        Assert-Result (Invoke-Checker $d) 1 @('ORPHAN', 'risk-r02-tauri-multiwebview-unstable.md')
    }

    Test-Case 'MISSING-SCRIPT: a gate script path that does not exist' {
        $d = New-Fixture 'missing script'
        Edit-Json (Join-Path $d 'plan/portal/phases/phase-p1-foundation.json') { param($j) $j['test_gate']['script'] = 'scripts/gates/nope.ps1' }
        Assert-Result (Invoke-Checker $d) 1 @('MISSING-SCRIPT', 'scripts/gates/nope.ps1')
    }

    Test-Case 'MISSING-FILE and DUP-ID' {
        $d = New-Fixture 'missing file'
        Remove-Item -LiteralPath (Join-Path $d 'plan/portal/research.json')
        Edit-Json (Join-Path $d 'plan/portal/refs.json') { param($j) $j['refs'][1]['aliases'] = @('P1') }
        Assert-Result (Invoke-Checker $d) 1 @('MISSING-FILE', 'plan/portal/research.json', 'DUP-ID', "'P1'")
    }

    Test-Case '-Hash equals the SCHEMA 10.2 Python reference (CRLF file)' {
        $d = New-Fixture 'hash'
        $f = Join-Path $d 'crlf.md'
        [IO.File]::WriteAllBytes($f, [Text.Encoding]::UTF8.GetBytes("---`r`nid: x`r`n---`r`nLine with arrow `u{2192} and a lone CR`rend`n"))
        $r = Invoke-Checker $d @('-Hash', 'crlf.md')
        Assert-True ($r.Code -eq 0) "exit $($r.Code): $($r.Err)"
        $py = Get-Command python -ErrorAction SilentlyContinue
        if ($py) {
            $code = "import hashlib,sys; b=open(sys.argv[1],'rb').read().replace(b'\r\n',b'\n').replace(b'\r',b'\n'); print('sha256:'+hashlib.sha256(b).hexdigest())"
            $expected = (& $py.Source -c $code $f).Trim()
        }
        else {
            # Fallback: the same bytes written with LF only must give the same hash.
            $g = Join-Path $d 'lf.md'
            [IO.File]::WriteAllBytes($g, [Text.Encoding]::UTF8.GetBytes("---`nid: x`n---`nLine with arrow `u{2192} and a lone CR`nend`n"))
            $expected = (Invoke-Checker $d @('-Hash', 'lf.md')).Out.Trim()
        }
        Assert-True ($r.Out.Trim() -eq $expected) "checker '$($r.Out.Trim())' <> reference '$expected'"
    }

    # --- Hook mode -----------------------------------------------------------------------------------
    Test-Case 'hook: switched off (no flag file) -> exit 0 even when stale' {
        $d = New-Fixture 'hook off'
        Add-Text (Join-Path $d 'wiki/phases/phase-p1-foundation.md') "`nchanged`n"
        $r = Invoke-Checker $d @('-Hook') $HookOff
        Assert-Result $r 0
        Assert-True ([string]::IsNullOrWhiteSpace($r.Err)) "expected no message, got: $($r.Err)"
    }

    Test-Case 'hook: on, stale, stop_hook_active=false -> exit 2 (block) with a plain message' {
        $d = New-Fixture 'hook block'
        New-Item -ItemType File -Path (Join-Path $d 'plan/portal/.hook-enabled') | Out-Null
        Add-Text (Join-Path $d 'wiki/phases/phase-p1-foundation.md') "`nchanged`n"
        $r = Invoke-Checker $d @('-Hook') $HookOff
        Assert-Result $r 2 @('no longer matches the wiki', 'wiki-to-portal', 'STALE')
        Assert-True ($r.Err.Contains('STALE')) 'the reason must be on stderr (Claude Code shows stderr to Claude on exit 2)'
    }

    Test-Case 'hook: on, stale, stop_hook_active=true -> exit 0 (never loops)' {
        $d = New-Fixture 'hook active'
        New-Item -ItemType File -Path (Join-Path $d 'plan/portal/.hook-enabled') | Out-Null
        Add-Text (Join-Path $d 'wiki/phases/phase-p1-foundation.md') "`nchanged`n"
        Assert-Result (Invoke-Checker $d @('-Hook') $HookOn) 0
    }

    Test-Case 'hook: on, clean -> exit 0' {
        $d = New-Fixture 'hook clean'
        New-Item -ItemType File -Path (Join-Path $d 'plan/portal/.hook-enabled') | Out-Null
        Assert-Result (Invoke-Checker $d @('-Hook') $HookOff) 0
    }

    Test-Case 'hook: finds the repo through CLAUDE_PROJECT_DIR (as configured in .claude/settings.json)' {
        $d = New-Fixture 'hook env'
        New-Item -ItemType File -Path (Join-Path $d 'plan/portal/.hook-enabled') | Out-Null
        Add-Text (Join-Path $d 'wiki/decisions/adr-0007-child-webviews.md') "`nchanged`n"
        Assert-Result (Invoke-Checker $d @('-Hook') $HookOff @{ CLAUDE_PROJECT_DIR = $d } -NoRoot) 2 @('STALE', 'adr-0007-child-webviews.md')
    }

    # --- Speed on the real repo ----------------------------------------------------------------------
    Test-Case 'speed: a full check of the real repo takes under 5 seconds' {
        $sw = [Diagnostics.Stopwatch]::StartNew()
        $r = Invoke-Checker $Repo
        $sw.Stop()
        Assert-True ($r.Code -in 0, 1) "checker crashed: exit $($r.Code) $($r.Err)"
        Assert-True ($sw.Elapsed.TotalSeconds -lt 5) "took $([math]::Round($sw.Elapsed.TotalSeconds, 2)) s"
        Write-Output ("      real repo: {0:N2} s, exit {1}, {2}" -f $sw.Elapsed.TotalSeconds, $r.Code, ($r.Out.Trim() -split "`n")[-1])
    }
}
finally {
    Remove-Item -LiteralPath $TmpBase -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Output ''
Write-Output "test-portal-sync-check: $script:Passed passed, $script:Failed failed"
if ($script:Failed -gt 0) { exit 1 }
exit 0
