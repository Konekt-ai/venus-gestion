import type { TipoEnHistorial, TipoMovimiento } from "./tipos";

/**
 * Los tres lugares donde puede estar una pieza.
 *
 * Cada modelo lleva una cuenta por lugar, en tres columnas de la tabla
 * modelos. Esas columnas se quedan como estaban a proposito: la caja de
 * la tienda descuenta directo de 'en_tienda' al cobrar, y si las piezas
 * se movieran a otra tabla la caja dejaria de cuadrar.
 *
 * Este archivo no toca la base: lo usan igual las pantallas que el
 * servidor, para que los dos hablen de los lugares con las mismas
 * palabras.
 */

export const LUGARES = ["bodega", "tienda", "tianguis"] as const;

export type Lugar = (typeof LUGARES)[number];

export const NOMBRE_LUGAR: Record<Lugar, string> = {
  bodega: "Bodega",
  tienda: "Tienda",
  tianguis: "Tianguis",
};

/** "en bodega", "en la tienda", "en el tianguis". */
export const EN_LUGAR: Record<Lugar, string> = {
  bodega: "en bodega",
  tienda: "en la tienda",
  tianguis: "en el tianguis",
};

/** Lo que trae un modelo con sus tres cuentas. */
export type ConPiezas = { existencia: number; en_tienda: number; en_tianguis: number };

export function piezasEn(m: ConPiezas, lugar: Lugar): number {
  return lugar === "bodega" ? m.existencia : lugar === "tienda" ? m.en_tienda : m.en_tianguis;
}

export type Efecto = Record<Lugar, number>;

/**
 * Cuanto suma o resta cada tipo de movimiento por pieza, en cada lugar.
 * 'conteo' no esta porque fija la cuenta de bodega en vez de sumarle.
 */
export const EFECTOS: Record<Exclude<TipoMovimiento, "conteo">, Efecto> = {
  entrada: { bodega: +1, tienda: 0, tianguis: 0 },
  entrada_tienda: { bodega: 0, tienda: +1, tianguis: 0 },
  entrada_tianguis: { bodega: 0, tienda: 0, tianguis: +1 },
  salida_tienda: { bodega: -1, tienda: +1, tianguis: 0 },
  salida_tianguis: { bodega: -1, tienda: 0, tianguis: +1 },
  retorno_tienda: { bodega: +1, tienda: -1, tianguis: 0 },
  retorno_tianguis: { bodega: +1, tienda: 0, tianguis: -1 },
  tienda_a_tianguis: { bodega: 0, tienda: -1, tianguis: +1 },
  tianguis_a_tienda: { bodega: 0, tienda: +1, tianguis: -1 },
  // En los ajustes la cantidad ya trae el signo.
  ajuste: { bodega: +1, tienda: 0, tianguis: 0 },
  ajuste_tienda: { bodega: 0, tienda: +1, tianguis: 0 },
  ajuste_tianguis: { bodega: 0, tienda: 0, tianguis: +1 },
  venta_tianguis: { bodega: 0, tienda: 0, tianguis: -1 },
  cancelacion_tianguis: { bodega: 0, tienda: 0, tianguis: +1 },
};

/** El tipo de movimiento que pasa piezas de un lugar a otro. */
export function tipoTraspaso(origen: Lugar, destino: Lugar): TipoMovimiento | null {
  const clave = `${origen}>${destino}`;
  const tipos: Record<string, TipoMovimiento> = {
    "bodega>tienda": "salida_tienda",
    "bodega>tianguis": "salida_tianguis",
    "tienda>bodega": "retorno_tienda",
    "tianguis>bodega": "retorno_tianguis",
    "tienda>tianguis": "tienda_a_tianguis",
    "tianguis>tienda": "tianguis_a_tienda",
  };
  return tipos[clave] ?? null;
}

/** Mercancia nueva que llega directo a un lugar. */
export function tipoEntrada(lugar: Lugar): TipoMovimiento {
  return lugar === "bodega" ? "entrada" : lugar === "tienda" ? "entrada_tienda" : "entrada_tianguis";
}

/** Correccion de la cuenta de un lugar. */
export function tipoAjuste(lugar: Lugar): TipoMovimiento {
  return lugar === "bodega" ? "ajuste" : lugar === "tienda" ? "ajuste_tienda" : "ajuste_tianguis";
}

/**
 * De que lugar habla el "quedaron N" del historial.
 *
 * Durante anos ese numero fue siempre la cuenta de bodega, y asi se
 * queda para todo lo que toca bodega. Lo que no la toca (una venta del
 * tianguis, un paso de tienda a tianguis) guarda la cuenta del lugar que
 * si cambio; si no, el historial diria "+0, quedaron 12" y no se
 * entenderia que paso.
 */
export function lugarDelMovimiento(tipo: TipoEnHistorial): Lugar {
  // Las de la caja guardan la cuenta de bodega tal cual, aunque no la
  // toquen: ese numero es de bodega y asi se tiene que leer.
  if (tipo === "conteo" || tipo === "venta" || tipo === "cancelacion") return "bodega";
  const efecto = EFECTOS[tipo];
  if (!efecto || efecto.bodega !== 0) return "bodega";
  return efecto.tianguis !== 0 ? "tianguis" : "tienda";
}
