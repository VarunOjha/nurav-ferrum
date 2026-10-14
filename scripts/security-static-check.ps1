#Requires -Version 7.0
<#
.SYNOPSIS
  Proves the normal release build of Ferrum has no "no security" benchmark switch (P4 task p4.16).

.DESCRIPTION
  What it checks : (1) the normal release build is made without the Cargo feature bench-nosecurity (cargo tree);
                   (2) the program file has none of the switch's marker texts; (3) positive control: a benchmark build
                   made with the switch does have them, so the scan can find them; (4) that benchmark build refuses
                   to start without --benchmark-mode.
  Why            : measuring the cost of security needs a build without the site rules → it exists only as a
                   separately built benchmark program → this proves the normal app never contains it.
  What it changes: nothing in the repo; builds both programs in its own folder (default target/security-static), so a
                   Ferrum that is running from target/release is not touched.
  How long       : about five minutes the first time (two optimised builds), about one minute after.
  How to run     : pwsh -NoProfile -File scripts/security-static-check.ps1
  Result         : exit 0 = PASS, 1 = FAIL. Prints every finding (also used as evidence by the p4.16 check and in CI).
  Tell Claude    : nothing if it passes; otherwise paste the FAIL lines.
#>
[CmdletBinding()]
param([string]$TargetDir = 'target/security-static')
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repo
$cargoBin = Join-Path $env:USERPROFILE '.cargo/bin'
if ((Test-Path -LiteralPath $cargoBin) -and ($env:PATH -notlike "*$cargoBin*")) { $env:PATH = "$cargoBin;$env:PATH" }

# Texts that exist only in a build with the switch (crates/security/src/policy.rs, apps/desktop/src-tauri/src/main.rs).
$markers = @('bench-nosecurity-ablation-rule', 'benchmark-nosecurity-build', '--benchmark-mode', 'benchmark build without site rules')
$fail = 0
function Say([string]$t) { Write-Output $t }
function Fail([string]$t) { Write-Output "FAIL $t"; $script:fail++ }

function Build([string[]]$extra) {
    $out = & cargo build --release --locked -p ferrum-desktop --target-dir $TargetDir @extra 2>&1 | ForEach-Object { "$_" }
    if ($LASTEXITCODE -ne 0) { throw "cargo build failed:`n$(($out | Select-Object -Last 15) -join "`n")" }
}
function Count([string]$file, [string]$text) {
    $bytes = [IO.File]::ReadAllBytes($file)
    $s = [Text.Encoding]::Latin1.GetString($bytes)
    ([regex]::Matches($s, [regex]::Escape($text))).Count
}

Say "security-static-check at $(Get-Date -Format 'yyyy-MM-dd HH:mm') on commit $(git rev-parse --short HEAD)$(if (git status --porcelain) { ' (with uncommitted changes)' })"
Say "target folder: $TargetDir"

# 1. Feature list of the normal build.
$tree = (& cargo tree --locked -p ferrum-desktop -e features -i ferrum-security 2>&1 | ForEach-Object { "$_" }) -join "`n"
Say "`n== cargo tree -p ferrum-desktop -e features -i ferrum-security (normal build)`n$tree"
if ($tree -match 'bench-nosecurity') { Fail 'the normal build enables bench-nosecurity' } else { Say 'PASS feature bench-nosecurity is not enabled in the normal build' }

# 2. and 3. Build the benchmark program first (kept aside), then the normal one, and scan both.
Build @('--features', 'bench-nosecurity')
$ablation = Join-Path $TargetDir 'ferrum-desktop-bench-nosecurity.exe'
Copy-Item -LiteralPath (Join-Path $TargetDir 'release/ferrum-desktop.exe') -Destination $ablation -Force
Build @()
$normal = Join-Path $TargetDir 'release/ferrum-desktop.exe'
Say "`n== marker texts (count in the normal release program / in the benchmark program)"
foreach ($m in $markers) {
    $n = Count $normal $m; $a = Count $ablation $m
    Say ("  {0,-38} normal={1} benchmark={2}" -f $m, $n, $a)
    if ($n -ne 0) { Fail "the normal release program contains '$m'" }
    if ($a -eq 0) { Fail "positive control: the benchmark program does not contain '$m' (the scan would miss it)" }
}
if ($fail -eq 0) { Say 'PASS no marker in the normal release program; every marker found in the benchmark program' }
Say ("  sizes: normal {0:N0} bytes, benchmark {1:N0} bytes" -f (Get-Item $normal).Length, (Get-Item $ablation).Length)

# 4. The benchmark program refuses to start without --benchmark-mode.
$p = Start-Process -FilePath $ablation -PassThru -Wait -NoNewWindow -RedirectStandardError (Join-Path $TargetDir 'refusal.txt')
$msg = (Get-Content -Raw -LiteralPath (Join-Path $TargetDir 'refusal.txt')).Trim()
Say "`n== benchmark program started without --benchmark-mode: exit $($p.ExitCode)`n  $msg"
if ($p.ExitCode -ne 2 -or $msg -notmatch 'starts only with --benchmark-mode') { Fail 'the benchmark program did not refuse to start' }
else { Say 'PASS the benchmark program refuses to start without --benchmark-mode' }

Say "`nRESULT: $(if ($fail) { "FAIL ($fail)" } else { 'PASS' })"
exit $(if ($fail) { 1 } else { 0 })
