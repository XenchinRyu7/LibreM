# ====================================================================
# LibreM Windows Desktop Build & NSIS Packaging Script
# ====================================================================
Write-Host ">>> [1/4] Building Frontend (React + Vite + Shadcn)..." -ForegroundColor Cyan
Set-Location frontend
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Frontend build failed!" -ForegroundColor Red
    exit 1
}
Set-Location ..

Write-Host ">>> [2/4] Building Desktop Executable (LibreM.exe GUI Subsystem)..." -ForegroundColor Cyan
go build -ldflags="-H=windowsgui -s -w" -o LibreM.exe ./cmd/server
if ($LASTEXITCODE -ne 0) {
    Write-Host "Go build failed!" -ForegroundColor Red
    exit 1
}

Write-Host ">>> [3/4] Compiling NSIS Installer..." -ForegroundColor Cyan
if (!(Test-Path "dist")) {
    New-Item -ItemType Directory -Path "dist" | Out-Null
}
.\tools\nsis\makensis.exe build\installer\installer.nsi
if ($LASTEXITCODE -ne 0) {
    Write-Host "NSIS packaging failed!" -ForegroundColor Red
    exit 1
}

Write-Host ">>> [4/4] SUCCESS! Installer generated at:" -ForegroundColor Green
Get-Item "dist\LibreM_Setup_v1.0.0.exe" | Select-Object Name, Length, LastWriteTime | Format-Table -AutoSize
