param(
  [string]$OutputDirectory = "dist\agent",
  [switch]$SelfContained
)

$ErrorActionPreference = "Stop"
$project = Join-Path $PSScriptRoot "..\services\print-agent\PrintMesh.Agent\PrintMesh.Agent.csproj"
$output = Join-Path $PSScriptRoot "..\$OutputDirectory"
$runtime = if ($SelfContained) { "true" } else { "false" }

if (Test-Path $output) { Remove-Item -LiteralPath $output -Recurse -Force }
dotnet publish $project --configuration Release --runtime win-x64 --self-contained $runtime --output $output
if ($LASTEXITCODE -ne 0) { throw "Agent publish failed." }
Write-Host "Published PrintMesh Agent to $output"
