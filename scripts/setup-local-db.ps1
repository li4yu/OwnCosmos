# Create OwnCosmos database after PostgreSQL is installed.
# Usage: powershell -ExecutionPolicy Bypass -File scripts/setup-local-db.ps1

$ErrorActionPreference = "Continue"
$psqlCandidates = @(
  "C:\Program Files\PostgreSQL\17\bin\psql.exe",
  "C:\Program Files\PostgreSQL\16\bin\psql.exe",
  "C:\Program Files\PostgreSQL\15\bin\psql.exe"
)
$psql = $psqlCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $psql) {
  throw "找不到 psql。请先安装 PostgreSQL。"
}

$env:PGPASSWORD = "OwnCosmosDev2026"
Write-Host "Using: $psql"
Write-Host "Creating database own_cosmos if missing..."

$exists = & $psql -U postgres -h 127.0.0.1 -p 5432 -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='own_cosmos'"
if ($exists -eq "1") {
  Write-Host "Database own_cosmos already exists."
} else {
  & $psql -U postgres -h 127.0.0.1 -p 5432 -d postgres -c "CREATE DATABASE own_cosmos;"
  if ($LASTEXITCODE -ne 0) { throw "CREATE DATABASE failed" }
  Write-Host "Created own_cosmos."
}

Write-Host "Next: pnpm db:push"
