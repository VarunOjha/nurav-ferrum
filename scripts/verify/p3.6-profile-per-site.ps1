#Requires -Version 7.0
<#
.SYNOPSIS
  Check for task p3.6 (P3 Tabs and sessions): A separate profile per site.

.DESCRIPTION
  What it checks : (1) unit tests (crates/core/tests/profiles.rs): a site is its main (registrable) domain, from the
                   Public Suffix List; profile names follow WebView2's documented rules; per-site settings choose the
                   profile and bad ones are refused; settings files from P2 keep one shared profile; (2) the smoke test
                   "profiles" on the test sites site-a.localhost, one./two.site-a.localhost and site-b.localhost: a
                   site's cookie stays in its own profile (a shared-profile run shows the cookie, as a control), one
                   site in two tabs shares one profile, subdomains share, a link to another site asks first (Cancel
                   stays, Continue moves the tab), a typed address moves without asking, named profiles from the
                   settings survive a restart.
  Why            : if all sites shared one store, any site could read another's sign-in → one profile per site, chosen
                   from the site's main domain → cookies stay apart, and you decide when a tab changes site.
  What it changes: nothing in git.
  How long       : about 40 seconds after the first build.
  How to run     : pwsh -NoProfile -File scripts/verify/p3.6-profile-per-site.ps1
                   Needs the local development certificate (task p2.1) and ports 8443 and 9339 free.
  Result         : PASS (every checked step is fine), FAIL (something is wrong) or NOT READY (something
                   still waits).
  Tell Claude    : nothing if it passes. If it fails, paste the FAIL lines and say "p3.6 check failed".

  For Claude     : exit codes 0 = PASS, 1 = FAIL, 2 = NOT READY (shared helpers:
                   scripts/lib/Ferrum.Check.psm1, scripts/lib/Ferrum.SelfTest.ps1). Phase-page verify field:
    Integration test: two fixture sites mapped to different profiles do not see each other's cookies; same site in
    two tabs shares one profile; subdomains of one registrable domain share a profile; a cross-site navigation shows
    the confirmation bar, Cancel keeps the tab, Confirm re-hosts it in the other profile; settings survive restart.
#>
[CmdletBinding()]
param([switch]$SaveEvidence)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../lib/Ferrum.Check.psm1') -Force
. (Join-Path $PSScriptRoot '../lib/Ferrum.SelfTest.ps1')

Start-Check -Id 'p3.6' -Title 'A separate profile per site' -Phase 'phase-p3-tabs-sessions' `
    -Why 'cookies stay apart, and you decide when a tab changes site.'

Invoke-Step 'Site and profile unit tests' {
    $r = Assert-Cargo @('test', '--locked', '-p', 'ferrum-core', '--test', 'profiles')
    $need = 'a_site_is_its_registrable_domain', 'subdomains_share_and_other_sites_differ', 'profile_names_follow_microsofts_rules',
    'user_labels_are_restricted', 'settings_choose_the_profile', 'bad_site_settings_are_refused', 'version_one_files_keep_one_shared_profile'
    $missing = @($need | Where-Object { $r.Output -notmatch "test $_ \.\.\. ok" })
    if ($missing.Count) { Stop-Fail "Not passing (or missing): $($missing -join ', ')." }
    "$($need.Count) required cases pass"
}

Invoke-Step 'Smoke test: cookies apart (with a shared-profile control), sharing rules, the cross-site bar, settings after a restart' {
    $r = Invoke-FerrumSmoke -Spec 'profiles'
    Add-LogText (Get-Tail $r.Output 10)
    if ($r.ExitCode -ne 0 -or $r.Output -notmatch '\b5 passed') { Stop-Fail "The smoke test failed:`n$(Get-Tail $r.Output 20)" }
    'profiles: 5 passed'
}

Complete-Check -SaveEvidence:$SaveEvidence
