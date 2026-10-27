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
const tspl = await import("../src/lib/tspl.ts");
const consultas = await import("../src/lib/consultas.ts");
const dinero = await import("../src/lib/dinero.ts");
const precios = await import("../src/lib/precios.ts");

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
console.log("\nTres lugares: bodega, tienda y tianguis");
// ---------------------------------------------------------------
const idLugares = Number(
  db
    .prepare(
      "INSERT INTO modelos (codigo, codigo_norm, prefijo, numero, descripcion) VALUES (?, ?, ?, ?, ?)"
    )
    .run("VD 777", "VD777", "VD", 777, "PRUEBA DE LUGARES").lastInsertRowid
);
const leerL = () => db.prepare("SELECT * FROM modelos WHERE id = ?").get(idLugares);
const cuentas = () => {
  const x = leerL();
  return [x.existencia, x.en_tienda, x.en_tianguis];
};

aplicarMovimiento(db, { modeloId: idLugares, tipo: "entrada", cantidad: 10 });
aplicarMovimiento(db, { modeloId: idLugares, tipo: "entrada_tianguis", cantidad: 6 });
iguales("una entrada puede ir directo al tianguis", cuentas(), [10, 0, 6]);

aplicarMovimiento(db, { modeloId: idLugares, tipo: "entrada_tienda", cantidad: 2 });
iguales("y directo a la tienda", cuentas(), [10, 2, 6]);

aplicarMovimiento(db, { modeloId: idLugares, tipo: "tianguis_a_tienda", cantidad: 1 });
iguales("del tianguis a la tienda no toca bodega", cuentas(), [10, 3, 5]);

aplicarMovimiento(db, { modeloId: idLugares, tipo: "tienda_a_tianguis", cantidad: 3 });
iguales("de la tienda al tianguis", cuentas(), [10, 0, 8]);

const venta = aplicarMovimiento(db, { modeloId: idLugares, tipo: "venta_tianguis", cantidad: 2 });
iguales("una venta del tianguis solo baja el tianguis", cuentas(), [10, 0, 6]);
comprobar(
  "el historial de la venta guarda la cuenta del tianguis",
  venta.lugar === "tianguis" && venta.antes === 8 && venta.despues === 6,
  JSON.stringify(venta)
);

aplicarMovimiento(db, { modeloId: idLugares, tipo: "cancelacion_tianguis", cantidad: 2 });
iguales("cancelar la venta regresa las piezas al tianguis", cuentas(), [10, 0, 8]);

aplicarMovimiento(db, { modeloId: idLugares, tipo: "ajuste_tianguis", cantidad: -3 });
aplicarMovimiento(db, { modeloId: idLugares, tipo: "ajuste_tienda", cantidad: 4 });
iguales("las correcciones de tienda y tianguis van a su cuenta", cuentas(), [10, 4, 5]);

lanza("no se vende en el tianguis mas de lo que hay alla", () =>
  aplicarMovimiento(db, { modeloId: idLugares, tipo: "venta_tianguis", cantidad: 6 })
);
lanza("no se pasa del tianguis a la tienda mas de lo que hay", () =>
  aplicarMovimiento(db, { modeloId: idLugares, tipo: "tianguis_a_tienda", cantidad: 99 })
);
lanza("una correccion no deja la tienda en negativo", () =>
  aplicarMovimiento(db, { modeloId: idLugares, tipo: "ajuste_tienda", cantidad: -5 })
);
iguales("los intentos invalidos no movieron nada", cuentas(), [10, 4, 5]);

// ---------------------------------------------------------------
console.log("\nLa caja dejo la tienda en negativo");
// ---------------------------------------------------------------
// La caja cobra aunque la tienda este en cero y la deja en negativo, sin
// pasar por aqui. Ese modelo tiene que seguir aceptando lo que no toca la
// tienda, y lo que la sube.
const idCaja = Number(
  db
    .prepare(
      "INSERT INTO modelos (codigo, codigo_norm, prefijo, numero, descripcion, existencia, en_tienda, en_tianguis) VALUES (?, ?, ?, ?, ?, 5, -1, 2)"
    )
    .run("VD 666", "VD666", "VD", 666, "VENDIDO SIN PIEZAS EN TIENDA").lastInsertRowid
);
const cuentasCaja = () => {
  const x = db.prepare("SELECT * FROM modelos WHERE id = ?").get(idCaja);
  return [x.existencia, x.en_tienda, x.en_tianguis];
};

aplicarMovimiento(db, { modeloId: idCaja, tipo: "entrada", cantidad: 3 });
iguales("acepta una entrada a bodega", cuentasCaja(), [8, -1, 2]);

aplicarMovimiento(db, { modeloId: idCaja, tipo: "conteo", cantidad: 6 });
iguales("acepta el conteo de bodega", cuentasCaja(), [6, -1, 2]);

aplicarMovimiento(db, { modeloId: idCaja, tipo: "salida_tianguis", cantidad: 1 });
iguales("acepta una salida al tianguis", cuentasCaja(), [5, -1, 3]);

lanza("pero no deja la tienda mas abajo de lo que estaba", () =>
  aplicarMovimiento(db, { modeloId: idCaja, tipo: "tienda_a_tianguis", cantidad: 1 })
);

aplicarMovimiento(db, { modeloId: idCaja, tipo: "salida_tienda", cantidad: 3 });
iguales("un envio a la tienda la regresa a positivo", cuentasCaja(), [2, 2, 3]);

// ---------------------------------------------------------------
console.log("\nVentas del tianguis en los reportes");
// ---------------------------------------------------------------
const ventasLib = await import("../src/lib/ventas.ts");
db.prepare(
  `INSERT INTO tianguis_ventas (modelo_id, piezas, precio, precio_lista, persona, estado)
   VALUES (?, 2, 60000, 65000, 'Lupita', 'vendida'), (?, 1, 89000, NULL, 'Mario', 'cancelada')`
).run(idLugares, idLugares);

const r = ventasLib.resumenVentas("hoy", "tianguis");
iguales(
  "el resumen cuenta solo las ventas cobradas del tianguis",
  [r.ventas, r.piezas, r.total, r.canceladas],
  [1, 2, 120000, 1]
);
iguales("sin caja, 'todo' es lo mismo que el tianguis", ventasLib.resumenVentas("hoy").total, 120000);
iguales("filtrar por tienda sin caja no trae nada", ventasLib.resumenVentas("hoy", "tienda").ventas, 0);

const lista = ventasLib.ventasIndividuales("hoy");
const vendida = lista.find((v) => !v.cancelada);
comprobar(
  "venta por venta trae modelo, piezas, precio y total",
  vendida?.origen === "tianguis" &&
    vendida.renglones[0].codigo === "VD 777" &&
    vendida.renglones[0].piezas === 2 &&
    vendida.renglones[0].precio === 60000 &&
    vendida.total === 120000,
  JSON.stringify(vendida)
);
iguales("y avisa que se vendio en otro precio", vendida?.renglones[0].precio_lista, 65000);
comprobar("la cancelada aparece marcada", lista.some((v) => v.cancelada));

iguales("la lista de vendedoras trae a quien vendio", ventasLib.vendedorasConVentas("hoy"), ["Lupita", "Mario"]);
iguales(
  "filtrar por vendedora trae solo sus ventas",
  ventasLib.ventasIndividuales("hoy", "todo", 150, "Lupita").map((v) => v.vendedora),
  ["Lupita"]
);
iguales("y el resumen cuenta solo lo suyo", ventasLib.resumenVentas("hoy", "todo", "Mario").total, 0);
iguales("una vendedora sin ventas no trae nada", ventasLib.ventasIndividuales("hoy", "todo", 150, "Nadie").length, 0);

// ---------------------------------------------------------------
console.log("\nUbicaciones que en realidad eran lugares");
// ---------------------------------------------------------------
const { correrMigraciones } = await import("../src/lib/migraciones.ts");
const nuevaUbicacion = (codigo) =>
  Number(
    db.prepare("INSERT INTO ubicaciones (codigo, zona) VALUES (?, ?)").run(codigo, codigo)
      .lastInsertRowid
  );
const uTianguis = nuevaUbicacion("TIANGUIS");
const uTienda = nuevaUbicacion("Tienda");
const uBodega = nuevaUbicacion("BODEGA");
const uRack = nuevaUbicacion("A-01-1");

const conUbicacion = (codigo, piezas, ubicacion) =>
  Number(
    db
      .prepare(
        `INSERT INTO modelos (codigo, codigo_norm, descripcion, existencia, en_tienda, ubicacion_id)
         VALUES (?, ?, 'MIGRACION', ?, 1, ?)`
      )
      .run(codigo, codigo, piezas, ubicacion).lastInsertRowid
  );
const mTianguis = conUbicacion("MIG1", 7, uTianguis);
const mTienda = conUbicacion("MIG2", 3, uTienda);
const mBodega = conUbicacion("MIG3", 4, uBodega);
const mRack = conUbicacion("MIG4", 5, uRack);

db.prepare("DELETE FROM config WHERE clave = 'migracion_lugares_v1'").run();
correrMigraciones(db);
const fila = (id) => db.prepare("SELECT * FROM modelos WHERE id = ?").get(id);

iguales(
  "lo anotado en la ubicacion Tianguis paso al tianguis",
  [fila(mTianguis).existencia, fila(mTianguis).en_tianguis],
  [0, 7]
);
iguales(
  "lo anotado en la ubicacion Tienda se suma a la tienda",
  [fila(mTienda).existencia, fila(mTienda).en_tienda],
  [0, 4]
);
iguales("lo de la ubicacion Bodega se queda en bodega", fila(mBodega).existencia, 4);
iguales("un rack de verdad no se toca", [fila(mRack).existencia, fila(mRack).ubicacion_id], [5, uRack]);
comprobar(
  "las tres ubicaciones falsas se borraron",
  db.prepare("SELECT COUNT(*) AS n FROM ubicaciones WHERE id IN (?, ?, ?)").get(uTianguis, uTienda, uBodega).n === 0
);
comprobar(
  "el paso quedo en el historial como una salida",
  Boolean(
    db
      .prepare("SELECT 1 FROM movimientos WHERE modelo_id = ? AND tipo = 'salida_tianguis' AND cantidad = 7")
      .get(mTianguis)
  )
);
correrMigraciones(db);
iguales("correrla otra vez no repite nada", fila(mTianguis).en_tianguis, 7);

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
console.log("");
console.log("Etiquetas de la impresora de rollo");

const PLANTILLA = {
  anchoMm: 50, altoMm: 25, separacionMm: 2, altoBarrasMm: 14,
  densidad: 8, velocidad: 4, giro: 90, desplazaXMm: 0, desplazaYMm: 0,
};

const etq = tspl.armarEtiqueta({ codigo: "FD 429", descripcion: "FALDA CORTA CON FAJO" }, 30, PLANTILLA);
const renglones = etq.split("\r\n").filter(Boolean);

iguales("50 mm son 400 puntos", tspl.puntos(50), 400);

// El espacio antes de "mm" no es cosmetico: sin el, la impresora
// ignora la medida y usa la que traiga guardada de antes.
comprobar("SIZE lleva el espacio antes de mm", renglones[0] === "SIZE 50 mm,25 mm", renglones[0]);
comprobar("GAP lleva el espacio antes de mm", renglones[1] === "GAP 2 mm,0", renglones[1]);

// CLS limpia el area de dibujo, asi que tiene que saber ya de que
// tamano es: si fuera antes de SIZE, la etiqueta saldria recortada.
comprobar(
  "CLS va despues de SIZE",
  renglones.indexOf("CLS") > renglones.findIndex((l) => l.startsWith("SIZE")),
  renglones.join(" | ")
);

// Las copias se piden una sola vez. N bloques repetidos harian que el
// rollo se recalibre entre etiqueta y etiqueta, y salen torcidas.
iguales("las 30 copias se piden con un solo PRINT", renglones.filter((l) => l.startsWith("PRINT")).length, 1);
comprobar("y ese PRINT pide las 30", renglones.some((l) => l === "PRINT 1,30"));

// Code 128 solo admite barra angosta y ancha iguales. Con 2,4 (que es
// de Code 39) el simbolo sale mal y el lector no lo agarra: el sintoma
// aparece semanas despues, con todo el rollo ya impreso.
const barcode = renglones.find((l) => l.startsWith("BARCODE"));
comprobar("el codigo de barras va con angosto y ancho iguales", barcode.includes(",2,2,"), barcode);
comprobar("y codifica el codigo sin espacio", barcode.includes('"FD429"'), barcode);

// Girado 90, TODOS los objetos giran. DIRECTION no sirve para esto:
// voltea el origen 180 grados, que es otra cosa.
comprobar(
  "con giro 90 todos los objetos llevan 90",
  renglones.filter((l) => l.startsWith("TEXT") || l.startsWith("BARCODE")).every((l) => l.includes(",90,")),
  renglones.filter((l) => l.startsWith("TEXT")).join(" | ")
);
comprobar("y DIRECTION se queda en 1", renglones.some((l) => l === "DIRECTION 1"));

const derecha = tspl.armarEtiqueta({ codigo: "BD96", descripcion: "BLUSA" }, 1, { ...PLANTILLA, giro: 0 });
comprobar(
  "sin giro ningun objeto lleva 90",
  !derecha.split("\r\n").filter((l) => l.startsWith("TEXT") || l.startsWith("BARCODE")).some((l) => l.includes(",90,"))
);

// Una descripcion con comillas o con saltos no puede cerrar el
// argumento y colar comandos propios.
const sucia = tspl.armarEtiqueta(
  { codigo: "VD 194", descripcion: 'VESTIDO 24"\r\nPRINT 1,999' },
  1,
  PLANTILLA
);
iguales("un texto con comillas no cuela comandos", sucia.split("\r\n").filter((l) => l.startsWith("PRINT")).length, 1);
comprobar("y ese PRINT sigue siendo el bueno", sucia.includes("PRINT 1,1"));

// latin1 y no utf8: la impresora lee en CODEPAGE 1252, donde cada letra
// es UN byte. Con utf8 la ene viajaria en dos y saldrian garabatos.
iguales("la letra va en un solo byte", tspl.aBytes("n").length, 1);
iguales("la ene minuscula es 0xF1 en latin1", tspl.aBytes("ñ")[0], 0xf1);
iguales("la e con acento es 0xE9", tspl.aBytes("é")[0], 0xe9);

// Lo que se imprime tiene que poder leerse de vuelta con el mismo
// decodificador que ya prueba los codigos de la pantalla.
const dentro = barcode.match(/"128",\d+,1,\d+,2,2,"([^"]+)"/)[1];
iguales("lo que va en el simbolo es lo que el lector leeria", leerBarras(barras.trazarBarras(dentro).anchos), "FD429");

// Varias prendas en un solo envio.
const lote = tspl.armarLote(
  [
    { prenda: { codigo: "BD96", descripcion: "BLUSA" }, copias: 30 },
    { prenda: { codigo: "VD 194", descripcion: "VESTIDO" }, copias: 5 },
  ],
  PLANTILLA
);
iguales("un lote de dos prendas lleva dos PRINT", lote.split("\r\n").filter((l) => l.startsWith("PRINT")).length, 2);
comprobar("cada una con su cantidad", lote.includes("PRINT 1,30") && lote.includes("PRINT 1,5"));

// Una densidad fuera de rango la rechaza la impresora entera.
comprobar(
  "una densidad absurda se recorta al maximo",
  tspl.armarEtiqueta({ codigo: "A", descripcion: "" }, 1, { ...PLANTILLA, densidad: 99 }).includes("DENSITY 15")
);

// La descripcion se recorta a lo que de verdad cabe con su fuente, y
// no mas: "FALDA CORTA CON FAJO" tiene que salir completa.
comprobar("la descripcion del cliente cabe entera", etq.includes("FALDA CORTA CON FAJO"));

// ---------------------------------------------------------------
console.log("");
console.log("Corregir el codigo de una prenda");

// De los 129 modelos precargados hay algunos con el codigo mal escrito.
// Corregirlos no puede dejar inservibles las etiquetas que ya estan
// pegadas en la ropa: eso es lo que se prueba aqui.
const paraRenombrar = db
  .prepare("SELECT id, codigo, codigo_norm FROM modelos ORDER BY id LIMIT 1")
  .get();

comprobar("hay una prenda para la prueba", Boolean(paraRenombrar));

const codigoViejo = paraRenombrar.codigo;
const normViejo = paraRenombrar.codigo_norm;
const NUEVO = "ZZ 999";
const NUEVO_NORM = "ZZ999";

db.transaction(() => {
  db.prepare(
    "UPDATE modelos SET codigo = ?, codigo_norm = ?, prefijo = ?, numero = ? WHERE id = ?"
  ).run(NUEVO, NUEVO_NORM, "ZZ", 999, paraRenombrar.id);
  db.prepare(
    `INSERT INTO codigos_anteriores (modelo_id, codigo, codigo_norm, codigo_nuevo)
     VALUES (?, ?, ?, ?)`
  ).run(paraRenombrar.id, codigoViejo, normViejo, NUEVO);
})();

iguales(
  "con el codigo nuevo se encuentra",
  consultas.obtenerModeloPorCodigo(NUEVO_NORM)?.codigo,
  NUEVO
);

// La de verdad importante: la etiqueta que trae la prenda colgada dice
// el codigo viejo. Si al escanearla no apareciera nada, el inventario
// quedaria bien y la bodega igual no serviria.
iguales(
  "escanear la etiqueta vieja sigue encontrando la prenda",
  consultas.obtenerModeloPorCodigo(normViejo)?.codigo,
  NUEVO
);

const porBuscador = consultas.buscarModelos({ q: normViejo, limite: 5 });
comprobar(
  "y el buscador general tambien la encuentra",
  porBuscador.some((m) => m.codigo === NUEVO),
  porBuscador.map((m) => m.codigo).join(", ") || "(nada)"
);

comprobar(
  "el primero de la lista es esa prenda, no otra parecida",
  porBuscador[0] && porBuscador[0].codigo === NUEVO,
  porBuscador[0] ? porBuscador[0].codigo : "(lista vacia)"
);

// Un codigo que se reciclo entre dos prendas distintas no puede abrir
// la equivocada: mas vale no encontrar nada que mandar a alguien a la
// percha de al lado.
const otra = db.prepare("SELECT id FROM modelos WHERE id <> ? LIMIT 1").get(paraRenombrar.id);
db.prepare(
  `INSERT INTO codigos_anteriores (modelo_id, codigo, codigo_norm, codigo_nuevo)
   VALUES (?, ?, ?, ?)`
).run(otra.id, codigoViejo, normViejo, "OTRO");

comprobar(
  "un codigo que dos prendas tuvieron no abre ninguna",
  consultas.obtenerModeloPorCodigo(normViejo) === null
);

// Se deja todo como estaba para no ensuciar las pruebas de abajo.
db.prepare("DELETE FROM codigos_anteriores WHERE codigo_norm = ?").run(normViejo);
db.prepare(
  "UPDATE modelos SET codigo = ?, codigo_norm = ?, prefijo = ?, numero = ? WHERE id = ?"
).run(codigoViejo, normViejo, paraRenombrar.codigo.split(" ")[0], null, paraRenombrar.id);

// ---------------------------------------------------------------
console.log("");
console.log("Precios");

iguales('"650" son 65000 centavos', dinero.aCentavos("650"), 65000);
iguales('"$1,300.50" se entiende', dinero.aCentavos("$1,300.50"), 130050);
iguales("lo que no es numero se rechaza", dinero.aCentavos("como quinientos"), null);
iguales("vacio tambien", dinero.aCentavos(""), null);
iguales("un negativo se rechaza", dinero.aCentavos("-10"), null);
iguales("65000 centavos se leen $650.00", dinero.pesos(65000), "$650.00");
iguales("y en el campo de captura, 650.00", dinero.pesosSimple(65000), "650.00");
iguales("en la etiqueta, sin los .00: $650", dinero.pesosCortos(65000), "$650");
iguales("pero si hay centavos se ven: $650.50", dinero.pesosCortos(65050), "$650.50");
iguales("y los miles llevan coma: $1,300", dinero.pesosCortos(130000), "$1,300");

// Bodega NUNCA crea la tabla de la caja: un precio sin caja no le sirve
// a nadie, y dos definiciones distintas de la misma tabla no se
// arreglan solas.
const habiaTabla = Boolean(
  db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='caja_precios'").get()
);
comprobar(
  "sin caja instalada, bodega no inventa la tabla de precios",
  habiaTabla || precios.hayTablaPrecios() === false
);
comprobar(
  "y sin tabla, pedir un precio no truena: contesta que no hay",
  habiaTabla || precios.precioDeModelo(paraRenombrar.id) === null
);
comprobar(
  "sin tabla, la lista de modelos sale con todos sin precio",
  habiaTabla || consultas.buscarModelos({ limite: 5 }).every((m) => m.precio === null)
);
comprobar(
  "sin tabla, pedir los precios de varias prendas da un mapa vacio",
  habiaTabla || precios.preciosDeModelos([paraRenombrar.id]).size === 0
);
comprobar(
  "y buscar por un precio exacto no truena: no encuentra a nadie",
  habiaTabla || consultas.buscarModelos({ precioCentavos: 65000 }).length === 0
);

// ---------------------------------------------------------------
console.log("\nVentas de la tienda (escritas por la caja)");
// ---------------------------------------------------------------
// Va al final a proposito: a partir de aqui la base ya "tiene caja".
// Se crean solo las columnas que bodega lee, como las deja la caja.
db.exec(`
  CREATE TABLE caja_ventas (id TEXT PRIMARY KEY, folio TEXT, fecha TEXT, vendedora TEXT,
    estado TEXT, piezas INTEGER, descuento INTEGER, total INTEGER);
  CREATE TABLE caja_venta_lineas (id INTEGER PRIMARY KEY AUTOINCREMENT, venta_id TEXT,
    modelo_id INTEGER, codigo TEXT, descripcion TEXT, piezas INTEGER, precio INTEGER,
    importe INTEGER, sin_respaldo INTEGER DEFAULT 0);
`);
db.prepare(
  `INSERT INTO caja_ventas VALUES ('t1', 'C1-000001', datetime('now','localtime'), 'ANA', 'cobrada', 1, 0, 50000)`
).run();
db.prepare(
  `INSERT INTO caja_venta_lineas (venta_id, modelo_id, codigo, descripcion, piezas, precio, importe)
   VALUES ('t1', ?, 'VD 777', 'PRUEBA', 1, 50000, 50000)`
).run(idLugares);

const deAna = ventasLib.ventasIndividuales("hoy", "todo", 150, "ANA");
iguales("la tienda tambien se filtra por vendedora", deAna.map((v) => v.folio), ["C1-000001"]);
iguales("una caja vieja no trae precio registrado", deAna[0]?.renglones[0].precio_lista, null);

// La caja nueva guarda el precio registrado de cada prenda vendida.
db.exec("ALTER TABLE caja_venta_lineas ADD COLUMN precio_lista INTEGER");
db.prepare("UPDATE caja_venta_lineas SET precio_lista = 60000 WHERE venta_id = 't1'").run();
iguales(
  "la caja nueva avisa que se cobro en otro precio",
  ventasLib.ventasIndividuales("hoy", "tienda")[0]?.renglones[0].precio_lista,
  60000
);
db.prepare("UPDATE caja_venta_lineas SET precio_lista = 50000 WHERE venta_id = 't1'").run();
iguales(
  "y no dice nada si se cobro al registrado",
  ventasLib.ventasIndividuales("hoy", "tienda")[0]?.renglones[0].precio_lista,
  null
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
