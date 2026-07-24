param()

$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$distRoot = [System.IO.Path]::GetFullPath((Join-Path $projectRoot 'dist'))
$clientRoot = Join-Path $distRoot 'client'
$serverRoot = Join-Path $distRoot 'server'

if (-not $distRoot.StartsWith(($projectRoot + [System.IO.Path]::DirectorySeparatorChar), [System.StringComparison]::OrdinalIgnoreCase)) {
  throw 'Le répertoire de sortie doit rester dans le projet.'
}

if (Test-Path -LiteralPath $distRoot) {
  Remove-Item -LiteralPath $distRoot -Recurse -Force
}

New-Item -ItemType Directory -Path $clientRoot, $serverRoot -Force | Out-Null

$rootFiles = @(
  'index.html',
  'styles.css',
  'app.js',
  'sw.js',
  'manifest.webmanifest',
  'icon.svg'
)

foreach ($file in $rootFiles) {
  Copy-Item -LiteralPath (Join-Path $projectRoot $file) -Destination (Join-Path $clientRoot $file)
}

foreach ($directory in @('assets', 'public', 'src')) {
  Copy-Item -LiteralPath (Join-Path $projectRoot $directory) -Destination $clientRoot -Recurse
}

Copy-Item -LiteralPath (Join-Path $projectRoot 'sites-worker.js') -Destination (Join-Path $serverRoot 'index.js')

$required = @(
  (Join-Path $serverRoot 'index.js'),
  (Join-Path $clientRoot 'index.html'),
  (Join-Path $clientRoot 'manifest.webmanifest'),
  (Join-Path $clientRoot 'sw.js'),
  (Join-Path $clientRoot 'src\features\reserve-01-kits\web.js'),
  (Join-Path $clientRoot 'assets\chariot-urgences\reserve-01-kits\reserve-01-kits-inventaire.json'),
  (Join-Path $clientRoot 'public\assets\chariots\box-3-4-adulte\chariot-face.png')
)

foreach ($path in $required) {
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    throw "Fichier de déploiement manquant : $path"
  }
}

Write-Output "Build Sites prêt dans $distRoot"
