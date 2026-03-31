@echo off
setlocal

set "NODE_EXE=C:\Program Files\nodejs\node.exe"
set "APP_DIR=%~dp0"

if not exist "%NODE_EXE%" (
  echo Node.js not found at:
  echo %NODE_EXE%
  echo.
  echo Please reinstall Node.js or update this file.
  pause
  exit /b 1
)

cd /d "%APP_DIR%"
echo Starting Busan Trip Planner...
echo Open http://localhost:3000 after the server starts.
echo.
"%NODE_EXE%" "%APP_DIR%server.js"

endlocal
