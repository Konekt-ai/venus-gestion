import "server-only";
import Database from "better-sqlite3";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ESQUEMA } from "./esquema";
import { sembrarCatalogo, sembrarDemostracion } from "./siembra";

/**
 * Conexion unica a la base de datos.
 *
 * Hay dos formas de correr el sistema:
 *
 *   BODEGA (lo normal)
 *     La base vive en <proyecto>/data/venus.db y es TODO el sistema:
 *     copiar ese archivo a una USB es respaldar el inventario completo.
 *
 *   DEMOSTRACION (VENUS_DEMO=1, o cualquier despliegue en Vercel)
 *     Es un escaparate para ensenar el sistema. Alla el disco es de solo
 *     lectura salvo /tmp, y ese /tmp se borra cuando el servidor recicla
 *     la instancia. Por eso la base se crea vacia, se llena sola con los
 *     datos de ejemplo, y se acepta que se reinicie de vez en cuando.
 *     No sirve para llevar un inventario de verdad, y la pantalla lo dice.
 */

/**
 * En la demostracion los datos son de mentiras y se pueden perder.
 * Vercel siempre expone VERCEL, asi que alla es demo aunque se olvide
 * poner la variable.
 */
export const MODO_DEMO = process.env.VENUS_DEMO === "1" || Boolean(process.env.VERCEL);

const CARPETA_DATOS = path.join(process.cwd(), "data");

/**
 * En la demostracion lo unico escribible es la carpeta temporal del
 * sistema; el resto del disco es de solo lectura. Que dependa de
 * MODO_DEMO y no de VERCEL permite ademas probar la demo en la propia
 * computadora sin tocar el inventario de data/venus.db.
 * VENUS_DB apunta a otro archivo (lo usan las pruebas).
 */
const RUTA_DB =
  process.env.VENUS_DB ??
  (MODO_DEMO ? path.join(os.tmpdir(), "venus-demo.db") : path.join(CARPETA_DATOS, "venus.db"));

// En desarrollo Next recarga los modulos en caliente; sin este cache
// se abririan decenas de conexiones al mismo archivo.
const global_ = globalThis as unknown as { __venusDb?: Database.Database };

function abrir(): Database.Database {
  try {
    fs.mkdirSync(path.dirname(RUTA_DB), { recursive: true });
  } catch {
    // En la demostracion la carpeta temporal ya existe y el resto del
    // disco es de solo lectura: no hay nada que crear ni por que fallar.
  }

  const db = new Database(RUTA_DB);

  if (MODO_DEMO) {
    // Un solo proceso escribe esta base y nadie mas la toca: WAL no
    // aporta y deja archivos sueltos. DELETE borra su bitacora al
    // confirmar y aguanta que el servidor corte el proceso a media
    // escritura, cosa que MEMORY no hace.
    db.pragma("journal_mode = DELETE");
  } else {
    // WAL permite leer mientras alguien escribe: varias personas pueden
    // estar consultando desde el celular sin trabar a quien captura.
    db.pragma("journal_mode = WAL");
  }

  db.pragma("foreign_keys = ON");
  // Espera hasta 5s si la base esta ocupada en vez de fallar de inmediato.
  db.pragma("busy_timeout = 5000");

  db.exec(ESQUEMA);
  sembrarCatalogos(db);

  // El catalogo del cliente se carga solo la primera vez, en la bodega y
  // en la demostracion por igual: un sistema vacio no le sirve a nadie.
  // Va aqui dentro y no en getDb() para que ocurra una sola vez por
  // instancia, en la misma pasada en que se crea el archivo.
  try {
    sembrarCatalogo(db);
    // En la demostracion ademas se inventan ubicaciones y existencias,
    // para que se vea como se veria una bodega ya acomodada.
    if (MODO_DEMO) sembrarDemostracion(db);
  } catch (e) {
    // Que el sistema no se caiga por no poder sembrar: es preferible
    // abrirlo vacio que con un error en pantalla.
    console.error("No se pudo cargar el catalogo inicial:", e);
  }

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
