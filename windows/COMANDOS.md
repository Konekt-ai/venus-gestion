# Comandos para la computadora de la bodega

Para copiar y pegar. Casi todo se puede hacer con doble clic a un `.bat`,
pero por SSH hace falta escribirlo.

Todo asume que el sistema está en `C:\Venus\venus-gestion`. Cambia la ruta si
lo pusiste en otro lado.

---

## Lo de todos los días

```bat
:: ¿Está encendido?
netstat -ano | findstr ":3000"

:: Encenderlo a mano
cd C:\Venus\venus-gestion
INICIAR.bat

:: Apagarlo (solo el sistema, no la caja que usa el 3001)
for /f "tokens=5" %p in ('netstat -ano ^| findstr ":3000 " ^| findstr LISTENING') do taskkill /f /pid %p

:: Ver la dirección para los celulares
ipconfig | findstr IPv4

:: Ver qué pasó (arranques, errores)
type C:\Venus\venus-gestion\data\servidor.log
```

> Dentro de un `.bat` los `%p` se escriben `%%p`. Los de arriba son para
> pegarlos directo en la ventana negra.

---

## Entrar desde otro lado

```bash
# Desde tu computadora, en la misma red que la bodega
ssh usuario@192.168.1.50

# Ver qué usuario y qué IP son: correr esto allá
echo %USERNAME%
ipconfig | findstr IPv4
```

Desde fuera de la bodega hace falta el túnel de Cloudflare. Sin él, el SSH
solo alcanza dentro de la misma red.

---

## Actualizar el sistema

```bat
cd C:\Venus\venus-gestion
ACTUALIZAR.bat
```

Hace respaldo, apaga, `git pull`, reconstruye y vuelve a prender. Funciona
igual por SSH.

Si solo cambiaste algo a mano y quieres reconstruir sin bajar nada:

```bat
cd C:\Venus\venus-gestion
npm run build
```

---

## Respaldos

El botón está en **Ajustes → Descargar respaldo completo**, que es lo que debe
usar el cliente. Desde la terminal:

```bat
cd C:\Venus\venus-gestion
node -e "const D=require('better-sqlite3');const d=new D('data/venus.db',{readonly:true});d.exec(`VACUUM INTO 'respaldos/venus-manual.db'`);"
```

`VACUUM INTO` y no copiar el archivo: con el modo WAL, copiar `venus.db` a
mano puede dejar fuera lo último que se escribió.

Para restaurar, con el sistema apagado:

```bat
copy /y C:\Venus\venus-gestion\respaldos\venus-2026-08-28_0900.db C:\Venus\venus-gestion\data\venus.db
del C:\Venus\venus-gestion\data\venus.db-wal
del C:\Venus\venus-gestion\data\venus.db-shm
```

---

## La tarea que lo arranca solo

```bat
:: ¿Existe? ¿Cuándo corrió?
schtasks /query /tn "Venus - Sistema de bodega" /fo list /v

:: Arrancarla ahora
schtasks /run /tn "Venus - Sistema de bodega"

:: Detenerla
schtasks /end /tn "Venus - Sistema de bodega"

:: Quitarla del todo
schtasks /delete /tn "Venus - Sistema de bodega" /f
```

---

## Firewall

```bat
:: Ver cómo está
netsh advfirewall show allprofiles state

:: Prenderlo (recomendado: las reglas de Venus siguen puestas)
netsh advfirewall set allprofiles state on

:: Apagarlo
netsh advfirewall set allprofiles state off

:: Ver las reglas que dejamos
netsh advfirewall firewall show rule name=all | findstr /i venus
```

---

## Energía

```bat
:: Ver cómo quedó
powercfg /query SCHEME_CURRENT SUB_SLEEP
powercfg /a

:: Volver a poner que se duerma a los 30 min (deshacer)
powercfg /change standby-timeout-ac 30
```

---

## Cuando algo no prende

```bat
:: ¿Node está y es la versión correcta?
node -v

:: ¿La base de datos funciona en esta computadora?
node -e "new (require('better-sqlite3'))(':memory:').prepare('select 1').get(); console.log('la base responde bien')"

:: ¿Cuántos modelos hay cargados?
cd C:\Venus\venus-gestion
node -e "const d=new (require('better-sqlite3'))('data/venus.db',{readonly:true});console.log(d.prepare('SELECT COUNT(*) c FROM modelos').get().c,'modelos')"

:: Reinstalar todo desde cero (no toca el inventario)
cd C:\Venus\venus-gestion
rmdir /s /q node_modules
INSTALAR.bat
```

**Nunca** `npm run datos -- --limpiar` en la computadora del cliente: borra el
inventario. Si ya hay ventas de la caja, el sistema se frena solo y avisa.

---

## Si el sistema arranca vacío

Es porque falta el material del cliente, que no viaja en GitHub. Se resuelve
copiando la carpeta `MATERIAL-VENUS` de la USB junto a `venus-gestion` y
volviendo a correr `INSTALAR.bat`.

Para revisar qué falta:

```bat
dir C:\Venus\venus-gestion\public\catalogo
dir C:\Venus\venus-gestion\src\datos\catalogo.json
```
