@echo off
REM ============================================================
REM  VENUS - Sistema de bodega
REM  Doble clic en este archivo para encender el sistema.
REM ============================================================
title Venus Bodega - NO CERRAR ESTA VENTANA
cd /d "%~dp0"

echo.
echo   ==========================================
echo      VENUS - Sistema de bodega
echo   ==========================================
echo.

REM --- Revisa que Node este instalado -------------------------
where node >nul 2>nul
if errorlevel 1 (
  echo   [!] Falta instalar Node.js en esta computadora.
  echo.
  echo   Descargalo gratis de:  https://nodejs.org
  echo   Elige la version "LTS", instala y vuelve a abrir este archivo.
  echo.
  pause
  exit /b 1
)

REM --- Primera vez: instala lo que necesita -------------------
if not exist "node_modules" (
  echo   Preparando el sistema por primera vez.
  echo   Esto tarda unos minutos, solo pasa una vez...
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo   [!] No se pudo preparar. Revisa que haya internet e intenta de nuevo.
    pause
    exit /b 1
  )
)

REM --- Compila si hace falta ----------------------------------
if not exist ".next\BUILD_ID" (
  echo   Terminando de preparar...
  echo.
  call npm run build
  if errorlevel 1 (
    echo.
    echo   [!] No se pudo preparar el sistema.
    pause
    exit /b 1
  )
)

REM --- Muestra la direccion para los celulares ----------------
echo.
echo   El sistema esta encendido.
echo.
echo   En esta computadora:   http://localhost:3000
echo.
echo   Desde un celular conectado al mismo WiFi, usa alguna
echo   de estas direcciones (agregale  :3000  al final):
echo.
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do echo       %%a:3000
echo.
echo   ------------------------------------------------
echo    NO CIERRES ESTA VENTANA mientras uses el sistema.
echo    Para apagarlo, cierra esta ventana.
echo   ------------------------------------------------
echo.

REM --- Abre el navegador y arranca ----------------------------
start "" http://localhost:3000
call npm start

echo.
echo   El sistema se detuvo.
pause
