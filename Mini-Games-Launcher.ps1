# Otvara glavni meni kao aplikacioni prozor preko celog ekrana.
# Web igre se zatim navigiraju unutar istog prozora.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$hubPath = Join-Path $root 'mini-games\index.html'

if (-not (Test-Path -LiteralPath $hubPath)) {
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

$hubUri = ([System.Uri](Resolve-Path -LiteralPath $hubPath).Path).AbsoluteUri
Start-Process -FilePath $browserPath -ArgumentList @('--app=' + $hubUri, '--start-fullscreen')
