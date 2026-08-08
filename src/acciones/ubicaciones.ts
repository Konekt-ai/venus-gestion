"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { normalizarCodigo, normalizarTexto } from "@/lib/codigos";
import type { Resultado } from "@/lib/tipos";

function refrescar() {
  revalidatePath("/", "layout");
}

/** Arma el codigo visible de una ubicacion: zona A, rack 01, nivel 2 -> "A-01-2". */
function armarCodigo(zona: string, rack: string, nivel: string): string {
  return [zona, rack, nivel]
    .map((p) => normalizarCodigo(p))
    .filter(Boolean)
    .join("-");
}

export async function guardarUbicacion(
  _previo: unknown,
  form: FormData
): Promise<Resultado<number>> {
  const db = getDb();

  const id = parseInt(String(form.get("id") ?? "0"), 10) || 0;
  const zona = normalizarTexto(String(form.get("zona") ?? ""));
  const rack = normalizarTexto(String(form.get("rack") ?? ""));
  const nivel = normalizarTexto(String(form.get("nivel") ?? ""));
  const descripcion = String(form.get("descripcion") ?? "").trim();

  if (!zona) return { ok: false, error: "La zona es obligatoria (por ejemplo A, B o ENTRADA)." };

  const codigo = armarCodigo(zona, rack, nivel);
  if (!codigo) return { ok: false, error: "No se pudo formar el codigo de la ubicacion." };

  const choque = db
    .prepare("SELECT id FROM ubicaciones WHERE codigo = ? AND id <> ?")
    .get(codigo, id) as { id: number } | undefined;

  if (choque) return { ok: false, error: `La ubicacion ${codigo} ya existe.` };

  if (id > 0) {
    db.prepare(
      `UPDATE ubicaciones SET codigo = ?, zona = ?, rack = ?, nivel = ?, descripcion = ?
       WHERE id = ?`
    ).run(codigo, zona, rack, nivel, descripcion, id);
    refrescar();
    return { ok: true, datos: id, mensaje: `Se guardo la ubicacion ${codigo}.` };
  }

  const info = db
    .prepare(
      "INSERT INTO ubicaciones (codigo, zona, rack, nivel, descripcion) VALUES (?, ?, ?, ?, ?)"
    )
    .run(codigo, zona, rack, nivel, descripcion);

  refrescar();
  return {
    ok: true,
    datos: Number(info.lastInsertRowid),
    mensaje: `Se creo la ubicacion ${codigo}.`,
  };
}

/**
 * Crea muchas ubicaciones de golpe.
 * Ej. zona "A", racks 1 a 5, niveles 1 a 4 -> A-01-1 ... A-05-4 (20 lugares).
 * Sirve para dejar la bodega mapeada en un minuto la primera vez.
 */
export async function generarUbicaciones(datos: {
  zona: string;
  rackDesde: number;
  rackHasta: number;
  nivelDesde: number;
  nivelHasta: number;
}): Promise<Resultado<{ creadas: number; repetidas: number }>> {
  const db = getDb();
  const zona = normalizarTexto(datos.zona);

  if (!zona) return { ok: false, error: "Escribe el nombre de la zona." };
  if (datos.rackHasta < datos.rackDesde || datos.nivelHasta < datos.nivelDesde) {
    return { ok: false, error: "Revisa los rangos: el final no puede ser menor que el inicio." };
  }

  const totalRacks = datos.rackHasta - datos.rackDesde + 1;
  const totalNiveles = datos.nivelHasta - datos.nivelDesde + 1;

  if (totalRacks * totalNiveles > 500) {
    return { ok: false, error: "Son demasiadas ubicaciones de una vez (maximo 500)." };
  }

  let creadas = 0;
  let repetidas = 0;

  db.transaction(() => {
    const insertar = db.prepare(
      "INSERT OR IGNORE INTO ubicaciones (codigo, zona, rack, nivel, orden) VALUES (?, ?, ?, ?, ?)"
    );

    let orden = 0;
    for (let r = datos.rackDesde; r <= datos.rackHasta; r++) {
      for (let n = datos.nivelDesde; n <= datos.nivelHasta; n++) {
        const rack = String(r).padStart(2, "0");
        const nivel = String(n);
        const codigo = armarCodigo(zona, rack, nivel);
        const info = insertar.run(codigo, zona, rack, nivel, orden++);
        if (info.changes > 0) creadas++;
        else repetidas++;
      }
    }
  })();

  refrescar();
  return {
    ok: true,
    datos: { creadas, repetidas },
    mensaje:
      `Se crearon ${creadas} ubicaciones en la zona ${zona}.` +
      (repetidas > 0 ? ` (${repetidas} ya existian)` : ""),
  };
}

/**
 * Elimina una ubicacion. Los modelos que estaban ahi no se borran:
 * quedan como "sin ubicacion" para reasignarlos.
 */
export async function eliminarUbicacion(id: number): Promise<Resultado> {
  const db = getDb();

  const enUso = db
    .prepare("SELECT COUNT(*) AS n FROM modelos WHERE ubicacion_id = ? AND activo = 1")
    .get(id) as { n: number };

  db.prepare("DELETE FROM ubicaciones WHERE id = ?").run(id);
  refrescar();

  return {
    ok: true,
    mensaje:
      enUso.n > 0
        ? `Se elimino la ubicacion. ${enUso.n} ${
            enUso.n === 1 ? "modelo quedo" : "modelos quedaron"
          } sin ubicacion.`
        : "Se elimino la ubicacion.",
  };
}

/** Mueve todos los modelos de una ubicacion a otra. */
export async function moverUbicacionCompleta(
  origenId: number,
  destinoId: number | null
): Promise<Resultado> {
  const db = getDb();
  const info = db
    .prepare(
      "UPDATE modelos SET ubicacion_id = ?, actualizado_en = datetime('now','localtime') WHERE ubicacion_id = ?"
    )
    .run(destinoId, origenId);

  refrescar();
  return {
    ok: true,
    mensaje: `Se movieron ${info.changes} ${info.changes === 1 ? "modelo" : "modelos"}.`,
  };
}
