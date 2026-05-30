# Migrate local PostgreSQL to Render
# Usage:
#   $env:RENDER_DATABASE_URL = "postgresql://user:pass@host/dbname"
#   .\scripts\migrate-db-to-render.ps1

$ErrorActionPreference = "Stop"

$backendRoot = Split-Path $PSScriptRoot -Parent
$dumpFile = Join-Path $backendRoot "flower_local_dump.sql"
$cleanDump = Join-Path $backendRoot "flower_local_dump_clean.sql"

if (-not $env:RENDER_DATABASE_URL) {
    Write-Host "Set RENDER_DATABASE_URL first (External Database URL from Render dashboard)."
    Write-Host 'Example: $env:RENDER_DATABASE_URL = "postgresql://flower:pass@host/db"'
    exit 1
}

if ($env:RENDER_DATABASE_URL -notlike "postgresql://*") {
    Write-Host "RENDER_DATABASE_URL must start with postgresql:// (not a browser link)."
    exit 1
}

$localUrl = $env:DATABASE_URL
if (-not $localUrl) {
    $localUrl = "postgresql://postgres:postgres@localhost:5432/flower_aggregator"
}

Write-Host "Step 1/3: dump local database..."

$pgDump = (Get-Command pg_dump).Source
$pgDir = Split-Path $pgDump -Parent
$psql = Join-Path $pgDir "psql.exe"

& $pgDump $localUrl --no-owner --no-acl --clean --if-exists -f $dumpFile
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Step 2/3: prepare dump for Render..."

Get-Content $dumpFile |
    Where-Object { $_ -notmatch '^\\restrict' -and $_ -notmatch '^\\unrestrict' } |
    Set-Content $cleanDump -Encoding utf8

Write-Host "Step 3/3: restore to Render (overwrites remote data)..."

& $psql $env:RENDER_DATABASE_URL -v ON_ERROR_STOP=1 -f $cleanDump
if ($LASTEXITCODE -ne 0) {
    Write-Host "Restore failed. Check External URL and network access."
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "Done. Local data copied to Render."
