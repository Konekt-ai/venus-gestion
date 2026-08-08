import "server-only";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { ESQUEMA } from "./esquema";

/**
 * Conexion unica a la base de datos.
 *
 * El archivo vive en  <proyecto>/data/venus.db  y es TODO el sistema:
 * copiarlo a una USB es respaldar el inventario completo.
 */

const CARPETA_DATOS = path.join(process.cwd(), "data");
const RUTA_DB = process.env.VENUS_DB ?? path.join(CARPETA_DATOS, "venus.db");

// En desarrollo Next recarga los modulos en caliente; sin este cache
// se abririan decenas de conexiones al mismo archivo.
const global_ = globalThis as unknown as { __venusDb?: Database.Database };

function abrir(): Database.Database {
  fs.mkdirSync(path.dirname(RUTA_DB), { recursive: true });

  const db = new Database(RUTA_DB);

  // WAL permite leer mientras alguien escribe: varias personas pueden
  // estar consultando desde el celular sin trabar a quien captura.
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  // Espera hasta 5s si la base esta ocupada en vez de fallar de inmediato.
  db.pragma("busy_timeout = 5000");

  db.exec(ESQUEMA);
  sembrarCatalogos(db);

  return db;
}

export function getDb(): Database.Database {
  if (!global_.__venusDb) global_.__venusDb = abrir();
  return global_.__venusDb;
}

export const RUTA_BASE_DATOS = RUTA_DB;
export const CARPETA_DE_DATOS = CARPETA_DATOS;

/**
 * Valores iniciales de los catalogos, tomados del cuaderno del cliente.
 * Solo se insertan si no existen: nunca pisa lo que el usuario agrego.
 */
function sembrarCatalogos(db: Database.Database) {
  const yaHay = db.prepare("SELECT COUNT(*) AS n FROM catalogos").get() as { n: number };
  if (yaHay.n > 0) return;

  const insertar = db.prepare(
    "INSERT OR IGNORE INTO catalogos (tipo, valor, orden) VALUES (?, ?, ?)"
  );

  const datos: Record<string, string[]> = {
    talla: ["CH", "M", "GDE", "XL", "2XL", "3XL", "UNITALLA", "VARIADO"],
    tela: ["POWER SATEN", "TECNO CREPE", "BARBIE TWILL"],
    color: [
      "VARIADO",
      "COLORES BASICOS",
      "NEGRO",
      "BLANCO",
      "BEIGE",
      "ROJO",
      "AZUL",
      "VERDE",
      "ROSA",
      "VINO",
    ],
    categoria: ["VESTIDO", "PANTALON", "BLUSA", "BLAZER", "CONJUNTO", "FALDA", "PALAZZO"],
  };

  const tx = db.transaction(() => {
    for (const [tipo, valores] of Object.entries(datos)) {
      valores.forEach((valor, i) => insertar.run(tipo, valor, i));
    }
  });
  tx();
}
