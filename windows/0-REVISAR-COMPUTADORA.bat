@echo off
REM ============================================================
REM  VENUS - Revisar la computadora
REM
REM  Lo PRIMERO que se corre al llegar. No cambia nada: solo mira
REM  y dice si esta computadora aguanta el sistema. Tarda segundos
REM  y evita descubrir a media instalacion que algo no se puede.
REM
REM  No necesita administrador.
REM ============================================================
setlocal enabledelayedexpansion
title Venus - Revisar la computadora
color 07

echo.
echo   ============================================
echo      VENUS - Revisar la computadora
echo   ============================================
echo.

set "PROBLEMAS=0"

REM --- Windows -------------------------------------------------
REM Se pregunta por PowerShell y no con wmic: wmic ya esta descontinuado
REM y en algunas computadoras ya no viene. PowerShell siempre esta.
for /f "delims=" %%a in ('powershell -NoProfile -Command "(Get-CimInstance Win32_OperatingSystem).Caption" 2^>nul') do set "WIN=%%a"
for /f "delims=" %%a in ('powershell -NoProfile -Command "(Get-CimInstance Win32_OperatingSystem).Version" 2^>nul') do set "WINVER=%%a"
echo   Windows:      !WIN!
echo   Version:      !WINVER!

REM --- Arquitectura: lo unico que puede ser un NO rotundo -------
echo   Procesador:   %PROCESSOR_ARCHITECTURE%
if /i "%PROCESSOR_ARCHITECTURE%"=="x86" (
  echo.
  echo   [ALTO] Esta computadora es de 32 bits.
  echo.
  echo   Node.js ya no se hace para 32 bits, asi que el sistema
  echo   NO se puede instalar aqui. Hace falta una computadora
  echo   con Windows de 64 bits.
  echo.
  set "PROBLEMAS=1"
)

REM --- Memoria y disco ------------------------------------------
for /f "delims=" %%a in ('powershell -NoProfile -Command "[math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory/1GB)" 2^>nul') do set "RAMGB=%%a"
if defined RAMGB (
  echo   Memoria:      !RAMGB! GB
  if !RAMGB! LSS 4 echo                 [aviso] Con menos de 4 GB el sistema va a ir lento.
)

for /f "delims=" %%a in ('powershell -NoProfile -Command "[math]::Round((Get-PSDrive %SystemDrive:~0,1%).Free/1GB)" 2^>nul') do set "LIBREGB=%%a"
if defined LIBREGB (
  echo   Disco libre:  !LIBREGB! GB
  if !LIBREGB! LSS 3 echo                 [aviso] El sistema ocupa como 1 GB. Va muy justo.
)
echo.

REM --- Lo que hace falta tener ----------------------------------
where git >nul 2>nul
if errorlevel 1 (
  echo   Git:          NO esta instalado
  echo                 Hace falta para bajar el sistema.
  echo                 Se baja de  https://git-scm.com
  set "PROBLEMAS=1"
) else (
  for /f "tokens=3" %%a in ('git --version 2^>nul') do echo   Git:          %%a
)

where node >nul 2>nul
if errorlevel 1 (
  echo   Node.js:      NO esta instalado
  echo                 Corre  1-INSTALAR-NODE.bat  y lo pone solo.
) else (
  for /f %%a in ('node -p "process.versions.node" 2^>nul') do set "NODEV=%%a"
  for /f "tokens=1 delims=." %%a in ("!NODEV!") do set "NODEMAYOR=%%a"
  if !NODEMAYOR! LSS 20 (
    echo   Node.js:      !NODEV!  [aviso] muy vieja, hay que actualizarla
    set "PROBLEMAS=1"
  ) else (
    echo   Node.js:      !NODEV!  correcta
  )
)
echo.

REM --- Red -------------------------------------------------------
echo   Direcciones de esta computadora en la red:
set "HAYIP=0"
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
  set "IP=%%a"
  set "IP=!IP: =!"
  echo !IP! | findstr /r /c:"^192\.168\." /c:"^10\." /c:"^172\.1[6-9]\." /c:"^172\.2[0-9]\." /c:"^172\.3[0-1]\." >nul
  if not errorlevel 1 (
    echo                 !IP!
    set "HAYIP=1"
  )
)
if "!HAYIP!"=="0" (
  echo                 [aviso] No encontre una direccion de red local.
  echo                 Sin eso, los celulares no van a poder entrar.
)

ping -n 1 -w 2000 nodejs.org >nul 2>nul
if errorlevel 1 (
  echo   Internet:     NO responde
  echo                 Hace falta para el  git clone  y para bajar Node.
) else (
  echo   Internet:     si hay
)
echo.

REM --- Que sigue -------------------------------------------------
echo   ============================================
if "!PROBLEMAS!"=="1" (
  echo      HAY QUE RESOLVER LO DE ARRIBA PRIMERO
  echo   ============================================
) else (
  echo      Esta computadora aguanta el sistema.
  echo   ============================================
  echo.
  echo   El orden es:
  echo     1-INSTALAR-NODE.bat        si Node no esta
  echo     ..\INSTALAR.bat            instala el sistema
  echo     ..\INICIAR.bat             lo enciende
  echo     2-SIEMPRE-ENCENDIDA.bat    que no se duerma
  echo     3-SSH-Y-FIREWALL.bat       acceso remoto
  echo     4-ARRANCAR-CON-WINDOWS.bat que arranque solo
)
echo.
pause
