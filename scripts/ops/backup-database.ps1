param(
  [string]$DatabaseUrl = $env:DATABASE_URL,
  [string]$OutputDir = "artifacts/backups",
  [string]$Label = "manual"
)

$ErrorActionPreference = "Stop"

if (-not $DatabaseUrl) {
  throw "DATABASE_URL is required."
}

if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) {
  throw "pg_dump was not found in PATH. Install PostgreSQL client tools before running backup."
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupFile = Join-Path $OutputDir ("presales-{0}-{1}.dump" -f $Label, $timestamp)
$manifestFile = Join-Path $OutputDir ("presales-{0}-{1}.json" -f $Label, $timestamp)

& pg_dump --format=custom --file $backupFile $DatabaseUrl

$manifest = @{
  createdAt = (Get-Date).ToString("s")
  databaseUrl = $DatabaseUrl
  backupFile = $backupFile
  label = $Label
} | ConvertTo-Json

Set-Content -Path $manifestFile -Value $manifest
Write-Output "Backup created: $backupFile"