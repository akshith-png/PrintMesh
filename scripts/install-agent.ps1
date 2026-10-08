param([Parameter(Mandatory=$true)][string]$ApiBaseUrl,[Parameter(Mandatory=$true)][string]$EnrollmentToken,[string]$InstallDirectory="$env:ProgramFiles\PrintMesh Agent",[string]$DataDirectory="$env:ProgramData\PrintMesh Agent")
$ErrorActionPreference='Stop'
$package=Join-Path $PSScriptRoot '..\dist\agent'
if(-not(Test-Path $package)){throw 'Published agent not found. Run scripts/publish-agent.ps1 first.'}
New-Item -ItemType Directory -Force -Path $InstallDirectory,$DataDirectory|Out-Null
Copy-Item (Join-Path $package '*') $InstallDirectory -Recurse -Force
$agent=Join-Path $InstallDirectory 'PrintMesh.Agent.exe'
@{ApiBaseUrl=$ApiBaseUrl;EnrollmentToken=$EnrollmentToken;DataDirectory=$DataDirectory}|ConvertTo-Json|Set-Content (Join-Path $DataDirectory 'setup.json') -Encoding UTF8
schtasks.exe /Create /TN 'PrintMesh Agent' /TR "`"$agent`" --setup --config `"$(Join-Path $DataDirectory 'setup.json')`"" /SC ONLOGON /RL HIGHEST /F|Out-Null
Start-Process $agent -ArgumentList '--setup','--config',('"'+(Join-Path $DataDirectory 'setup.json')+'"')
Write-Host 'PrintMesh Agent installed and configured for auto-start.'
