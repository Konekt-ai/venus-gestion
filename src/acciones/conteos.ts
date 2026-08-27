"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { aplicarMovimiento, ErrorInventario } from "@/lib/inventario";
import type { Resultado } from "@/lib/tipos";
import { exigirAcceso } from "@/lib/acceso";

function refrescar() {
  revalidatePath("/", "layout");
}

/**
 * Conteo fisico de bodega.
 *
 * Mientras el conteo esta abierto, capturar una cantidad NO toca el
 * inventario: solo se anota lo que se vio en el rack. Al cerrarlo se
 * comparan las cifras y se ajustan de golpe, dejando el rastro de la
 * diferencia. Asi se puede contar en varios ratos sin romper nada.
 */
export async function iniciarConteo(nombre: string, nota = ""): Promise<Resultado<number>> {
  await exigirAcceso();
  const db = getDb();

  const abierto = db.prepare("SELECT id FROM conteos WHERE estado = 'abierto'").get() as
    | { id: number }
    | undefined;

  if (abierto) {
    return { ok: false, error: "Ya hay un conteo abierto. Cierralo antes de empezar otro." };
  }

  const titulo = nombre.trim() || `Conteo del ${new Date().toLocaleDateString("es-MX")}`;
  const info = db
    .prepare("INSERT INTO conteos (nombre, nota) VALUES (?, ?)")
    .run(titulo, nota.trim());

  refrescar();
  return { ok: true, datos: Number(info.lastInsertRowid), mensaje: "Conteo iniciado." };
}

/**
 * Anota cuantas piezas se vieron de un modelo.
 * Guarda tambien lo que el sistema esperaba en ese momento, para que
 * la diferencia quede clara aunque despues haya otros movimientos.
 */
export async function anotarConteo(
  conteoId: number,
  modeloId: number,
  contado: number
): Promise<Resultado<{ esperado: number; diferencia: number }>> {
  await exigirAcceso();
  const db = getDb();

  if (!Number.isInteger(contado) || contado < 0) {
    return { ok: false, error: "La cantidad contada debe ser 0 o mas." };
  }

  const conteo = db.prepare("SELECT estado FROM conteos WHERE id = ?").get(conteoId) as
    | { estado: string }
    | undefined;

  if (!conteo) return { ok: false, error: "No se encontro el conteo." };
  if (conteo.estado !== "abierto") return { ok: false, error: "Ese conteo ya esta cerrado." };

  const modelo = db.prepare("SELECT existencia FROM modelos WHERE id = ?").get(modeloId) as
    | { existencia: number }
    | undefined;

  if (!modelo) return { ok: false, error: "No se encontro el modelo." };

  db.prepare(
    `INSERT INTO conteo_lineas (conteo_id, modelo_id, esperado, contado)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(conteo_id, modelo_id) DO UPDATE SET
       contado  = excluded.contado,
       esperado = excluded.esperado,
       fecha    = datetime('now','localtime')`
  ).run(conteoId, modeloId, modelo.existencia, contado);

  refrescar();
  return {
    ok: true,
    datos: { esperado: modelo.existencia, diferencia: contado - modelo.existencia },
  };
}

export async function borrarLineaConteo(conteoId: number, modeloId: number): Promise<Resultado> {
  await exigirAcceso();
  const db = getDb();
  db.prepare("DELETE FROM conteo_lineas WHERE conteo_id = ? AND modelo_id = ?").run(
    conteoId,
    modeloId
  );
  refrescar();
  return { ok: true, mensaje: "Se quito del conteo." };
}

/**
 * Cierra el conteo y aplica las diferencias al inventario.
 * Solo se ajustan los modelos cuya cantidad contada difiere de la
 * existencia actual; los que cuadran no generan movimiento.
 */
export async function cerrarConteo(
  conteoId: number
): Promise<Resultado<{ ajustados: number; sinCambio: number }>> {
  await exigirAcceso();
  const db = getDb();

  const conteo = db.prepare("SELECT estado FROM conteos WHERE id = ?").get(conteoId) as
    | { estado: string }
    | undefined;

  if (!conteo) return { ok: false, error: "No se encontro el conteo." };
  if (conteo.estado !== "abierto") return { ok: false, error: "Ese conteo ya estaba cerrado." };

  try {
    const r = db.transaction(() => {
      const lineas = db
        .prepare(
          `SELECT cl.modelo_id, cl.contado, m.existencia
           FROM conteo_lineas cl
           JOIN modelos m ON m.id = cl.modelo_id
           WHERE cl.conteo_id = ?`
        )
        .all(conteoId) as { modelo_id: number; contado: number; existencia: number }[];

      let ajustados = 0;
      let sinCambio = 0;

      for (const linea of lineas) {
        if (linea.contado === linea.existencia) {
          sinCambio++;
          continue;
        }

        const diferencia = linea.contado - linea.existencia;
        aplicarMovimiento(db, {
          modeloId: linea.modelo_id,
          tipo: "conteo",
          cantidad: linea.contado,
          nota: `Conteo fisico: ${diferencia > 0 ? "+" : ""}${diferencia} contra lo registrado`,
        });
        ajustados++;
      }

      db.prepare(
        "UPDATE conteos SET estado = 'cerrado', cerrado_en = datetime('now','localtime') WHERE id = ?"
      ).run(conteoId);

      return { ajustados, sinCambio };
    })();

    refrescar();
    return {
      ok: true,
      datos: r,
      mensaje: `Conteo cerrado: ${r.ajustados} ${
        r.ajustados === 1 ? "modelo ajustado" : "modelos ajustados"
      }, ${r.sinCambio} sin cambio.`,
    };
  } catch (e) {
    if (e instanceof ErrorInventario) return { ok: false, error: e.message };
    return { ok: false, error: "No se pudo cerrar el conteo." };
  }
}

/** Cancela un conteo sin aplicar ninguna diferencia. */
export async function cancelarConteo(conteoId: number): Promise<Resultado> {
  await exigirAcceso();
  const db = getDb();
  db.prepare("DELETE FROM conteos WHERE id = ? AND estado = 'abierto'").run(conteoId);
  refrescar();
  return { ok: true, mensaje: "Se cancelo el conteo. No se cambio ninguna existencia." };
}
