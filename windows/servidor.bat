@echo off
REM ============================================================
REM  VENUS - Arranque silencioso del servidor
REM
REM  Esto NO se abre a mano: lo llama la tarea programada que crea
REM  4-ARRANCAR-CON-WINDOWS.bat, cuando prende la computadora.
REM
REM  Para usarlo a mano esta INICIAR.bat, que ademas avisa la
REM  direccion y abre el navegador. Este es para que arranque solo,
REM  sin ventanas y sin que nadie tenga que iniciar sesion.
REM ============================================================
setlocal enabledelayedexpansion
cd /d "%~dp0.."

REM La tarea corre como SYSTEM, que no tiene el mismo PATH que una
REM persona. Por eso node se busca a mano en vez de confiar en el.
set "NODEEXE="
for /f "delims=" %%a in ('where node 2^>nul') do if not defined NODEEXE set "NODEEXE=%%a"
if not defined NODEEXE if exist "%ProgramFiles%\nodejs\node.exe" set "NODEEXE=%ProgramFiles%\nodejs\node.exe"
if not defined NODEEXE if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "NODEEXE=%ProgramFiles(x86)%\nodejs\node.exe"

if not exist "data" mkdir "data" >nul 2>nul
set "BITACORA=data\servidor.log"

if not defined NODEEXE (
  echo [%date% %time%] No encontre node.exe. El sistema no arranco.>> "!BITACORA!"
  exit /b 1
)

REM Se llama a next directo y no a npm: npm como SYSTEM a veces no
REM encuentra su propia carpeta de configuracion y falla sin decir
REM por que. Asi hay una cosa menos que se pueda romper de noche.
echo [%date% %time%] Arrancando el sistema...>> "!BITACORA!"
"!NODEEXE!" "node_modules\next\dist\bin\next" start -H 0.0.0.0 -p 3000 >> "!BITACORA!" 2>&1

echo [%date% %time%] El sistema se detuvo (codigo !errorlevel!).>> "!BITACORA!"
exit /b !errorlevel!
