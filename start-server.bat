@echo off
echo ===========================================
echo   坦克世界大战 - 联机服务器启动器
echo ===========================================
echo.
echo 本机联机地址: http://localhost:3000
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /C:"IPv4"') do (
    echo 局域网地址:   http://%%a:3000
)
echo.
echo 如需跨网络联机（手机流量等），请使用 ngrok:
echo   1. 下载 ngrok: https://ngrok.com/download
echo   2. 运行: ngrok http 3000
echo   3. 把 ngrok 提供的 https 地址发给对方
echo.
echo ===========================================
echo.

cd /d "%~dp0"
node server/index.js
pause
