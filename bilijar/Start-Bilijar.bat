@echo off
setlocal
set "GAME_SCRIPT=%~dp0main.py"

where py >nul 2>nul
if not errorlevel 1 goto try_py
goto try_python

:try_py
py -3 -c "import pygame" >nul 2>nul
if errorlevel 1 goto try_python
py -3 "%GAME_SCRIPT%"
exit /b

:try_python
where python >nul 2>nul
if errorlevel 1 goto missing_python
python -c "import pygame" >nul 2>nul
if errorlevel 1 goto missing_python
python "%GAME_SCRIPT%"
exit /b

:missing_python
echo Pygame is not installed for the available Python 3 interpreter.
pause
exit /b 1
