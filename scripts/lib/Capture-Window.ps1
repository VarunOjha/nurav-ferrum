#Requires -Version 7.0
<#
.SYNOPSIS
  Saves a PNG picture of a program's main window (used by Ferrum's check scripts as screenshot evidence).

.DESCRIPTION
  What it does   : waits until the process with the given id has a main window, then copies that window into a
                   PNG with the Windows PrintWindow function (works even if other windows cover it). Read-only:
                   it never closes, moves or changes the window.
  How to use     : . scripts/lib/Capture-Window.ps1; Save-WindowPicture -ProcessId 1234 -Path out.png
#>
Set-StrictMode -Version Latest

if (-not ('FerrumCapture.Native' -as [type])) {
    Add-Type -Namespace FerrumCapture -Name Native -MemberDefinition @'
[DllImport("user32.dll")] public static extern bool PrintWindow(System.IntPtr hwnd, System.IntPtr hdc, uint flags);
[DllImport("user32.dll")] public static extern bool GetWindowRect(System.IntPtr hwnd, out RECT rect);
[System.Runtime.InteropServices.StructLayout(System.Runtime.InteropServices.LayoutKind.Sequential)]
public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
'@
}
Add-Type -AssemblyName System.Drawing

function Save-WindowPicture {
    param(
        [Parameter(Mandatory)][int]$ProcessId,
        [Parameter(Mandatory)][string]$Path,
        [int]$TimeoutSeconds = 20
    )
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    $hwnd = [IntPtr]::Zero
    while ((Get-Date) -lt $deadline) {
        $p = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
        if (-not $p) { throw "Process $ProcessId ended before its window appeared." }
        $p.Refresh()
        if ($p.MainWindowHandle -ne [IntPtr]::Zero) { $hwnd = $p.MainWindowHandle; break }
        Start-Sleep -Milliseconds 200
    }
    if ($hwnd -eq [IntPtr]::Zero) { throw "No window for process $ProcessId within $TimeoutSeconds s." }
    $r = New-Object FerrumCapture.Native+RECT
    [void][FerrumCapture.Native]::GetWindowRect($hwnd, [ref]$r)
    $w = $r.Right - $r.Left; $h = $r.Bottom - $r.Top
    $bmp = New-Object System.Drawing.Bitmap $w, $h
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $hdc = $g.GetHdc()
    try { $ok = [FerrumCapture.Native]::PrintWindow($hwnd, $hdc, 2) } finally { $g.ReleaseHdc($hdc); $g.Dispose() }
    if (-not $ok) { $bmp.Dispose(); throw 'PrintWindow failed.' }
    $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    [pscustomobject]@{ Path = $Path; Width = $w; Height = $h }
}
