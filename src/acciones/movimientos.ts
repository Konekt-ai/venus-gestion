"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { aplicarMovimiento, ErrorInventario, siguienteFolio } from "@/lib/inventario";
import type { Destino, Resultado, TipoMovimiento } from "@/lib/tipos";

function refrescar() {
  revalidatePath("/", "layout");
}

/** Movimiento suelto desde la ficha del modelo. */
export async function registrarMovimiento(datos: {
  modeloId: number;
  tipo: TipoMovimiento;
  cantidad: number;
  persona?: string;
  nota?: string;
}): Promise<Resultado<{ antes: number; despues: number }>> {
  const db = getDb();
  try {
    const r = db.transaction(() => aplicarMovimiento(db, datos))();
    refrescar();
    return { ok: true, datos: r, mensaje: `Quedan ${r.despues} piezas en bodega.` };
  } catch (e) {
    if (e instanceof ErrorInventario) return { ok: false, error: e.message };
    return { ok: false, error: "No se pudo registrar el movimiento." };
  }
}

export type LineaEnvio = { modeloId: number; cantidad: number };

/**
 * Registra un envio completo a tienda o tianguis (o su retorno) en una
 * sola operacion: o pasan todas las lineas, o no pasa ninguna.
 *
 * Esto sustituye la hoja del cuaderno con la que hoy comparan bodega
 * contra tienda: al terminar queda una remision con folio, imprimible.
 */
export async function registrarRemision(datos: {
  destino: Destino;
  tipo: "envio" | "retorno";
  persona?: string;
  nota?: string;
  lineas: LineaEnvio[];
}): Promise<Resultado<{ remisionId: number; folio: string }>> {
  const db = getDb();

  const lineas = datos.lineas.filter((l) => l.cantidad > 0);
  if (lineas.length === 0) {
    return { ok: false, error: "Agrega al menos un modelo con cantidad." };
  }

  const tipoMovimiento: TipoMovimiento =
    datos.tipo === "envio"
      ? datos.destino === "TIENDA"
        ? "salida_tienda"
        : "salida_tianguis"
      : datos.destino === "TIENDA"
        ? "retorno_tienda"
        : "retorno_tianguis";

  try {
    const resultado = db.transaction(() => {
      const folio = siguienteFolio(db, datos.destino);
      const totalPiezas = lineas.reduce((s, l) => s + l.cantidad, 0);

      const info = db
        .prepare(
          `INSERT INTO remisiones (folio, destino, tipo, persona, nota, estado, total_piezas)
           VALUES (?, ?, ?, ?, ?, 'cerrada', ?)`
        )
        .run(
          folio,
          datos.destino,
          datos.tipo,
          (datos.persona ?? "").trim(),
          (datos.nota ?? "").trim(),
          totalPiezas
        );

      const remisionId = Number(info.lastInsertRowid);

      for (const linea of lineas) {
        aplicarMovimiento(db, {
          modeloId: linea.modeloId,
          tipo: tipoMovimiento,
          cantidad: linea.cantidad,
          persona: datos.persona,
          nota: datos.nota,
          remisionId,
        });
      }

      db.prepare("UPDATE remisiones SET cerrada_en = datetime('now','localtime') WHERE id = ?").run(
        remisionId
      );

      return { remisionId, folio };
    })();

    refrescar();
    return {
      ok: true,
      datos: resultado,
      mensaje: `Se registro la remision ${resultado.folio}.`,
    };
  } catch (e) {
    if (e instanceof ErrorInventario) return { ok: false, error: e.message };
    return { ok: false, error: "No se pudo registrar la remision." };
  }
}

/** Entrada de mercancia nueva a bodega, varios modelos de una vez. */
export async function registrarEntrada(datos: {
  persona?: string;
  nota?: string;
  lineas: LineaEnvio[];
}): Promise<Resultado<{ modelos: number; piezas: number }>> {
  const db = getDb();
  const lineas = datos.lineas.filter((l) => l.cantidad > 0);

  if (lineas.length === 0) {
    return { ok: false, error: "Agrega al menos un modelo con cantidad." };
  }

  try {
    db.transaction(() => {
      for (const linea of lineas) {
        aplicarMovimiento(db, {
          modeloId: linea.modeloId,
          tipo: "entrada",
          cantidad: linea.cantidad,
          persona: datos.persona,
          nota: datos.nota,
        });
      }
    })();

    refrescar();
    const piezas = lineas.reduce((s, l) => s + l.cantidad, 0);
    return {
      ok: true,
      datos: { modelos: lineas.length, piezas },
      mensaje: `Entraron ${piezas} piezas de ${lineas.length} ${
        lineas.length === 1 ? "modelo" : "modelos"
      }.`,
    };
  } catch (e) {
    if (e instanceof ErrorInventario) return { ok: false, error: e.message };
    return { ok: false, error: "No se pudo registrar la entrada." };
  }
}
