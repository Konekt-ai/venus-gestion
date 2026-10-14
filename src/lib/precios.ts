import "server-only";
import type Database from "better-sqlite3";
import { getDb } from "./db";

/**
 * Los precios de venta.
 *
 * NO son de bodega: viven en caja_precios, una tabla de la caja de la
 * tienda, que trabaja sobre este mismo archivo. Bodega los lee y los
 * escribe para que el dueno pueda corregir un precio sin ir a la caja,
 * pero NUNCA crea la tabla.
 *
 * Esa regla importa: si bodega la creara por su cuenta y manana la caja
 * cambiara su definicion, quedarian dos tablas distintas con el mismo
 * nombre segun quien llego primero, y eso no se arregla solo. Ademas un
 * precio sin caja no le sirve a nadie.
 */

/** Un precio nunca pasa de esto: arriba, casi siempre es un cero de mas. */
const TOPE_CENTAVOS = 5_000_000;

/**
 * Solo se recuerda el SI, nunca el no.
 *
 * Si se guardara que la tabla no existe, el dia que instalen la caja los
 * precios seguirian invisibles hasta reiniciar bodega, y nadie ataria
 * una cosa con la otra.
 */
let hayTabla = false;

export function hayTablaPrecios(): boolean {
  if (hayTabla) return true;
  const fila = getDb()
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'caja_precios'")
    .get();
  if (fila) hayTabla = true;
  return hayTabla;
}

/** El precio de una prenda en centavos, o null si no tiene. */
export function precioDeModelo(modeloId: number): number | null {
  if (!hayTablaPrecios()) return null;
  const fila = getDb()
    .prepare("SELECT precio FROM caja_precios WHERE modelo_id = ?")
    .get(modeloId) as { precio: number } | undefined;
  return fila ? fila.precio : null;
}

/**
 * Los precios de varias prendas de un jalon, en centavos.
 *
 * Solo trae las que tienen precio de verdad: una prenda que no esta en
 * el mapa no tiene precio, y un cero cuenta igual que no tenerlo (la
 * caja no deja vender en cero). Asi quien pregunta no tiene que
 * acordarse de las dos formas de "sin precio".
 */
export function preciosDeModelos(ids: number[]): Map<number, number> {
  const precios = new Map<number, number>();
  if (!hayTablaPrecios()) return precios;

  const limpios = [...new Set(ids)].filter((n) => Number.isInteger(n) && n > 0);
  if (limpios.length === 0) return precios;

  const filas = getDb()
    .prepare(
      `SELECT modelo_id, precio FROM caja_precios
        WHERE precio > 0 AND modelo_id IN (${limpios.map(() => "?").join(",")})`
    )
    .all(...limpios) as { modelo_id: number; precio: number }[];

  for (const f of filas) precios.set(f.modelo_id, f.precio);
  return precios;
}

/**
 * Pone o quita el precio de una prenda.
 *
 * Recibe la conexion por parametro para poder correr dentro de la misma
 * transaccion que guarda el modelo: o se guardan los dos cambios o no
 * se guarda ninguno.
 *
 * El SQL es copia textual del que usa la caja. Si los dos escribieran
 * distinto (por ejemplo sin actualizar actualizado_en), la caja no se
 * enteraria de que el precio cambio.
 */
export function guardarPrecio(
  db: Database.Database,
  modeloId: number,
  centavos: number | null
): void {
  if (!hayTablaPrecios()) return;

  // Sin precio se BORRA el renglon, nunca se guarda cero: un cero se
  // cobraria como regalada, y ademas la caja rechaza una venta cuyo
  // subtotal queda en cero, asi que la prenda no se podria vender.
  if (centavos === null) {
    db.prepare("DELETE FROM caja_precios WHERE modelo_id = ?").run(modeloId);
    return;
  }

  const limpio = Math.min(TOPE_CENTAVOS, Math.max(0, Math.round(centavos)));
  db.prepare(
    `INSERT INTO caja_precios (modelo_id, precio) VALUES (?, ?)
     ON CONFLICT(modelo_id) DO UPDATE SET precio = excluded.precio,
       actualizado_en = datetime('now','localtime')`
  ).run(modeloId, limpio);
}
