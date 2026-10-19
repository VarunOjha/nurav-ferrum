#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p5.4 (P5 Measurement): Prove the meter accurate.

.DESCRIPTION
  What it checks : (1) the limits were committed before any validation result existed; (2) a helper program that
                   uses a known amount of memory (256 MiB, every byte written) and CPU (one thread busy for 2 s) is
                   read by the meter within those limits, and psutil (an independent Python tool) reads the same
                   values; (3) live: a Ferrum tab fills a 128 MiB buffer and Ferrum's memory total rises by about
                   that much.
  Why            : A meter can be wrong in quiet ways → test it against amounts known in advance, with limits fixed
                   before the run → every later memory and CPU number rests on a meter that has passed.
  What it changes: nothing (Python's psutil 7.2.2 must be installed: python -m pip install --user psutil==7.2.2).
                   It starts a helper program and Ferrum; both close by themselves (nothing is killed).
  How long       : about 2 minutes (longer the first time, while Rust compiles).
  How to run     : pwsh -NoProfile -File scripts/verify/p5.4-prove-meter-accurate.ps1   (do not use the PC meanwhile)
  Result         : PASS or FAIL (the line says what).
  Tell Claude    : "p5.4 check passed", or paste the FAIL lines.

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers: scripts/lib/Ferrum.Check.psm1).
    -SaveEvidence also writes the helper results as wiki/raw/evidence/phase-p5-telemetry/ground-truth-p5.4.json.
    Phase-page verify field: Validation tests pass within tolerances written in the test before it is run; raw
    outputs saved as evidence; tolerances and any failure recorded on the metric pages.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p5.4' -Title 'Prove the meter accurate' -Phase 'phase-p5-telemetry' `
    -Why 'every later memory and CPU number rests on a meter that has passed.'

$cargoBin = Join-Path $env:USERPROFILE '.cargo/bin'
if ((Test-Path -LiteralPath $cargoBin) -and ($env:PATH -notlike "*$cargoBin*")) { $env:PATH = "$cargoBin;$env:PATH" }
$tolFile = 'crates/telemetry/tests/ground-truth-tolerances.json'

Invoke-Step 'The limits were committed before any result' {
    Push-Location (Get-RepoPath '.')
    try {
        $dirty = git status --porcelain -- $tolFile
        if ($dirty) { Stop-Fail "$tolFile has uncommitted changes; limits must be committed before the run." }
        $first = git log --diff-filter=A --format='%h %s' -- $tolFile | Select-Object -Last 1
        $evidence = git log --format='%h' -- 'wiki/raw/evidence/phase-p5-telemetry/check-p5.4.txt' | Select-Object -Last 1
        if ($evidence) {
            git merge-base --is-ancestor ($first -split ' ')[0] $evidence
            if ($LASTEXITCODE -ne 0) { Stop-Fail 'The limits were committed after the first saved result.' }
        }
    } finally { Pop-Location }
    if (-not $first) { Stop-Fail "$tolFile is not committed." }
    "limits committed in $first"
}

Invoke-Step 'The meter reads a helper''s known memory and CPU within the limits, and psutil agrees' {
    $py = & python -c "import psutil; print(psutil.__version__)" 2>&1
    if ($LASTEXITCODE -ne 0) { Stop-Wait 'Python psutil is missing: python -m pip install --user psutil==7.2.2' }
    Assert-CargoWorkspace
    $r = Invoke-Native -FilePath 'cargo' -ArgumentList @('test', '--locked', '-p', 'ferrum-telemetry', '--test', 'ground_truth', '--', '--ignored', '--nocapture')
    $checks = @($r.Output -split "`r?`n" | Where-Object { $_ -match '^CHECK ' })
    Add-LogText ($checks -join "`n")
    $gt = ($r.Output -split "`r?`n" | Where-Object { $_ -match '^GROUND-TRUTH ' } | Select-Object -Last 1)
    if ($gt -and $SaveEvidence) {
        $json = $gt.Substring(13) | ConvertFrom-Json | ConvertTo-Json -Depth 5
        [void](Save-Evidence -Path 'wiki/raw/evidence/phase-p5-telemetry/ground-truth-p5.4.json' -Text $json)
    }
    if ($r.ExitCode -ne 0 -or $r.Output -notmatch 'test the_sampler_reports_known_memory_and_cpu \.\.\. ok') {
        $bad = @($checks | Where-Object { $_ -match 'FAILED$' })
        Stop-Fail "Outside the limits ($($bad.Count) of $($checks.Count)):`n$($bad -join "`n")`n$(Get-Tail $r.Output 8)"
    }
    "$($checks.Count) comparisons within the limits (psutil $py)"
}

Invoke-Step 'Live: a Ferrum tab fills a 128 MiB buffer; the memory total rises by about that much' {
    $r = Invoke-FerrumSmoke -Spec @('sampler-ground-truth')
    $line = ($r.Output -split "`r?`n" | Where-Object { $_ -match 'JS-PROBE: ' } | Select-Object -Last 1)
    Add-LogText (Get-Tail $r.Output 12)
    if ($r.ExitCode -ne 0 -or $r.Output -notmatch '1 passed') { Stop-Fail "The live test failed:`n$(Get-Tail $r.Output 30)" }
    if (-not $line) { Stop-Fail 'The live test printed no JS-PROBE line.' }
    $line.Substring($line.IndexOf('JS-PROBE: ') + 10)
}

Complete-Check -SaveEvidence:$SaveEvidence
