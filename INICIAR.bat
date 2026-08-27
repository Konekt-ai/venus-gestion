@echo off
REM ============================================================
REM  VENUS BODEGA - Sistema de inventario
REM  Doble clic en este archivo para encender el sistema.
REM ============================================================
setlocal enabledelayedexpansion
title Venus Bodega - NO CERRAR ESTA VENTANA
cd /d "%~dp0"
set "PUERTO=3000"

echo.
echo   ==========================================
echo      VENUS - Sistema de bodega
echo   ==========================================
echo.

REM --- Node.js -------------------------------------------------
where node >nul 2>nul
if errorlevel 1 (
  echo   [alto] Falta instalar Node.js en esta computadora.
  echo.
  echo   Descargalo gratis de:  https://nodejs.org
  echo   Elige la version "LTS", instalala, y despues corre
  echo   el archivo  INSTALAR.bat
  echo.
  pause
  exit /b 1
)

REM --- Que ya se haya instalado --------------------------------
if not exist "node_modules" (
  echo   [alto] El sistema todavia no esta instalado aqui.
  echo.
  echo   Cierra esta ventana y dale doble clic a  INSTALAR.bat
  echo   Eso se hace una sola vez.
  echo.
  pause
  exit /b 1
)

if not exist ".next\BUILD_ID" (
  echo   [alto] Falta terminar de preparar el sistema.
  echo.
  echo   Cierra esta ventana y dale doble clic a  INSTALAR.bat
  echo.
  pause
  exit /b 1
)

REM --- Que el puerto este libre --------------------------------
REM Si quedo una ventana abierta de antes, el sistema no arranca y
REM el error de Next no dice nada util. Mejor avisarlo aqui.
netstat -ano | findstr /r /c:"LISTENING" | findstr /c:":%PUERTO% " >nul 2>nul
if not errorlevel 1 (
  echo   [aviso] El sistema ya parece estar encendido.
  echo.
  echo   Busca en la barra de tareas una ventana negra que diga
  echo   "Venus Bodega". Si la encuentras, usa esa.
  echo.
  echo   Si no, cierra todas las ventanas negras y vuelve a
  echo   abrir este archivo.
  echo.
  echo   Mientras tanto, abre:  http://localhost:%PUERTO%
  echo.
  pause
  start "" "http://localhost:%PUERTO%"
  exit /b 0
)

REM --- Direcciones para los celulares --------------------------
REM Solo se muestran las de red local (192.168.x, 10.x, 172.x).
REM Las de VPN o maquinas virtuales no sirven para los celulares
REM de la bodega y solo confunden.
echo   Para entrar desde un celular en el mismo WiFi:
echo.
set "HAYIP="
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
  set "IP=%%a"
  set "IP=!IP: =!"
  echo !IP! | findstr /r /c:"^192\.168\." /c:"^10\." /c:"^172\.1[6-9]\." /c:"^172\.2[0-9]\." /c:"^172\.3[0-1]\." >nul
  if not errorlevel 1 (
    echo        http://!IP!:%PUERTO%
    set "HAYIP=1"
  )
)
if not defined HAYIP (
  echo        [no encontre la red] Revisa que la computadora
  echo        este conectada al WiFi o por cable.
)
echo.
echo   En esta computadora:  http://localhost:%PUERTO%
echo.
echo   ------------------------------------------------
echo    NO CIERRES ESTA VENTANA mientras uses el sistema.
echo    Para apagarlo, cierra esta ventana.
echo   ------------------------------------------------
echo.

REM --- Arranque -------------------------------------------------
REM El navegador lo abre un archivo aparte que espera a que el
REM sistema responda. Abrirlo de inmediato mostraba "no se puede
REM conectar", porque el servidor tarda unos segundos en levantar.
start "Venus" /min "%~dp0scripts\abrir-navegador.bat" %PUERTO%

echo   Encendiendo...
echo.
call npm start

echo.
echo   El sistema se detuvo.
echo.
echo   Si no fue a proposito, toma una foto de esta ventana
echo   antes de cerrarla.
echo.
pause
