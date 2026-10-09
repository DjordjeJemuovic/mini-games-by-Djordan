Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$ink = [System.Drawing.Color]::FromArgb(16, 19, 29)
$panel = [System.Drawing.Color]::FromArgb(32, 40, 58)
$accent = [System.Drawing.Color]::FromArgb(125, 211, 252)
$text = [System.Drawing.Color]::FromArgb(244, 246, 255)
$muted = [System.Drawing.Color]::FromArgb(174, 184, 208)

function Find-Browser {
  $candidates = @(
    (Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe'),
    (Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe'),
    (Join-Path $env:LOCALAPPDATA 'Microsoft\Edge\Application\msedge.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe'),
    (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),
    (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe')
  )
  foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path -LiteralPath $candidate)) { return $candidate }
  }
  return $null
}

function Find-Python {
  $py = Get-Command 'py.exe' -ErrorAction SilentlyContinue
  if ($py) {
    & $py.Source -3 -c 'import tkinter' 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { return @{ Path = $py.Source; Prefix = @('-3') } }
  }
  $pythonCommand = Get-Command 'python.exe' -ErrorAction SilentlyContinue
  if ($pythonCommand -and $pythonCommand.Source -notmatch '\\WindowsApps\\') {
    & $pythonCommand.Source -c 'import tkinter' 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { return @{ Path = $pythonCommand.Source; Prefix = @() } }
  }
  return $null
}

function Open-BrowserGame($relativePath) {
  if (-not $browserPath) {
    [System.Windows.Forms.MessageBox]::Show('Microsoft Edge ili Google Chrome nije pronadjen.', 'Pregledac nije pronadjen', 'OK', 'Warning') | Out-Null
    return
  }
  $gamePath = Join-Path $root $relativePath
  if (-not (Test-Path -LiteralPath $gamePath)) {
    [System.Windows.Forms.MessageBox]::Show("Igra nije pronadjena:`r`n$gamePath", 'Igra nije pronadjena', 'OK', 'Error') | Out-Null
    return
  }
  $uri = ([System.Uri](Resolve-Path -LiteralPath $gamePath).Path).AbsoluteUri
  Start-Process -FilePath $browserPath -ArgumentList @('--new-window', "--app=$uri")
}

$browserPath = Find-Browser
$python = Find-Python

$form = New-Object System.Windows.Forms.Form
$form.Text = 'Mini Games by Djordan'
$form.StartPosition = 'CenterScreen'
$form.ClientSize = New-Object System.Drawing.Size(760, 680)
$form.MinimumSize = New-Object System.Drawing.Size(776, 719)
$form.BackColor = $ink
$form.ForeColor = $text
$form.Font = New-Object System.Drawing.Font('Segoe UI', 10)
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
$iconPath = Join-Path $root 'mini-games\assets\images\game-controller.ico'
if (Test-Path -LiteralPath $iconPath) { $form.Icon = New-Object -TypeName System.Drawing.Icon -ArgumentList $iconPath }

$heading = New-Object System.Windows.Forms.Label
$heading.Text = 'Mini Games by Djordan'
$heading.Location = New-Object System.Drawing.Point(36, 24)
$heading.Size = New-Object System.Drawing.Size(680, 42)
$heading.Font = New-Object System.Drawing.Font('Segoe UI', 23, [System.Drawing.FontStyle]::Bold)
$heading.ForeColor = $text
$form.Controls.Add($heading)

$subheading = New-Object System.Windows.Forms.Label
$subheading.Text = 'Izaberi igru koju zelis da pokrenes.'
$subheading.Location = New-Object System.Drawing.Point(40, 72)
$subheading.Size = New-Object System.Drawing.Size(680, 26)
$subheading.ForeColor = $muted
$form.Controls.Add($subheading)

function Add-GameButton($title, $description, $top, $action, $enabled = $true) {
  $button = New-Object System.Windows.Forms.Button
  $button.Location = New-Object System.Drawing.Point(36, $top)
  $button.Size = New-Object System.Drawing.Size(688, 82)
  $button.FlatStyle = 'Flat'
  $button.FlatAppearance.BorderColor = [System.Drawing.Color]::FromArgb(48, 57, 79)
  $button.FlatAppearance.BorderSize = 1
  $button.BackColor = $panel
  $button.ForeColor = $text
  $button.TextAlign = 'MiddleLeft'
  $button.Padding = New-Object System.Windows.Forms.Padding(18, 0, 10, 0)
  $button.Font = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Bold)
  $button.Text = "$title`r`n$description"
  $button.Enabled = $enabled
  $button.Add_Click($action)
  $form.Controls.Add($button)
}

Add-GameButton 'Iks-Oks' 'Solo partija ili turnir' 112 { Open-BrowserGame 'iks-oks\index.html' }
Add-GameButton 'Papir, kamen, makaze' 'Igraj 1v1 ili protiv racunara' 202 { Open-BrowserGame 'papir-kamen-makaze\index.html' }
Add-GameButton 'Simple sah' 'Sah za dva igraca ili protiv racunara' 292 { Open-BrowserGame 'simple-sah\index.html' }
Add-GameButton 'Vesanje' 'Python desktop verzija za dva igraca' 382 {
  if (-not $python) {
    [System.Windows.Forms.MessageBox]::Show('Za Python vesanje je potreban Python 3 sa Tkinter podrskom.', 'Python nije dostupan', 'OK', 'Information') | Out-Null
    return
  }
  $gamePath = Join-Path $root 'vesanje\main.py'
  $quotedScript = '"' + $gamePath + '"'
  Start-Process -FilePath $python.Path -ArgumentList (@($python.Prefix) + @($quotedScript)) -WorkingDirectory (Split-Path -Parent $gamePath)
} ($null -ne $python)

Add-GameButton 'Izbor igara u browseru' 'Otvori glavni meni sa imenima, bojama i svim web igrama' 472 { Open-BrowserGame 'mini-games\index.html' }

$status = New-Object System.Windows.Forms.Label
$status.Location = New-Object System.Drawing.Point(40, 572)
$status.Size = New-Object System.Drawing.Size(680, 50)
$status.ForeColor = $muted
if ($python) {
  $status.Text = 'Python 3 i Tkinter su dostupni. Vesanje ce se otvoriti u svom desktop prozoru.'
  $status.ForeColor = [System.Drawing.Color]::FromArgb(74, 222, 128)
} else {
  $status.Text = 'Python vesanje je onemoguceno dok Python 3 sa Tkinter podrskom nije instaliran.'
}
$form.Controls.Add($status)

[void]$form.ShowDialog()
