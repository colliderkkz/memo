@echo off
cd /d "%~dp0"
title my-memos

rem 已在运行则直接打开浏览器
netstat -ano | findstr ":5173" | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo [my-memos] 服务已在运行，直接打开浏览器。
    start "" "http://localhost:5173"
    exit /b 0
)

echo [my-memos] 正在启动服务，就绪后会自动打开浏览器（首次启动约需半分钟）...
echo [my-memos] 使用期间请保持本窗口开着；关闭窗口或按 Ctrl+C 即停止服务。
echo.

rem 后台轮询端口，就绪后自动打开浏览器（最多等 3 分钟）
start "" /min powershell -NoProfile -WindowStyle Hidden -Command "$ok=$false; foreach($i in 1..90){ if(Test-NetConnection localhost -Port 5173 -InformationLevel Quiet -WarningAction SilentlyContinue){ $ok=$true; break }; Start-Sleep -Seconds 2 }; if($ok){ Start-Process 'http://localhost:5173' }"

corepack pnpm dev
