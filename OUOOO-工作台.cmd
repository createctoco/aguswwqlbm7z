@echo off
setlocal
cd /d "%~dp0"
where node.exe >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Please install Node.js 22 or newer.
  pause
  exit /b 1
)
node.exe scripts\control-center.mjs --open
if errorlevel 1 pause
