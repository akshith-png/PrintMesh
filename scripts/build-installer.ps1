$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$agent=Join-Path $root 'dist\agent'
$stage=Join-Path $root 'dist\installer-stage'
$out=Join-Path $root 'dist\PrintMeshAgentSetup.exe'
if(Test-Path $stage){Remove-Item $stage -Recurse -Force}
New-Item -ItemType Directory -Force -Path (Join-Path $stage 'agent') | Out-Null
& (Join-Path $PSScriptRoot 'publish-agent.ps1') -OutputDirectory 'dist\installer-stage\agent' -SelfContained
Copy-Item (Join-Path $root 'installer\setup.cmd') $stage
Copy-Item (Join-Path $root 'installer\uninstall.cmd') $stage
$sed=Join-Path $stage 'package.sed'
@"
[Version]
Class=IEXPRESS
SEDVersion=3
[Options]
PackagePurpose=InstallApp
ShowInstallProgramWindow=0
HideExtractAnimation=1
UseLongFileName=1
InsideCompressed=1
TargetName=$out
FriendlyName=PrintMesh Agent Setup
AppLaunched=setup.cmd
PostInstallCmd=<None>
AdminQuietInstCmd=setup.cmd
UserQuietInstCmd=setup.cmd
SourceFiles=SourceFiles
[SourceFiles]
SourceFiles0=$stage
[SourceFiles0]
%stage%\setup.cmd=
%stage%\uninstall.cmd=
%stage%\agent\*=
[Strings]
stage=$stage
"@ | Set-Content $sed -Encoding ASCII
& iexpress.exe /N $sed
if($LASTEXITCODE -ne 0 -or -not(Test-Path $out)){throw 'Installer build failed.'}
Write-Host "Built $out"
