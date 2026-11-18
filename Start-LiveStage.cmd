@echo off
setlocal
cd /d "%~dp0"
where node.exe >nul 2>nul
if errorlevel 1 (
  echo Node.js is required to start this project.
  pause
  exit /b 1
)
node.exe "%~dp0tools\launch.cjs"
if errorlevel 1 pause
