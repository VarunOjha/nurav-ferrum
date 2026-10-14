#Requires -Version 7.0
<#
.SYNOPSIS
  Runs Ferrum's GitHub checks (.github/workflows/ci.yml) on this computer, step by step.

.DESCRIPTION
  What it checks : the same steps as the GitHub workflow: Rust formatting, code warnings, tests, release
                   build and licence/alert check; the plan app's style, types, unit tests and build; the wiki
                   check, the fingerprint parity test and the tools' unit tests; and that no lock file or
                   toolchain file changed during the run.
  Why            : GitHub only runs after you push → the same checks here catch problems first, and their
                   output is the phase's evidence.
  What it changes: nothing tracked by git. Build output goes to ignored folders (target/, interactive_plan/.next/).
                   With -CleanInstall it runs "npm ci", which deletes and reinstalls interactive_plan/node_modules.
  Two differences from GitHub, on purpose:
                   - "npm ci" only with -CleanInstall (by default the installed packages are checked with npm ls);
                   - the plan app's browser tests only with -E2E: Playwright stops its test server with a forced
                     process kill, and the owner asked Claude to run no kill commands without asking (2026-10-11).
  How long       : about 5 to 10 minutes (the release build is the slow part).
  How to run     : pwsh -NoProfile -File scripts/ci-local.ps1   [-CleanInstall] [-E2E]
  Result         : prints PASS or FAIL per step and exits 0 only if every step passed.
  Tell Claude    : "ci-local passed", or paste the first FAIL line.
#>
[CmdletBinding()]
param([switch]$CleanInstall, [switch]$E2E)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root
foreach ($p in "$env:ProgramFiles\nodejs", "$env:USERPROFILE\.cargo\bin") {
    if ((Test-Path -LiteralPath $p) -and ($env:Path -notlike "*$p*")) { $env:Path = "$p;$env:Path" }
}

$results = [System.Collections.Generic.List[object]]::new()
function Step([string]$Name, [string]$Folder, [string]$Command) {
    $start = Get-Date
    Write-Host ("`n=== {0}  ({1}> {2})" -f $Name, $Folder, $Command) -ForegroundColor Cyan
    Push-Location -LiteralPath (Join-Path $root $Folder)
    try {
        $global:LASTEXITCODE = 0
        & ([scriptblock]::Create("$Command 2>&1")) | ForEach-Object { "$_" } | Out-Host
        $code = $LASTEXITCODE
    }
    catch { Write-Host $_; $code = 1 }
    finally { Pop-Location }
    $ok = ($code -eq 0)
    $results.Add([pscustomobject]@{ Step = $Name; Result = $(if ($ok) { 'PASS' } else { 'FAIL' }); Exit = $code; Seconds = [int]((Get-Date) - $start).TotalSeconds })
    Write-Host ("--- {0}: {1} (exit {2})" -f $Name, $(if ($ok) { 'PASS' } else { 'FAIL' }), $code) -ForegroundColor $(if ($ok) { 'Green' } else { 'Red' })
}

Write-Host "Ferrum ci-local at $(Get-Date -Format 'yyyy-MM-dd HH:mm') on commit $(git rev-parse --short HEAD)$(if (git status --porcelain) { ' (with uncommitted changes)' })"

# Job: rust
Step 'rust-fmt' '.' 'cargo fmt --all -- --check'
Step 'rust-clippy' '.' 'cargo clippy --locked --workspace --all-targets --all-features -- -D warnings'
Step 'rust-test' '.' 'cargo test --locked --workspace --all-targets'
Step 'rust-build' '.' 'cargo build --locked --workspace --release'
Step 'security-static' '.' 'pwsh -NoProfile -File scripts/security-static-check.ps1'
# Job: rust-deps
Step 'rust-deps' '.' 'cargo deny check'
# Job: plan-app
if ($CleanInstall) { Step 'plan-app npm ci' 'interactive_plan' 'npm ci' }
else { Step 'plan-app packages match the lock file (npm ls)' 'interactive_plan' 'npm ls --all --silent' }
Step 'plan-app lint' 'interactive_plan' 'npm run lint'
Step 'plan-app typecheck' 'interactive_plan' 'npm run typecheck'
Step 'plan-app unit tests' 'interactive_plan' 'npm run test'
Step 'plan-app build' 'interactive_plan' 'npm run build'
if ($E2E) { Step 'plan-app e2e' 'interactive_plan' 'npm run test:e2e' }
# Job: wiki
Step 'wiki-lint' 'interactive_plan' 'npm run lint:wiki'
Step 'hash-parity' 'interactive_plan' 'npx vitest run tests/unit/hash.vectors.test.ts'
Step 'tools unit tests' '.' 'python -m unittest discover -s tools -p "test_*.py"'
# repro-check (both jobs)
Step 'repro-check (lock and toolchain files unchanged)' '.' 'git diff --exit-code -- Cargo.lock rust-toolchain.toml interactive_plan/package-lock.json'

Write-Host "`n=== Summary" -ForegroundColor Cyan
$results | Format-Table -AutoSize | Out-String | Write-Host
if (-not $E2E) { Write-Host 'Not run here: plan-app e2e (use -E2E; GitHub runs it).' }
$failed = @($results | Where-Object Result -eq 'FAIL')
if ($failed.Count) { Write-Host "RESULT: FAIL ($($failed.Count) step(s))" -ForegroundColor Red; exit 1 }
Write-Host "RESULT: PASS ($($results.Count) steps)" -ForegroundColor Green
exit 0
