@echo off
REM ============================================================
REM  VENUS BODEGA - Actualizar el sistema
REM
REM  Baja la ultima version de GitHub y la deja funcionando. Sirve
REM  igual desde la bodega que por SSH desde otro lado.
REM
REM  Lo primero que hace es un respaldo de la base. El inventario
REM  del cliente no se toca nunca, pero si algo sale mal a media
REM  actualizacion, mejor tener de donde volver.
REM ============================================================
setlocal enabledelayedexpansion
title Venus Bodega - Actualizar
cd /d "%~dp0"

echo.
echo   ============================================
echo      VENUS BODEGA - Actualizar
echo   ============================================
echo.

REM --- 1. Respaldo ----------------------------------------------
echo   Paso 1 de 5: guardando un respaldo por si acaso...

if not exist "respaldos" mkdir "respaldos" >nul 2>nul

REM La base NO siempre esta en data\venus.db: cuando la caja de la
REM tienda esta instalada, las dos comparten un solo archivo y la
REM ruta buena viene en .env.local. Buscarla solo aqui hacia que el
REM respaldo se saltara en silencio, que es la peor forma de fallar:
REM la red de seguridad no estaba y nadie se enteraba.
set "RUTADB=data\venus.db"
if exist ".env.local" (
  for /f "usebackq eol=# tokens=1,* delims==" %%a in (".env.local") do (
    if /i "%%a"=="VENUS_DB" set "RUTADB=%%b"
  )
)
REM En .env.local va con diagonales normales; aqui se ocupan las de Windows.
set "RUTADB=!RUTADB:/=\!"

if not exist "!RUTADB!" (
  echo   [aviso] No encontre la base en:
  echo      !RUTADB!
  echo   Se actualiza igual, pero SIN respaldo previo.
  echo.
  goto :detener
)

echo   Base encontrada en: !RUTADB!

REM La fecha se saca con PowerShell y no con %date%, que cambia de
REM formato segun como este configurado Windows y termina haciendo
REM nombres de archivo con diagonales adentro.
REM Con segundos, no solo minutos: dos intentos seguidos caian en el
REM mismo nombre, VACUUM se negaba a escribir encima y el respaldo
REM terminaba saliendo por el camino malo.
for /f "delims=" %%a in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HHmmss"') do set "CUANDO=%%a"

REM VACUUM INTO y no copiar el archivo: con el modo WAL la base vive
REM en dos partes, y copiar solo el .db deja fuera lo ultimo escrito.
set "ORIGEN=!RUTADB:\=/!"
set "DESTINO=respaldos\venus-!CUANDO!.db"
if exist "!DESTINO!" del /q "!DESTINO!" >nul 2>nul

node -e "const D=require('better-sqlite3');const d=new D(process.argv[1],{readonly:true});d.exec(`VACUUM INTO '`+process.argv[2]+`'`);d.close();" "!ORIGEN!" "respaldos/venus-!CUANDO!.db" 2>nul

if not exist "!DESTINO!" (
  REM Copiar solo el .db daria un respaldo incompleto que PARECE
  REM bueno: pesa menos y le falta lo ultimo que se escribio. Eso es
  REM peor que no tener respaldo, porque nadie lo revisa hasta el dia
  REM que hace falta. Se copian las tres partes juntas, que si sirven.
  echo   [aviso] No se pudo compactar el respaldo. Copio la base entera.
  copy /y "!RUTADB!" "!DESTINO!" >nul 2>nul
  if exist "!RUTADB!-wal" copy /y "!RUTADB!-wal" "!DESTINO!-wal" >nul 2>nul
  if exist "!RUTADB!-shm" copy /y "!RUTADB!-shm" "!DESTINO!-shm" >nul 2>nul
  echo   Se copiaron las tres partes: sin el -wal el respaldo no sirve.
)

if exist "!DESTINO!" (
  echo   Respaldo en:  !DESTINO!
) else (
  echo   [alto] No se pudo respaldar. NO se actualiza a ciegas.
  echo   Revisa que la base este donde dice arriba y vuelve a intentar.
  pause
  exit /b 1
)
echo.

:detener

REM --- 2. Apagar el sistema --------------------------------------
echo   Paso 2 de 5: apagando el sistema un momento...

set "HABIATAREA=0"
schtasks /query /tn "Venus - Sistema de bodega" >nul 2>nul
if not errorlevel 1 (
  set "HABIATAREA=1"
  schtasks /end /tn "Venus - Sistema de bodega" >nul 2>nul
)

REM Se mata node por el puerto y no todos los node de la maquina:
REM en la misma computadora puede estar corriendo la caja.
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:"LISTENING" ^| findstr /c:":3000 "') do (
  taskkill /f /pid %%p >nul 2>nul
)
echo   Apagado.
echo.

REM --- 3. Bajar los cambios --------------------------------------
echo   Paso 3 de 5: bajando la ultima version...
echo.

REM npm reescribe package-lock.json por su cuenta al instalar: cambia
REM marcas internas segun su version. Ese archivo lo genera la
REM herramienta, no lo escribe nadie a mano, asi que se descarta lo
REM local antes de bajar. Sin esto, git se niega a actualizar porque ve
REM un cambio sin guardar, y el despliegue se atora para siempre por un
REM archivo que a nadie le importa.
git checkout -- package-lock.json >nul 2>nul

git pull --ff-only
if errorlevel 1 (
  echo.
  echo   [alto] No se pudo bajar la nueva version.
  echo.
  echo   Si dice algo de "local changes", es que alguien edito
  echo   archivos aqui. Se arregla con:
  echo       git stash
  echo       git pull
  echo.
  echo   El sistema viejo sigue estando: vuelve a prenderlo con
  echo   INICIAR.bat mientras se resuelve.
  echo.
  pause
  exit /b 1
)
echo.

REM --- 4. Preparar -----------------------------------------------
echo   Paso 4 de 5: preparando la nueva version...
echo.

call npm install --no-audit --no-fund
if errorlevel 1 (
  echo   [alto] Fallo la descarga de lo que necesita.
  pause
  exit /b 1
)

call npm run build
if errorlevel 1 (
  echo.
  echo   [alto] La nueva version no compila.
  echo   Toma una foto de esta ventana y mandala.
  echo.
  echo   El inventario NO se toco: sigue completo.
  echo.
  pause
  exit /b 1
)
echo.

REM --- 5. Prender otra vez ---------------------------------------
echo   Paso 5 de 5: prendiendo el sistema...

if "!HABIATAREA!"=="1" (
  schtasks /run /tn "Venus - Sistema de bodega" >nul 2>nul
  echo   Arrancado por la tarea programada.
) else (
  start "Venus" /min cmd /c "%~dp0INICIAR.bat"
  echo   Arrancado con INICIAR.bat.
)

set "INTENTOS=0"
:esperar
set /a INTENTOS+=1
powershell -NoProfile -Command "try { (New-Object Net.WebClient).DownloadString('http://127.0.0.1:3000/') | Out-Null; exit 0 } catch { exit 1 }" >nul 2>nul
if not errorlevel 1 goto :listo
if !INTENTOS! GEQ 40 goto :nocontesta
powershell -NoProfile -Command "Start-Sleep -Milliseconds 1000" >nul 2>nul
goto :esperar

:listo
echo.
echo   ============================================
echo      LISTO. El sistema quedo actualizado.
echo   ============================================
echo.
echo   Ya esta contestando otra vez.
echo.
pause
exit /b 0

:nocontesta
echo.
echo   [aviso] Se actualizo, pero el sistema no contesto en 40
echo   segundos. Revisa la bitacora:
echo       data\servidor.log
echo.
echo   O prendelo a mano con INICIAR.bat.
echo.
pause
exit /b 1
