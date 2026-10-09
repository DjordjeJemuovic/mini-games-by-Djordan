# Serve the launcher on loopback so it can safely request local Pygame games.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
$root = [System.IO.Path]::GetFullPath((Split-Path -Parent $MyInvocation.MyCommand.Path))
$rootPrefix = $root.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
$bilijarBat = Join-Path $root 'bilijar\Start-Bilijar.bat'

if (-not (Test-Path -LiteralPath (Join-Path $root 'mini-games\index.html'))) {
  [System.Windows.Forms.MessageBox]::Show('Glavni meni Mini Games nije pronadjen.', 'Mini Games', 'OK', 'Error') | Out-Null
  exit 1
}

$browserCandidates = @(
  (Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe'),
  (Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe'),
  (Join-Path $env:LOCALAPPDATA 'Microsoft\Edge\Application\msedge.exe'),
  (Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe'),
  (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),
  (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe')
)
$browserPath = $browserCandidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1

if (-not $browserPath) {
  [System.Windows.Forms.MessageBox]::Show('Instaliraj Microsoft Edge ili Google Chrome da bi pokrenuo Mini Games.', 'Pregledac nije pronadjen', 'OK', 'Warning') | Out-Null
  exit 1
}

# Bind a local TCP server directly so no administrator URL reservation is needed.
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
$listener.Start()
$port = ([System.Net.IPEndPoint]$listener.LocalEndpoint).Port
$profilePath = Join-Path $env:LOCALAPPDATA 'MiniGamesLauncherProfile'
$hubUri = "http://127.0.0.1:$port/mini-games/index.html"
$browserArgs = '--app="' + $hubUri + '" --start-fullscreen --no-first-run --user-data-dir="' + $profilePath + '"'
$browserProcess = Start-Process -FilePath $browserPath -ArgumentList $browserArgs -PassThru

$mimeTypes = @{
  '.html' = 'text/html; charset=utf-8'
  '.css' = 'text/css; charset=utf-8'
  '.js' = 'text/javascript; charset=utf-8'
  '.svg' = 'image/svg+xml'
  '.png' = 'image/png'
  '.jpg' = 'image/jpeg'
  '.jpeg' = 'image/jpeg'
  '.json' = 'application/json; charset=utf-8'
  '.ico' = 'image/x-icon'
}

function Send-HttpResponse($client, $status, $reason, $contentType, $body) {
  $stream = $client.GetStream()
  $header = "HTTP/1.1 $status $reason`r`nConnection: close`r`nCache-Control: no-store`r`nContent-Type: $contentType`r`nContent-Length: $($body.Length)`r`n`r`n"
  $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
  $stream.Write($headerBytes, 0, $headerBytes.Length)
  if ($body.Length -gt 0) { $stream.Write($body, 0, $body.Length) }
}

try {
  while ($listener.Server.IsBound -and -not $browserProcess.HasExited) {
    if (-not $listener.Pending()) {
      Start-Sleep -Milliseconds 100
      continue
    }

    $client = $listener.AcceptTcpClient()
    $client.ReceiveTimeout = 3000
    try {
      $stream = $client.GetStream()
      $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
      $requestLine = $reader.ReadLine()
      if ([string]::IsNullOrWhiteSpace($requestLine)) { continue }
      $parts = $requestLine.Split(' ')
      if ($parts.Length -lt 2) {
        Send-HttpResponse $client 400 'Bad Request' 'text/plain' ([System.Text.Encoding]::UTF8.GetBytes('Bad request.'))
        continue
      }
      $method, $target = $parts[0], $parts[1]
      $headers = @{}
      while ($true) {
        $line = $reader.ReadLine()
        if ([string]::IsNullOrEmpty($line)) { break }
        $separator = $line.IndexOf(':')
        if ($separator -gt 0) { $headers[$line.Substring(0, $separator).Trim()] = $line.Substring($separator + 1).Trim() }
      }

      if ($method -eq 'POST' -and $target.Split('?')[0] -eq '/__launcher/launch/bilijar' -and $headers['X-Mini-Games-Launcher'] -eq '1') {
        if (-not (Test-Path -LiteralPath $bilijarBat)) {
          Send-HttpResponse $client 404 'Not Found' 'text/plain; charset=utf-8' ([System.Text.Encoding]::UTF8.GetBytes('Bilijar launcher not found.'))
        } else {
          Start-Process -FilePath $env:ComSpec -ArgumentList @('/c', ('""' + $bilijarBat + '""')) -WorkingDirectory (Split-Path -Parent $bilijarBat) | Out-Null
          Send-HttpResponse $client 204 'No Content' 'text/plain' ([byte[]]@())
        }
        continue
      }

      if ($method -notin @('GET', 'HEAD')) {
        Send-HttpResponse $client 405 'Method Not Allowed' 'text/plain' ([byte[]]@())
        continue
      }

      $requestUri = [System.Uri]::new("http://127.0.0.1:$port$target")
      $relativePath = [System.Uri]::UnescapeDataString($requestUri.AbsolutePath.TrimStart('/')).Replace('/', [System.IO.Path]::DirectorySeparatorChar)
      if ([string]::IsNullOrWhiteSpace($relativePath)) { $relativePath = 'mini-games\index.html' }
      $filePath = [System.IO.Path]::GetFullPath((Join-Path $root $relativePath))
      if (-not $filePath.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        Send-HttpResponse $client 403 'Forbidden' 'text/plain' ([byte[]]@())
        continue
      }
      if (Test-Path -LiteralPath $filePath -PathType Container) { $filePath = Join-Path $filePath 'index.html' }
      if (-not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
        Send-HttpResponse $client 404 'Not Found' 'text/plain' ([byte[]]@())
        continue
      }

      $extension = [System.IO.Path]::GetExtension($filePath).ToLowerInvariant()
      $contentType = $mimeTypes[$extension]
      if (-not $contentType) { $contentType = 'application/octet-stream' }
      $body = [System.IO.File]::ReadAllBytes($filePath)
      if ($method -eq 'HEAD') { $body = [byte[]]@() }
      Send-HttpResponse $client 200 'OK' $contentType $body
    } catch {
      # Close malformed or interrupted browser requests without stopping the launcher.
    } finally {
      $client.Close()
    }
  }
} finally {
  $listener.Stop()
}
