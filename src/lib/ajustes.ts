import "server-only";
import { getDb } from "./db";

/**
 * Ajustes del sistema.
 *
 * Se guardan en la tabla config, uno por renglon, para poder prender y
 * apagar partes del sistema sin tocar el codigo ni volver a compilar.
 */

export type Ajustes = {
  /** El tianguis se maneja aparte; por ahora el cliente no lo usa. */
  usaTianguis: boolean;
  /** Nombre del negocio, para las hojas impresas. */
  negocio: string;
};

const POR_OMISION: Ajustes = {
  // Apagado a peticion del cliente: primero bodega y tienda.
  // La informacion del tianguis NO se borra, solo se deja de mostrar.
  usaTianguis: false,
  negocio: "Venus Boutique",
};

export function leerAjustes(): Ajustes {
  const db = getDb();
  const filas = db.prepare("SELECT clave, valor FROM config").all() as {
    clave: string;
    valor: string;
  }[];
  const mapa = new Map(filas.map((f) => [f.clave, f.valor]));

  return {
    usaTianguis: mapa.has("usa_tianguis")
      ? mapa.get("usa_tianguis") === "1"
      : POR_OMISION.usaTianguis,
    negocio: mapa.get("negocio") || POR_OMISION.negocio,
  };
}

export function guardarAjuste(clave: string, valor: string) {
  const db = getDb();
  db.prepare(
    `INSERT INTO config (clave, valor) VALUES (?, ?)
     ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor`
  ).run(clave, valor);
}

/**
 * Atajo: casi todas las pantallas solo necesitan saber si mostrar o no
 * lo del tianguis.
 */
export function usaTianguis(): boolean {
  return leerAjustes().usaTianguis;
}
