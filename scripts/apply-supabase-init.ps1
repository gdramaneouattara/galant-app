param(
  [string]$ContainerName = "supabase-selfhosted-db-1",
  [switch]$AllowErrors
)

$initDir = "/docker-entrypoint-initdb.d/init-scripts"
$files = @(
  "00-schema.sql",
  "00000000000000-initial-schema.sql",
  "00000000000001-auth-schema.sql",
  "00000000000002-storage-schema.sql",
  "00000000000003-post-setup.sql"
)

Write-Host "Application des scripts d'initialisation Supabase via $ContainerName..."

foreach ($file in $files) {
  Write-Host "-> $file"

  if ($AllowErrors) {
    $onError = 0
  } else {
    $onError = 1
  }

  $cmd = "psql -v ON_ERROR_STOP=$onError -U postgres -d postgres -f $initDir/$file"
  docker exec -i $ContainerName sh -lc $cmd
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur lors de l'exécution de $file" -ForegroundColor Red
    exit $LASTEXITCODE
  }
}
