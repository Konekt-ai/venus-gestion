@echo off
REM ============================================================
REM  VENUS BODEGA - Instalacion
REM  Se corre UNA sola vez, en la computadora de la bodega.
REM  Doble clic normal: no hace falta ser administrador.
REM ============================================================
setlocal enabledelayedexpansion
title Venus Bodega - Instalacion
cd /d "%~dp0"
set "PUERTO=3000"

echo.
echo   ============================================
echo      VENUS BODEGA - Instalacion
echo   ============================================
echo.
echo   Esto se hace una sola vez y tarda unos minutos.
echo   No cierres la ventana hasta que diga que termino.
echo.

REM --- Node.js -------------------------------------------------
where node >nul 2>nul
if errorlevel 1 (
  echo   [alto] Falta instalar Node.js en esta computadora.
  echo.
  echo   Descargalo gratis de:  https://nodejs.org
  echo   Elige la version "LTS", instalala, y vuelve a abrir
  echo   este archivo.
  echo.
  pause
  exit /b 1
)

REM Node 20 o mas nuevo: abajo de eso, Next.js no arranca.
for /f "tokens=1 delims=." %%v in ('node -p "process.versions.node"') do set "NODEMAYOR=%%v"
echo   Node.js encontrado: version !NODEMAYOR!
if !NODEMAYOR! LSS 20 (
  echo.
  echo   [alto] Esta version de Node.js es muy vieja para el sistema.
  echo.
  echo   Instala la version "LTS" desde  https://nodejs.org
  echo   y vuelve a abrir este archivo.
  echo.
  pause
  exit /b 1
)
echo.

REM --- Material del cliente -------------------------------------
REM Las fotos, el logo y el catalogo NO viajan en GitHub: son del
REM cliente. Entonces un  git clone  baja el sistema vacio. Ese
REM material se trae aparte, en la carpeta MATERIAL-VENUS que arma
REM  npm run material , y aqui se busca sola en los lugares donde
REM razonablemente puede estar: adentro, al lado, o en la USB.
echo   Paso 1 de 4: buscando el material del cliente...

set "MATERIAL="
if exist "MATERIAL-VENUS\src\datos\catalogo.json" set "MATERIAL=MATERIAL-VENUS"
if not defined MATERIAL if exist "..\MATERIAL-VENUS\src\datos\catalogo.json" set "MATERIAL=..\MATERIAL-VENUS"

REM En la USB: se prueba letra por letra, de la D a la K.
if not defined MATERIAL for %%U in (D E F G H I J K) do (
  if not defined MATERIAL if exist "%%U:\MATERIAL-VENUS\src\datos\catalogo.json" set "MATERIAL=%%U:\MATERIAL-VENUS"
)

if defined MATERIAL goto :copiarmaterial
goto :revisarmaterial

:copiarmaterial
echo   Lo encontre en  !MATERIAL!
REM /E subcarpetas, /I destino es carpeta, /Y sin preguntar, /Q callado.
xcopy "!MATERIAL!\public" "public\" /E /I /Y /Q >nul 2>nul
xcopy "!MATERIAL!\src\datos" "src\datos\" /E /I /Y /Q >nul 2>nul
echo   Fotos, logo y catalogo copiados.
echo.
goto :dependencias

:revisarmaterial
if exist "src\datos\catalogo.json" (
  echo   Ya estaba en su lugar.
  echo.
  goto :dependencias
)

echo.
echo   [aviso] No encontre el material del cliente.
echo.
echo   El sistema va a instalarse bien, pero va a arrancar SIN
echo   los modelos y SIN las fotos, porque eso no viaja en
echo   GitHub a proposito: es material del negocio.
echo.
echo   Para arreglarlo: copia la carpeta  MATERIAL-VENUS  de la
echo   USB junto a esta carpeta, y vuelve a correr este archivo.
echo.
echo   Presiona una tecla para seguir de todos modos...
pause >nul
echo.

:dependencias

REM --- Lo que necesita el sistema -------------------------------
REM Si la carpeta ya trae node_modules (paquete armado con
REM  npm run paquete  y copiado por USB), no hace falta internet.
REM Se prueba antes de confiarse: unos archivos compilados para otra
REM version de Node no sirven aqui y hay que volverlos a bajar.
set "TRAELISTO=0"
if exist "node_modules\next\package.json" (
  node -e "new (require('better-sqlite3'))(':memory:').prepare('select 1').get()" >nul 2>nul
  if not errorlevel 1 set "TRAELISTO=1"
)

REM Con etiquetas y no con if/else anidados: cmd.exe se enreda con los
REM parentesis dentro de parentesis y termina corriendo las dos ramas.
if "!TRAELISTO!"=="1" goto :yavienelisto

if exist "node_modules" (
  echo   Paso 2 de 4: lo que venia en la carpeta no sirve en esta
  echo   computadora. Bajando la version correcta...
)
if not exist "node_modules" (
  echo   Paso 2 de 4: descargando lo que necesita el sistema...
)
echo   (esto necesita internet y es lo que mas tarda)
echo.
call npm install --no-audit --no-fund
if errorlevel 1 goto :nosepudobajar
echo.
goto :probarbase

:yavienelisto
echo   Paso 2 de 4: la carpeta ya trae todo lo que necesita.
echo   No hace falta internet.
echo.
goto :probarbase

:nosepudobajar
echo.
echo   [alto] No se pudo descargar.
echo.
echo   Revisa que la computadora tenga internet y vuelve a
echo   intentar. Si la red de la empresa bloquea descargas,
echo   prueba con otra conexion o con el celular compartiendo.
echo.
pause
exit /b 1

:probarbase

REM --- Prueba del motor de la base de datos ---------------------
REM Es lo unico que se compila para esta computadora en particular.
REM Si algo falla, casi siempre falla aqui, asi que se revisa ahora
REM y no cuando el cliente lo este usando.
echo   Paso 3 de 4: probando la base de datos...
node -e "new (require('better-sqlite3'))(':memory:').prepare('select 1 as x').get()" >nul 2>nul
if errorlevel 1 (
  echo.
  echo   [alto] La base de datos no funciona en esta computadora.
  echo.
  echo   Suele ser por la version de Node.js. Prueba asi:
  echo     1. Desinstala Node.js
  echo     2. Instala la version "LTS" de  https://nodejs.org
  echo     3. Borra la carpeta  node_modules
  echo     4. Vuelve a correr este archivo
  echo.
  pause
  exit /b 1
)
echo   La base de datos responde bien.
echo.

REM --- Compilacion ----------------------------------------------
echo   Paso 4 de 4: preparando el sistema...
echo.
call npm run build
if errorlevel 1 (
  echo.
  echo   [alto] No se pudo preparar el sistema.
  echo   Toma una foto de esta ventana y mandala para revisar.
  echo.
  pause
  exit /b 1
)

echo.
echo   ============================================
echo      LISTO. El sistema quedo instalado.
echo   ============================================
echo.
echo   Para usarlo, dale doble clic a:   INICIAR.bat
echo.
echo   La primera vez que lo abras, Windows va a preguntar si
echo   permites que Node.js use la red. Hay que decir que SI
echo   (marcando "Redes privadas"), o los celulares no van a
echo   poder entrar al sistema.
echo.
pause
