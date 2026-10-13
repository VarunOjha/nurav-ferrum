#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p3.10 (P3 Tabs and sessions): A guard against freezes when tabs are created.

.DESCRIPTION
  What it checks : (1) a code scan of apps/desktop/src-tauri/src: every Tauri command that can create a tab view
                   (it calls open_tab, navigate_tab or reopen) is async, and nothing there blocks on a reply (recv,
                   recv_timeout, block_on, .wait) except the debug-only test_stats command, which waits off the UI
                   thread (selftest.rs is not scanned for waits: the built-in self-tests run on their own
                   background threads, never on the UI thread); (2) the review checklist item exists (docs/developer/code-review-checklist.md); (3) the smoke
                   test "no-freeze": about 40 tab commands fired at once (new, navigate to other sites, close) all return
                   within 30 s, every tab gets its view, and page pop-ups still create tabs.
  Why            : on Windows, creating a web view while the caller waits can freeze the app → tab views are only
                   ever made in the background and nobody waits for them → the app cannot hang on a new tab.
  What it changes: nothing in git.
  How long       : about 30 seconds after the first build.
  How to run     : pwsh -NoProfile -File scripts/verify/p3.10-guard-against-freeze.ps1
                   Needs the local development certificate (task p2.1) and ports 8443 and 9339 free.
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p3.10 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1, scripts/lib/Ferrum.SelfTest.ps1). Phase-page verify field:
    Code review checklist item plus a test that creates tabs from the shell's command path in a loop without
    hanging (test timeout).
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p3.10' -Title 'A guard against freezes when tabs are created' -Phase 'phase-p3-tabs-sessions' `
    -Why 'the app cannot hang on a new tab.'

# The body of the function whose header ends at $start (the text from its first '{' to the matching '}').
function Get-Body([string]$text, [int]$start) {
    $open = $text.IndexOf('{', $start)
    $depth = 0
    for ($i = $open; $i -lt $text.Length; $i++) {
        if ($text[$i] -eq '{') { $depth++ } elseif ($text[$i] -eq '}') { $depth--; if ($depth -eq 0) { return $text.Substring($open, $i - $open + 1) } }
    }
    $text.Substring($open)
}

Invoke-Step 'Code scan: tab-creating commands are async; nothing blocks on a reply' {
    $problems = [System.Collections.Generic.List[string]]::new()
    $commands = 0
    foreach ($file in Get-ChildItem -LiteralPath (Get-RepoPath 'apps/desktop/src-tauri/src') -Filter *.rs) {
        $text = Get-Content -LiteralPath $file.FullName -Raw
        foreach ($m in [regex]::Matches($text, '#\[tauri::command\]\s*(?:\r?\n\s*)*pub\s+(async\s+)?fn\s+(\w+)')) {
            $commands++
            $body = Get-Body $text ($m.Index + $m.Length)
            if (-not $m.Groups[1].Success -and $body -match '\b(open_tab|navigate_tab|reopen)\s*\(') {
                $problems.Add("$($file.Name): command $($m.Groups[2].Value) is not async but can create a tab view ($($Matches[1]))")
            }
        }
        # The built-in self-tests (selftest.rs) run on their own background threads and may wait there.
        if ($file.Name -eq 'selftest.rs') { continue }
        foreach ($m in [regex]::Matches($text, '\.(recv|recv_timeout|wait)\s*\(|block_on\s*\(')) {
            $before = $text.Substring(0, $m.Index)
            $fn = [regex]::Matches($before, 'fn\s+(\w+)') | Select-Object -Last 1
            if ($fn.Groups[1].Value -ne 'test_stats') { $problems.Add("$($file.Name): blocking call '$($m.Value.Trim())' in $($fn.Groups[1].Value)") }
        }
    }
    if ($commands -lt 20) { Stop-Fail "Only $commands commands found; the scan is not reading the code it should." }
    if ($problems.Count) { Stop-Fail ($problems -join '; ') }
    "$commands commands scanned; tab-creating ones are async; no blocking call outside test_stats"
}

Invoke-Step 'The review checklist has the item' {
    $t = Read-RepoText 'docs/developer/code-review-checklist.md'
    if ($t -notmatch 'No web view is created while a caller waits') { Stop-Fail 'The checklist item is missing.' }
    'docs/developer/code-review-checklist.md: present'
}

Invoke-Step 'Smoke test: a burst of tab commands settles; pop-ups still open tabs' {
    $r = Invoke-FerrumSmoke -Spec 'no-freeze'
    Add-LogText (Get-Tail $r.Output 6)
    if ($r.ExitCode -ne 0 -or $r.Output -notmatch '\b1 passed') { Stop-Fail "The smoke test failed:`n$(Get-Tail $r.Output 20)" }
    'no-freeze: 1 passed'
}

Complete-Check -SaveEvidence:$SaveEvidence
