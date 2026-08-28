@echo off
REM ============================================================
REM  VENUS - Instalar Node.js
REM
REM  Node.js es el motor sobre el que corre el sistema. Es lo unico
REM  que hay que instalar aparte. Este archivo lo baja de la pagina
REM  oficial y lo instala sin preguntar nada.
REM
REM  NECESITA ADMINISTRADOR: se pide solo, con el aviso de Windows.
REM  NECESITA INTERNET: son unos 30 MB.
REM ============================================================
setlocal enabledelayedexpansion
title Venus - Instalar Node.js

REM --- Permisos -------------------------------------------------
net session >nul 2>nul
if not errorlevel 1 goto :consermisos

echo.
echo   Para instalar Node.js hacen falta permisos de administrador.
echo   Windows va a preguntar: dale que SI.
echo.
powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
exit /b

:consermisos
cd /d "%~dp0"

echo.
echo   ============================================
echo      VENUS - Instalar Node.js
echo   ============================================
echo.

REM --- Ya esta? -------------------------------------------------
where node >nul 2>nul
if errorlevel 1 goto :instalar

for /f %%a in ('node -p "process.versions.node" 2^>nul') do set "NODEV=%%a"
for /f "tokens=1 delims=." %%a in ("!NODEV!") do set "NODEMAYOR=%%a"
if !NODEMAYOR! GEQ 20 (
  echo   Node.js !NODEV! ya esta instalado y sirve.
  echo   No hay nada que hacer aqui.
  echo.
  pause
  exit /b 0
)
echo   Hay Node.js !NODEV!, que es muy vieja. La voy a actualizar.
echo.

:instalar

REM --- 32 bits no se puede -------------------------------------
if /i "%PROCESSOR_ARCHITECTURE%"=="x86" (
  echo   [alto] Esta computadora es de 32 bits.
  echo.
  echo   Node.js ya no se hace para 32 bits. El sistema necesita
  echo   una computadora con Windows de 64 bits.
  echo.
  pause
  exit /b 1
)

set "ARQ=x64"
if /i "%PROCESSOR_ARCHITECTURE%"=="ARM64" set "ARQ=arm64"

REM Version fija a proposito: es exactamente la que se probo con el
REM sistema. Con otra puede que la base de datos no compile igual.
set "VERSION=v24.19.0"
set "ARCHIVO=node-!VERSION!-!ARQ!.msi"
set "URL=https://nodejs.org/dist/!VERSION!/!ARCHIVO!"
set "DESTINO=%TEMP%\!ARCHIVO!"

echo   Bajando Node.js !VERSION! (!ARQ!)...
echo   Son unos 30 MB. Aguanta.
echo.

REM Tls12 a la fuerza: Windows 10 sin actualizar sale con TLS 1.0 y
REM nodejs.org lo rechaza, con un error que no dice nada util.
powershell -NoProfile -Command "$ProgressPreference='SilentlyContinue'; [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; try { Invoke-WebRequest -Uri '!URL!' -OutFile '!DESTINO!' -UseBasicParsing; exit 0 } catch { Write-Host $_.Exception.Message; exit 1 }"

if errorlevel 1 goto :nosepudobajar
if not exist "!DESTINO!" goto :nosepudobajar

echo   Ya lo baje. Instalando...
echo   (la pantalla se puede quedar quieta un minuto: es normal)
echo.

msiexec /i "!DESTINO!" /qn /norestart
if errorlevel 1 (
  echo.
  echo   [alto] El instalador de Node.js fallo.
  echo.
  echo   Prueba a mano: abre el archivo
  echo     !DESTINO!
  echo   y sigue el instalador dandole siguiente a todo.
  echo.
  pause
  exit /b 1
)

REM El PATH de esta ventana es el de antes de instalar, asi que aqui
REM  node  todavia no se ve. Se busca donde el instalador lo deja.
set "NODEEXE=%ProgramFiles%\nodejs\node.exe"
if not exist "!NODEEXE!" set "NODEEXE=%ProgramFiles(x86)%\nodejs\node.exe"

if not exist "!NODEEXE!" (
  echo.
  echo   [aviso] Se instalo, pero no encuentro node.exe donde suele
  echo   quedar. Cierra esta ventana, abre una nueva y escribe:
  echo       node -v
  echo   Si contesta con un numero, quedo bien.
  echo.
  pause
  exit /b 0
)

for /f %%a in ('"!NODEEXE!" -p "process.versions.node"') do set "PUESTA=%%a"

del "!DESTINO!" >nul 2>nul

echo.
echo   ============================================
echo      LISTO. Node.js !PUESTA! quedo instalado.
echo   ============================================
echo.
echo   IMPORTANTE: cierra TODAS las ventanas negras que tengas
echo   abiertas antes de seguir. Las que ya estaban no se enteran
echo   de que Node existe hasta que se vuelven a abrir.
echo.
echo   Lo que sigue:  ..\INSTALAR.bat
echo.
pause
exit /b 0

:nosepudobajar
echo.
echo   [alto] No se pudo bajar Node.js.
echo.
echo   Revisa que la computadora tenga internet. Si la red del
echo   negocio bloquea descargas, comparte datos del celular un
echo   rato y vuelve a correr este archivo.
echo.
echo   A mano tambien se puede: entra a  https://nodejs.org
echo   baja la version LTS e instalala dandole siguiente a todo.
echo.
pause
exit /b 1
