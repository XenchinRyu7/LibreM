# ====================================================================
# LibreM Multi-Platform Release Packaging Pipeline
# Targets: Windows (Installer & Zip), Linux, macOS (Intel & Apple Silicon)
# ====================================================================
$ErrorActionPreference = "Stop"

$Version = "v1.0.0"
$ReleaseDir = "dist\release"

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host " LibreM Multi-Platform Release Pipeline ($Version)" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

# 1. Clean & Prepare Release Directory
if (Test-Path $ReleaseDir) {
    Remove-Item $ReleaseDir -Recurse -Force
}
New-Item -ItemType Directory -Path $ReleaseDir | Out-Null

# 2. Build Frontend Production Bundle
Write-Host "`n>>> [1/6] Building Production Frontend..." -ForegroundColor Yellow
Set-Location frontend
npm run build
if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }
Set-Location ..

# 3. Ensure Windows Resource Icon (.syso) is Compiled
Write-Host "`n>>> [2/6] Compiling Windows PE Resource Icon..." -ForegroundColor Yellow
Copy-Item "build\installer\LibreM.ico" "cmd\server\app.ico" -Force
Set-Content -Path "cmd\server\app.rc" -Value '1 ICON "app.ico"'
& "C:\MinGW\bin\windres.exe" -i cmd\server\app.rc -O coff -o cmd\server\resource_windows_amd64.syso

# 4. Build Windows Executable & NSIS Installer
Write-Host "`n>>> [3/6] Building Windows Targets (x64)..." -ForegroundColor Yellow
$env:GOOS = "windows"
$env:GOARCH = "amd64"
go build -ldflags="-H=windowsgui -s -w" -o LibreM.exe ./cmd/server
if ($LASTEXITCODE -ne 0) { throw "Windows binary build failed" }

# Compile NSIS Installer
.\tools\nsis\makensis.exe build\installer\installer.nsi
if ($LASTEXITCODE -ne 0) { throw "NSIS installer compilation failed" }
Copy-Item "dist\LibreM_Setup_v1.0.0.exe" "$ReleaseDir\LibreM_Setup_${Version}.exe"

# Package Windows Portable Zip
$winDir = "$ReleaseDir\LibreM-${Version}-windows-amd64"
New-Item -ItemType Directory -Path $winDir | Out-Null
Copy-Item "LibreM.exe" $winDir
Copy-Item ".env.example" $winDir
Copy-Item "README.md" $winDir
Compress-Archive -Path "$winDir\*" -DestinationPath "$ReleaseDir\LibreM-${Version}-windows-amd64.zip" -Force
Remove-Item $winDir -Recurse -Force

# 5. Cross-Compile Linux AMD64
Write-Host "`n>>> [4/6] Cross-Compiling Linux Target (x64)..." -ForegroundColor Yellow
$env:GOOS = "linux"
$env:GOARCH = "amd64"
$env:CGO_ENABLED = "0"
$linuxDir = "$ReleaseDir\LibreM-${Version}-linux-amd64"
New-Item -ItemType Directory -Path $linuxDir | Out-Null
go build -ldflags="-s -w" -o "$linuxDir\LibreM" ./cmd/server
Copy-Item ".env.example" $linuxDir
Copy-Item "README.md" $linuxDir
tar -czf "$ReleaseDir\LibreM-${Version}-linux-amd64.tar.gz" -C $ReleaseDir "LibreM-${Version}-linux-amd64"
Remove-Item $linuxDir -Recurse -Force

# 6. Cross-Compile macOS (Darwin AMD64 & ARM64)
Write-Host "`n>>> [5/6] Cross-Compiling macOS Targets (Intel & Apple Silicon)..." -ForegroundColor Yellow
$env:GOOS = "darwin"
$env:CGO_ENABLED = "0"

# Darwin ARM64 (M1/M2/M3/M4)
$env:GOARCH = "arm64"
$macArmDir = "$ReleaseDir\LibreM-${Version}-darwin-arm64"
New-Item -ItemType Directory -Path $macArmDir | Out-Null
go build -ldflags="-s -w" -o "$macArmDir\LibreM" ./cmd/server
Copy-Item ".env.example" $macArmDir
Copy-Item "README.md" $macArmDir
tar -czf "$ReleaseDir\LibreM-${Version}-darwin-arm64.tar.gz" -C $ReleaseDir "LibreM-${Version}-darwin-arm64"
Remove-Item $macArmDir -Recurse -Force

# Darwin AMD64 (Intel)
$env:GOARCH = "amd64"
$macAmdDir = "$ReleaseDir\LibreM-${Version}-darwin-amd64"
New-Item -ItemType Directory -Path $macAmdDir | Out-Null
go build -ldflags="-s -w" -o "$macAmdDir\LibreM" ./cmd/server
Copy-Item ".env.example" $macAmdDir
Copy-Item "README.md" $macAmdDir
tar -czf "$ReleaseDir\LibreM-${Version}-darwin-amd64.tar.gz" -C $ReleaseDir "LibreM-${Version}-darwin-amd64"
Remove-Item $macAmdDir -Recurse -Force

# 7. Generate SHA-256 Checksums
Write-Host "`n>>> [6/6] Generating SHA-256 Checksums..." -ForegroundColor Yellow
$checksums = @()
Get-ChildItem $ReleaseDir -File | Where-Object { $_.Name -ne "checksums.txt" } | ForEach-Object {
    $hash = (Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLower()
    $checksums += "$hash  $($_.Name)"
}
$checksums | Set-Content "$ReleaseDir\checksums.txt"

Write-Host "`n======================================================" -ForegroundColor Green
Write-Host " SUCCESS! All Release Artifacts Generated at: $ReleaseDir" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
Get-ChildItem $ReleaseDir | Select-Object Name, Length, LastWriteTime | Format-Table -AutoSize
