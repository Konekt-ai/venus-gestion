"use server";

import { exigirAcceso } from "@/lib/acceso";
import { leerAjustes, guardarAjuste } from "@/lib/ajustes";
import { modelosPorIds } from "@/lib/consultas";
import {
  estadoImpresora,
  listarImpresoras,
  mandarCrudo,
  sePuedeImprimir,
  vaciarCola,
  type ImpresoraVista,
} from "@/lib/impresora";
import { armarEtiqueta, armarLote, type Plantilla } from "@/lib/tspl";
import type { Resultado } from "@/lib/tipos";

/**
 * Imprimir etiquetas de prendas.
 *
 * La impresora vive en la bodega, pero quien pide las etiquetas puede
 * estar en la tienda o en su casa con el celular. Por eso el envio sale
 * del servidor y no del navegador: asi el boton funciona desde donde
 * sea y las etiquetas salen en la bodega.
 */

/** Nunca mas de esto de un solo boton, pase lo que pase. */
const TOPE_DURO = 500;

function plantillaDeAjustes(): Plantilla {
  const a = leerAjustes();
  return {
    anchoMm: a.etiquetaAnchoMm,
    altoMm: a.etiquetaAltoMm,
    separacionMm: a.etiquetaSeparacionMm,
    altoBarrasMm: a.etiquetaAltoBarrasMm,
    densidad: a.etiquetaDensidad,
    velocidad: a.etiquetaVelocidad,
    giro: a.etiquetaGiro,
    desplazaXMm: a.etiquetaDesplazaX,
    desplazaYMm: a.etiquetaDesplazaY,
  };
}

export type LineaAEtiquetar = { modeloId: number; cantidad: number };

/**
 * Manda a imprimir las etiquetas de una o varias prendas.
 *
 * Se revisa la impresora ANTES de encolar: si esta apagada o sin rollo,
 * el trabajo se quedaria formado y nadie veria salir nada. Y despues se
 * vuelve a revisar, porque Windows contesta que todo salio bien aunque
 * la impresora este apagada.
 */
export async function imprimirEtiquetas(
  lineas: LineaAEtiquetar[]
): Promise<Resultado<{ etiquetas: number; aviso?: string }>> {
  await exigirAcceso();

  const ajustes = leerAjustes();
  if (!ajustes.impresoraEtiquetas) {
    return {
      ok: false,
      error: "Todavia no esta elegida la impresora de etiquetas. Se elige en Ajustes.",
    };
  }
  if (!sePuedeImprimir()) {
    return { ok: false, error: "Esta computadora no puede imprimir etiquetas." };
  }

  const pedidas = (lineas ?? [])
    .map((l) => ({
      modeloId: Number(l.modeloId),
      cantidad: Math.min(Math.max(1, Math.floor(Number(l.cantidad) || 0)), ajustes.etiquetaTope),
    }))
    .filter((l) => Number.isInteger(l.modeloId) && l.modeloId > 0);

  if (pedidas.length === 0) {
    return { ok: false, error: "No se dijo que etiquetas imprimir." };
  }

  const total = pedidas.reduce((s, l) => s + l.cantidad, 0);
  if (total > TOPE_DURO) {
    return {
      ok: false,
      error: `Son ${total} etiquetas de un jalon. El maximo es ${TOPE_DURO}: hazlo en partes.`,
    };
  }

  const modelos = modelosPorIds(pedidas.map((l) => l.modeloId));
  const porId = new Map(modelos.map((m) => [m.id, m]));

  const aImprimir = pedidas
    .map((l) => {
      const m = porId.get(l.modeloId);
      return m
        ? { prenda: { codigo: m.codigo, descripcion: m.descripcion }, copias: l.cantidad }
        : null;
    })
    .filter((x): x is { prenda: { codigo: string; descripcion: string }; copias: number } => x !== null);

  if (aImprimir.length === 0) {
    return { ok: false, error: "No encontre esas prendas en el catalogo." };
  }

  // Todo en un solo envio: si fueran varios, el rollo se recalibra
  // entre uno y otro y las etiquetas salen torcidas.
  const tspl = armarLote(aImprimir, plantillaDeAjustes());
  const nombres = aImprimir.map((x) => x.prenda.codigo).join(", ");

  const r = await mandarCrudo(
    ajustes.impresoraEtiquetas,
    tspl,
    `Venus - etiquetas ${nombres}`.slice(0, 60)
  );

  if (!r.ok) return { ok: false, error: r.error };

  const etiquetas = aImprimir.reduce((s, x) => s + x.copias, 0);
  return {
    ok: true,
    datos: { etiquetas, aviso: r.datos.aviso },
    mensaje:
      etiquetas === 1
        ? "Salio 1 etiqueta."
        : `Salieron ${etiquetas} etiquetas.`,
  };
}

/** Una etiqueta de muestra, para cuadrar las medidas sin gastar rollo. */
export async function probarImpresora(): Promise<Resultado<{ aviso?: string }>> {
  await exigirAcceso();

  const ajustes = leerAjustes();
  if (!ajustes.impresoraEtiquetas) {
    return { ok: false, error: "Primero elige la impresora de etiquetas." };
  }

  const tspl = armarEtiqueta(
    { codigo: "PRUEBA 1", descripcion: "ETIQUETA DE PRUEBA" },
    1,
    plantillaDeAjustes()
  );

  const r = await mandarCrudo(ajustes.impresoraEtiquetas, tspl, "Venus - prueba");
  if (!r.ok) return { ok: false, error: r.error };

  return {
    ok: true,
    datos: { aviso: r.datos.aviso },
    mensaje: "Salio una etiqueta de prueba. Revisa que quede bien acomodada en el papel.",
  };
}

/** Las impresoras que Windows tiene, para elegir de una lista. */
export async function impresorasDisponibles(): Promise<ImpresoraVista[]> {
  await exigirAcceso();
  return listarImpresoras();
}

export async function revisarImpresora(): Promise<Resultado<ImpresoraVista | null>> {
  await exigirAcceso();
  const { impresoraEtiquetas } = leerAjustes();
  if (!impresoraEtiquetas) return { ok: false, error: "No hay impresora elegida." };
  const estado = await estadoImpresora(impresoraEtiquetas);
  if (!estado) return { ok: false, error: "Windows ya no encuentra esa impresora." };
  return { ok: true, datos: estado };
}

export async function tirarCola(): Promise<Resultado> {
  await exigirAcceso();
  const { impresoraEtiquetas } = leerAjustes();
  const r = await vaciarCola(impresoraEtiquetas);
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true, mensaje: "Se tiraron los trabajos que estaban formados." };
}

/**
 * Guarda la impresora y las medidas de la etiqueta.
 *
 * Las medidas se afinan probando, con la impresora enfrente, asi que se
 * guardan en la configuracion y no en el codigo: se pueden ajustar
 * desde el celular sin volver a compilar ni ir a la bodega.
 */
export async function guardarAjustesImpresora(
  _previo: unknown,
  form: FormData
): Promise<Resultado> {
  await exigirAcceso();

  const texto = (clave: string) => String(form.get(clave) ?? "").trim();

  guardarAjuste("impresora_etiquetas", texto("impresora"));

  const numeros: [string, string, number, number][] = [
    // clave en config, campo del formulario, minimo, maximo
    ["etiqueta_ancho_mm", "ancho", 10, 110],
    ["etiqueta_alto_mm", "alto", 10, 300],
    ["etiqueta_separacion_mm", "separacion", 0, 20],
    ["etiqueta_alto_barras_mm", "altoBarras", 5, 60],
    ["etiqueta_densidad", "densidad", 0, 15],
    ["etiqueta_velocidad", "velocidad", 1, 10],
    ["etiqueta_giro", "giro", 0, 90],
    ["etiqueta_desplaza_x", "desplazaX", -20, 20],
    ["etiqueta_desplaza_y", "desplazaY", -20, 20],
    ["etiqueta_tope", "tope", 1, 200],
  ];

  for (const [clave, campo, minimo, maximo] of numeros) {
    if (!form.has(campo)) continue;
    const n = Number(texto(campo));
    // Un valor absurdo aqui no da un error visible: da una etiqueta en
    // blanco. Por eso se recorta al rango que la impresora acepta.
    if (!Number.isFinite(n)) continue;
    guardarAjuste(clave, String(Math.min(maximo, Math.max(minimo, n))));
  }

  return { ok: true, mensaje: "Se guardaron los ajustes de la impresora." };
}
