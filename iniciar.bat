@echo off
start "Servidor Curso ML" cmd /c "cd /d %~dp0 && node server.js"
echo Servidor iniciado! Abra http://localhost:3000 no navegador
pause