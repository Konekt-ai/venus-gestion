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
