@echo off
REM ============================================================
REM  Espera a que el sistema responda y abre el navegador.
REM
REM  Va en un archivo aparte a proposito: meter esta espera dentro
REM  de INICIAR.bat obligaba a anidar comillas dentro de comillas,
REM  que en cmd.exe se rompe facil.
REM
REM  Lo arranca INICIAR.bat en segundo plano. No se corre solo.
REM ============================================================
setlocal
set "PUERTO=%~1"
if "%PUERTO%"=="" set "PUERTO=3000"
set "DIRECCION=http://localhost:%PUERTO%"

REM Hasta 40 intentos de un segundo: si en 40 segundos no levanto,
REM algo se rompio y el error se ve en la ventana principal.
for /l %%i in (1,1,40) do (
  powershell -NoProfile -Command "try{ $r=[System.Net.HttpWebRequest]::Create('%DIRECCION%'); $r.Timeout=1500; $r.GetResponse().Close(); exit 0 } catch { exit 1 }" >nul 2>nul
  if not errorlevel 1 (
    start "" "%DIRECCION%"
    exit /b 0
  )
  timeout /t 1 /nobreak >nul
)

exit /b 1
