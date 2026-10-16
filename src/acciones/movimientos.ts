"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { aplicarMovimiento, ErrorInventario, siguienteFolio } from "@/lib/inventario";
import type { Destino, Modelo, Resultado, TipoMovimiento } from "@/lib/tipos";
import { exigirAcceso } from "@/lib/acceso";
import {
  EN_LUGAR,
  LUGARES,
  NOMBRE_LUGAR,
  piezasEn,
  tipoAjuste,
  tipoEntrada,
  tipoTraspaso,
  type Lugar,
} from "@/lib/lugares";

function esLugar(v: unknown): v is Lugar {
  return typeof v === "string" && (LUGARES as readonly string[]).includes(v);
}

function piezas(n: number) {
  return `${n} ${n === 1 ? "pieza" : "piezas"}`;
}

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
  await exigirAcceso();
  const db = getDb();
  try {
    const r = db.transaction(() => aplicarMovimiento(db, datos))();
    refrescar();
    return {
      ok: true,
      datos: { antes: r.antes, despues: r.despues },
      mensaje: `Quedan ${piezas(r.despues)} ${EN_LUGAR[r.lugar]}.`,
    };
  } catch (e) {
    if (e instanceof ErrorInventario) return { ok: false, error: e.message };
    return { ok: false, error: "No se pudo registrar el movimiento." };
  }
}

/**
 * Pasa piezas de un lugar a otro desde la ficha del modelo: "salieron 5
 * de bodega al tianguis", "regresaron 2 de la tienda".
 */
export async function moverPiezas(datos: {
  modeloId: number;
  origen: Lugar;
  destino: Lugar;
  cantidad: number;
  persona?: string;
}): Promise<Resultado> {
  await exigirAcceso();
  if (!esLugar(datos.origen) || !esLugar(datos.destino)) {
    return { ok: false, error: "Elige de donde salen y a donde van." };
  }
  const tipo = tipoTraspaso(datos.origen, datos.destino);
  if (!tipo) return { ok: false, error: "El lugar de salida y el de llegada son el mismo." };

  const db = getDb();
  try {
    const r = db.transaction(() =>
      aplicarMovimiento(db, {
        modeloId: datos.modeloId,
        tipo,
        cantidad: datos.cantidad,
        persona: datos.persona,
      })
    )();
    refrescar();
    return {
      ok: true,
      mensaje: `Pasaron ${piezas(datos.cantidad)} a ${NOMBRE_LUGAR[datos.destino].toLowerCase()}. Quedan ${r.cuentas[datos.origen]} ${EN_LUGAR[datos.origen]}.`,
    };
  } catch (e) {
    if (e instanceof ErrorInventario) return { ok: false, error: e.message };
    return { ok: false, error: "No se pudo registrar el movimiento." };
  }
}

/**
 * Corrige las cuentas de un modelo dejandolas como se escribieron.
 *
 * Se captura cuantas piezas DEBE haber en cada lugar y se guarda una
 * correccion por cada lugar que cambio, todas juntas o ninguna.
 */
export async function corregirPiezas(datos: {
  modeloId: number;
  piezas: Record<Lugar, number>;
  persona?: string;
}): Promise<Resultado> {
  await exigirAcceso();
  const db = getDb();

  for (const l of LUGARES) {
    const n = datos.piezas?.[l];
    if (!Number.isInteger(n) || n < 0) {
      return { ok: false, error: `Revisa las piezas ${EN_LUGAR[l]}: deben ser 0 o mas.` };
    }
  }

  try {
    const cambios = db.transaction(() => {
      const modelo = db.prepare("SELECT * FROM modelos WHERE id = ?").get(datos.modeloId) as
        | Modelo
        | undefined;
      if (!modelo) throw new ErrorInventario("No se encontro el modelo.");

      let hechos = 0;
      for (const l of LUGARES) {
        const diferencia = datos.piezas[l] - piezasEn(modelo, l);
        if (diferencia === 0) continue;
        aplicarMovimiento(db, {
          modeloId: datos.modeloId,
          tipo: tipoAjuste(l),
          cantidad: diferencia,
          persona: datos.persona,
          nota: "Correccion manual desde la ficha",
        });
        hechos++;
      }
      return hechos;
    })();

    if (cambios === 0) return { ok: false, error: "Esas son las piezas que ya estaban registradas." };
    refrescar();
    return { ok: true, mensaje: "Se corrigieron las piezas." };
  } catch (e) {
    if (e instanceof ErrorInventario) return { ok: false, error: e.message };
    return { ok: false, error: "No se pudo guardar la correccion." };
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
  await exigirAcceso();
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

/**
 * Lo que se acaba de registrar, renglon por renglon.
 *
 * Se devuelve con detalle para que la pantalla pueda ofrecer justo
 * despues "imprimir 30 etiquetas de BD96", con la cantidad ya puesta:
 * registrar produccion y etiquetarla son el mismo momento.
 */
export type EntradaRegistrada = {
  modelos: number;
  piezas: number;
  lineas: {
    modeloId: number;
    codigo: string;
    descripcion: string;
    /** Todas las piezas que entraron de este modelo, sin importar a donde. */
    cantidad: number;
    /** Con cuantas piezas quedo la prenda en cada lugar. */
    despues: Record<Lugar, number>;
    /** Cuantas fueron a cada lugar; los que no recibieron no aparecen. */
    reparto: Partial<Record<Lugar, number>>;
  }[];
};

/** Un renglon de entrada: cuantas piezas de un modelo llegan a un lugar. */
export type LineaEntrada = LineaEnvio & { lugar?: Lugar };

/**
 * Entrada de mercancia nueva, varios modelos de una vez.
 *
 * Lo normal es que todo llegue a bodega, y eso pasa si el renglon no
 * dice lugar. Pero una parte puede irse directo a la tienda o al
 * tianguis sin pasar por bodega: para eso un modelo puede venir en
 * varios renglones, uno por lugar.
 */
export async function registrarEntrada(datos: {
  persona?: string;
  nota?: string;
  lineas: LineaEntrada[];
}): Promise<Resultado<EntradaRegistrada>> {
  await exigirAcceso();
  const db = getDb();
  const lineas = datos.lineas.filter((l) => l.cantidad > 0);
  if (lineas.some((l) => l.lugar !== undefined && !esLugar(l.lugar))) {
    return { ok: false, error: "Uno de los renglones trae un lugar que no existe." };
  }

  if (lineas.length === 0) {
    return { ok: false, error: "Agrega al menos un modelo con cantidad." };
  }

  const datosDelModelo = db.prepare(
    "SELECT codigo, descripcion FROM modelos WHERE id = ?"
  );

  try {
    // El detalle se arma DENTRO de la transaccion y se devuelve desde
    // ella. Si se fuera juntando en una variable de afuera, una entrada
    // que se revierte a la mitad dejaria en pantalla piezas que en
    // realidad nunca entraron.
    const detalle = db.transaction(() => {
      // Un renglon por modelo en el acuse, aunque haya llegado repartido:
      // las etiquetas se imprimen por prenda, no por lugar.
      const porModelo = new Map<number, EntradaRegistrada["lineas"][number]>();

      for (const linea of lineas) {
        const lugar = linea.lugar ?? "bodega";
        const r = aplicarMovimiento(db, {
          modeloId: linea.modeloId,
          tipo: tipoEntrada(lugar),
          cantidad: linea.cantidad,
          persona: datos.persona,
          nota: datos.nota,
        });

        let hecha = porModelo.get(linea.modeloId);
        if (!hecha) {
          const m = datosDelModelo.get(linea.modeloId) as
            | { codigo: string; descripcion: string }
            | undefined;
          hecha = {
            modeloId: linea.modeloId,
            codigo: m?.codigo ?? "",
            descripcion: m?.descripcion ?? "",
            cantidad: 0,
            despues: r.cuentas,
            reparto: {},
          };
          porModelo.set(linea.modeloId, hecha);
        }
        hecha.cantidad += linea.cantidad;
        hecha.despues = r.cuentas;
        hecha.reparto[lugar] = (hecha.reparto[lugar] ?? 0) + linea.cantidad;
      }

      return [...porModelo.values()];
    })();

    refrescar();
    const total = lineas.reduce((s, l) => s + l.cantidad, 0);
    return {
      ok: true,
      datos: { modelos: detalle.length, piezas: total, lineas: detalle },
      mensaje: `Entraron ${total} piezas de ${detalle.length} ${
        detalle.length === 1 ? "modelo" : "modelos"
      }.`,
    };
  } catch (e) {
    if (e instanceof ErrorInventario) return { ok: false, error: e.message };
    return { ok: false, error: "No se pudo registrar la entrada." };
  }
}
