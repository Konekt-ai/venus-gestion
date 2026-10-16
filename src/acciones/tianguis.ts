"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { aplicarMovimiento, ErrorInventario } from "@/lib/inventario";
import { precioDeModelo } from "@/lib/precios";
import { exigirAcceso } from "@/lib/acceso";
import type { Resultado } from "@/lib/tipos";

/** El mismo tope que usa la caja: arriba, casi siempre es un cero de mas. */
const TOPE_CENTAVOS = 5_000_000;

function refrescar() {
  revalidatePath("/", "layout");
}

function piezas(n: number) {
  return `${n} ${n === 1 ? "pieza" : "piezas"}`;
}

/**
 * Registra una venta del tianguis.
 *
 * El precio llega en centavos y es por pieza. Si es distinto al
 * registrado, solo cuenta para esta venta: el precio de la prenda (el
 * que usan la caja y las etiquetas) no se toca.
 */
export async function registrarVentaTianguis(datos: {
  modeloId: number;
  piezas: number;
  precio: number;
  persona?: string;
}): Promise<Resultado<{ quedan: number; ventaId: number }>> {
  await exigirAcceso();

  if (!Number.isInteger(datos.piezas) || datos.piezas <= 0) {
    return { ok: false, error: "Escribe cuantas piezas se vendieron." };
  }
  if (!Number.isInteger(datos.precio) || datos.precio <= 0) {
    return { ok: false, error: "Escribe el precio al que se vendio." };
  }
  if (datos.precio > TOPE_CENTAVOS) {
    return { ok: false, error: "Ese precio se ve demasiado alto. Revisalo." };
  }

  const db = getDb();
  try {
    const r = db.transaction(() => {
      const mov = aplicarMovimiento(db, {
        modeloId: datos.modeloId,
        tipo: "venta_tianguis",
        cantidad: datos.piezas,
        persona: datos.persona,
      });

      const venta = db.prepare(
        `INSERT INTO tianguis_ventas (modelo_id, piezas, precio, precio_lista, persona, movimiento_id)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(
        datos.modeloId,
        datos.piezas,
        datos.precio,
        precioDeModelo(datos.modeloId),
        (datos.persona ?? "").trim(),
        mov.movimientoId
      );

      const m = db.prepare("SELECT codigo FROM modelos WHERE id = ?").get(datos.modeloId) as {
        codigo: string;
      };
      return {
        codigo: m.codigo,
        quedan: mov.cuentas.tianguis,
        ventaId: Number(venta.lastInsertRowid),
      };
    })();

    refrescar();
    return {
      ok: true,
      datos: { quedan: r.quedan, ventaId: r.ventaId },
      mensaje: `Vendiste ${piezas(datos.piezas)} de ${r.codigo}. Quedan ${r.quedan} en el tianguis.`,
    };
  } catch (e) {
    if (e instanceof ErrorInventario) return { ok: false, error: e.message };
    return { ok: false, error: "No se pudo registrar la venta. Intenta de nuevo." };
  }
}

/**
 * Cancela una venta que se registro por error: las piezas regresan a la
 * cuenta del tianguis. La venta no se borra, queda marcada.
 */
export async function cancelarVentaTianguis(ventaId: number): Promise<Resultado> {
  await exigirAcceso();
  const db = getDb();

  try {
    db.transaction(() => {
      const venta = db
        .prepare("SELECT modelo_id, piezas, estado FROM tianguis_ventas WHERE id = ?")
        .get(ventaId) as { modelo_id: number; piezas: number; estado: string } | undefined;

      if (!venta) throw new ErrorInventario("No se encontro esa venta.");
      if (venta.estado === "cancelada") throw new ErrorInventario("Esa venta ya estaba cancelada.");

      aplicarMovimiento(db, {
        modeloId: venta.modelo_id,
        tipo: "cancelacion_tianguis",
        cantidad: venta.piezas,
        nota: `Se cancelo la venta #${ventaId}`,
      });

      db.prepare(
        `UPDATE tianguis_ventas
            SET estado = 'cancelada', cancelada_en = datetime('now','localtime')
          WHERE id = ?`
      ).run(ventaId);
    })();

    refrescar();
    return { ok: true, mensaje: "Se cancelo la venta y las piezas regresaron al tianguis." };
  } catch (e) {
    if (e instanceof ErrorInventario) return { ok: false, error: e.message };
    return { ok: false, error: "No se pudo cancelar la venta." };
  }
}

export type LineaCierre = { modeloId: number; bodega: number; tienda: number };

/**
 * El cierre del dia: a donde se va lo que no se vendio.
 *
 * Cada renglon dice cuantas piezas de un modelo regresan a bodega y
 * cuantas se van a la tienda. Lo que no se mande a ningun lado se queda
 * en la cuenta del tianguis para el siguiente dia. Todo junto o nada.
 */
export async function registrarCierreTianguis(datos: {
  lineas: LineaCierre[];
  persona?: string;
}): Promise<Resultado<{ bodega: number; tienda: number }>> {
  await exigirAcceso();

  const lineas = (datos.lineas ?? []).filter((l) => l.bodega > 0 || l.tienda > 0);
  if (lineas.length === 0) {
    return { ok: false, error: "No hay piezas que mover: todo se queda en el tianguis." };
  }
  for (const l of lineas) {
    if (!Number.isInteger(l.bodega) || !Number.isInteger(l.tienda) || l.bodega < 0 || l.tienda < 0) {
      return { ok: false, error: "Las cantidades deben ser numeros enteros, 0 o mas." };
    }
  }

  const db = getDb();
  try {
    db.transaction(() => {
      for (const l of lineas) {
        if (l.bodega > 0) {
          aplicarMovimiento(db, {
            modeloId: l.modeloId,
            tipo: "retorno_tianguis",
            cantidad: l.bodega,
            persona: datos.persona,
            nota: "Cierre del tianguis",
          });
        }
        if (l.tienda > 0) {
          aplicarMovimiento(db, {
            modeloId: l.modeloId,
            tipo: "tianguis_a_tienda",
            cantidad: l.tienda,
            persona: datos.persona,
            nota: "Cierre del tianguis",
          });
        }
      }
    })();
  } catch (e) {
    // Lo mas comun: alguien vendio una pieza mientras se llenaba el
    // cierre y ya no alcanzan. Se avisa con el modelo y se recarga.
    if (e instanceof ErrorInventario) {
      return { ok: false, error: `${e.message} Recarga la pantalla para ver las piezas de ahora.` };
    }
    return { ok: false, error: "No se pudo registrar el cierre." };
  }

  refrescar();
  const bodega = lineas.reduce((s, l) => s + l.bodega, 0);
  const tienda = lineas.reduce((s, l) => s + l.tienda, 0);
  const partes = [
    bodega > 0 ? `${piezas(bodega)} a bodega` : "",
    tienda > 0 ? `${piezas(tienda)} a la tienda` : "",
  ].filter(Boolean);
  return { ok: true, datos: { bodega, tienda }, mensaje: `Listo: ${partes.join(" y ")}.` };
}
