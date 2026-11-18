@echo off
setlocal
cd /d "%~dp0"
set "npm_config_cache=%~dp0.cache\npm"
set "ELECTRON_CACHE=%~dp0.cache\electron"
set "TEMP=%~dp0.cache\temp"
set "TMP=%TEMP%"
if not exist "%TEMP%" mkdir "%TEMP%"
call npm.cmd ci --no-audit --no-fund
if errorlevel 1 exit /b 1
call npm.cmd ci --prefix src --no-audit --no-fund
if errorlevel 1 exit /b 1
node node_modules\electron\install.js
if errorlevel 1 exit /b 1
pause
