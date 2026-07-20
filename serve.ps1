param([int]$Port = 4173)

$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath($PSScriptRoot)
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.css' = 'text/css; charset=utf-8'
  '.js' = 'text/javascript; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.webmanifest' = 'application/manifest+json; charset=utf-8'
  '.svg' = 'image/svg+xml'
  '.png' = 'image/png'
  '.jpg' = 'image/jpeg'
  '.jpeg' = 'image/jpeg'
}

$listener.Start()
Write-Output "Relève disponible sur http://localhost:$Port/"

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $stream = $client.GetStream()
      $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
      $requestLine = $reader.ReadLine()
      while (($header = $reader.ReadLine()) -ne '') {
        if ($null -eq $header) { break }
      }

      $method = if ($requestLine) { ($requestLine -split ' ')[0] } else { 'GET' }
      $status = '200 OK'
      $contentType = 'text/plain; charset=utf-8'
      $body = [System.Text.Encoding]::UTF8.GetBytes('Not found')
      $target = if ($requestLine) { ($requestLine -split ' ')[1] } else { '/' }
      $relative = [Uri]::UnescapeDataString(($target -split '\?')[0].TrimStart('/'))
      if ([string]::IsNullOrWhiteSpace($relative)) { $relative = 'index.html' }
      $candidate = [System.IO.Path]::GetFullPath((Join-Path $root $relative))

      if ($method -notin @('GET', 'HEAD')) {
        $status = '405 Method Not Allowed'
        $body = [System.Text.Encoding]::UTF8.GetBytes('Method not allowed')
      } elseif ($candidate.StartsWith(($root + [IO.Path]::DirectorySeparatorChar), [System.StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $candidate -PathType Leaf)) {
        $extension = [System.IO.Path]::GetExtension($candidate).ToLowerInvariant()
        $contentType = if ($mime.ContainsKey($extension)) { $mime[$extension] } else { 'application/octet-stream' }
        $body = [System.IO.File]::ReadAllBytes($candidate)
      } else {
        $status = '404 Not Found'
      }

      $headers = "HTTP/1.1 $status`r`nContent-Type: $contentType`r`nContent-Length: $($body.Length)`r`nCache-Control: no-store`r`nX-Content-Type-Options: nosniff`r`nReferrer-Policy: no-referrer`r`nService-Worker-Allowed: /`r`nConnection: close`r`n`r`n"
      $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
      $stream.Write($headerBytes, 0, $headerBytes.Length)
      if ($method -ne 'HEAD') { $stream.Write($body, 0, $body.Length) }
      $stream.Flush()
    } finally {
      $client.Close()
    }
  }
} finally {
  $listener.Stop()
}
