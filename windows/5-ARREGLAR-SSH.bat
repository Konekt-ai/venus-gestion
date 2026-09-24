@echo off
REM ============================================================
REM  VENUS - Arreglar el acceso remoto (SSH)
REM
REM  Sirve cuando el soporte ya no puede entrar a esta computadora
REM  y al intentarlo le dice "Connection refused".
REM
REM  Eso quiere decir que el servidor SSH no esta corriendo. Suele
REM  pasar despues de reiniciar, cuando alguien lo dejo prendido a
REM  mano pero no en automatico. Este archivo lo arregla Y lo deja
REM  en automatico, para que no vuelva a pasar al siguiente
REM  reinicio.
REM
REM  NO apaga el firewall ni toca nada mas. Solo SSH.
REM
REM  NECESITA ADMINISTRADOR: se pide solo.
REM ============================================================
setlocal enabledelayedexpansion
title Venus - Arreglar el acceso remoto

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

echo.
echo   ============================================
echo      VENUS - Arreglar el acceso remoto
echo   ============================================
echo.

REM --- 1. Esta instalado? ----------------------------------------
echo   Paso 1 de 4: revisando si el servidor SSH esta instalado...

sc query sshd >nul 2>nul
if not errorlevel 1 goto :yaestainstalado

echo   No esta. Lo bajo de Windows Update, tarda un poco...
powershell -NoProfile -Command "$ErrorActionPreference='Stop'; try { $c = Get-WindowsCapability -Online -Name 'OpenSSH.Server*' | Select-Object -First 1; if ($c.State -eq 'Installed') { exit 0 }; Add-WindowsCapability -Online -Name $c.Name | Out-Null; exit 0 } catch { Write-Host $_.Exception.Message; exit 1 }"
if errorlevel 1 (
  echo.
  echo   [alto] No se pudo instalar desde Windows Update.
  echo.
  echo   Se puede a mano: Configuracion ^> Sistema ^>
  echo   Caracteristicas opcionales ^> Agregar ^>
  echo   "Servidor de OpenSSH".
  echo.
  pause
  exit /b 1
)
echo   Instalado.
goto :automatico

:yaestainstalado
echo   Ya estaba instalado.

:automatico

REM --- 2. En automatico ------------------------------------------
REM Esta es la parte que de verdad arregla el problema de fondo.
REM Arrancarlo a mano lo deja andando hasta el siguiente reinicio;
REM en automatico vuelve solo cuando prende la computadora.
echo.
echo   Paso 2 de 4: dejandolo en automatico...
sc config sshd start= auto >nul 2>nul
if errorlevel 1 (
  echo   [aviso] No se pudo poner en automatico.
) else (
  echo   Listo: ahora arranca solo al prender la computadora.
)

REM --- 3. Prenderlo ahora ----------------------------------------
echo.
echo   Paso 3 de 4: prendiendolo...
net start sshd >nul 2>nul

sc query sshd | findstr /c:"RUNNING" >nul 2>nul
if errorlevel 1 (
  echo   [alto] No arranco. Mira que dice:
  echo.
  sc query sshd
  echo.
  pause
  exit /b 1
)
echo   Prendido.

REM --- 4. La regla del firewall ----------------------------------
REM Se crea aunque el firewall este apagado. El dia que alguien lo
REM prenda, o lo prenda Windows tras una actualizacion, el acceso
REM remoto sigue funcionando en vez de caerse sin explicacion.
echo.
echo   Paso 4 de 4: dejando abierto el puerto 22...
netsh advfirewall firewall delete rule name="Venus - SSH" >nul 2>nul
netsh advfirewall firewall add rule name="Venus - SSH" dir=in action=allow protocol=TCP localport=22 profile=any >nul 2>nul
echo   Hecho.

echo.
echo   ============================================
echo      Listo. El acceso remoto quedo arreglado.
echo   ============================================
echo.
echo   Para entrar desde otra computadora:
set "HAYIP=0"
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
  set "IP=%%a"
  set "IP=!IP: =!"
  echo !IP! | findstr /r /c:"^100\.[6-9][0-9]\." /c:"^100\.1[0-2][0-9]\." >nul
  if not errorlevel 1 (
    echo       ssh !USERNAME!@!IP!      ^(desde cualquier lado^)
    set "HAYIP=1"
  )
)
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
  set "IP=%%a"
  set "IP=!IP: =!"
  echo !IP! | findstr /r /c:"^192\.168\." /c:"^10\." >nul
  if not errorlevel 1 echo       ssh !USERNAME!@!IP!      ^(en el negocio^)
)

echo.
echo   ------------------------------------------------
echo    Ya quedo en automatico, asi que despues de un
echo    reinicio vuelve solo. Si algun dia vuelve a
echo    decir "Connection refused", es que el servicio
echo    se cayo: correr este archivo otra vez.
echo   ------------------------------------------------
echo.
pause
