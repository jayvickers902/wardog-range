@echo off
rem Serve the page on its registered port -- serve.py's default, owned by
rem C:\projects\homepanel\ports.toml. Run at boot by the \WardogRange task;
rem see tools\install-boot-tasks.ps1.
setlocal
cd /d "%~dp0.." || exit /b 1
"C:\Python314\python.exe" -u serve.py >> serve.out.log 2>> serve.err.log
exit /b %errorlevel%
