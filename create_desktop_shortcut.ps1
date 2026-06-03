$ErrorActionPreference = "Stop"

# Get current directory where this script is located
$ScriptDir = $PSScriptRoot
if (-not $ScriptDir) {
    $ScriptDir = (Get-Item -Path ".\").FullName
}

# Paths
$BatFile = Join-Path $ScriptDir "start.bat"
$PngIcon = Join-Path $ScriptDir "frontend\public\logo.png"
$IcoIcon = Join-Path $ScriptDir "frontend\public\logo.ico"

# Windows requires .ico files for shortcuts. We will create a copy of the PNG with an .ico extension.
# Modern Windows 10/11 is often smart enough to read the PNG data inside an .ico file.
if (Test-Path $PngIcon) {
    Copy-Item -Path $PngIcon -Destination $IcoIcon -Force
}

# Create Shortcut on Desktop
$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = $WshShell.SpecialFolders.Item("Desktop")
$ShortcutPath = Join-Path $DesktopPath "SSI Smart Manufacturing.lnk"

$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $BatFile
$Shortcut.WorkingDirectory = $ScriptDir
$Shortcut.Description = "Start SSI Smart Manufacturing System"

# Try to apply the icon if we successfully created it
if (Test-Path $IcoIcon) {
    $Shortcut.IconLocation = "$IcoIcon, 0"
}

$Shortcut.Save()

Write-Host "Success! Desktop shortcut created at: $ShortcutPath"
