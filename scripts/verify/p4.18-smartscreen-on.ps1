#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p4.18 (P4 Security): SmartScreen back on.

.DESCRIPTION
  What it checks : (1) the research note on SmartScreen in WebView2 exists, gives access dates, and is cited by
                   SECURITY.md and the data-flows page (what SmartScreen sends to Microsoft); (2) a unit test: Ferrum's
                   browser switches do not switch SmartScreen off and keep the two Edge-menu switches and the autoplay
                   switch; (3) the source: the shell, the IPC self-test's extra view and every site engine get that one
                   set of switches, and nothing else in Ferrum switches SmartScreen off; (4) live, in each isolation mode
                   with two sites open: every browser engine Ferrum started runs without the SmartScreen-off switch;
                   (5) live: Microsoft's SmartScreen demo phishing page is opened and what Ferrum shows is recorded as
                   observed (no warning would be recorded as a note, not hidden); (6) live: a downloaded program
                   gets WebView2's own download pop-up (where SmartScreen asks "Keep or delete?") and waits there,
                   with Ferrum's program warning on its line; the other download tests still pass.
  Why            : SmartScreen warns about known phishing and malware sites and downloads → Ferrum stops switching it
                   off in every engine → you get the same protection Edge gives, and the documents say what it sends.
  What it changes: nothing (builds the app and the test pages in target/debug; test data under the smoke-test folder).
                   Step 5 opens one Microsoft demo page on the internet, so its address goes to Microsoft's SmartScreen.
  How long       : about five minutes (builds, then Ferrum opens and closes by itself several times).
  By hand (once) : download a program file in Ferrum and answer "Keep" in the pop-up; tell Claude what happened.
  How to run     : pwsh -NoProfile -File scripts/verify/p4.18-smartscreen-on.ps1
  Result         : PASS (every checked step is fine) or FAIL (the line says what).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p4.18 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers: scripts/lib/Ferrum.Check.psm1).
    Do not use the PC while the live tests run. Needs internet for step 5. Phase-page verify field: A research note in
    raw/research (access dates) says what SmartScreen checks and sends inside WebView2, cited by the privacy page and
    SECURITY.md; an automated check proves no environment's browser arguments contain msSmartScreenProtection (shell
    and site environments); a live check opens Microsoft's SmartScreen test page named in the note and records what
    WebView2 shows, as observed (a missing warning is recorded, not hidden).
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p4.18' -Title 'SmartScreen back on' -Phase 'phase-p4-security' `
    -Why 'you get the same protection Edge gives, and the documents say what it sends.'

$cargoBin = Join-Path $env:USERPROFILE '.cargo/bin'
if ((Test-Path -LiteralPath $cargoBin) -and ($env:PATH -notlike "*$cargoBin*")) { $env:PATH = "$cargoBin;$env:PATH" }

Invoke-Step 'Research note with access dates, cited by SECURITY.md and the data-flows page' {
    $note = 'wiki/raw/research/smartscreen-webview2.md'
    Assert-RepoFile $note
    $text = Read-RepoText $note
    $urls = @([regex]::Matches($text, '(?m)^  - https://\S+.*$') | ForEach-Object Value)
    $undated = @($urls | Where-Object { $_ -notmatch 'accessed \d{4}-\d{2}-\d{2}' })
    if ($urls.Count -lt 3 -or $undated.Count) { Stop-Fail "The note's sources need an access date each (sources: $($urls.Count), without a date: $($undated.Count))." }
    if ($text -notmatch 'demo\.smartscreen\.msft\.net/phishingdemo\.html') { Stop-Fail 'The note does not name Microsoft''s demo phishing page.' }
    foreach ($doc in 'SECURITY.md', 'wiki/architecture/ov-arch-data-flows.md') {
        if ((Read-RepoText $doc) -notmatch 'smartscreen-webview2\.md') { Stop-Fail "$doc does not cite the research note." }
    }
    "$($urls.Count) dated sources; cited by SECURITY.md and the data-flows page"
}

Invoke-Step 'Unit test: the switches keep SmartScreen on and keep the menu and autoplay switches' {
    $r = Assert-Cargo @('test', '--locked', '-p', 'ferrum-webview-manager', 'browser_arguments_keep_smartscreen_on')
    if ($r.Output -notmatch '(?m)^test (\S+::)?browser_arguments_keep_smartscreen_on \.\.\. ok') {
        Stop-Fail "The unit test did not run or did not pass:`n$(Get-Tail $r.Output 10)"
    }
    'browser_arguments_keep_smartscreen_on passed'
}

Invoke-Step 'Source: one set of switches for every engine; nothing else switches SmartScreen off' {
    $uses = [ordered]@{
        'apps/desktop/src-tauri/src/main.rs'         = 'additional_browser_args\(ferrum_webview_manager::webview2::SHELL_BROWSER_ARGUMENTS\)'
        'apps/desktop/src-tauri/src/selftest.rs'     = 'additional_browser_args\(ferrum_webview_manager::webview2::SHELL_BROWSER_ARGUMENTS\)'
        'crates/webview-manager/src/webview2.rs'     = 'set_additional_browser_arguments\(SHELL_BROWSER_ARGUMENTS'
    }
    foreach ($f in $uses.Keys) {
        if ((Read-RepoText $f) -notmatch $uses[$f]) { Stop-Fail "$f does not use Ferrum's browser switches ($($uses[$f]))." }
    }
    # Every WebviewBuilder in the app sets the switches (a view without them would get wry's default, SmartScreen off).
    $builders = @(Get-ChildItem -LiteralPath (Get-RepoPath 'apps/desktop/src-tauri/src') -Filter '*.rs' | Select-String -Pattern 'WebviewBuilder::new\(')
    if ($builders.Count -ne 2) { Stop-Fail "Expected 2 WebviewBuilder::new calls (shell, self-test probe), found $($builders.Count): a new view must get the switches too." }
    # No code line (comments and the unit test's assertion aside) sets the SmartScreen-off switch or turns reputation
    # checking off.
    $bad = foreach ($root in 'apps/desktop/src-tauri/src', 'crates') {
        Get-ChildItem -LiteralPath (Get-RepoPath $root) -Recurse -Filter '*.rs' | Where-Object FullName -notmatch '\\target\\' |
            Select-String -Pattern 'msSmartScreenProtection|IsReputationCheckingRequired|put_IsReputationCheckingRequired' |
            Where-Object { $_.Line -notmatch '^\s*//' -and $_.Line -notmatch 'assert!\(!SHELL_BROWSER_ARGUMENTS\.contains\("msSmartScreenProtection"\)\)' } |
            ForEach-Object { "$([IO.Path]::GetRelativePath((Get-RepoRoot), $_.Path)):$($_.LineNumber): $($_.Line.Trim())" }
    }
    if ($bad) { Stop-Fail "Code that switches SmartScreen off:`n$($bad -join "`n")" }
    'shell, self-test view and site engines use SHELL_BROWSER_ARGUMENTS; no other line switches SmartScreen off'
}

$live = $null
Invoke-Step 'Live: no browser engine runs with SmartScreen switched off (shared, per-site, per-site-udf)' {
    $script:live = Invoke-FerrumSmoke -Spec @('smartscreen', 'safe-downloads')
    $r = $script:live
    Add-LogText (($r.Output -split "`r?`n" | Where-Object { $_ -match '^SMARTSCREEN-' }) -join "`n")
    Add-LogText (Get-Tail $r.Output 8)
    $argLines = @($r.Output -split "`r?`n" | Where-Object { $_ -match '^SMARTSCREEN-ARGS ' })
    if ($argLines.Count -ne 3) { Stop-Fail "Expected the switches of 3 modes, got $($argLines.Count):`n$(Get-Tail $r.Output 30)" }
    if ($r.ExitCode -ne 0 -or $r.Output -match '(?m)^\s+\d+ failed') { Stop-Fail "The live tests failed:`n$(Get-Tail $r.Output 30)" }
    $n = 0
    foreach ($line in $argLines) {
        $j = ($line -replace '^SMARTSCREEN-ARGS ', '') | ConvertFrom-Json
        foreach ($b in $j.browsers) { $n++; if ($b.smartscreen_off) { Stop-Fail "$($j.mode) / $($b.environment): SmartScreen switched off." } }
    }
    "$n browser engines in 3 modes, none with SmartScreen switched off (shell's engine, and each site's under per-site-udf)"
}

Invoke-Step 'Live: Microsoft''s demo phishing page, as observed' {
    $demo = @($script:live.Output -split "`r?`n" | Where-Object { $_ -match '^SMARTSCREEN-DEMO ' })
    if ($demo.Count -ne 2) { Stop-Fail "Expected the demo page in 2 modes, got $($demo.Count) (no internet?)." }
    $out = foreach ($line in $demo) {
        $j = ($line -replace '^SMARTSCREEN-DEMO ', '') | ConvertFrom-Json
        $panel = if ($j.ferrum_error_panel) { "Ferrum's panel shown on top: '$($j.ferrum_error_panel)'" } else { "no Ferrum panel" }
        if (-not $j.warning_seen) { Write-Note "$($j.mode): NO SmartScreen warning seen (tab title '$($j.tab_title)'); see the note, 3.2 and 3.7." }
        "$($j.mode): tab title '$($j.tab_title)'; $panel"
    }
    $out -join "`n         "
}

Invoke-Step 'Live: a downloaded program waits in WebView2''s own pop-up for SmartScreen''s question' {
    foreach ($t in 'a program file is saved with the warning and is not opened', 'a right-to-left mark cannot hide a program') {
        if ($script:live.Output -notmatch [regex]::Escape($t)) { Stop-Fail "Live test '$t' did not run." }
    }
    'safe-downloads passed: program downloads held with the pop-up opened and the warning shown; nothing opened'
}

Complete-Check -SaveEvidence:$SaveEvidence
