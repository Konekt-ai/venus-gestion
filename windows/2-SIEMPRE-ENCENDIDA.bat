@echo off
REM ============================================================
REM  VENUS - Que la computadora nunca se apague
REM
REM  Esta computadora va a trabajar de servidor: los celulares y la
REM  caja de la tienda entran a ella. Si se duerme, se acaba el
REM  sistema para todos, sin aviso y sin error: simplemente deja de
REM  responder.
REM
REM  Aqui se apaga todo lo que la manda a dormir. La PANTALLA si se
REM  apaga a los 15 minutos, que eso no estorba y cuida el monitor.
REM
REM  NECESITA ADMINISTRADOR: se pide solo.
REM ============================================================
setlocal enabledelayedexpansion
title Venus - Que nunca se apague

net session >nul 2>nul
if not errorlevel 1 goto :conpermisos

echo.
echo   Para cambiar la energia hacen falta permisos de administrador.
echo   Windows va a preguntar: dale que SI.
echo.
powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
exit /b

:conpermisos
cd /d "%~dp0"

echo.
echo   ============================================
echo      VENUS - Que nunca se apague
echo   ============================================
echo.

REM --- Suspension ------------------------------------------------
REM El 0 quiere decir "nunca". Se pone en ac (enchufada) y en dc
REM (con bateria), por si el servidor termina siendo una laptop.
echo   Quitando la suspension...
powercfg /change standby-timeout-ac 0
powercfg /change standby-timeout-dc 0
powercfg /change hibernate-timeout-ac 0
powercfg /change hibernate-timeout-dc 0

REM --- Disco duro ------------------------------------------------
REM Si el disco se apaga, la base de datos tarda en despertar y hay
REM peticiones que se quedan colgadas.
echo   Dejando el disco siempre despierto...
powercfg /change disk-timeout-ac 0
powercfg /change disk-timeout-dc 0

REM --- Hibernacion ------------------------------------------------
REM Apagarla tambien quita el "inicio rapido" de Windows, que en vez
REM de apagar de verdad deja la maquina a medias y despierta con la
REM red en un estado raro. Ademas libera varios GB de disco.
echo   Apagando la hibernacion y el inicio rapido...
powercfg /hibernate off >nul 2>nul

REM --- Pantalla ---------------------------------------------------
REM Esta si se apaga: no afecta al servidor y alarga la vida del
REM monitor. La computadora sigue trabajando con la pantalla negra.
echo   La pantalla se apaga a los 15 minutos (la computadora no).
powercfg /change monitor-timeout-ac 15
powercfg /change monitor-timeout-dc 15

REM --- Puertos USB ------------------------------------------------
REM Sin esto Windows duerme los puertos y el lector de codigos deja
REM de responder al primer escaneo despues de un rato quieto.
echo   Evitando que se duerman los puertos USB...
powercfg /setacvalueindex SCHEME_CURRENT 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 0 >nul 2>nul
powercfg /setdcvalueindex SCHEME_CURRENT 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 0 >nul 2>nul

REM --- Tapa y boton -----------------------------------------------
REM Solo aplica si es laptop; en una de escritorio no hace nada.
REM Cerrar la tapa deja de dormirla: 0 es "no hagas nada".
echo   Si es laptop, cerrar la tapa ya no la duerme...
powercfg /setacvalueindex SCHEME_CURRENT 4f971e89-eebd-4455-a8de-9e59040e7347 5ca83367-6e45-459f-a27b-476b1d01c936 0 >nul 2>nul
powercfg /setdcvalueindex SCHEME_CURRENT 4f971e89-eebd-4455-a8de-9e59040e7347 5ca83367-6e45-459f-a27b-476b1d01c936 0 >nul 2>nul

REM Los setvalueindex no surten efecto hasta reaplicar el plan.
powercfg /setactive SCHEME_CURRENT >nul 2>nul

echo.
echo   ============================================
echo      Listo. Asi quedo:
echo   ============================================
echo.

REM El nombre del plan va entre parentesis en la salida de powercfg.
for /f "tokens=2 delims=()" %%a in ('powercfg /getactivescheme') do echo   Plan de energia: %%a
echo.
echo   Suspension:      nunca
echo   Hibernacion:     apagada
echo   Disco duro:      siempre despierto
echo   Puertos USB:     nunca se duermen
echo   Pantalla:        se apaga a los 15 min (la computadora no)
echo.
echo   ------------------------------------------------
echo    Falta algo que NO se puede poner desde aqui:
echo.
echo    Si se va la luz y vuelve, la computadora se queda
echo    apagada. Para que prenda sola hay que entrar al BIOS
echo    (F2 o Supr al encender) y buscar una opcion que se
echo    llama "Restore on AC Power Loss" o "After Power
echo    Failure", y ponerla en "Power On" o "Last State".
echo.
echo    Sin eso, despues de un apagon alguien tiene que ir
echo    a prender la computadora a mano.
echo   ------------------------------------------------
echo.
pause
