@echo off
schtasks /Delete /TN "PrintMesh Agent" /F >nul 2>&1
if exist "%ProgramFiles%\PrintMesh Agent" rmdir /S /Q "%ProgramFiles%\PrintMesh Agent"
if exist "%ProgramData%\PrintMesh Agent" rmdir /S /Q "%ProgramData%\PrintMesh Agent"
exit /b 0
