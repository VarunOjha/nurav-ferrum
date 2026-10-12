#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p3.21 (P3 feature set): the encrypted backup file and its import (adr-0032).

.DESCRIPTION
  What it checks : (1) the backup format's unit tests: round trip; nothing readable in the file; a short passphrase,
                   a wrong passphrase, a changed byte (header or body), a cut-off file, a file from a newer Ferrum and
                   a file asking for unreasonable work are refused; Ferrum's key-derivation cost is the documented
                   one; (2) the store's import tests: merge skips what is already there, replace keeps only the
                   backup, script and file addresses inside a backup are dropped, a copy of the library can be made;
                   (3) the licence and alert check with the new building blocks (cargo deny); (4) the smoke test
                   "backup": make a backup from the screen, refuse mismatched or short passphrases, look inside from a
                   fresh Ferrum, refuse a wrong passphrase and a changed byte, merge, replace (asked twice, a copy
                   kept), and the passphrase is in no log.
  Why            : you want a manual but secure dump to load into another Ferrum → it must be unreadable without the
                   passphrase, refuse anything changed, and never lose your data.
  What it changes: nothing in git.
  How long       : about 3 minutes after the first build.
  How to run     : pwsh -NoProfile -File scripts/verify/p3.21-backup.ps1
                   Needs the local development certificate (task p2.1) and ports 8443 and 9339 free.
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p3.21 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1, scripts/lib/Ferrum.SelfTest.ps1). Phase-page verify field:
    Unit tests: round trip; wrong passphrase, a changed byte and a truncated file are each refused with nothing
    changed; a javascript: bookmark inside a backup is dropped; size limit enforced; smoke test: export from one data
    folder, import into a fresh one, bookmarks and history match; the passphrase appears in no log.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p3.21' -Title 'The encrypted backup and its import' -Phase 'phase-p3-tabs-sessions' `
    -Why 'a backup must be unreadable without the passphrase, refuse anything changed, and never lose your data.'

Invoke-Step 'Backup format and import unit tests' {
    $r = Assert-Cargo @('test', '--locked', '-p', 'ferrum-core', '--lib', '--', 'backup', 'copy_to')
    Add-LogText (Get-Tail $r.Output 14)
    $need = 'backup::tests::round_trip', 'backup::tests::short_passphrase_is_refused',
        'backup::tests::wrong_passphrase_changed_byte_and_cut_file_are_refused',
        'backup::tests::not_a_backup_newer_and_unreasonable_files_are_refused',
        'backup::tests::ferrum_cost_is_the_documented_one', 'backup::tests::two_backups_of_the_same_contents_differ',
        'store::tests::backup_export_and_import_merge_or_replace', 'store::tests::copy_to_writes_a_usable_copy_and_never_overwrites'
    foreach ($n in $need) {
        if ($r.Output -notmatch "$([regex]::Escape($n)) \.\.\. ok") { Stop-Fail "The unit test '$n' did not pass." }
    }
    "$($need.Count) named tests pass"
}

Invoke-Step 'Licences and alerts with the encryption building blocks' {
    [void](Assert-Cargo @('deny', 'check'))
    $tree = Assert-Cargo @('tree', '--locked', '-p', 'ferrum-core', '-e', 'normal', '--depth', '1')
    foreach ($c in 'argon2 v0.6.0', 'chacha20poly1305 v0.11.0') {
        if ($tree.Output -notmatch [regex]::Escape($c)) { Stop-Fail "ferrum-core does not use $c." }
    }
    'cargo deny check: ok (argon2 0.6.0, chacha20poly1305 0.11.0)'
}

Invoke-Step 'Smoke test: backup and restore between two Ferrums' {
    $r = Invoke-FerrumSmoke -Spec 'backup.spec'
    Add-LogText (Get-Tail $r.Output 10)
    if ($r.ExitCode -ne 0 -or $r.Output -match '\d+ failed') { Stop-Fail "The smoke test failed:`n$(Get-Tail $r.Output 25)" }
    foreach ($name in 'make a backup from the Backup and restore screen', 'a fresh Ferrum: wrong passphrase and a changed byte are refused; merge, then replace',
        'the passphrase is in no log') {
        if ($r.Output -notmatch [regex]::Escape($name)) { Stop-Fail "The smoke test '$name' did not run." }
    }
    "backup: $(([regex]::Match($r.Output, '\d+ passed')).Value)"
}

Complete-Check -SaveEvidence:$SaveEvidence
