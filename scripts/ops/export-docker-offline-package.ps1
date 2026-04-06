param(
  [string]$OutputDir,
  [string]$AppImageTag = "presales-app:offline-5004",
  [string]$SourceDbContainer = "app_code-postgres-1"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "docker was not found in PATH."
}

if (-not $OutputDir) {
  $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $OutputDir = Join-Path "artifacts" "docker-offline-5004-$timestamp"
}

$outputRoot = Resolve-Path "."
$packageDir = Join-Path $outputRoot $OutputDir
$postgresInitDir = Join-Path $packageDir "postgres\init"
$imagesDir = Join-Path $packageDir "images"

New-Item -ItemType Directory -Force -Path $packageDir | Out-Null
New-Item -ItemType Directory -Force -Path $postgresInitDir | Out-Null
New-Item -ItemType Directory -Force -Path $imagesDir | Out-Null

$sqlDumpFile = Join-Path $postgresInitDir "01-current-data.sql"
$appImageFile = Join-Path $imagesDir "presales-app-offline-5004.tar"
$postgresImageFile = Join-Path $imagesDir "postgres-16-alpine.tar"
$runbookFile = Join-Path $packageDir "docker-offline-5004-runbook.md"

Write-Output "[1/6] Building app image $AppImageTag"
docker build --tag $AppImageTag .

Write-Output "[2/6] Exporting current PostgreSQL data from $SourceDbContainer"
$dumpCommand = "pg_dump -U presales -d presales_system --no-owner --no-privileges --clean --if-exists"
$dumpContent = docker exec $SourceDbContainer sh -lc $dumpCommand
Set-Content -Path $sqlDumpFile -Value $dumpContent -Encoding utf8

Write-Output "[3/6] Saving app image"
docker save --output $appImageFile $AppImageTag

Write-Output "[4/6] Saving postgres base image"
docker save --output $postgresImageFile postgres:16-alpine

Write-Output "[5/6] Copying runtime descriptors"
Copy-Item "deploy/docker-offline/compose.offline-5004.yaml" (Join-Path $packageDir "compose.yaml") -Force
Copy-Item "deploy/docker-offline/.env.offline-5004.example" (Join-Path $packageDir ".env.example") -Force
Copy-Item "docs/deployment/docker-offline-5004-runbook.md" $runbookFile -Force

Write-Output "[6/6] Writing manifest"
$manifest = [ordered]@{
  createdAt = (Get-Date).ToString("s")
  appImage = $AppImageTag
  appImageArchive = "images/presales-app-offline-5004.tar"
  postgresImageArchive = "images/postgres-16-alpine.tar"
  composeFile = "compose.yaml"
  envTemplate = ".env.example"
  runbook = "docker-offline-5004-runbook.md"
  databaseInitSql = "postgres/init/01-current-data.sql"
  sourceDbContainer = $SourceDbContainer
  runtimePort = 5004
}
$manifest | ConvertTo-Json | Set-Content -Path (Join-Path $packageDir "manifest.json") -Encoding utf8

Write-Output "Offline package exported to: $packageDir"