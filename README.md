# Venus — Sistema de bodega

Control de inventario y ubicaciones para la bodega. Sirve para saber, en
segundos, **cuántas piezas hay de un modelo y en qué rack está**, y para
llevar el registro de lo que sale a la tienda o al tianguis.

Corre en la computadora de la bodega y se puede consultar desde cualquier
celular conectado al mismo WiFi.

---

## Cómo encenderlo

Doble clic en **`INICIAR.bat`**.

La primera vez tarda unos minutos preparándose; después abre solo. Mientras
esa ventana negra esté abierta, el sistema está encendido. Para apagarlo,
se cierra la ventana.

En la computadora de la bodega: <http://localhost:3000>

Desde un celular en el mismo WiFi: la dirección que aparece en la ventana
al arrancar, o en **Ajustes → Entrar desde el celular**.

> Requiere Node.js instalado (<https://nodejs.org>, versión LTS). Si falta,
> `INICIAR.bat` lo avisa con las instrucciones.

---

## Cómo está organizado el inventario

### Modelos

Cada prenda es un **modelo** con su código tal como viene en la etiqueta:
`VD 194`, `084`, `PD 46`. El sistema guarda el código como se escribió, pero
lo busca de forma tolerante:

| Si escribes | Encuentra |
| --- | --- |
| `84` | `084` |
| `vd194`, `VD-194`, `vd 194` | `VD 194` |
| `194` | `VD 194` |
| `olanes`, `midi`, `barbie` | por descripción o tela |

Las letras del código son la **línea** (`VD`, `VN`, `PD`…) y el sistema las
usa para agrupar y filtrar.

El inventario se lleva **por modelo**: una existencia total por código.
Tallas, colores y tela se guardan como datos descriptivos de la prenda, igual
que en el cuaderno.

### Ubicaciones

Los lugares de la bodega se nombran **Zona → Rack → Repisa**, lo que da
códigos que se leen solos: `A-03-2` es zona A, rack 3, segunda repisa.

- Desde **Ubicaciones → Mapear la bodega** se crea una zona completa de
  golpe (por ejemplo 5 racks × 4 repisas = 20 lugares).
- **Imprimir etiquetas** genera hojas con el código en grande, 6 por hoja,
  para recortar y pegar en cada anaquel.

### Salidas y regresos

Lo que sale de bodega se registra en **Salidas**, eligiendo si va a la
tienda o al tianguis. Al confirmar se genera una **hoja con folio**
(`TIE-0001`) lista para imprimir y firmar: es el reemplazo del cuaderno con
el que hoy se compara bodega contra tienda.

El sistema lleva tres cuentas por modelo: cuántas piezas están **en bodega**,
cuántas **en la tienda** y cuántas **en el tianguis**. Los regresos del
tianguis vuelven a sumar a bodega.

### Conteo físico

**Conteo** sirve para cuadrar lo que dice el sistema con lo que realmente
hay. Se recorre la bodega anotando lo que se ve; nada cambia hasta cerrar el
conteo, así que se puede dejar a medias y seguir después. Al cerrarlo se
ajustan solo los modelos que no cuadraron, y queda registrado en el historial.

---

## Respaldos

Todo el inventario vive en un solo archivo: `data/venus.db`.

Desde **Ajustes** se puede descargar:

- **Respaldo completo** (`.db`) — con ese archivo se recupera todo. Conviene
  guardarlo en una USB o mandarlo por correo cada tanto.
- **Inventario en Excel** (`.csv`) — para revisarlo o compartirlo.
- **Historial en Excel** (`.csv`) — todos los movimientos.

Para restaurar un respaldo: cerrar el sistema, reemplazar `data/venus.db` con
el archivo guardado, y volver a abrir.

---

## Importar desde Excel

En **Ajustes → Subir un archivo** se puede cargar el catálogo completo desde
una hoja de cálculo guardada como CSV.

La única columna obligatoria es `codigo` (o `modelo`). Las demás son
opcionales y se reconocen escritas de varias formas:

`descripcion` · `tallas` · `colores` · `tela` · `existencia` (o `cantidad`,
`piezas`, `stock`) · `ubicacion` (o `lugar`, `rack`) · `minimo` · `notas`

Antes de guardar nada, el sistema muestra cuántos modelos entrarían, cuántos
se actualizarían y cuáles se omitirían y por qué. Las ubicaciones que no
existan se crean solas.

Los modelos que ya existen **conservan su historial**: si la cantidad del
archivo es distinta a la registrada, se anota como un ajuste en vez de
sobrescribir en silencio.

---

## El catalogo del cliente

Los **129 modelos** que la boutique tiene a la venta ya vienen cargados, con
la foto de cada prenda. Salieron del PDF del cliente
(*MODELOS MAS VENDIDOS + MODELOS VARIADOS*), que trae una ficha por modelo.

| | |
| --- | --- |
| Vestidos | 49 |
| Conjuntos | 23 |
| Blusas | 19 |
| Palazzos | 8 |
| Pantalones | 7 |
| Shorts, sacos, faldas y demas | 23 |

Los 14 que el cliente marca como **mas vendidos** salen con estrella y se
pueden filtrar aparte. El catalogo tambien trae la ficha tecnica de cada
prenda (tela, indicaciones de confeccion y avios), que aparece en su pantalla.

**Los modelos entran sin existencias, y eso es lo correcto**: el catalogo dice
que se vende, no cuanto hay. Las cantidades salen del primer conteo fisico.

### Si el cliente manda un catálogo nuevo

```bash
npm run catalogo -- "ruta/del/catalogo.pdf"   # lee el PDF, saca fotos y fichas
npm run catalogo:importar                     # lo mete a la base
```

El segundo paso **no pisa el inventario**: a los modelos que ya existen sólo
les actualiza la ficha (nombre, tela, foto), nunca las existencias ni la
ubicación.

---

### Lo que NO viaja en el repositorio

Estas carpetas estan fuera de GitHub a proposito, porque son material del
cliente:

| Carpeta | Qué trae |
| --- | --- |
| `public/catalogo/` | Las 129 fotos de las prendas |
| `public/logo.png` | El logo de la tienda |
| `docs/` | Documentos internos del proyecto |
| `data/venus.db` | El inventario |
| El PDF del catálogo | El original que mandó el cliente |

**Al instalar en otra computadora hay que copiarlas a mano** (por USB o por
correo), después de clonar el repositorio. El sistema arranca igual sin ellas
—los modelos aparecen con una percha en vez de la foto, y el nombre se escribe
con letras en lugar del logo— pero se ve a medias.

Si se perdieran las fotos, se vuelven a sacar del PDF:

```bash
npm run catalogo -- "MODELOS MAS VENDIDOS + MODELOS VARIADOS.pdf"
```

---

## Personal

En **Personal** se da de alta a quien trabaja en la bodega y en la tienda. Al
registrar un movimiento se elige de esa lista en vez de escribir el nombre,
asi queda firmado quien saco y quien recibio. Dar de baja a alguien no borra
su historial.

---

## Tianguis

Viene **apagado**, como pidio el cliente: por ahora solo bodega y tienda. Se
prende desde *Ajustes* cuando lo necesiten y todas las pantallas lo vuelven a
ofrecer solas. Apagarlo nunca borra lo que se haya registrado.

---

## Desde el celular

El sistema está pensado para usarse de pie entre los racks, con el teléfono
en una mano. Está adaptado a pantalla angosta: los campos no provocan zoom al
tocarlos, los botones tienen tamaño suficiente para el pulgar, y la barra de
accesos de abajo respeta la zona de gestos del iPhone.

**Se puede instalar como app**: al abrirlo en el celular, desde el menú del
navegador se elige *Agregar a pantalla de inicio*. Queda con su propio icono y
se abre sin la barra de direcciones. Al mantener presionado el icono aparecen
accesos directos a **Conteo**, **Salidas** y **Modelos**.

---

## Demostración pública (Vercel)

Además de correr en la bodega, el proyecto se puede subir a Vercel como
**escaparate** para enseñarle el sistema a alguien.

En ese modo la base de datos vive en la carpeta temporal del servidor, así que
**los datos son de ejemplo y se reinician solos**. Una franja ámbar lo advierte
en pantalla para que nadie capture ahí inventario de verdad. Desde *Ajustes* se
puede reiniciar la demostración a mano para volver a enseñarla desde cero.

### Cómo subirla

1. Hacer commit y subir el repositorio a GitHub.
2. Importar el repo en Vercel. **No hay que tocar** Build Command ni Output
   Directory: Next.js se detecta solo. Tampoco hace falta `vercel.json`.
3. En *Settings → Environment Variables*, agregar `VENUS_DEMO = 1` en
   Production, Preview y Development.
4. Desplegar. En el log debe decir Node **24.x** (queda fijado en
   `package.json` porque el binario de SQLite depende de la versión).
5. Abrir la URL **desde el celular** y comprobar: que cargue el tablero con
   datos, que se vea la franja ámbar, que se pueda registrar una entrada y una
   salida, y que las descargas de Ajustes funcionen.

> Si el primer despliegue falla con `Module did not self-register`, cambiar
> `engines.node` a `"22.x"` en `package.json` y volver a desplegar. Es el único
> ajuste que suele hacer falta.

**La bodega no se ve afectada.** Sin `VENUS_DEMO`, el sistema sigue guardando en
`data/venus.db` exactamente como antes.

---

## Para desarrollo

```bash
npm install
npm run dev              # servidor de desarrollo en el puerto 3000
npm test                 # pruebas del núcleo
npm run build && npm start
npm run datos                      # carga el catálogo (sin existencias)
npm run datos -- --demo            # además inventa existencias, para enseñarlo
npm run datos -- --limpiar         # borra todo y recarga
npm run catalogo -- "cat.pdf"      # regenera el catálogo desde un PDF nuevo
npm run logo                       # quita el fondo a public/logo.jpeg
```

> En la bodega nada de esto hace falta: el sistema carga el catálogo solo la
> primera vez que se abre.

### Cómo está armado

| Carpeta | Qué hay |
| --- | --- |
| `src/lib/` | Base de datos, esquema, códigos, motor de existencias, CSV |
| `src/acciones/` | Operaciones de escritura (server actions) |
| `src/app/` | Pantallas |
| `src/components/` | Piezas de interfaz reutilizables |
| `scripts/` | Pruebas y datos de ejemplo |
| `data/` | La base de datos (no se sube al repositorio) |

**Next.js 15** + **SQLite** (better-sqlite3) + **Tailwind 4**. Sin servicios
externos ni cuentas: todo corre local.

Las reglas de inventario están centralizadas en
[`src/lib/inventario.ts`](src/lib/inventario.ts): cualquier cambio de
existencias pasa por ahí, siempre dentro de una transacción y dejando su
movimiento en el historial. Las existencias nunca pueden quedar negativas, y
un envío de varios modelos se aplica completo o no se aplica.
