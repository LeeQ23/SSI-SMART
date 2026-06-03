const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log("Generating valid Windows .ico file from logo.png...");

const pngPath = path.join(__dirname, 'frontend', 'public', 'logo.png');
const icoPath = path.join(__dirname, 'frontend', 'public', 'logo.ico');
const batPath = path.join(__dirname, 'start.bat');

if (!fs.existsSync(pngPath)) {
    console.error("Error: Could not find logo.png at", pngPath);
    process.exit(1);
}

// Read the raw PNG image
const pngBuffer = fs.readFileSync(pngPath);

// Windows 10/11 supports PNG-compressed ICO files. 
// We just need to build a 22-byte standard ICO header and attach the PNG bytes!
const icoHeader = Buffer.alloc(22);
icoHeader.writeUInt16LE(0, 0);  // Reserved (Always 0)
icoHeader.writeUInt16LE(1, 2);  // Type (1 = ICO)
icoHeader.writeUInt16LE(1, 4);  // Number of images (1)

// Image Directory Entry
icoHeader.writeUInt8(0, 6);     // Width (0 means 256px or let Windows auto-scale)
icoHeader.writeUInt8(0, 7);     // Height (0 means 256px)
icoHeader.writeUInt8(0, 8);     // Color count (0 = no palette)
icoHeader.writeUInt8(0, 9);     // Reserved (0)
icoHeader.writeUInt16LE(1, 10); // Color planes (1)
icoHeader.writeUInt16LE(32, 12);// Bits per pixel (32 for RGBA)
icoHeader.writeUInt32LE(pngBuffer.length, 14); // Size of the PNG data in bytes
icoHeader.writeUInt32LE(22, 18); // Offset to image data (header is 22 bytes long)

// Combine header and PNG into a valid ICO file
const icoBuffer = Buffer.concat([icoHeader, pngBuffer]);
fs.writeFileSync(icoPath, icoBuffer);

console.log("-> logo.ico successfully created.");
console.log("Creating Desktop Shortcut...");

// Create a temporary PowerShell script to bind the new valid .ico to a Desktop Shortcut
const psScript = `
$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = $WshShell.SpecialFolders.Item("Desktop")
$ShortcutPath = Join-Path $DesktopPath "SSI Smart Manufacturing.lnk"

# If it exists from the old attempt, delete it so the icon cache refreshes
if (Test-Path $ShortcutPath) { Remove-Item $ShortcutPath }

$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "${batPath}"
$Shortcut.WorkingDirectory = "${__dirname}"
$Shortcut.IconLocation = "${icoPath}, 0"
$Shortcut.Description = "Start SSI Smart Manufacturing System"
$Shortcut.Save()
`;

const tempPsPath = path.join(__dirname, 'temp_shortcut.ps1');
fs.writeFileSync(tempPsPath, psScript);

try {
    execSync(`powershell -ExecutionPolicy Bypass -File "${tempPsPath}"`, { stdio: 'inherit' });
    console.log("-> SSI Smart Manufacturing.lnk successfully placed on Desktop!");
} catch (e) {
    console.error("Failed to run PowerShell script:", e.message);
} finally {
    fs.unlinkSync(tempPsPath); // Clean up the temp file
}
