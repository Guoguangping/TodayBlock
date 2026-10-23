@echo off
setlocal
cd /d "%~dp0"
if exist ".cache\electron-dist\electron.exe" (
  start "" ".cache\electron-dist\electron.exe" "%~dp0"
  exit /b 0
)
if exist "node_modules\electron\dist\electron.exe" (
  start "" "node_modules\electron\dist\electron.exe" "%~dp0"
  exit /b 0
)
echo Electron runtime not found.
echo Download electron-v45.0.0-win32-x64.zip and extract it to .cache\electron-dist\
echo Or use the packaged release in release\win-unpacked\TodayBlock.exe
pause
exit /b 1
