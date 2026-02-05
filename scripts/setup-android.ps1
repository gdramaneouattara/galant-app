param(
  [switch]$Persist
)

$androidSdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"
$platformTools = Join-Path $androidSdk "platform-tools"

if (-not (Test-Path $androidSdk)) {
  Write-Host "Android SDK introuvable: $androidSdk" -ForegroundColor Red
  Write-Host "Installe Android Studio puis le SDK via le SDK Manager."
  exit 1
}

# Session only (no admin, no registry write)
$env:ANDROID_HOME = $androidSdk
if ($env:Path -notlike "*$platformTools*") {
  $env:Path = "$platformTools;$env:Path"
}

Write-Host "ANDROID_HOME défini pour la session: $env:ANDROID_HOME"
Write-Host "platform-tools ajouté au PATH (session)."

if ($Persist) {
  # Persist in user env without setx truncation
  [Environment]::SetEnvironmentVariable("ANDROID_HOME", $androidSdk, "User")
  $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
  if ([string]::IsNullOrWhiteSpace($userPath)) {
    $userPath = ""
  }
  if ($userPath -notlike "*$platformTools*") {
    $userPath = ($userPath.TrimEnd(';') + ";" + $platformTools).Trim(';')
  }
  [Environment]::SetEnvironmentVariable("Path", $userPath, "User")
  Write-Host "Variables persistées dans l'environnement utilisateur." -ForegroundColor Green
  Write-Host "Ferme et rouvre le terminal pour prendre effet."
}
