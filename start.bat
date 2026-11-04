@echo off
setlocal
title WulonSpec
cd /d "%~dp0"

set "URL=http://127.0.0.1:4173"

echo.
echo   WulonSpec preview
echo   %URL%
echo.

rem If the preview is already up, just open it instead of starting a second server.
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing -Uri '%URL%' -TimeoutSec 1; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>nul
if not errorlevel 1 (
  echo   Preview is already running. Opening the browser...
  start "" "%URL%"
  exit /b 0
)

set "PY="
python -c "import sys" >nul 2>nul
if not errorlevel 1 set "PY=python"
if not defined PY (
  py -3 -c "import sys" >nul 2>nul
  if not errorlevel 1 set "PY=py -3"
)

if not defined PY (
  echo   Python 3 was not found.
  echo   Install Python 3 and enable "Add python.exe to PATH".
  echo   Download: https://www.python.org/downloads/
  echo.
  pause
  exit /b 1
)

echo   Starting the local server...
echo   Press Ctrl+C to stop it.
echo.

rem Give the server a moment, then open the page in the default browser.
start "" /b cmd /c "ping -n 3 127.0.0.1 >nul & start %URL%"

%PY% -m http.server 4173 --bind 127.0.0.1

echo.
echo   Server stopped.
pause
