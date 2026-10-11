# Benchmark machine inventory (p1.2, session s02, 2026-10-11 12:35 -05:00)

> Raw evidence. Outputs of the PowerShell inventory commands listed on phase-p1-foundation (Machine inventory), run by Claude, masked with tools/mask.ps1. No performance numbers.

### CPU (processor, cores)

```text
> Get-CimInstance Win32_Processor | Select-Object Name, NumberOfCores, NumberOfLogicalProcessors, MaxClockSpeed | Format-List
Name                      : AMD Ryzen 7 6800H with Radeon Graphics
NumberOfCores             : 8
NumberOfLogicalProcessors : 16
MaxClockSpeed             : 3201
```

### RAM (memory)

```text
> Get-CimInstance Win32_ComputerSystem | Select-Object Manufacturer, Model, TotalPhysicalMemory | Format-List
Manufacturer        : AZW
Model               : SER
TotalPhysicalMemory : 29833297920
```

### RAM modules

```text
> Get-CimInstance Win32_PhysicalMemory | Select-Object Capacity, Speed, ConfiguredClockSpeed, Manufacturer, PartNumber | Format-Table -AutoSize
Capacity Speed ConfiguredClockSpeed Manufacturer      PartNumber
  -------- ----- -------------------- ------------      ----------
8589934592  6000                 6300 Micron Technology MT62F1536M64D8CL-026
8589934592  6000                 6300 Micron Technology MT62F1536M64D8CL-026
8589934592  6000                 6300 Micron Technology MT62F1536M64D8CL-026
8589934592  6000                 6300 Micron Technology MT62F1536M64D8CL-026
```

### GPU (graphics adapters, with the resolution of the display each drives)

```text
> Get-CimInstance Win32_VideoController | Select-Object Name, DriverVersion, CurrentHorizontalResolution, CurrentVerticalResolution, CurrentRefreshRate | Format-List
Name                        : AMD Radeon(TM) Graphics
DriverVersion               : 32.0.21030.2001
CurrentHorizontalResolution : 1920
CurrentVerticalResolution   : 1080
CurrentRefreshRate          : 59

Name                        : DisplayLink USB Device
DriverVersion               : 12.1.2591.0
CurrentHorizontalResolution : 1920
CurrentVerticalResolution   : 1080
CurrentRefreshRate          : 59

Name                        : DisplayLink USB Device
DriverVersion               : 12.1.2591.0
CurrentHorizontalResolution : 3840
CurrentVerticalResolution   : 2160
CurrentRefreshRate          : 60
```

### Display / monitor list

```text
> Get-CimInstance Win32_DesktopMonitor | Select-Object Name, ScreenWidth, ScreenHeight | Format-List
Name         : Generic PnP Monitor
ScreenWidth  :
ScreenHeight :

Name         : Default Monitor
ScreenWidth  : 1920
ScreenHeight : 1080

Name         : Dell S2721QS(HDMI1)
ScreenWidth  : 3840
ScreenHeight : 2160
```

### OS build (Windows build)

```text
> Get-CimInstance Win32_OperatingSystem | Select-Object Caption, Version, BuildNumber, OSArchitecture | Format-List
Caption        : Microsoft Windows 11 Pro
Version        : 10.0.26200
BuildNumber    : 26200
OSArchitecture : 64-bit
```

### Windows display version and update revision (CurrentBuild, UBR)

```text
> Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion' | Select-Object DisplayVersion, CurrentBuild, UBR | Format-List
DisplayVersion : 25H2
CurrentBuild   : 26200
UBR            : 9457
```

### Power plan (power scheme)

```text
> powercfg /getactivescheme
Power Scheme GUID: 381b4222-f694-41f0-9685-ff5bb260df2e  (Balanced)
```

### Battery (none listed = mains-powered desktop)

```text
> $b = Get-CimInstance Win32_Battery; if ($b) { $b | Select-Object Name, BatteryStatus | Format-List } else { "no battery reported" }
no battery reported
```

### WebView2 runtime version (Evergreen pv)

```text
> reg query 'HKLM\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}' /v pv
HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}
    pv    REG_SZ    154.0.4258.62
```

### Edge and Chrome versions (file version of the executables)

```text
> foreach ($p in "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Google\Chrome\Application\chrome.exe") { if (Test-Path $p) { "{0} => {1}" -f $p, (Get-Item $p).VersionInfo.ProductVersion } else { "$p => not installed" } }
C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe => 155.0.4283.45
C:\Program Files\Google\Chrome\Application\chrome.exe => 154.0.8037.95
```

## Comparison with 8 October

- WebView2 pv on 2026-10-08 (raw/evidence/phase-p0-planning/env-webview2-pv.txt): 154.0.4258.62. Today: the same value (see above), so the Evergreen runtime has not updated since.
- Edge (155.x) is one major version ahead of the WebView2 runtime (154.x) on this machine today; Chrome is 154.x.

## Not answered by commands (owner questions)

- Q-116: is this computer the benchmark machine? (CPU and RAM above.)
- Q-122: is a wall-power meter available?
