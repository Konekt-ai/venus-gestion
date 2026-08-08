/**
 * Carga datos de ejemplo para probar el sistema.
 *
 *   npm run datos:ejemplo                 carga los datos
 *   npm run datos:ejemplo -- --limpiar    borra todo y vuelve a cargar
 *
 * La lista de modelos vive en src/lib/ejemplo.ts, que es la misma que usa
 * la demostracion publica: asi no hay dos copias que se desincronicen.
 *
 * Node 24 lee archivos .ts directamente; el cargador resuelve las rutas
 * sin extension que usa el codigo de la app.
 */
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { register } from "node:module";

register("./cargador-ts.mjs", import.meta.url);

const { ESQUEMA } = await import("../src/lib/esquema.ts");
const { sembrarEjemplo } = await import("../src/lib/ejemplo.ts");

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
    DELETE FROM lineas;
    DELETE FROM config;
  `);
  console.log("Se borraron los datos anteriores.");
}

const cargados = sembrarEjemplo(db);

if (cargados === 0) {
  const n = db.prepare("SELECT COUNT(*) AS n FROM modelos").get().n;
  console.log(
    `Ya hay ${n} modelos en la base. No se toco nada.\n` +
      "Si quieres empezar de cero: npm run datos:ejemplo -- --limpiar"
  );
  db.close();
  process.exit(0);
}

const total = db.prepare("SELECT COUNT(*) AS n, SUM(existencia) AS p FROM modelos").get();
const ubicaciones = db.prepare("SELECT COUNT(*) AS n FROM ubicaciones").get();

console.log(
  `Listo: ${total.n} modelos de ejemplo con ${total.p} piezas, ` +
    `en ${ubicaciones.n} ubicaciones (zonas A y B).`
);
console.log("Arranca el sistema con: npm run dev");

db.close();
