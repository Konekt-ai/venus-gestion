import "server-only";
import type Database from "better-sqlite3";
import { getDb } from "./db";
import type { Modelo, TipoMovimiento } from "./tipos";
import {
  EFECTOS,
  EN_LUGAR,
  LUGARES,
  lugarDelMovimiento,
  piezasEn,
  type Lugar,
} from "./lugares";

/**
 * Motor de existencias.
 *
 * Toda modificacion de inventario pasa por aqui, para que nunca quede
 * un movimiento sin su cambio de existencia ni al reves. Cada tipo de
 * movimiento sabe como afecta a las tres cuentas del modelo: bodega,
 * tienda y tianguis (ver EFECTOS en lugares.ts).
 */

export class ErrorInventario extends Error {}

/** Los tipos cuya cantidad trae el signo: pueden sumar o restar. */
const CON_SIGNO = new Set<TipoMovimiento>(["ajuste", "ajuste_tienda", "ajuste_tianguis"]);

export type DatosMovimiento = {
  modeloId: number;
  tipo: TipoMovimiento;
  /**
   * Piezas del movimiento.
   * - los ajustes aceptan negativo para descontar.
   * - 'conteo' es la existencia final de bodega, no una diferencia.
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
 * Devuelve la cuenta antes y despues del lugar del que habla el
 * movimiento (bodega, salvo los que no la tocan).
 */
export function aplicarMovimiento(db: Database.Database, datos: DatosMovimiento) {
  const modelo = db.prepare("SELECT * FROM modelos WHERE id = ?").get(datos.modeloId) as
    | Modelo
    | undefined;

  if (!modelo) throw new ErrorInventario("No se encontro el modelo.");
  if (!Number.isInteger(datos.cantidad)) {
    throw new ErrorInventario("La cantidad debe ser un numero entero.");
  }

  const cuentas: Record<Lugar, number> = {
    bodega: modelo.existencia,
    tienda: modelo.en_tienda,
    tianguis: modelo.en_tianguis,
  };
  const lugar = lugarDelMovimiento(datos.tipo);
  const antes = cuentas[lugar];

  if (datos.tipo === "conteo") {
    if (datos.cantidad < 0) {
      throw new ErrorInventario("El conteo no puede ser negativo.");
    }
    cuentas.bodega = datos.cantidad;
  } else {
    const efecto = EFECTOS[datos.tipo];
    if (!efecto) throw new ErrorInventario("Tipo de movimiento no valido.");

    if (CON_SIGNO.has(datos.tipo)) {
      if (datos.cantidad === 0) throw new ErrorInventario("La correccion no puede ser cero.");
    } else if (datos.cantidad <= 0) {
      throw new ErrorInventario("La cantidad debe ser mayor a cero.");
    }

    for (const l of LUGARES) cuentas[l] += efecto[l] * datos.cantidad;
  }

  // Nunca se permite dejar existencias en negativo: significa que el
  // dato de partida estaba mal y hay que revisarlo, no arrastrarlo.
  for (const l of LUGARES) {
    if (cuentas[l] >= 0) continue;
    const habia = piezasEn(modelo, l);
    throw new ErrorInventario(
      `No alcanza: ${modelo.codigo} tiene ${habia} ${habia === 1 ? "pieza" : "piezas"} ${EN_LUGAR[l]}.`
    );
  }

  db.prepare(
    `UPDATE modelos
     SET existencia = ?, en_tienda = ?, en_tianguis = ?,
         actualizado_en = datetime('now','localtime')
     WHERE id = ?`
  ).run(cuentas.bodega, cuentas.tienda, cuentas.tianguis, datos.modeloId);

  const info = db
    .prepare(
      `INSERT INTO movimientos
         (modelo_id, tipo, cantidad, existencia_antes, existencia_despues,
          remision_id, persona, nota)
       VALUES (@modelo_id, @tipo, @cantidad, @antes, @despues,
               @remision_id, @persona, @nota)`
    )
    .run({
      modelo_id: datos.modeloId,
      tipo: datos.tipo,
      cantidad: datos.cantidad,
      antes,
      despues: cuentas[lugar],
      remision_id: datos.remisionId ?? null,
      persona: (datos.persona ?? "").trim(),
      nota: (datos.nota ?? "").trim(),
    });

  return {
    antes,
    despues: cuentas[lugar],
    lugar,
    cuentas,
    movimientoId: Number(info.lastInsertRowid),
  };
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
