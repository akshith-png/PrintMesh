@echo off
setlocal
set "INSTALL=%ProgramFiles%\PrintMesh Agent"
set "DATA=%ProgramData%\PrintMesh Agent"
if not exist "%INSTALL%" mkdir "%INSTALL%"
if not exist "%DATA%" mkdir "%DATA%"
xcopy /E /I /Y "%~dp0agent\*" "%INSTALL%\" >nul
set "AGENT=%INSTALL%\PrintMesh.Agent.exe"
schtasks /Create /TN "PrintMesh Agent" /TR "\"%AGENT%\" --data-directory \"%DATA%\"" /SC ONLOGON /RL HIGHEST /F >nul
start "PrintMesh Agent" "%AGENT%" --data-directory "%DATA%"
exit /b 0
