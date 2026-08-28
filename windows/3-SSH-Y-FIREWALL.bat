@echo off
REM ============================================================
REM  VENUS - Acceso remoto (SSH) y firewall
REM
REM  Deja SSH prendido para poder entrar a esta computadora desde
REM  fuera sin ir a la bodega, y abre la red para que los celulares
REM  y la caja alcancen el sistema.
REM
REM  OJO CON EL FIREWALL: este archivo lo APAGA, como se pidio. Eso
REM  deja la computadora abierta a toda la red local. Antes de
REM  apagarlo se crean las reglas de los puertos que de verdad se
REM  usan, para que el dia que se quiera volver a prender el
REM  firewall, todo siga funcionando igual. Para prenderlo:
REM      netsh advfirewall set allprofiles state on
REM
REM  NECESITA ADMINISTRADOR: se pide solo.
REM  NECESITA INTERNET: SSH se baja de Windows Update.
REM ============================================================
setlocal enabledelayedexpansion
title Venus - SSH y firewall

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
echo      VENUS - SSH y firewall
echo   ============================================
echo.

REM --- 1. Reglas de los puertos que se usan ---------------------
REM Se crean SIEMPRE, aunque abajo se apague el firewall. Asi el
REM dia que alguien lo vuelva a prender, el sistema sigue entrando.
echo   Paso 1 de 4: abriendo los puertos del sistema...

netsh advfirewall firewall delete rule name="Venus - Sistema de bodega" >nul 2>nul
netsh advfirewall firewall add rule name="Venus - Sistema de bodega" dir=in action=allow protocol=TCP localport=3000 profile=any >nul 2>nul
if errorlevel 1 (echo   [aviso] No pude crear la regla del puerto 3000.) else (echo   Puerto 3000 abierto  - el sistema de bodega)

netsh advfirewall firewall delete rule name="Venus - Caja de la tienda" >nul 2>nul
netsh advfirewall firewall add rule name="Venus - Caja de la tienda" dir=in action=allow protocol=TCP localport=3001 profile=any >nul 2>nul
if errorlevel 1 (echo   [aviso] No pude crear la regla del puerto 3001.) else (echo   Puerto 3001 abierto  - la caja de la tienda)

netsh advfirewall firewall delete rule name="Venus - SSH" >nul 2>nul
netsh advfirewall firewall add rule name="Venus - SSH" dir=in action=allow protocol=TCP localport=22 profile=any >nul 2>nul
if errorlevel 1 (echo   [aviso] No pude crear la regla del puerto 22.) else (echo   Puerto 22 abierto    - SSH)
echo.

REM --- 2. Instalar SSH -------------------------------------------
echo   Paso 2 de 4: revisando el servidor SSH...

sc query sshd >nul 2>nul
if not errorlevel 1 (
  echo   Ya estaba instalado.
  goto :prenderssh
)

echo   No esta. Lo bajo de Windows Update, tarda un poco...
powershell -NoProfile -Command "$ErrorActionPreference='Stop'; try { $c = Get-WindowsCapability -Online -Name 'OpenSSH.Server*' | Select-Object -First 1; if ($c.State -eq 'Installed') { exit 0 }; Add-WindowsCapability -Online -Name $c.Name | Out-Null; exit 0 } catch { Write-Host $_.Exception.Message; exit 1 }"

if errorlevel 1 (
  echo.
  echo   [aviso] No se pudo instalar SSH desde Windows Update.
  echo.
  echo   Suele pasar cuando la red bloquea Windows Update o
  echo   cuando el Windows esta muy desactualizado.
  echo.
  echo   Se puede a mano: Configuracion ^> Aplicaciones ^>
  echo   Caracteristicas opcionales ^> Agregar caracteristica ^>
  echo   "Servidor de OpenSSH".
  echo.
  echo   Lo demas de este archivo si quedo hecho.
  echo.
  goto :firewall
)
echo   Instalado.

:prenderssh

REM --- 3. Prender SSH y dejarlo automatico ----------------------
echo.
echo   Paso 3 de 4: prendiendo SSH...

sc config sshd start= auto >nul 2>nul
net start sshd >nul 2>nul

sc query sshd | findstr /c:"RUNNING" >nul 2>nul
if errorlevel 1 (
  echo   [aviso] SSH no arranco. Revisalo con:  sc query sshd
) else (
  echo   SSH prendido, y arranca solo cuando prende la computadora.
)

REM Que la sesion remota abra en PowerShell y no en cmd: es lo que
REM espera cualquiera que entre por SSH a un Windows.
powershell -NoProfile -Command "New-Item -Path 'HKLM:\SOFTWARE\OpenSSH' -Force | Out-Null; New-ItemProperty -Path 'HKLM:\SOFTWARE\OpenSSH' -Name DefaultShell -Value 'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe' -PropertyType String -Force | Out-Null" >nul 2>nul

:firewall

REM --- 4. Apagar el firewall -------------------------------------
echo.
echo   Paso 4 de 4: apagando el firewall...
netsh advfirewall set allprofiles state off >nul 2>nul
if errorlevel 1 (
  echo   [aviso] No se pudo apagar. Puede estar controlado por el
  echo   antivirus o por una politica de la empresa.
) else (
  echo   Firewall apagado en los tres perfiles.
)

echo.
echo   ============================================
echo      Listo. Asi quedo:
echo   ============================================
echo.

echo   Para entrar por SSH desde otra computadora:
set "HAYIP=0"
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
  set "IP=%%a"
  set "IP=!IP: =!"
  echo !IP! | findstr /r /c:"^192\.168\." /c:"^10\." /c:"^172\.1[6-9]\." /c:"^172\.2[0-9]\." /c:"^172\.3[0-1]\." >nul
  if not errorlevel 1 (
    echo       ssh !USERNAME!@!IP!
    set "HAYIP=1"
  )
)
if "!HAYIP!"=="0" echo       [aviso] No encontre la direccion de red local.

echo.
echo   Eso funciona desde la misma red. Desde fuera de la bodega
echo   hace falta el tunel, que es otro tema.
echo.
echo   ------------------------------------------------
echo    El firewall quedo APAGADO, como se pidio. Con eso,
echo    cualquiera que se conecte al WiFi de la bodega puede
echo    tocar esta computadora. Si el WiFi lo comparten con
echo    clientes, conviene prenderlo otra vez:
echo.
echo        netsh advfirewall set allprofiles state on
echo.
echo    Las reglas del paso 1 se quedan puestas, asi que el
echo    sistema sigue funcionando igual con el firewall
echo    prendido. No se pierde nada por prenderlo.
echo   ------------------------------------------------
echo.
pause
