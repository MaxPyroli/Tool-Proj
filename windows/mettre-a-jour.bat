@echo off
REM Tool Proj : met a jour l'app depuis GitHub puis l'ouvre sur ce PC.
REM Double-clique sur ce fichier (garde mettre-a-jour.ps1 a cote).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0mettre-a-jour.ps1"
echo.
pause
