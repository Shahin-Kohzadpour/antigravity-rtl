@echo off
setlocal
chcp 65001 >nul
title Antigravity RTL Support Installer
cls
echo ================================================================
echo    Antigravity 2.0 - Smart Auto-Bidi RTL Installer (v1.5.0)
echo ================================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is required but was not found in your PATH.
    echo Please install Node.js (https://nodejs.org) and try again.
    echo.
    pause
    exit /b 1
)

echo [1/3] Syncing scripts and patching Antigravity app.asar...
node "%~dp0..\src\patch-asar.mjs" apply
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to patch Antigravity. Check permissions and retry.
    echo.
    pause
    exit /b 1
)

echo.
echo [2/3] Setting up Windows startup integrity watcher...
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "VBS_TARGET=%STARTUP_DIR%\Antigravity-RTL-AutoCheck.vbs"

(
echo Set WshShell = CreateObject^("WScript.Shell"^)
echo Set fso = CreateObject^("Scripting.FileSystemObject"^)
echo userProfile = WshShell.ExpandEnvironmentStrings^("%%USERPROFILE%%"^)
echo patchScript = userProfile ^& "\.gemini\antigravity\rtl-support\patch-asar.mjs"
echo If fso.FileExists^(patchScript^) Then
echo     cmd = "node """ ^& patchScript ^& """ apply"
echo     WshShell.Run cmd, 0, False
echo End If
) > "%VBS_TARGET%"

echo [OK] Startup watcher registered.

echo.
echo [3/3] Verifying installation status:
node "%~dp0..\src\patch-asar.mjs" status

echo.
echo ================================================================
echo  [SUCCESS] RTL support is installed and active!
echo  If Antigravity was open, changes applied live.
echo ================================================================
echo.
pause
