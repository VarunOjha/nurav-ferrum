#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p1.1 (P1 Foundation): Confirm and record the toolchain.

.DESCRIPTION
  What it checks : each build tool is installed and prints its version: Rust (version 1.90 or newer, for
                   Windows with the Microsoft C++ tools), cargo, rustup, the Microsoft C++ build tools (found
                   with Microsoft's own finder, vswhere), Node 24, npm, Python, git, PowerShell 7 and the
                   licence checker cargo-deny; then a tiny throw-away Rust program is built, which proves the
                   C++ linker works; finally, that the versions were saved as evidence (toolchain.txt).
  Why            : every later result must name the tools it was built with → confirm each works and write
                   the exact versions down.
  What it changes: nothing in the repo. The tiny Rust program is built in your temp folder and deleted.
                   With -SaveEvidence it writes wiki/raw/evidence/phase-p1-foundation/toolchain.txt (masked).
  How long       : about 20 seconds (the first Rust build can take a minute).
  How to run     : pwsh -NoProfile -File scripts/verify/p1.1-toolchain.ps1
                   Claude, when doing p1.1:  pwsh -NoProfile -File scripts/verify/p1.1-toolchain.ps1 -SaveEvidence
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If a tool FAILS, paste its line and say "p1.1 check failed";
                   Claude installs what is missing (you only click the Windows admin prompt).
  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1).
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force

Start-Check -Id 'p1.1' -Title 'Confirm and record the toolchain' -Phase 'phase-p1-foundation' `
    -Why 'every later result must name the exact tools it was built with.'

$evidence = 'wiki/raw/evidence/phase-p1-foundation/toolchain.txt'

function Get-ToolVersion([string]$Tool, [string[]]$ToolArgs) {
    $r = Invoke-Native -FilePath $Tool -ArgumentList $ToolArgs
    if ($r.ExitCode -ne 0) { Stop-Fail "'$Tool $($ToolArgs -join ' ')' failed: $(Get-Tail $r.Output 3)" }
    $r.Output.Trim()
}

Invoke-Step 'Rust 1.90 or newer, built for Windows with the Microsoft C++ tools' {
    $out = Get-ToolVersion 'rustc' @('-Vv')
    if ($out -notmatch '(?m)^host:\s*x86_64-pc-windows-msvc') { Stop-Fail "Rust is not the Windows/MSVC build:`n$out" }
    if ($out -notmatch '(?m)^release:\s*(\S+)') { Stop-Fail "rustc -Vv shows no release line:`n$out" }
    $v = Get-VersionNumber $Matches[1]
    if ($v -lt [version]'1.90.0') { Stop-Fail "Rust $v is older than 1.90." }
    "rustc $v (x86_64-pc-windows-msvc)"
}

Invoke-Step 'cargo and rustup answer' {
    $c = Get-ToolVersion 'cargo' @('-V')
    $u = Get-ToolVersion 'rustup' @('show', 'active-toolchain')
    "$c; active toolchain: $(($u -split "`n")[0])"
}

Invoke-Step 'Microsoft C++ build tools are installed (found with vswhere)' {
    $vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
    if (-not (Test-Path -LiteralPath $vswhere)) { Stop-Fail 'vswhere.exe not found: the Visual Studio installer is missing.' }
    $r = Invoke-Native -FilePath $vswhere -ArgumentList @('-latest', '-products', '*', '-requires', 'Microsoft.VisualStudio.Component.VC.Tools.x86.x64', '-format', 'json')
    $found = @($r.Output | ConvertFrom-Json)
    if ($found.Count -eq 0) { Stop-Fail 'No Visual Studio install with the C++ x64 build tools was found.' }
    "$($found[0].displayName) $($found[0].installationVersion)"
}

Invoke-Step 'Node 24 and npm' {
    $n = Get-ToolVersion 'node' @('--version')
    if ((Get-VersionNumber $n).Major -ne 24) { Stop-Fail "Node is $n; the plan uses major version 24." }
    $npm = Invoke-Npm -Arguments @('--version') -Folder '.'
    "node $n; npm $($npm.Output.Trim())"
}

Invoke-Step 'Python, git and PowerShell 7' {
    $p = Get-ToolVersion 'python' @('--version')
    $g = Get-ToolVersion 'git' @('--version')
    if ($PSVersionTable.PSVersion.Major -lt 7) { Stop-Fail "PowerShell is $($PSVersionTable.PSVersion); version 7 is required." }
    "$p; $g; PowerShell $($PSVersionTable.PSVersion)"
}

Invoke-Step 'Licence checker cargo-deny is installed' {
    $r = Invoke-Native -FilePath 'cargo' -ArgumentList @('deny', '--version')
    if ($r.ExitCode -ne 0) { Stop-Fail "cargo-deny is not installed yet (part of this task: cargo install cargo-deny --locked)." }
    $r.Output.Trim()
}

Invoke-Step 'A tiny Rust program builds and links' {
    $dir = Join-Path ([IO.Path]::GetTempPath()) "ferrum-link-test-$PID"
    try {
        $new = Invoke-Native -FilePath 'cargo' -ArgumentList @('new', '--bin', '--vcs', 'none', '--quiet', $dir)
        if ($new.ExitCode -ne 0) { Stop-Fail "cargo new failed: $(Get-Tail $new.Output 4)" }
        $b = Invoke-Native -FilePath 'cargo' -ArgumentList @('build', '--quiet') -WorkingDirectory $dir
        if ($b.ExitCode -ne 0) { Stop-Fail "The test program did not build or link:`n$(Get-Tail $b.Output 8)" }
        $exe = Get-ChildItem -LiteralPath (Join-Path $dir 'target\debug') -Filter '*.exe' | Select-Object -First 1
        if (-not $exe) { Stop-Fail 'The build finished but produced no program.' }
        $run = Invoke-Native -FilePath $exe.FullName
        if ($run.Output -notmatch 'Hello, world!') { Stop-Fail "The test program ran but printed: $($run.Output)" }
        'built, linked and ran (prints Hello, world!)'
    }
    finally { Remove-Item -LiteralPath $dir -Recurse -Force -ErrorAction SilentlyContinue }
}

Invoke-Step 'Versions saved as evidence (toolchain.txt)' {
    if (Test-Path -LiteralPath (Get-RepoPath $evidence)) { return "$evidence exists" }
    if ($SaveEvidence) { return 'this printout is saved now' }
    Stop-Fail "Not saved yet: $evidence (Claude runs this script with -SaveEvidence as part of p1.1)."
}

Complete-Check -SaveEvidence:$SaveEvidence -EvidencePath $evidence
