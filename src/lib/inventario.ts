import "server-only";
import type Database from "better-sqlite3";
import { getDb } from "./db";
import type { Modelo, TipoMovimiento } from "./tipos";

/**
 * Motor de existencias.
 *
 * Toda modificacion de inventario pasa por aqui, para que nunca quede
 * un movimiento sin su cambio de existencia ni al reves. Cada tipo de
 * movimiento sabe como afecta a los tres contadores del modelo:
 * bodega, tienda y tianguis.
 */

type Efecto = { bodega: number; tienda: number; tianguis: number };

/** Cuanto suma o resta cada tipo de movimiento por pieza. */
const EFECTOS: Record<Exclude<TipoMovimiento, "conteo">, Efecto> = {
  entrada: { bodega: +1, tienda: 0, tianguis: 0 },
  salida_tienda: { bodega: -1, tienda: +1, tianguis: 0 },
  salida_tianguis: { bodega: -1, tienda: 0, tianguis: +1 },
  retorno_tienda: { bodega: +1, tienda: -1, tianguis: 0 },
  retorno_tianguis: { bodega: +1, tienda: 0, tianguis: -1 },
  ajuste: { bodega: +1, tienda: 0, tianguis: 0 }, // la cantidad lleva el signo
};

export class ErrorInventario extends Error {}

export type DatosMovimiento = {
  modeloId: number;
  tipo: TipoMovimiento;
  /**
   * Piezas del movimiento.
   * - 'ajuste' acepta negativo para descontar.
   * - 'conteo' es la existencia final, no una diferencia.
   * - los demas tipos deben ser mayores a cero.
   */
  cantidad: number;
  persona?: string;
  nota?: string;
  remisionId?: number | null;
};

/**
 * Aplica un movimiento y deja el historial escrito.
 * Debe llamarse dentro de una transaccion cuando se procesan varios.
 */
export function aplicarMovimiento(db: Database.Database, datos: DatosMovimiento) {
  const modelo = db.prepare("SELECT * FROM modelos WHERE id = ?").get(datos.modeloId) as
    | Modelo
    | undefined;

  if (!modelo) throw new ErrorInventario("No se encontro el modelo.");
  if (!Number.isInteger(datos.cantidad)) {
    throw new ErrorInventario("La cantidad debe ser un numero entero.");
  }

  const antes = modelo.existencia;
  let bodega = modelo.existencia;
  let tienda = modelo.en_tienda;
  let tianguis = modelo.en_tianguis;

  if (datos.tipo === "conteo") {
    if (datos.cantidad < 0) {
      throw new ErrorInventario("El conteo no puede ser negativo.");
    }
    bodega = datos.cantidad;
  } else {
    const efecto = EFECTOS[datos.tipo];
    if (!efecto) throw new ErrorInventario("Tipo de movimiento no valido.");

    if (datos.tipo === "ajuste") {
      if (datos.cantidad === 0) throw new ErrorInventario("El ajuste no puede ser cero.");
    } else if (datos.cantidad <= 0) {
      throw new ErrorInventario("La cantidad debe ser mayor a cero.");
    }

    bodega += efecto.bodega * datos.cantidad;
    tienda += efecto.tienda * datos.cantidad;
    tianguis += efecto.tianguis * datos.cantidad;
  }

  // Nunca se permite dejar existencias en negativo: significa que el
  // dato de partida estaba mal y hay que revisarlo, no arrastrarlo.
  if (bodega < 0) {
    throw new ErrorInventario(
      `No alcanza: ${modelo.codigo} tiene ${modelo.existencia} ${
        modelo.existencia === 1 ? "pieza" : "piezas"
      } en bodega.`
    );
  }
  if (tienda < 0) {
    throw new ErrorInventario(
      `${modelo.codigo} solo tiene ${modelo.en_tienda} en tienda; no puede regresar mas.`
    );
  }
  if (tianguis < 0) {
    throw new ErrorInventario(
      `${modelo.codigo} solo tiene ${modelo.en_tianguis} en tianguis; no puede regresar mas.`
    );
  }

  db.prepare(
    `UPDATE modelos
     SET existencia = ?, en_tienda = ?, en_tianguis = ?,
         actualizado_en = datetime('now','localtime')
     WHERE id = ?`
  ).run(bodega, tienda, tianguis, datos.modeloId);

  db.prepare(
    `INSERT INTO movimientos
       (modelo_id, tipo, cantidad, existencia_antes, existencia_despues,
        ubicacion_id, remision_id, persona, nota)
     VALUES (@modelo_id, @tipo, @cantidad, @antes, @despues,
             @ubicacion_id, @remision_id, @persona, @nota)`
  ).run({
    modelo_id: datos.modeloId,
    tipo: datos.tipo,
    cantidad: datos.cantidad,
    antes,
    despues: bodega,
    ubicacion_id: modelo.ubicacion_id,
    remision_id: datos.remisionId ?? null,
    persona: (datos.persona ?? "").trim(),
    nota: (datos.nota ?? "").trim(),
  });

  return { antes, despues: bodega };
}

/** Version suelta: abre su propia transaccion para un movimiento unico. */
export function registrarMovimientoUnico(datos: DatosMovimiento) {
  const db = getDb();
  const tx = db.transaction(() => aplicarMovimiento(db, datos));
  return tx();
}

/**
 * Genera el siguiente folio de remision, del estilo TIE-0007.
 * Se calcula dentro de la transaccion para que dos capturas
 * simultaneas no reciban el mismo numero.
 */
export function siguienteFolio(db: Database.Database, destino: string): string {
  const clave = `folio_${destino.toLowerCase()}`;
  const fila = db.prepare("SELECT valor FROM config WHERE clave = ?").get(clave) as
    | { valor: string }
    | undefined;

  const siguiente = (fila ? parseInt(fila.valor, 10) || 0 : 0) + 1;
  db.prepare(
    "INSERT INTO config (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor"
  ).run(clave, String(siguiente));

  const prefijo = destino === "TIENDA" ? "TIE" : "TIA";
  return `${prefijo}-${String(siguiente).padStart(4, "0")}`;
}
