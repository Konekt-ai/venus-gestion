/**
 * Carga datos de ejemplo para probar el sistema.
 *
 * Son los modelos de la lista de "MODELOS MAS VENDIDOS" del cliente,
 * con ubicaciones y existencias inventadas, para poder ver como se
 * comporta todo antes de capturar el inventario real.
 *
 *   npm run datos:ejemplo          carga los datos
 *   npm run datos:ejemplo -- --limpiar   borra todo y vuelve a cargar
 *
 * Node 24 lee archivos .ts directamente, por eso puede importar el
 * esquema real y no hay una segunda copia que se desincronice.
 */
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ESQUEMA } from "../src/lib/esquema.ts";

const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const rutaDb = path.join(raiz, "data", "venus.db");
const limpiar = process.argv.includes("--limpiar");

fs.mkdirSync(path.dirname(rutaDb), { recursive: true });

const db = new Database(rutaDb);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(ESQUEMA);

if (limpiar) {
  db.exec(`
    DELETE FROM conteo_lineas;
    DELETE FROM conteos;
    DELETE FROM movimientos;
    DELETE FROM remisiones;
    DELETE FROM modelos;
    DELETE FROM ubicaciones;
    DELETE FROM config;
  `);
  console.log("Se borraron los datos anteriores.");
}

const yaHay = db.prepare("SELECT COUNT(*) AS n FROM modelos").get();
if (yaHay.n > 0) {
  console.log(
    `Ya hay ${yaHay.n} modelos en la base. No se toco nada.\n` +
      "Si quieres empezar de cero: npm run datos:ejemplo -- --limpiar"
  );
  process.exit(0);
}

// ---------------------------------------------------------------
// Ubicaciones: dos zonas de ejemplo
// ---------------------------------------------------------------
const insertarUbicacion = db.prepare(
  "INSERT OR IGNORE INTO ubicaciones (codigo, zona, rack, nivel, descripcion, orden) VALUES (?, ?, ?, ?, ?, ?)"
);

let orden = 0;
for (const zona of ["A", "B"]) {
  for (let rack = 1; rack <= 3; rack++) {
    for (let nivel = 1; nivel <= 3; nivel++) {
      const r = String(rack).padStart(2, "0");
      insertarUbicacion.run(
        `${zona}-${r}-${nivel}`,
        zona,
        r,
        String(nivel),
        zona === "A" && rack === 1 ? "Entrando a la derecha" : "",
        orden++
      );
    }
  }
}

const ubicacionPorCodigo = new Map(
  db
    .prepare("SELECT id, codigo FROM ubicaciones")
    .all()
    .map((u) => [u.codigo, u.id])
);

// ---------------------------------------------------------------
// Lineas: que significan las letras de cada codigo
// ---------------------------------------------------------------
const insertarLinea = db.prepare(
  `INSERT INTO lineas (prefijo, nombre) VALUES (?, ?)
   ON CONFLICT(prefijo) DO UPDATE SET nombre = excluded.nombre`
);

for (const [prefijo, nombre] of [
  ["VD", "Vestidos"],
  ["PD", "Palazzos"],
  ["NP", "Pantalones"],
  ["CD", "Conjuntos"],
]) {
  insertarLinea.run(prefijo, nombre);
}

// ---------------------------------------------------------------
// Modelos: la lista de mas vendidos del cliente
// ---------------------------------------------------------------
const MODELOS = [
  ["VD 194", "VESTIDO MIDI OLANES",          "GDE - XL - 2XL",   "VARIADO",         "POWER SATEN", "VESTIDO",  "A-01-1", 24],
  ["084",    "VESTIDO MAXI DE COPAS SATEN",  "CH - M - GDE",     "VARIADO",         "POWER SATEN", "VESTIDO",  "A-01-2", 18],
  ["VD 302", "VESTIDO MANGA MARIPOSA",       "GDE - XL - 2XL",   "VARIADO",         "POWER SATEN", "VESTIDO",  "A-01-3", 31],
  ["VD 342", "VESTIDO MIDI OLAN CAMPESINO",  "M - GDE - XL",     "VARIADO",         "POWER SATEN", "VESTIDO",  "A-02-1", 12],
  ["004",    "VESTIDO SATEN VUELO CORTO",    "CH - M - GDE - XL","VARIADO",         "POWER SATEN", "VESTIDO",  "A-02-2", 27],
  ["VD 496", "VESTIDO DE TIRAS EN ESPALDA",  "CH - UNITALLA",    "VARIADO",         "POWER SATEN", "VESTIDO",  "A-02-3", 9],
  ["VD 410", "VESTIDO ARGOLLA SATEN",        "CH - M",           "NEGRO",           "POWER SATEN", "VESTIDO",  "A-03-1", 15],
  ["005",    "VESTIDO TECNO MAXI COPA",      "GDE - XL",         "VARIADO",         "TECNO CREPE", "VESTIDO",  "A-03-2", 21],
  ["VD 446", "VESTIDO PASTELON MAXI",        "VARIADO",          "VARIADO",         "TECNO CREPE", "VESTIDO",  "A-03-3", 6],
  ["PD 46",  "PANTALON VOGUE",               "",                 "VARIADO",         "POWER SATEN", "PANTALON", "B-01-1", 33],
  ["NP 284", "PANTALON FAJO Y HEBILLA",      "M - GDE - XL",     "NEGRO",           "TECNO CREPE", "PANTALON", "B-01-2", 14],
  ["PD 320", "PALAZZO MONO",                 "M - XL",           "VARIADO",         "TECNO CREPE", "PALAZZO",  "B-01-3", 19],
  ["CD 281", "CONJUNTO CHALECO Y PANTALON",  "M - GDE - XL",     "NEGRO Y BEIGE",   "BARBIE TWILL","CONJUNTO", "B-02-1", 8],
  ["202",    "BLAZER MANGA 3/4",             "VARIADO",          "COLORES BASICOS", "TECNO CREPE", "BLAZER",   "B-02-2", 0],
];

const insertarModelo = db.prepare(
  `INSERT INTO modelos
     (codigo, codigo_norm, prefijo, numero, descripcion, categoria,
      tallas, colores, tela, ubicacion_id, minimo, destacado)
   VALUES (@codigo, @codigo_norm, @prefijo, @numero, @descripcion, @categoria,
           @tallas, @colores, @tela, @ubicacion_id, @minimo, 1)`
);

const insertarMovimiento = db.prepare(
  `INSERT INTO movimientos
     (modelo_id, tipo, cantidad, existencia_antes, existencia_despues, ubicacion_id, nota)
   VALUES (?, 'entrada', ?, 0, ?, ?, 'Existencia inicial (datos de ejemplo)')`
);

const actualizarExistencia = db.prepare("UPDATE modelos SET existencia = ? WHERE id = ?");

const cargar = db.transaction(() => {
  for (const [codigo, descripcion, tallas, colores, tela, categoria, ubic, piezas] of MODELOS) {
    const norm = codigo.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    const partes = norm.match(/^([A-Z]*)(\d*)/);
    const ubicacionId = ubicacionPorCodigo.get(ubic) ?? null;

    const info = insertarModelo.run({
      codigo,
      codigo_norm: norm,
      prefijo: partes?.[1] ?? "",
      numero: partes?.[2] ? parseInt(partes[2], 10) : null,
      descripcion,
      categoria,
      tallas,
      colores,
      tela,
      ubicacion_id: ubicacionId,
      minimo: 10,
    });

    const id = Number(info.lastInsertRowid);

    if (piezas > 0) {
      actualizarExistencia.run(piezas, id);
      insertarMovimiento.run(id, piezas, piezas, ubicacionId);
    }
  }
});

cargar();

const total = db.prepare("SELECT COUNT(*) AS n, SUM(existencia) AS p FROM modelos").get();
console.log(
  `Listo: ${total.n} modelos de ejemplo con ${total.p} piezas, en 18 ubicaciones (zonas A y B).`
);
console.log("Arranca el sistema con: npm run dev");

db.close();
