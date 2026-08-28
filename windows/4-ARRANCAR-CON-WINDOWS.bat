@echo off
REM ============================================================
REM  VENUS - Que el sistema arranque solo
REM
REM  Deja una tarea programada que enciende el sistema cuando
REM  prende la computadora, sin que nadie tenga que iniciar sesion
REM  ni darle doble clic a nada.
REM
REM  Es lo que convierte esta computadora en un servidor de verdad:
REM  si se va la luz y vuelve, o alguien la reinicia, el sistema
REM  regresa solo.
REM
REM  NECESITA ADMINISTRADOR: se pide solo.
REM ============================================================
setlocal enabledelayedexpansion
title Venus - Arrancar con Windows

net session >nul 2>nul
if not errorlevel 1 goto :conpermisos

echo.
echo   Esto necesita permisos de administrador.
echo   Windows va a preguntar: dale que SI.
echo.
powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
exit /b

:conpermisos
cd /d "%~dp0"

set "TAREA=Venus - Sistema de bodega"
set "ARRANCADOR=%~dp0servidor.bat"

echo.
echo   ============================================
echo      VENUS - Arrancar con Windows
echo   ============================================
echo.

REM --- Que exista lo que se va a arrancar ------------------------
if not exist "%~dp0..\.next\BUILD_ID" (
  echo   [alto] El sistema todavia no esta instalado.
  echo.
  echo   Corre primero  ..\INSTALAR.bat  y cuando termine
  echo   vuelve a abrir este archivo.
  echo.
  pause
  exit /b 1
)

REM --- Ya estaba? -------------------------------------------------
schtasks /query /tn "!TAREA!" >nul 2>nul
if errorlevel 1 goto :crear

echo   La tarea ya estaba puesta. La vuelvo a crear para que
echo   apunte a esta carpeta.
echo.
schtasks /delete /tn "!TAREA!" /f >nul 2>nul

:crear

REM /sc onstart y no onlogon: asi arranca aunque nadie inicie
REM sesion, que es justo lo que se quiere despues de un apagon.
REM /ru SYSTEM porque nadie va a estar ahi para escribir su clave.
schtasks /create /tn "!TAREA!" /tr "\"!ARRANCADOR!\"" /sc onstart /ru SYSTEM /rl highest /f >nul 2>nul

if errorlevel 1 (
  echo   [alto] No se pudo crear la tarea.
  echo.
  echo   Puede ser una politica de la empresa. Como plan B, se
  echo   puede dejar un acceso directo de INICIAR.bat en la
  echo   carpeta de Inicio de Windows, pero entonces solo
  echo   arranca cuando alguien inicia sesion.
  echo.
  pause
  exit /b 1
)

echo   Tarea creada.
echo.

REM --- Probarla de una vez ---------------------------------------
REM Mejor descubrir aqui que no arranca, y no dentro de un mes
REM despues de un apagon, con la tienda esperando.
echo   La pruebo ahora mismo para no llevarnos sorpresas...

netstat -ano | findstr /r /c:"LISTENING" | findstr /c:":3000 " >nul 2>nul
if not errorlevel 1 (
  echo   El sistema ya esta encendido, asi que la prueba se salta.
  echo   La tarea quedo puesta igual.
  goto :final
)

schtasks /run /tn "!TAREA!" >nul 2>nul

set "INTENTOS=0"
:esperar
set /a INTENTOS+=1
powershell -NoProfile -Command "try { (New-Object Net.WebClient).DownloadString('http://127.0.0.1:3000/') | Out-Null; exit 0 } catch { exit 1 }" >nul 2>nul
if not errorlevel 1 goto :arranco
if !INTENTOS! GEQ 30 goto :noarranco
powershell -NoProfile -Command "Start-Sleep -Milliseconds 1000" >nul 2>nul
goto :esperar

:arranco
echo   Arranco bien. El sistema ya esta corriendo.
goto :final

:noarranco
echo.
echo   [aviso] La tarea se creo, pero el sistema no contesto
echo   en 30 segundos. Revisa que dice la bitacora:
echo       ..\data\servidor.log
echo.

:final
echo.
echo   ============================================
echo      Listo.
echo   ============================================
echo.
echo   De ahora en adelante el sistema arranca solo cuando
echo   prende la computadora. Nadie tiene que iniciar sesion.
echo.
echo   Sigue sirviendo INICIAR.bat para encenderlo a mano; si ya
echo   estaba prendido, avisa en vez de abrir otro.
echo.
echo   Para quitarlo algun dia:
echo       schtasks /delete /tn "!TAREA!" /f
echo.
echo   Para ver si esta corriendo:
echo       schtasks /query /tn "!TAREA!"
echo.
pause
