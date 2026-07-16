param(
  [string]$OutputPath = (Join-Path $PSScriptRoot '..\src\data\chariot-reference.json')
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem

$downloads = 'C:\Users\Guillaume Prenveille\Downloads'
$pediatricWorkbook = (Get-ChildItem -LiteralPath $downloads -File -Filter '*.xlsx' | Where-Object { $_.Name -like '*peremptions chariot urgence pediatrique.xlsx' } | Select-Object -First 1).FullName
$box4Workbook = (Get-ChildItem -LiteralPath $downloads -File -Filter '*.xlsx' | Where-Object { $_.Name -like '*BOX 4 2024 mars.xlsx' } | Select-Object -First 1).FullName
$box3Workbook = (Get-ChildItem -LiteralPath $downloads -File -Filter '*.xlsx' | Where-Object { $_.Name -like '*BOX 3 2024.xlsx' } | Select-Object -First 1).FullName

$sources = @(
  [pscustomobject]@{
    Id = 'chariot-pediatrique'
    Label = "Chariot d'urgence pediatrique"
    Scope = 'pediatrie'
    File = $pediatricWorkbook
  },
  [pscustomobject]@{
    Id = 'chariot-box-4'
    Label = "Chariot d'urgence - Box 4"
    Scope = 'urgences'
    File = $box4Workbook
  },
  [pscustomobject]@{
    Id = 'chariot-box-3'
    Label = "Chariot d'urgence - Box 3"
    Scope = 'urgences'
    File = $box3Workbook
  }
)

function Read-ZipXml {
  param($Zip, [string]$EntryName)
  $entry = $Zip.GetEntry($EntryName)
  if (-not $entry) { return $null }
  $reader = [IO.StreamReader]::new($entry.Open())
  try { return [xml]$reader.ReadToEnd() } finally { $reader.Dispose() }
}

function Read-CellValue {
  param($Cell, $Namespace, [object[]]$SharedStrings)
  if (-not $Cell) { return '' }
  $value = $Cell.SelectSingleNode('./m:v', $Namespace)
  if ($Cell.t -eq 's' -and $value) { return [string]$SharedStrings[[int]$value.InnerText] }
  if ($Cell.t -eq 'inlineStr') {
    return [string](($Cell.SelectNodes('.//m:t', $Namespace) | ForEach-Object { $_.InnerText }) -join '')
  }
  if ($value) { return [string]$value.InnerText }
  return ''
}

function ConvertTo-Slug {
  param([string]$Value)
  $normalized = $Value.Normalize([Text.NormalizationForm]::FormD)
  $builder = [Text.StringBuilder]::new()
  foreach ($character in $normalized.ToCharArray()) {
    if ([Globalization.CharUnicodeInfo]::GetUnicodeCategory($character) -ne [Globalization.UnicodeCategory]::NonSpacingMark) {
      [void]$builder.Append($character)
    }
  }
  return (($builder.ToString().ToLowerInvariant() -replace '[^a-z0-9]+', '-') -replace '(^-|-$)', '')
}

function Get-FileSha256 {
  param([string]$Path)
  $stream = [IO.File]::OpenRead($Path)
  $algorithm = [Security.Cryptography.SHA256]::Create()
  try {
    return ([BitConverter]::ToString($algorithm.ComputeHash($stream))).Replace('-', '').ToLowerInvariant()
  } finally {
    $algorithm.Dispose()
    $stream.Dispose()
  }
}

$references = @()
$sourceManifest = @()

foreach ($source in $sources) {
  if (-not (Test-Path -LiteralPath $source.File)) { throw "Source introuvable : $($source.File)" }
  $zip = [IO.Compression.ZipFile]::OpenRead($source.File)
  try {
    $workbook = Read-ZipXml $zip 'xl/workbook.xml'
    $relationships = Read-ZipXml $zip 'xl/_rels/workbook.xml.rels'
    $sharedStringXml = Read-ZipXml $zip 'xl/sharedStrings.xml'

    $sharedStrings = @()
    if ($sharedStringXml) {
      $sharedNs = [Xml.XmlNamespaceManager]::new($sharedStringXml.NameTable)
      $sharedNs.AddNamespace('m', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main')
      foreach ($item in $sharedStringXml.SelectNodes('//m:si', $sharedNs)) {
        $sharedStrings += [string](($item.SelectNodes('.//m:t', $sharedNs) | ForEach-Object { $_.InnerText }) -join '')
      }
    }

    $relationshipMap = @{}
    foreach ($relationship in $relationships.Relationships.Relationship) {
      $relationshipMap[$relationship.Id] = $relationship.Target
    }

    $workbookNs = [Xml.XmlNamespaceManager]::new($workbook.NameTable)
    $workbookNs.AddNamespace('m', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main')
    $containers = @()

    foreach ($sheet in $workbook.SelectNodes('//m:sheet', $workbookNs)) {
      if ($sheet.name -in @('Signets', 'Utilisation des check-lists')) { continue }
      $relationshipId = $sheet.GetAttribute('id', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships')
      $target = [string]$relationshipMap[$relationshipId]
      $entryName = if ($target.StartsWith('/')) { $target.TrimStart('/') } else { 'xl/' + $target.TrimStart('/') }
      $sheetXml = Read-ZipXml $zip $entryName
      $sheetNs = [Xml.XmlNamespaceManager]::new($sheetXml.NameTable)
      $sheetNs.AddNamespace('m', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main')
      $sheetSlug = ConvertTo-Slug $sheet.name
      $items = @()

      foreach ($row in $sheetXml.SelectNodes('//m:sheetData/m:row', $sheetNs)) {
        $quantityCell = $row.SelectSingleNode('./m:c[starts-with(@r,"A")]', $sheetNs)
        $labelCell = $row.SelectSingleNode('./m:c[starts-with(@r,"B")]', $sheetNs)
        $quantityRaw = Read-CellValue $quantityCell $sheetNs $sharedStrings
        $label = (Read-CellValue $labelCell $sheetNs $sharedStrings).Trim()
        $quantity = 0.0
        if (-not [double]::TryParse($quantityRaw, [Globalization.NumberStyles]::Any, [Globalization.CultureInfo]::InvariantCulture, [ref]$quantity)) { continue }
        if ($quantity -le 0 -or [string]::IsNullOrWhiteSpace($label)) { continue }

        $productCode = ''
        foreach ($column in @('G', 'F')) {
          $candidate = $row.SelectSingleNode("./m:c[starts-with(@r,'$column')]", $sheetNs)
          $candidateValue = (Read-CellValue $candidate $sheetNs $sharedStrings).Trim()
          if ($candidateValue -and $candidateValue -notin @('*', 'NA', '?')) { $productCode = $candidateValue; break }
        }

        $presentation = ''
        if ($sheet.name -eq 'Tiroir 2 DROGUES') {
          $presentationCell = $row.SelectSingleNode('./m:c[starts-with(@r,"C")]', $sheetNs)
          $presentation = (Read-CellValue $presentationCell $sheetNs $sharedStrings).Trim()
        }

        $items += [ordered]@{
          id = "$($source.Id)-$sheetSlug-$($row.r)"
          label = $label
          expectedQuantity = $quantity
          unit = 'unite'
          presentation = $presentation
          productCode = $productCode
          sourceCell = "B$($row.r)"
        }
      }

      $containers += [ordered]@{
        id = "$($source.Id)-$sheetSlug"
        label = [string]$sheet.name
        kind = if ($sheet.name -like 'Tiroir*') { 'tiroir' } else { 'plateau' }
        items = $items
      }
    }

    $references += [ordered]@{
      id = $source.Id
      label = $source.Label
      scope = $source.Scope
      sourceStatus = 'historical-reference-only'
      validationRequired = $true
      kind = 'chariot'
      containers = $containers
    }
    $sourceManifest += [ordered]@{
      referenceId = $source.Id
      fileName = [IO.Path]::GetFileName($source.File)
      sha256 = Get-FileSha256 $source.File
      sourcePeriod = '2024-03'
      importedFields = @('expectedQuantity', 'label', 'presentation', 'productCode', 'sourceCell')
      excludedFields = @('expiry', 'alert', 'signature', 'author', 'approval', 'instruction')
    }
  } finally {
    $zip.Dispose()
  }
}

$payload = [ordered]@{
  schemaVersion = 1
  generatedAt = '2026-07-16T00:00:00.000Z'
  sourceStatus = 'demo-draft-needs-hospital-validation'
  sources = $sourceManifest
  references = $references
}

$resolvedOutput = [IO.Path]::GetFullPath($OutputPath)
[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($resolvedOutput)) | Out-Null
$json = $payload | ConvertTo-Json -Depth 20
[IO.File]::WriteAllText($resolvedOutput, $json, [Text.UTF8Encoding]::new($false))
Write-Output "Referentiel chariots genere : $resolvedOutput"
