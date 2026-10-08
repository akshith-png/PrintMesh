param([string]$InstallDirectory="$env:ProgramFiles\PrintMesh Agent",[string]$DataDirectory="$env:ProgramData\PrintMesh Agent")
$ErrorActionPreference='Stop'
schtasks.exe /Delete /TN 'PrintMesh Agent' /F 2>$null | Out-Null
if(Test-Path $InstallDirectory){Remove-Item $InstallDirectory -Recurse -Force}
if(Test-Path $DataDirectory){Remove-Item $DataDirectory -Recurse -Force}
Write-Host 'PrintMesh Agent uninstalled. Cloud jobs and audit records were not removed.'
