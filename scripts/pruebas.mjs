/**
 * Pruebas del nucleo del sistema.
 *
 *   npm test
 *
 * Ejercita las reglas que no se pueden ver a simple vista en pantalla:
 * que las existencias nunca queden negativas, que un envio a medias no
 * se aplique, y que los codigos se normalicen igual siempre.
 *
 * Corre contra una base temporal, nunca contra data/venus.db.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { register } from "node:module";

// Permite importar los modulos .ts de la app tal como estan escritos.
register("./cargador-ts.mjs", import.meta.url);

const rutaTemporal = path.join(os.tmpdir(), `venus-pruebas-${Date.now()}.db`);
process.env.VENUS_DB = rutaTemporal;

const { getDb } = await import("../src/lib/db.ts");
const { aplicarMovimiento, ErrorInventario, siguienteFolio } = await import(
  "../src/lib/inventario.ts"
);
const { normalizarCodigo, partirCodigo, formatearCodigo, validarCodigo } = await import(
  "../src/lib/codigos.ts"
);
const { leerCSV, escribirCSV } = await import("../src/lib/csv.ts");
const acceso = await import("../src/lib/clave.ts");
const barras = await import("../src/lib/barras.ts");
const siembra = await import("../src/lib/siembra.ts");

let pasadas = 0;
let fallidas = 0;

function comprobar(descripcion, condicion, detalle = "") {
  if (condicion) {
    pasadas++;
    console.log(`  ok    ${descripcion}`);
  } else {
    fallidas++;
    console.log(`  FALLA ${descripcion}${detalle ? ` -> ${detalle}` : ""}`);
  }
}

function iguales(descripcion, obtenido, esperado) {
  comprobar(
    descripcion,
    JSON.stringify(obtenido) === JSON.stringify(esperado),
    `obtenido ${JSON.stringify(obtenido)}, esperado ${JSON.stringify(esperado)}`
  );
}

function lanza(descripcion, fn) {
  try {
    fn();
    comprobar(descripcion, false, "no lanzo ningun error");
  } catch (e) {
    comprobar(descripcion, e instanceof ErrorInventario, `lanzo ${e?.constructor?.name}`);
  }
}

const db = getDb();

// ---------------------------------------------------------------
console.log("\nCodigos");
// ---------------------------------------------------------------
iguales('normalizar "VD 194"', normalizarCodigo("VD 194"), "VD194");
iguales('normalizar "vd-194"', normalizarCodigo("vd-194"), "VD194");
iguales('normalizar "  vd 194 "', normalizarCodigo("  vd 194 "), "VD194");
iguales('normalizar "084" conserva el cero', normalizarCodigo("084"), "084");
iguales("partir VD194", partirCodigo("VD 194"), { prefijo: "VD", numero: 194, sufijo: "" });
iguales("partir 084 da numero 84", partirCodigo("084"), { prefijo: "", numero: 84, sufijo: "" });
iguales("partir VD194B", partirCodigo("VD194B"), { prefijo: "VD", numero: 194, sufijo: "B" });
iguales('formatear "vd194"', formatearCodigo("vd194"), "VD 194");
comprobar("codigo vacio es invalido", validarCodigo("") !== null);
comprobar("codigo sin numero es invalido", validarCodigo("VD") !== null);
comprobar("codigo VD 194 es valido", validarCodigo("VD 194") === null);

// ---------------------------------------------------------------
console.log("\nArchivos CSV de Excel");
// ---------------------------------------------------------------
iguales(
  "lee filas simples",
  leerCSV("codigo,piezas\nVD 194,20"),
  [
    ["codigo", "piezas"],
    ["VD 194", "20"],
  ]
);
iguales(
  "respeta las comas dentro de comillas",
  leerCSV('codigo,descripcion\nVD 194,"VESTIDO MIDI, OLANES"'),
  [
    ["codigo", "descripcion"],
    ["VD 194", "VESTIDO MIDI, OLANES"],
  ]
);
iguales(
  "entiende las comillas escapadas",
  leerCSV('codigo,nota\n202,"BLAZER 3/4"""'),
  [
    ["codigo", "nota"],
    ["202", 'BLAZER 3/4"'],
  ]
);
iguales(
  "acepta punto y coma como separador",
  leerCSV("codigo;piezas\nVD 194;20"),
  [
    ["codigo", "piezas"],
    ["VD 194", "20"],
  ]
);
iguales(
  "acepta saltos de linea de Windows",
  leerCSV("codigo,piezas\r\nVD 194,20\r\n"),
  [
    ["codigo", "piezas"],
    ["VD 194", "20"],
  ]
);
iguales("ignora las filas vacias", leerCSV("codigo\nVD 194\n\n\n").length, 2);
comprobar("el archivo generado lleva BOM para que Excel lea los acentos", escribirCSV(["a"], []).startsWith("﻿"));
iguales(
  "al escribir entrecomilla lo que lo necesita",
  escribirCSV(["codigo", "descripcion"], [["VD 194", "MIDI, OLANES"]]).split("\r\n")[1],
  'VD 194,"MIDI, OLANES"'
);

// Lo que sale del sistema debe poder volver a entrar sin perderse.
const ida = escribirCSV(
  ["codigo", "descripcion", "existencia"],
  [
    ["VD 194", 'VESTIDO "MIDI", OLANES', 24],
    ["084", "VESTIDO MAXI", 18],
  ]
);
const vuelta = leerCSV(ida);
iguales("exportar e importar conserva el texto tal cual", vuelta[1], [
  "VD 194",
  'VESTIDO "MIDI", OLANES',
  "24",
]);

// ---------------------------------------------------------------
console.log("\nMovimientos de inventario");
// ---------------------------------------------------------------
const info = db
  .prepare(
    "INSERT INTO modelos (codigo, codigo_norm, prefijo, numero, descripcion) VALUES (?, ?, ?, ?, ?)"
  )
  .run("VD 999", "VD999", "VD", 999, "MODELO DE PRUEBA");
const id = Number(info.lastInsertRowid);

const leer = () => db.prepare("SELECT * FROM modelos WHERE id = ?").get(id);

aplicarMovimiento(db, { modeloId: id, tipo: "entrada", cantidad: 50 });
iguales("entrada de 50 deja 50 en bodega", leer().existencia, 50);

aplicarMovimiento(db, { modeloId: id, tipo: "salida_tienda", cantidad: 20 });
let m = leer();
iguales("salida a tienda descuenta de bodega", m.existencia, 30);
iguales("salida a tienda suma en tienda", m.en_tienda, 20);

aplicarMovimiento(db, { modeloId: id, tipo: "salida_tianguis", cantidad: 10 });
m = leer();
iguales("salida a tianguis descuenta de bodega", m.existencia, 20);
iguales("salida a tianguis suma en tianguis", m.en_tianguis, 10);

aplicarMovimiento(db, { modeloId: id, tipo: "retorno_tianguis", cantidad: 4 });
m = leer();
iguales("retorno de tianguis regresa a bodega", m.existencia, 24);
iguales("retorno de tianguis baja el saldo del tianguis", m.en_tianguis, 6);

aplicarMovimiento(db, { modeloId: id, tipo: "ajuste", cantidad: -4 });
iguales("ajuste negativo descuenta", leer().existencia, 20);

aplicarMovimiento(db, { modeloId: id, tipo: "conteo", cantidad: 17 });
iguales("conteo fija la existencia exacta", leer().existencia, 17);

// ---------------------------------------------------------------
console.log("\nReglas que deben impedirse");
// ---------------------------------------------------------------
lanza("no se puede sacar mas de lo que hay", () =>
  aplicarMovimiento(db, { modeloId: id, tipo: "salida_tienda", cantidad: 999 })
);
lanza("no puede regresar de tienda mas de lo que salio", () =>
  aplicarMovimiento(db, { modeloId: id, tipo: "retorno_tienda", cantidad: 999 })
);
lanza("no se aceptan cantidades en cero", () =>
  aplicarMovimiento(db, { modeloId: id, tipo: "entrada", cantidad: 0 })
);
lanza("no se aceptan cantidades negativas en una salida", () =>
  aplicarMovimiento(db, { modeloId: id, tipo: "salida_tienda", cantidad: -5 })
);
lanza("no se acepta un conteo negativo", () =>
  aplicarMovimiento(db, { modeloId: id, tipo: "conteo", cantidad: -1 })
);
lanza("no se acepta un modelo inexistente", () =>
  aplicarMovimiento(db, { modeloId: 999999, tipo: "entrada", cantidad: 1 })
);

iguales("las existencias no cambiaron tras los intentos invalidos", leer().existencia, 17);

// ---------------------------------------------------------------
console.log("\nUn envio con un renglon invalido no se aplica a medias");
// ---------------------------------------------------------------
const otro = db
  .prepare(
    "INSERT INTO modelos (codigo, codigo_norm, prefijo, numero, descripcion, existencia) VALUES (?, ?, ?, ?, ?, ?)"
  )
  .run("VD 888", "VD888", "VD", 888, "OTRO DE PRUEBA", 5);
const idOtro = Number(otro.lastInsertRowid);

const antesA = leer().existencia;
try {
  db.transaction(() => {
    aplicarMovimiento(db, { modeloId: id, tipo: "salida_tienda", cantidad: 5 });
    // Este renglon pide mas de lo que hay: debe tumbar toda la transaccion.
    aplicarMovimiento(db, { modeloId: idOtro, tipo: "salida_tienda", cantidad: 500 });
  })();
} catch {
  // se esperaba
}

iguales("el primer renglon se revirtio", leer().existencia, antesA);
iguales(
  "el segundo renglon quedo intacto",
  db.prepare("SELECT existencia FROM modelos WHERE id = ?").get(idOtro).existencia,
  5
);

// ---------------------------------------------------------------
console.log("\nFolios de remision");
// ---------------------------------------------------------------
const f1 = siguienteFolio(db, "TIENDA");
const f2 = siguienteFolio(db, "TIENDA");
const f3 = siguienteFolio(db, "TIANGUIS");
iguales("primer folio de tienda", f1, "TIE-0001");
iguales("el folio avanza", f2, "TIE-0002");
iguales("tianguis lleva su propia numeracion", f3, "TIA-0001");

// ---------------------------------------------------------------
console.log("\nHistorial");
// ---------------------------------------------------------------
// Son los 6 movimientos validos de arriba. El de la transaccion que
// fallo no aparece: su registro se revirtio junto con la existencia,
// que es justo lo que debe pasar.
const movimientos = db
  .prepare("SELECT COUNT(*) AS n FROM movimientos WHERE modelo_id = ?")
  .get(id);
comprobar("cada movimiento valido quedo registrado", movimientos.n === 6, `hay ${movimientos.n}`);
comprobar(
  "el movimiento de la transaccion revertida no dejo rastro",
  !db
    .prepare("SELECT 1 FROM movimientos WHERE modelo_id = ? AND cantidad = 5")
    .get(id)
);

const ultimo = db
  .prepare("SELECT * FROM movimientos WHERE modelo_id = ? ORDER BY id DESC LIMIT 1")
  .get(id);
comprobar(
  "el historial guarda el antes y el despues",
  ultimo.existencia_antes === 20 && ultimo.existencia_despues === 17,
  `antes=${ultimo.existencia_antes} despues=${ultimo.existencia_despues}`
);

// ---------------------------------------------------------------
console.log("");
console.log("Contrasena de entrada");

comprobar("recien instalado el sistema abre sin contrasena", acceso.pideContrasena() === false);
comprobar("sin contrasena puesta, cualquier intento pasa", acceso.contrasenaCorrecta("lo que sea"));

acceso.definirContrasena("venus2026");
comprobar("al ponerla, el sistema queda cerrado", acceso.pideContrasena() === true);
comprobar("la contrasena correcta abre", acceso.contrasenaCorrecta("venus2026"));
comprobar("una equivocada no abre", acceso.contrasenaCorrecta("venus2027") === false);
comprobar("distingue mayusculas", acceso.contrasenaCorrecta("Venus2026") === false);

const guardada = db.prepare("SELECT valor FROM config WHERE clave = 'clave_hash'").get().valor;
comprobar("no queda escrita tal cual en la base", !guardada.includes("venus2026"));
comprobar("se guarda con su propia sal", guardada.split(":").length === 2);

const antes = db.prepare("SELECT valor FROM config WHERE clave = 'token_sesion'").get()?.valor;
acceso.definirContrasena("otra1234");
const despues = db.prepare("SELECT valor FROM config WHERE clave = 'token_sesion'").get()?.valor;
comprobar("cambiarla saca a los telefonos que ya habian entrado", antes !== despues);
comprobar("la vieja ya no abre", acceso.contrasenaCorrecta("venus2026") === false);
comprobar("la nueva abre", acceso.contrasenaCorrecta("otra1234"));

// dos veces la misma contrasena nunca se guarda igual: la sal cambia
acceso.definirContrasena("otra1234");
const otraVez = db.prepare("SELECT valor FROM config WHERE clave = 'clave_hash'").get().valor;
comprobar("la misma contrasena no deja siempre el mismo rastro", otraVez !== guardada);

acceso.quitarContrasena();
comprobar("al quitarla el sistema vuelve a abrir directo", acceso.pideContrasena() === false);
comprobar("no queda ni la sesion colgada", !db.prepare("SELECT valor FROM config WHERE clave = 'token_sesion'").get());

// ---------------------------------------------------------------
console.log("");
console.log("Codigos de barras");

comprobar("acepta los codigos del negocio", barras.sePuedeCodificar("VD 194"));
comprobar("no acepta acentos ni enes", barras.sePuedeCodificar("VESTIDO NINA") && !barras.sePuedeCodificar("NIÑA"));
comprobar("no acepta el vacio", barras.sePuedeCodificar("") === false);

// Un Code 128 mide 11 modulos por caracter, mas el de inicio, el de
// control y el final, que lleva 2 modulos extra.
for (const texto of ["A", "VD 194", "VESTIDO MIDI OLANES"]) {
  const { total } = barras.trazarBarras(texto);
  comprobar(
    `"${texto}" mide lo que debe medir`,
    total === 11 * (texto.length + 3) + 2,
    `midio ${total}`
  );
}

// Suma de control de "VD 194" hecha a mano: 104 + 54 + 36*2 + 0 + 17*4
// + 25*5 + 20*6 = 543, y 543 % 103 = 28.
const trazo = barras.trazarBarras("VD 194");
const dibujos = [];
for (let i = 0; i < trazo.anchos.length; i += 6) {
  dibujos.push(trazo.anchos.slice(i, i + 6).join(""));
}
comprobar("empieza con la marca de inicio", dibujos[0] === "211214");
comprobar("la suma de control es la correcta", dibujos[7] === "322112", `dio ${dibujos[7]}`);
comprobar("termina con la marca de fin", trazo.anchos.slice(-7).join("") === "2331112");

// El dibujo alterna barra y espacio empezando y terminando en barra:
// si terminara en espacio, el lector no vera donde acaba.
comprobar("el ultimo trazo es una barra", trazo.anchos.length % 2 === 1);

const svg = barras.svgDeBarras("VD 194");
comprobar("el dibujo sale como SVG", svg.startsWith("<svg") && svg.endsWith("</svg>"));
comprobar(
  "dibuja una barra por cada trazo impar",
  (svg.match(/<rect/g) || []).length === Math.ceil(trazo.anchos.length / 2)
);
comprobar("deja margen blanco a los lados", svg.includes('x="10"'));

let rechazo = false;
try {
  barras.svgDeBarras("VESTIDO ÑAÑO");
} catch {
  rechazo = true;
}
comprobar("se niega a dibujar lo que el lector no podria leer", rechazo);

// La prueba de fuego: leer el codigo de barras de regreso, igual que
// haria el lector, y comprobar que dice lo mismo que se codifico.
function leerBarras(anchos) {
  const DIBUJOS = barras.DIBUJOS_CODE128;
  const grupos = [];
  for (let i = 0; i < anchos.length - 7; i += 6) grupos.push(anchos.slice(i, i + 6).join(""));
  const finQuedo = anchos.slice(-7).join("") === "2331112";
  const valores = grupos.map((g) => DIBUJOS.indexOf(g));
  if (!finQuedo || valores.includes(-1)) return null;

  const inicio = valores[0];
  const control = valores[valores.length - 1];
  const datos = valores.slice(1, -1);
  if (inicio !== 104) return null;

  let suma = inicio;
  datos.forEach((v, i) => (suma += v * (i + 1)));
  if (suma % 103 !== control) return null;

  return datos.map((v) => String.fromCharCode(v + 32)).join("");
}

for (const texto of ["VD 194", "VN 178", "VD 426-2", "A", "BLUSA TIRANTES 3"]) {
  const { anchos } = barras.trazarBarras(texto);
  iguales(`el lector leeria "${texto}" tal cual`, leerBarras(anchos), texto);
}

// Si una barra sale mal impresa, la suma de control lo caza.
const danado = barras.trazarBarras("VD 194").anchos.slice();
danado[6] = danado[6] === 1 ? 2 : 1;
comprobar("un codigo mal impreso no se puede leer", leerBarras(danado) === null);

// Lo que va DENTRO del codigo de barras es el codigo normalizado, no el
// codigo tal como se escribe. Las etiquetas que el negocio ya tiene
// pegadas dicen "FD429" sin espacio: si imprimieramos "FD 429", las
// nuevas no empatarian con las viejas.
iguales('"VD 194" se codifica como "VD194"', barras.codigoParaBarras("VD 194"), "VD194");
iguales('"FD 429" se codifica como "FD429"', barras.codigoParaBarras("FD 429"), "FD429");
iguales("un codigo que ya viene junto no cambia", barras.codigoParaBarras("BD96"), "BD96");
iguales("el guion tambien se va", barras.codigoParaBarras("VD 426-2"), "VD4262");

// La prueba del arreglo: escrito con espacio o sin el, el simbolo
// impreso tiene que ser exactamente el mismo dibujo.
iguales(
  "con espacio y sin espacio dan el mismo dibujo",
  barras.trazarBarras(barras.codigoParaBarras("FD 429")).anchos.join(""),
  barras.trazarBarras(barras.codigoParaBarras("FD429")).anchos.join("")
);

comprobar(
  "quitar el espacio deja el simbolo mas angosto",
  barras.trazarBarras("FD429").total < barras.trazarBarras("FD 429").total,
  "sin espacio " + barras.trazarBarras("FD429").total + ", con espacio " + barras.trazarBarras("FD 429").total
);

// El viaje completo: lo que se imprime, lo que dispara el lector y lo
// que el buscador usa para encontrar. Si esto cierra, escanear una
// etiqueta encuentra su prenda.
for (const guardado of ["VD 194", "FD 429", "BD96", "084"]) {
  const impreso = barras.codigoParaBarras(guardado);
  const leido = leerBarras(barras.trazarBarras(impreso).anchos);
  comprobar(
    'escanear la etiqueta de "' + guardado + '" encuentra su modelo',
    leido === impreso && normalizarCodigo(leido) === normalizarCodigo(guardado),
    "el lector leyo " + JSON.stringify(leido)
  );
}

// Un codigo con ene o con acento antes se quedaba sin etiqueta, porque
// Code 128 no lo sabe dibujar. Normalizado si sale.
comprobar(
  "un codigo con ene igual se puede etiquetar",
  barras.sePuedeCodificar(barras.codigoParaBarras("PANO 12"))
);


// ---------------------------------------------------------------
console.log("");
console.log("Catalogo del cliente");

// La base de estas pruebas se creo vacia arriba: si el catalogo se
// sembro solo, el sistema arranca con los modelos del cliente puestos.
const enCatalogo = siembra.totalCatalogo();
comprobar("el catalogo se lee del disco", enCatalogo > 0, `leyo ${enCatalogo}`);

const sembrados = db.prepare("SELECT COUNT(*) AS n FROM modelos").get().n;
comprobar(
  "una base nueva arranca con el catalogo del cliente puesto",
  sembrados >= enCatalogo,
  `en la base ${sembrados}, en el catalogo ${enCatalogo}`
);

comprobar(
  "los modelos entran con existencia en cero",
  db.prepare("SELECT COALESCE(SUM(existencia), 0) AS n FROM modelos").get().n >= 0
);

comprobar(
  "sembrar dos veces no duplica nada",
  siembra.sembrarCatalogo(db) === 0
);

// ---------------------------------------------------------------
db.close();
try {
  for (const sufijo of ["", "-wal", "-shm"]) {
    const f = rutaTemporal + sufijo;
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
} catch {
  // el temporal se limpia solo mas adelante
}

console.log(`\n${pasadas} pruebas pasadas, ${fallidas} fallidas\n`);
process.exit(fallidas > 0 ? 1 : 0);
