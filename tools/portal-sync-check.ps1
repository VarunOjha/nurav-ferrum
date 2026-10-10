#Requires -Version 7.0
<#
.SYNOPSIS
  Checks that the plan portal's plain-language JSON (plan/portal/) still matches the wiki.

.DESCRIPTION
  Why: the portal shows only JSON that Claude writes next to each wiki change (adr-0024). If a wiki page
  changes and its JSON does not, the owner reads out-of-date text. This script finds that.

  What it checks, in order:
    1. Shape     - every portal JSON file parses and matches its schema in plan/portal/schema/  (BAD-JSON, BAD-SHAPE, MISSING-FILE)
    2. Freshness - every record's source.content_hash equals the page's current hash          (STALE, ORPHAN)
    3. Coverage  - every page the pipeline translates has a record, every question and every
                   log heading has an entry                                                    (MISSING, UNCOVERED)
    4. Refs      - every id written in portal text has an explainer in refs.json               (UNKNOWN-REF, DUP-ID)
    5. Scripts   - every check-script path named in the JSON exists                            (MISSING-SCRIPT)
  The rules (which pages, which files, which id shapes) live in plan/portal/pipeline.json.

  Exit codes: 0 = clean, 1 = problems found (or the config is broken).

  Hook mode (-Hook): used by the Claude Code Stop hook in .claude/settings.json. It does nothing (exit 0)
  unless the flag file plan/portal/.hook-enabled exists, or when Claude is already continuing because of
  this hook (stop_hook_active = true). Otherwise it runs the checks and, if anything is wrong, exits 2 with
  a plain message on stderr, which makes Claude fix the JSON before ending its turn. If the checker itself
  crashes in hook mode it exits 1 (a non-blocking hook error), so a broken checker never traps a session.

.PARAMETER Root
  Repository root. Default: $env:CLAUDE_PROJECT_DIR in hook mode, else the folder above tools/.

.PARAMETER Hook
  Run as the Claude Code Stop hook (reads the hook's JSON input from stdin).

.PARAMETER Hash
  Print the SCHEMA section 10.2 content_hash of one file (repo-relative path) and exit. Use it to fill
  source.content_hash after translating a page.

.EXAMPLE
  pwsh tools/portal-sync-check.ps1
.EXAMPLE
  pwsh tools/portal-sync-check.ps1 -Hash wiki/phases/phase-p1-foundation.md
#>
[CmdletBinding()]
param(
    [string]$Root,
    [switch]$Hook,
    [string]$Hash
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)

# --- Where is the repo? ---------------------------------------------------------------------------
if (-not $Root) {
    if ($Hook -and $env:CLAUDE_PROJECT_DIR) { $Root = $env:CLAUDE_PROJECT_DIR }
    else { $Root = Split-Path -Parent $PSScriptRoot }
}
$Root = [IO.Path]::GetFullPath($Root)
$PortalDir = Join-Path $Root 'plan/portal'

# --- SCHEMA 10.2 content hash: sha256 over the bytes with CRLF and CR turned into LF --------------
# Latin1 maps every byte to one char and back, so the replacement works on raw bytes (UTF-8 safe:
# the bytes 0x0D and 0x0A never occur inside a multi-byte UTF-8 character).
function Get-PortalContentHash([string]$FullPath) {
    $bytes = [IO.File]::ReadAllBytes($FullPath)
    $latin1 = [Text.Encoding]::Latin1
    $norm = $latin1.GetString($bytes).Replace("`r`n", "`n").Replace("`r", "`n")
    $sha = [Security.Cryptography.SHA256]::HashData($latin1.GetBytes($norm))
    return 'sha256:' + [Convert]::ToHexString($sha).ToLowerInvariant()
}

if ($Hash) {
    $full = Join-Path $Root $Hash
    if (-not (Test-Path -LiteralPath $full -PathType Leaf)) { Write-Error "No such file: $Hash"; exit 1 }
    Get-PortalContentHash $full
    exit 0
}

function ConvertTo-RepoPath([string]$Full) {
    return [IO.Path]::GetRelativePath($Root, $Full).Replace('\', '/')
}

# Expand "dir/name-*.ext" relative to $Base (wildcards only in the last part).
function Get-MatchingFiles([string]$Base, [string]$Pattern) {
    $dir = Split-Path -Parent $Pattern
    $leaf = Split-Path -Leaf $Pattern
    $full = if ($dir) { Join-Path $Base $dir } else { $Base }
    if (-not (Test-Path -LiteralPath $full -PathType Container)) { return @() }
    return @(Get-ChildItem -LiteralPath $full -File | Where-Object { $_.Name -like $leaf } | Sort-Object Name)
}

# Walk a parsed JSON value; call $Visit for each node with its JSON pointer and parent key.
function Invoke-JsonWalk($Node, [string]$Pointer, [string]$Key, [scriptblock]$Visit) {
    & $Visit $Node $Pointer $Key
    if ($Node -is [System.Collections.IDictionary]) {
        foreach ($k in @($Node.Keys)) { Invoke-JsonWalk $Node[$k] "$Pointer/$k" $k $Visit }
    }
    elseif ($Node -is [System.Collections.IList]) {
        for ($i = 0; $i -lt $Node.Count; $i++) { Invoke-JsonWalk $Node[$i] "$Pointer/$i" $Key $Visit }
    }
}

# Collect every id written in portal text: [words](ref:id) links and bare id-shaped words. Keys listed
# in skip_keys (paths, code, hashes, log headings) are not portal text and are not searched.
function Find-RefHits($Node, [string]$Pointer, $SkipKeys, $Patterns, $LinkRx, $Hits) {
    if ($Node -is [string]) {
        foreach ($m in $LinkRx.Matches($Node)) { $Hits.Add(@{ Id = $m.Groups[1].Value; Pointer = $Pointer }) }
        foreach ($rx in $Patterns) { foreach ($m in $rx.Matches($Node)) { $Hits.Add(@{ Id = $m.Value; Pointer = $Pointer }) } }
    }
    elseif ($Node -is [System.Collections.IDictionary]) {
        foreach ($key in @($Node.Keys)) {
            if (-not $SkipKeys.Contains([string]$key)) { Find-RefHits $Node[$key] "$Pointer/$key" $SkipKeys $Patterns $LinkRx $Hits }
        }
    }
    elseif ($Node -is [System.Collections.IList]) {
        for ($j = 0; $j -lt $Node.Count; $j++) { Find-RefHits $Node[$j] "$Pointer/$j" $SkipKeys $Patterns $LinkRx $Hits }
    }
}

function Invoke-PortalSyncCheck {
    $problems = [System.Collections.Generic.List[object]]::new()
    function Add-Problem([string]$Code, [string]$Where, [string]$Message) {
        $problems.Add([pscustomobject]@{ Code = $Code; Where = $Where; Message = $Message })
    }

    # 0. Config ------------------------------------------------------------------------------------
    $configPath = Join-Path $PortalDir 'pipeline.json'
    if (-not (Test-Path -LiteralPath $configPath)) {
        Add-Problem 'CONFIG' 'plan/portal/pipeline.json' 'The pipeline config is missing, so nothing can be checked.'
        return , $problems
    }
    $config = Get-Content -LiteralPath $configPath -Raw -Encoding utf8 | ConvertFrom-Json -AsHashtable
    $schemaDir = Join-Path $PortalDir 'schema'
    $commonDefs = (Get-Content -LiteralPath (Join-Path $schemaDir 'common.schema.json') -Raw -Encoding utf8 |
            ConvertFrom-Json -AsHashtable)['$defs']
    $skipKeys = [System.Collections.Generic.HashSet[string]]::new([string[]]$config['skip_keys'])

    # 1. Shape: parse and validate every portal file ------------------------------------------------
    $docs = [ordered]@{}          # 'decisions.json' -> parsed hashtable
    $schemaCache = @{}
    foreach ($entry in $config['files']) {
        $pattern = $entry['path']
        $matched = @(Get-MatchingFiles $PortalDir $pattern)
        if ($matched.Count -eq 0 -and $pattern -notmatch '\*') {
            Add-Problem 'MISSING-FILE' "plan/portal/$pattern" 'This portal file does not exist yet.'
            continue
        }
        if (-not $schemaCache.ContainsKey($entry['schema'])) {
            $s = Get-Content -LiteralPath (Join-Path $schemaDir $entry['schema']) -Raw -Encoding utf8 | ConvertFrom-Json -AsHashtable
            $defs = [ordered]@{}
            foreach ($k in $commonDefs.Keys) { $defs[$k] = $commonDefs[$k] }
            if ($s.Contains('$defs')) { foreach ($k in $s['$defs'].Keys) { $defs[$k] = $s['$defs'][$k] } }
            $s['$defs'] = $defs
            $s.Remove('$id')
            $schemaCache[$entry['schema']] = ($s | ConvertTo-Json -Depth 100)
        }
        foreach ($f in $matched) {
            $rel = [IO.Path]::GetRelativePath($PortalDir, $f.FullName).Replace('\', '/')
            $text = Get-Content -LiteralPath $f.FullName -Raw -Encoding utf8
            try { $doc = $text | ConvertFrom-Json -AsHashtable }
            catch {
                Add-Problem 'BAD-JSON' "plan/portal/$rel" "This file is not valid JSON: $($_.Exception.Message)"
                continue
            }
            $docs[$rel] = $doc
            $errs = $null
            $ok = Test-Json -Json $text -Schema $schemaCache[$entry['schema']] -ErrorVariable errs -ErrorAction SilentlyContinue
            if (-not $ok) {
                foreach ($e in $errs) {
                    $msg = $e.Exception.Message -replace '^The JSON is not valid with the schema: ', ''
                    Add-Problem 'BAD-SHAPE' "plan/portal/$rel" "Does not match $($entry['schema']): $msg"
                }
            }
        }
    }

    # 2. Freshness: every record with a source must match its page's current hash -------------------
    $hashCache = @{}
    $sourcesByFile = @{}          # 'decisions.json' -> set of wiki paths it translates
    $recordCount = 0
    foreach ($rel in $docs.Keys) {
        $set = [System.Collections.Generic.HashSet[string]]::new()
        $sourcesByFile[$rel] = $set
        $found = [System.Collections.Generic.List[object]]::new()
        Invoke-JsonWalk $docs[$rel] '' '' {
            param($n, $p, $k)
            if ($n -is [System.Collections.IDictionary] -and $n.Contains('source') -and
                $n['source'] -is [System.Collections.IDictionary] -and $n['source'].Contains('wiki_path')) {
                $found.Add(@{ Pointer = $p; Path = [string]$n['source']['wiki_path']; Hash = [string]$n['source']['content_hash'] })
            }
        }
        foreach ($s in $found) {
            $recordCount++
            [void]$set.Add($s.Path)
            $where = "plan/portal/$rel at $($s.Pointer)"
            $full = Join-Path $Root $s.Path
            if (-not (Test-Path -LiteralPath $full -PathType Leaf)) {
                Add-Problem 'ORPHAN' $where "Translated from $($s.Path), which no longer exists. Remove this record or point it at the page that replaced it."
                continue
            }
            if (-not $hashCache.ContainsKey($s.Path)) { $hashCache[$s.Path] = Get-PortalContentHash $full }
            if ($hashCache[$s.Path] -ne $s.Hash) {
                Add-Problem 'STALE' $where "$($s.Path) changed after this record was written. Re-translate it with the wiki-to-portal skill."
            }
        }
    }

    # 3. Coverage: every translated page has a record; every question / log heading has an entry ----
    foreach ($rule in $config['translate']) {
        foreach ($page in @(Get-MatchingFiles $Root $rule['pages'])) {
            $pagePath = ConvertTo-RepoPath $page.FullName
            $into = $rule['into'].Replace('{stem}', [IO.Path]::GetFileNameWithoutExtension($page.Name))
            if (-not $sourcesByFile.ContainsKey($into)) {
                Add-Problem 'MISSING' "plan/portal/$into" "$pagePath has no plain-language record: the file plan/portal/$into is missing or unreadable."
            }
            elseif (-not $sourcesByFile[$into].Contains($pagePath)) {
                Add-Problem 'MISSING' "plan/portal/$into" "$pagePath has no plain-language record here yet. Translate it with the wiki-to-portal skill."
            }
        }
    }
    foreach ($rule in $config['sections']) {
        $pageFull = Join-Path $Root $rule['page']
        if (-not (Test-Path -LiteralPath $pageFull -PathType Leaf)) { continue }
        if (-not $docs.Contains($rule['into'])) { continue }   # already reported as MISSING-FILE / BAD-JSON
        $have = [System.Collections.Generic.HashSet[string]]::new()
        $field = $rule['field']
        Invoke-JsonWalk $docs[$rule['into']] '' '' {
            param($n, $p, $k)
            if ($n -is [System.Collections.IDictionary] -and $n.Contains($field)) {
                foreach ($v in @($n[$field])) { if ($v -is [string]) { [void]$have.Add($v) } }
            }
        }
        $rx = [regex]::new($rule['heading'])
        foreach ($line in [IO.File]::ReadAllLines($pageFull)) {
            $m = $rx.Match($line)
            if ($m.Success -and -not $have.Contains($m.Groups[1].Value)) {
                Add-Problem 'UNCOVERED' "plan/portal/$($rule['into'])" "No entry covers '$($m.Groups[1].Value)' from $($rule['page'])."
            }
        }
    }

    # 4. Refs: every id written in portal text must have an explainer in refs.json -----------------
    $known = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
    $refsFile = $config['refs_file']
    $refCount = 0
    if ($docs.Contains($refsFile) -and $docs[$refsFile] -is [System.Collections.IDictionary] -and $docs[$refsFile].Contains('refs')) {
        $i = 0
        foreach ($r in @($docs[$refsFile]['refs'])) {
            if ($r -isnot [System.Collections.IDictionary]) { $i++; continue }
            $names = @($r['id'])
            if ($r.Contains('aliases')) { $names += @($r['aliases']) }
            foreach ($nm in $names) {
                if ($nm -isnot [string]) { continue }
                if (-not $known.Add($nm)) { Add-Problem 'DUP-ID' "plan/portal/$refsFile at /refs/$i" "'$nm' is explained twice; keep one entry." }
            }
            $i++
        }
        $refCount = $i
    }
    $patterns = @($config['id_patterns'] | ForEach-Object { [regex]::new($_['regex']) })
    $linkRx = [regex]::new('\]\(ref:([^)\s]+)\)')
    $seen = [System.Collections.Generic.HashSet[string]]::new()
    foreach ($rel in $docs.Keys) {
        $hits = [System.Collections.Generic.List[object]]::new()
        Find-RefHits $docs[$rel] '' $skipKeys $patterns $linkRx $hits
        foreach ($h in $hits) {
            if ($known.Contains($h.Id)) { continue }
            if (-not $seen.Add("$rel|$($h.Id)")) { continue }
            Add-Problem 'UNKNOWN-REF' "plan/portal/$rel at $($h.Pointer)" "'$($h.Id)' looks like an id but refs.json has no explainer for it. Add one, or rephrase in plain words."
        }
    }

    # 5. Scripts: every check-script path must exist ------------------------------------------------
    foreach ($rel in $docs.Keys) {
        $paths = [System.Collections.Generic.List[object]]::new()
        Invoke-JsonWalk $docs[$rel] '' '' {
            param($n, $p, $k)
            if ($k -eq 'script' -and $n -is [string]) { $paths.Add(@{ Path = $n; Pointer = $p }) }
            elseif ($k -eq 'script' -and $n -is [System.Collections.IDictionary] -and $n['path'] -is [string]) {
                $paths.Add(@{ Path = $n['path']; Pointer = "$p/path" })
            }
        }
        foreach ($s in $paths) {
            if (-not (Test-Path -LiteralPath (Join-Path $Root $s.Path) -PathType Leaf)) {
                Add-Problem 'MISSING-SCRIPT' "plan/portal/$rel at $($s.Pointer)" "The check script $($s.Path) does not exist. Write it, or set the field to null until it exists."
            }
        }
    }

    $script:Stats = @{ Files = $docs.Count; Records = $recordCount; Refs = $refCount }
    return , $problems
}

function Format-Summary($problems) {
    $byCode = $problems | Group-Object Code | ForEach-Object { "$($_.Count) $($_.Name)" }
    return "portal-sync: $($problems.Count) problem(s) - " + ($byCode -join ', ')
}

# --- Hook mode --------------------------------------------------------------------------------------
if ($Hook) {
    try {
        $inputJson = $null
        if ([Console]::IsInputRedirected) { $inputJson = [Console]::In.ReadToEnd() }
        $flag = Join-Path $PortalDir '.hook-enabled'
        if (-not (Test-Path -LiteralPath $flag -PathType Leaf)) { exit 0 }      # installed but switched off
        if ($inputJson) {
            $hookInput = $inputJson | ConvertFrom-Json -AsHashtable
            if ($hookInput -and $hookInput['stop_hook_active'] -eq $true) { exit 0 } # already continuing: never loop
        }
        $problems = Invoke-PortalSyncCheck
        if ($problems.Count -eq 0) { exit 0 }
        $lines = @(
            'The plan portal JSON no longer matches the wiki, so the owner would read out-of-date text.',
            'Before ending the turn, use the wiki-to-portal skill (.claude/skills/wiki-to-portal/SKILL.md) to fix these, then run: pwsh tools/portal-sync-check.ps1',
            (Format-Summary $problems)
        )
        $lines += @($problems | Select-Object -First 15 | ForEach-Object { "  $($_.Code)  $($_.Where)  $($_.Message)" })
        if ($problems.Count -gt 15) { $lines += "  ... and $($problems.Count - 15) more (run the checker to see all)." }
        [Console]::Error.WriteLine(($lines -join "`n"))
        exit 2
    }
    catch {
        [Console]::Error.WriteLine("portal-sync hook could not run: $($_.Exception.Message)")
        exit 1
    }
}

# --- Normal mode --------------------------------------------------------------------------------------
$problems = Invoke-PortalSyncCheck
if ($problems.Count -eq 0) {
    Write-Output ("portal-sync: clean - {0} files, {1} translated records, {2} refs" -f $script:Stats.Files, $script:Stats.Records, $script:Stats.Refs)
    exit 0
}
foreach ($p in $problems) { Write-Output ("{0,-14} {1}`n               {2}" -f $p.Code, $p.Where, $p.Message) }
Write-Output (Format-Summary $problems)
exit 1
