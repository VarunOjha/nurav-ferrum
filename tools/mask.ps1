#Requires -Version 7.0
<#
.SYNOPSIS
  Hides real machine details (IP addresses, the computer name, network-card MAC addresses and your
  Windows user folder) so they never end up in a committed file.

.DESCRIPTION
  Why: test logs and other evidence print real addresses and paths. Committing them would publish
  where this machine sits on the network and whose account it is (owner decision 2026-10-09, adr-0027).

  How: the real values live only in the gitignored file `.env.local-map` at the repo root, one per line
  as MASK=real (for example LAN_IPV4_1=192.0.2.10). This script swaps every real value for <MASK>
  (for example <LAN_IPV4_1>). Paths are matched in all their spellings (C:\..., C:/..., /c/...,
  JSON-escaped C:\\...), MAC addresses with "-" or ":", everything case-insensitively.
  A key ending in _PREFIX masks any address that starts with that prefix.

  Usage (run from anywhere; the repo root is the folder above tools/):
    pwsh tools/mask.ps1 --scan                  Check every git-tracked file, zip archives included.
                                                Exit 0 = nothing real found, 1 = real values found.
    pwsh tools/mask.ps1 --file <path> [<path>]  Mask files in place (text files and .zip archives).
    pwsh tools/mask.ps1 --text "<text>"         Print the masked text.
    <command> | pwsh tools/mask.ps1 --stdin     Mask piped text; use this when saving evidence.
    pwsh tools/mask.ps1 --refresh-map           Add this machine's current values to the map
                                                (new temporary IPv6 addresses appear over time).
    --map <path>                                Use another map file (tests).
  Exit code 2 = wrong usage or no map file.

  Dot-source it (. tools/mask.ps1) to get the functions without running the command line part.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression

$script:RepoRoot = Split-Path -Parent $PSScriptRoot
$script:DefaultMap = Join-Path $script:RepoRoot '.env.local-map'
$script:Utf8 = [System.Text.UTF8Encoding]::new($false)
$script:ZipBlob = [regex]'data:application/zip;base64,([A-Za-z0-9+/=]+)'

# --- 1. Read the map -------------------------------------------------------------------------------
function Read-MaskMap {
  param([string]$Path = $script:DefaultMap)
  if (-not (Test-Path -LiteralPath $Path)) { throw "no mask map at $Path (create it, or run: pwsh tools/mask.ps1 --refresh-map)" }
  $entries = [System.Collections.Generic.List[object]]::new()
  $n = 0
  foreach ($line in [System.IO.File]::ReadAllLines($Path)) {
    $n++
    $t = $line.Trim()
    if ($t -eq '' -or $t.StartsWith('#')) { continue }
    $i = $t.IndexOf('=')
    if ($i -lt 1) { throw "map line ${n}: expected MASK=real" }
    $key = $t.Substring(0, $i).Trim()
    $val = $t.Substring($i + 1).Trim()
    if ($key -notmatch '^[A-Z][A-Z0-9_]*$') { throw "map line ${n}: mask name '$key' must be UPPER_CASE letters, digits and _" }
    if ($val -eq '') { throw "map line ${n}: empty value for $key" }
    $entries.Add([pscustomobject]@{ Key = $key; Value = $val })
  }
  return , $entries
}

# --- 2. Turn map entries into match rules -----------------------------------------------------------
# Each real value becomes one regex covering its spellings, with edges so that 10.0.0.1 does not match
# inside 10.0.0.12. Longer values go first, prefix rules last.
function Get-MaskRules {
  param([Parameter(Mandatory)]$Map)
  $rules = [System.Collections.Generic.List[object]]::new()
  $opts = [System.Text.RegularExpressions.RegexOptions]::IgnoreCase -bor [System.Text.RegularExpressions.RegexOptions]::CultureInvariant
  foreach ($e in $Map) {
    $v = $e.Value
    if ($e.Key.EndsWith('_PREFIX')) {
      $mask = $e.Key.Substring(0, $e.Key.Length - '_PREFIX'.Length)
      $re = '(?<![0-9A-Za-z:.])' + [regex]::Escape($v) + '[0-9A-Fa-f:.]*'
      $rules.Add([pscustomobject]@{ Key = $mask; Regex = [regex]::new($re, $opts); Len = 0; Prefix = $true })
      continue
    }
    $forms = [System.Collections.Generic.List[string]]::new()
    $forms.Add($v)
    if ($v -match '^[A-Za-z]:\\') {                       # Windows path: C:\x, C:\\x, C:/x, /c/x
      $forms.Add($v.Replace('\', '\\'))
      $forms.Add($v.Replace('\', '/'))
      $forms.Add('/' + $v.Substring(0, 1).ToLowerInvariant() + $v.Substring(2).Replace('\', '/'))
    }
    if ($v -match '^([0-9A-Fa-f]{2}[-:]){5}[0-9A-Fa-f]{2}$') {   # MAC: both separators
      $forms.Add($v.Replace('-', ':')); $forms.Add($v.Replace(':', '-'))
    }
    $alts = ($forms | Select-Object -Unique | Sort-Object -Property Length -Descending | ForEach-Object { [regex]::Escape($_) }) -join '|'
    $isMac = $v -match '^([0-9A-Fa-f]{2}[-:]){5}[0-9A-Fa-f]{2}$'
    if ($v -match '^[0-9.]+$') { $re = "(?<![0-9A-Za-z.])(?:$alts)(?![0-9A-Za-z]|\.[0-9])" }          # IPv4
    elseif (-not $isMac -and $v -match '^[0-9A-Fa-f]{0,4}(:[0-9A-Fa-f]{0,4}){2,7}$') {
      $re = "(?<![0-9A-Za-z:])(?:$alts)(?![0-9A-Za-z]|:[0-9A-Fa-f])"                                   # IPv6
    }
    elseif ($v -match '^[A-Za-z]:\\') { $re = "(?:$alts)(?![0-9A-Za-z])" }                               # path
    else { $re = "(?<![0-9A-Za-z_-])(?:$alts)(?![0-9A-Za-z_-])" }                                       # host name, MAC, other
    $rules.Add([pscustomobject]@{ Key = $e.Key; Regex = [regex]::new($re, $opts); Len = $v.Length; Prefix = $false })
  }
  return , @($rules | Sort-Object -Property @{ Expression = 'Prefix' }, @{ Expression = 'Len'; Descending = $true })
}

# --- 3. Mask text ----------------------------------------------------------------------------------
# Returns the masked text. $Hits (optional list) receives "<MASK> x<count>" for every rule that matched.
function Invoke-MaskText {
  param([AllowEmptyString()][string]$Text, [Parameter(Mandatory)]$Rules, $Hits = $null)
  foreach ($r in $Rules) {
    $c = $r.Regex.Matches($Text).Count
    if ($c -gt 0) {
      if ($null -ne $Hits) { $Hits.Add("<$($r.Key)> x$c") }
      $Text = $r.Regex.Replace($Text, "<$($r.Key)>")
    }
  }
  return $Text
}

# --- 4. Mask file content (text, zip, base64 zip inside HTML such as a Playwright report) ------------
# Returns the new bytes, or the same array when nothing matched. $Hits gets "<where>: <MASK> xN" lines.
function Invoke-MaskBytes {
  param([byte[]]$Bytes, [string]$Name, [Parameter(Mandatory)]$Rules, [Parameter(Mandatory)]$Hits)
  if ($Name -match '\.zip$') { return , (Invoke-MaskZip -Bytes $Bytes -Name $Name -Rules $Rules -Hits $Hits) }
  if ([Array]::IndexOf($Bytes, [byte]0) -ge 0) { return , $Bytes }                        # binary: nothing to mask
  $text = $script:Utf8.GetString($Bytes)
  if (-not [System.Linq.Enumerable]::SequenceEqual($script:Utf8.GetBytes($text), $Bytes)) {
    $Hits.Add("${Name}: not valid UTF-8, not checked"); return , $Bytes
  }
  $local = [System.Collections.Generic.List[string]]::new()
  $text2 = $script:ZipBlob.Replace($text, [System.Text.RegularExpressions.MatchEvaluator]{
      param($m)
      $inner = [Convert]::FromBase64String($m.Groups[1].Value)
      $out = Invoke-MaskZip -Bytes $inner -Name "$Name(embedded zip)" -Rules $Rules -Hits $Hits
      if ([object]::ReferenceEquals($out, $inner)) { return $m.Value }
      return 'data:application/zip;base64,' + [Convert]::ToBase64String($out)
    })
  $text2 = Invoke-MaskText -Text $text2 -Rules $Rules -Hits $local
  foreach ($h in $local) { $Hits.Add("${Name}: $h") }
  if ($text2 -ceq $text) { return , $Bytes }
  return , $script:Utf8.GetBytes($text2)
}

function Invoke-MaskZip {
  param([byte[]]$Bytes, [string]$Name, [Parameter(Mandatory)]$Rules, [Parameter(Mandatory)]$Hits)
  $src = [System.IO.Compression.ZipArchive]::new([System.IO.MemoryStream]::new($Bytes), [System.IO.Compression.ZipArchiveMode]::Read)
  $items = foreach ($en in $src.Entries) {
    $ms = [System.IO.MemoryStream]::new(); $s = $en.Open(); $s.CopyTo($ms); $s.Dispose()
    $data = $ms.ToArray()
    $new = if ($en.FullName.EndsWith('/')) { $data } else { Invoke-MaskBytes -Bytes $data -Name "$Name!$($en.FullName)" -Rules $Rules -Hits $Hits }
    [pscustomobject]@{ FullName = $en.FullName; Time = $en.LastWriteTime; Data = $new; Changed = -not [object]::ReferenceEquals($new, $data) }
  }
  $src.Dispose()
  if (-not ($items | Where-Object Changed)) { return , $Bytes }
  $out = [System.IO.MemoryStream]::new()
  $dst = [System.IO.Compression.ZipArchive]::new($out, [System.IO.Compression.ZipArchiveMode]::Create, $true)
  foreach ($it in $items) {
    $en = $dst.CreateEntry($it.FullName, [System.IO.Compression.CompressionLevel]::Optimal)
    $en.LastWriteTime = $it.Time
    $s = $en.Open(); $s.Write($it.Data, 0, $it.Data.Length); $s.Dispose()
  }
  $dst.Dispose()
  return , $out.ToArray()
}

# Masks one file in place. Returns the hit lines (empty = file unchanged).
function Invoke-MaskFile {
  param([Parameter(Mandatory)][string]$Path, [Parameter(Mandatory)]$Rules)
  $full = (Resolve-Path -LiteralPath $Path).Path
  $hits = [System.Collections.Generic.List[string]]::new()
  $bytes = [System.IO.File]::ReadAllBytes($full)
  $new = Invoke-MaskBytes -Bytes $bytes -Name $Path -Rules $Rules -Hits $hits
  if (-not [object]::ReferenceEquals($new, $bytes)) { [System.IO.File]::WriteAllBytes($full, $new) }
  return , $hits
}

# --- 5. Scan every git-tracked file -------------------------------------------------------------------
function Invoke-MaskScan {
  param([Parameter(Mandatory)]$Rules, [string]$Root = $script:RepoRoot)
  $files = (& git -C $Root -c core.quotePath=false ls-files -z) -split "`0" | Where-Object { $_ -ne '' }
  if ($LASTEXITCODE -ne 0) { throw 'git ls-files failed' }
  $found = 0; $unchecked = 0
  foreach ($f in $files) {
    $p = Join-Path $Root $f
    if (-not (Test-Path -LiteralPath $p -PathType Leaf)) { continue }      # deleted in the working tree
    $hits = [System.Collections.Generic.List[string]]::new()
    $null = Invoke-MaskBytes -Bytes ([System.IO.File]::ReadAllBytes($p)) -Name $f -Rules $Rules -Hits $hits
    foreach ($h in $hits) {
      if ($h -like '*not checked') { $unchecked++; Write-Host "UNCHECKED $h" }
      else { $found++; Write-Host "UNMASKED  $h" }
    }
  }
  Write-Host "mask scan: $($files.Count) tracked files, $found unmasked value group(s), $unchecked file(s) not checkable"
  return $found
}

# --- 6. Refresh the map from this machine ---------------------------------------------------------------
function Update-MaskMap {
  param([string]$Path = $script:DefaultMap)
  $map = if (Test-Path -LiteralPath $Path) { Read-MaskMap -Path $Path } else { [System.Collections.Generic.List[object]]::new() }
  $have = @{}; foreach ($e in $map) { $have[$e.Value.ToLowerInvariant()] = $e.Key }
  $keys = @{}; foreach ($e in $map) { $keys[$e.Key] = $true }
  $added = [System.Collections.Generic.List[string]]::new()
  function Add-One([string]$stem, [string]$value) {
    if ([string]::IsNullOrWhiteSpace($value) -or $have.ContainsKey($value.ToLowerInvariant())) { return }
    $k = $stem; if ($stem -match '_$') { $i = 1; while ($keys.ContainsKey("$stem$i")) { $i++ }; $k = "$stem$i" }
    if ($keys.ContainsKey($k)) { return }
    $keys[$k] = $true; $have[$value.ToLowerInvariant()] = $k; $added.Add("$k=$value")
  }
  Add-One 'USERPROFILE' $env:USERPROFILE
  $short = (& cmd /c "for %I in (""%USERPROFILE%"") do @echo %~sI" 2>$null | Select-Object -First 1)
  if ($short -and $short.Trim() -ne $env:USERPROFILE) { Add-One 'USERPROFILE_SHORT' $short.Trim() }
  Add-One 'HOSTNAME' ([Environment]::MachineName)
  foreach ($nic in [System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces()) {
    if ($nic.NetworkInterfaceType -eq 'Loopback') { continue }
    $mac = $nic.GetPhysicalAddress().ToString()
    if ($mac.Length -eq 12 -and $mac -ne '000000000000') { Add-One 'MAC_' (($mac -split '(..)' | Where-Object { $_ }) -join '-') }
    foreach ($u in $nic.GetIPProperties().UnicastAddresses) {
      $a = $u.Address
      if ([System.Net.IPAddress]::IsLoopback($a)) { continue }
      if ($a.AddressFamily -eq 'InterNetwork') { Add-One 'LAN_IPV4_' $a.ToString() }
      elseif ($a.IsIPv6LinkLocal) { Add-One 'LINK_LOCAL_IPV6_' ($a.ToString() -replace '%.*$', '') }
      elseif ($a.AddressFamily -eq 'InterNetworkV6') {
        $s = $a.ToString() -replace '%.*$', ''
        Add-One 'LAN_IPV6_' $s
        $g = $s -split ':'
        if ($g.Count -ge 5 -and ($g[0..3] -notcontains '')) { Add-One 'LAN_IPV6_NET_PREFIX_' (($g[0..3] -join ':') + ':') }
      }
    }
  }
  if (-not (Test-Path -LiteralPath $Path)) {
    [System.IO.File]::WriteAllText($Path, "# Ferrum sensitive-value map. LOCAL ONLY: gitignored, never commit (adr-0027).`n# Format: MASK=real, one per line.`n", $script:Utf8)
  }
  if ($added.Count -gt 0) { [System.IO.File]::AppendAllText($Path, (($added -join "`n") + "`n"), $script:Utf8) }
  return , $added
}

# --- 7. Command line ---------------------------------------------------------------------------------
if ($MyInvocation.InvocationName -ne '.') {
  $mapPath = $script:DefaultMap
  $rest = [System.Collections.Generic.List[string]]::new()
  for ($i = 0; $i -lt $args.Count; $i++) {
    if ($args[$i] -eq '--map') { $mapPath = $args[++$i] } else { $rest.Add([string]$args[$i]) }
  }
  $cmd = if ($rest.Count -gt 0) { $rest[0] } else { '' }
  try {
    switch ($cmd) {
      '--refresh-map' {
        $added = Update-MaskMap -Path $mapPath
        Write-Output "mask map: $($added.Count) new value(s) added (names only shown): $((($added | ForEach-Object { ($_ -split '=')[0] }) -join ', '))"
        exit 0
      }
      '--scan' {
        $rules = Get-MaskRules -Map (Read-MaskMap -Path $mapPath)
        $n = Invoke-MaskScan -Rules $rules
        exit ([int]($n -gt 0))
      }
      '--file' {
        if ($rest.Count -lt 2) { Write-Error 'usage: --file <path> [<path> ...]'; exit 2 }
        $rules = Get-MaskRules -Map (Read-MaskMap -Path $mapPath)
        foreach ($f in $rest | Select-Object -Skip 1) {
          $hits = Invoke-MaskFile -Path $f -Rules $rules
          Write-Output ("masked {0}: {1}" -f $f, $(if ($hits.Count) { $hits -join '; ' } else { 'nothing to mask' }))
        }
        exit 0
      }
      '--text' {
        $rules = Get-MaskRules -Map (Read-MaskMap -Path $mapPath)
        Write-Output (Invoke-MaskText -Text ($rest | Select-Object -Skip 1 | Join-String -Separator ' ') -Rules $rules)
        exit 0
      }
      '--stdin' {
        $rules = Get-MaskRules -Map (Read-MaskMap -Path $mapPath)
        [Console]::InputEncoding = $script:Utf8; [Console]::OutputEncoding = $script:Utf8
        [Console]::Out.Write((Invoke-MaskText -Text ([Console]::In.ReadToEnd()) -Rules $rules))
        exit 0
      }
      default {
        Write-Output 'usage: pwsh tools/mask.ps1 --scan | --file <path>... | --text "<text>" | --stdin | --refresh-map  [--map <path>]'
        exit 2
      }
    }
  }
  catch {
    Write-Error $_.Exception.Message -ErrorAction Continue
    exit 2
  }
}
