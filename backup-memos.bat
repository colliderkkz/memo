@echo off
cd /d "%~dp0"
title my-memos 备份

rem 服务在运行时备份可能拷到写入中的数据库快照，先提醒
netstat -ano | findstr ":5173" | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo [警告] 检测到 my-memos 服务可能正在运行。
    echo 建议先关闭服务窗口再备份，否则可能得到不一致的数据快照。
    choice /c YN /m "仍要现在备份吗? Y=备份, N=取消"
    if errorlevel 2 goto end
)

if not exist "apps\memos\.wrangler\state" (
    echo [错误] 找不到数据目录 apps\memos\.wrangler\state，还没有任何数据？
    goto end
)

for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set STAMP=%%i
if not exist backups mkdir backups
set ZIP=backups\memos-backup-%STAMP%.zip

echo [my-memos] 正在备份数据到 %ZIP% ...
powershell -NoProfile -Command "Compress-Archive -Path 'apps\memos\.wrangler\state\*' -DestinationPath '%ZIP%' -Force"
if errorlevel 1 (
    echo [错误] 备份失败！
    goto end
)
echo [my-memos] 备份完成：%ZIP%
echo [my-memos] 恢复方法：停掉服务后，把 zip 里的内容解压覆盖回 apps\memos\.wrangler\state\ 即可。

:end
echo.
pause
