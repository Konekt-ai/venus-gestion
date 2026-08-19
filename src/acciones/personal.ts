"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { guardarAjuste } from "@/lib/ajustes";
import type { Resultado } from "@/lib/tipos";

/**
 * Personal del negocio.
 *
 * Se usa para firmar los movimientos: en vez de escribir el nombre a
 * mano cada vez que sale mercancia, se elige de una lista. Ademas deja
 * lista la informacion para el sistema de la caja, donde va a hacer
 * falta saber que vendedora hizo cada venta.
 */

function refrescar() {
  revalidatePath("/", "layout");
}

export async function guardarPersona(
  _previo: unknown,
  form: FormData
): Promise<Resultado<number>> {
  const db = getDb();

  const id = parseInt(String(form.get("id") ?? "0"), 10) || 0;
  const nombre = String(form.get("nombre") ?? "").trim();
  const puesto = String(form.get("puesto") ?? "").trim();

  if (!nombre) return { ok: false, error: "Escribe el nombre." };
  if (nombre.length > 60) return { ok: false, error: "El nombre es demasiado largo." };

  const repetido = db
    .prepare("SELECT id FROM personal WHERE lower(nombre) = lower(?) AND id <> ?")
    .get(nombre, id) as { id: number } | undefined;

  if (repetido) return { ok: false, error: `${nombre} ya esta en la lista.` };

  if (id > 0) {
    db.prepare("UPDATE personal SET nombre = ?, puesto = ? WHERE id = ?").run(nombre, puesto, id);
    refrescar();
    return { ok: true, datos: id, mensaje: `Se guardo ${nombre}.` };
  }

  const info = db
    .prepare("INSERT INTO personal (nombre, puesto) VALUES (?, ?)")
    .run(nombre, puesto);

  refrescar();
  return {
    ok: true,
    datos: Number(info.lastInsertRowid),
    mensaje: `Se agrego a ${nombre}.`,
  };
}

/**
 * Da de baja a alguien sin borrarlo: los movimientos que ya firmo
 * conservan su nombre y el historial sigue teniendo sentido.
 */
export async function cambiarEstadoPersona(id: number, activo: boolean): Promise<Resultado> {
  const db = getDb();
  db.prepare("UPDATE personal SET activo = ? WHERE id = ?").run(activo ? 1 : 0, id);
  refrescar();
  return { ok: true, mensaje: activo ? "Se reactivo." : "Se dio de baja." };
}

/** Prende o apaga el manejo de tianguis en todo el sistema. */
export async function cambiarUsoTianguis(usar: boolean): Promise<Resultado> {
  guardarAjuste("usa_tianguis", usar ? "1" : "0");
  refrescar();
  return {
    ok: true,
    mensaje: usar
      ? "Ya se puede mandar mercancia al tianguis."
      : "Se oculto el tianguis. Lo registrado no se borro.",
  };
}
