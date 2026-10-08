@echo off
rem Carry https://wardogs.dudgy.net/ to serve.py over the Cloudflare tunnel
rem `wardogs` (README, "Serving"). Run at boot by the \WardogsTunnel task; see
rem tools\install-boot-tasks.ps1.
setlocal
cd /d "%~dp0.." || exit /b 1
"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --config "C:\Users\jayvi\.cloudflared\wardogs-config.yml" --no-autoupdate run >> tunnel.log 2>&1
exit /b %errorlevel%
