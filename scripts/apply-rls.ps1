param(
  [string]$ContainerName = "supabase-selfhosted-db-1",
  [switch]$WithSchema
)

$sqlPath = Join-Path $PSScriptRoot "supabase-rls.sql"
$schemaPath = Join-Path $PSScriptRoot "supabase-schema.sql"

if (-not (Test-Path $sqlPath)) {
  Write-Host "Fichier SQL introuvable: $sqlPath" -ForegroundColor Red
  exit 1
}

if ($WithSchema) {
  if (-not (Test-Path $schemaPath)) {
    Write-Host "Fichier SQL introuvable: $schemaPath" -ForegroundColor Red
    exit 1
  }
  Write-Host "Application du schéma via $ContainerName..."
  Get-Content $schemaPath | docker exec -i $ContainerName psql -U postgres -d postgres
}

Write-Host "Application des politiques RLS via $ContainerName..."
Get-Content $sqlPath | docker exec -i $ContainerName psql -U postgres -d postgres
