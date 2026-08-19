/**
 * Deja la base lista para trabajar o para ensenar el sistema.
 *
 *   npm run datos                    carga el catalogo del cliente (sin existencias)
 *   npm run datos -- --demo          ademas inventa ubicaciones y existencias
 *   npm run datos -- --limpiar       borra todo y vuelve a empezar
 *
 * El catalogo real vive en src/datos/catalogo.json y se genera del PDF
 * del cliente con  npm run catalogo.
 *
 * En la bodega esto no hace falta: el sistema carga el catalogo solo la
 * primera vez que se abre. Este script es para pruebas y para rearmar la
 * demostracion.
 */
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { register } from "node:module";

register("./cargador-ts.mjs", import.meta.url);

const { ESQUEMA } = await import("../src/lib/esquema.ts");
const { sembrarCatalogo, sembrarDemostracion } = await import("../src/lib/siembra.ts");

const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const rutaDb = process.env.VENUS_DB ?? path.join(raiz, "data", "venus.db");
const limpiar = process.argv.includes("--limpiar");
const conExistencias = process.argv.includes("--demo");

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

const cargados = sembrarCatalogo(db);

if (cargados === 0 && !limpiar) {
  const n = db.prepare("SELECT COUNT(*) AS n FROM modelos").get().n;
  console.log(
    `Ya hay ${n} modelos en la base. No se toco nada.\n` +
      "Si quieres empezar de cero: npm run datos -- --limpiar"
  );
  db.close();
  process.exit(0);
}

if (conExistencias) sembrarDemostracion(db);

const total = db
  .prepare("SELECT COUNT(*) AS n, COALESCE(SUM(existencia),0) AS p FROM modelos")
  .get();
const ubicaciones = db.prepare("SELECT COUNT(*) AS n FROM ubicaciones").get();

console.log(`Listo: ${total.n} modelos del catalogo, ${total.p} piezas.`);
if (ubicaciones.n) console.log(`       ${ubicaciones.n} ubicaciones.`);

if (!conExistencias) {
  console.log("");
  console.log("Los modelos entraron sin existencias, que es lo correcto para la");
  console.log("bodega: el catalogo dice QUE se vende, no CUANTO hay. El primer");
  console.log("conteo fisico pone las cantidades.");
}

console.log("");
console.log("Arranca el sistema con: npm run dev");

db.close();
