@echo off
setlocal
set "LAUNCHER=%~dp0Mini-Games-Launcher.ps1"

if not exist "%LAUNCHER%" (
  echo Mini Games launcher was not found.
  pause
  exit /b 1
)

powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -STA -File "%LAUNCHER%"
exit /b %errorlevel%
