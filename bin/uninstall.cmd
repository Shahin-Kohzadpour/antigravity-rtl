@echo off
setlocal
chcp 65001 >nul
title Antigravity RTL Support Uninstaller
cls
echo ================================================================
echo    Antigravity 2.0 - Revert RTL Support to Factory State
echo ================================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is required but was not found in your PATH.
    pause
    exit /b 1
)

echo [1/2] Restoring original unpatched app.asar from backup...
node "%~dp0..\src\patch-asar.mjs" revert

echo.
echo [2/2] Removing Windows startup background watcher...
set "VBS_TARGET=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Antigravity-RTL-AutoCheck.vbs"
if exist "%VBS_TARGET%" (
    del "%VBS_TARGET%"
    echo [OK] Removed %VBS_TARGET%
)

echo.
echo ================================================================
echo  [SUCCESS] Antigravity has been restored to factory unpatched state.
echo ================================================================
echo.
pause
