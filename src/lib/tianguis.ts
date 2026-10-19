import "server-only";
import { getDb } from "./db";
import { conFotosReales } from "./consultas";
import { preciosDeModelos } from "./precios";

/**
 * Lo que se lee del tianguis.
 *
 * El tianguis se trabaja desde el celular de quien esta vendiendo, asi
 * que solo se manda al telefono lo que esta en el tianguis, no los dos
 * mil modelos del catalogo: la senal alla suele ser mala.
 */

/** Un modelo del tianguis, con lo justo para buscarlo y venderlo. */
export type ModeloTianguis = {
  id: number;
  codigo: string;
  codigo_norm: string;
  numero: number | null;
  descripcion: string;
  categoria: string;
  tallas: string;
  colores: string;
  foto: string;
  en_tianguis: number;
  /** Precio registrado en centavos, o null si no tiene. */
  precio: number | null;
};

/** Todo lo que hay ahorita en el tianguis. */
export function inventarioTianguis(): ModeloTianguis[] {
  const filas = getDb()
    .prepare(
      `SELECT id, codigo, codigo_norm, numero, descripcion, categoria, tallas, colores,
              foto, en_tianguis
         FROM modelos
        WHERE activo = 1 AND en_tianguis > 0
        ORDER BY prefijo, numero, codigo_norm`
    )
    .all() as Omit<ModeloTianguis, "precio">[];

  const precios = preciosDeModelos(filas.map((f) => f.id));
  return conFotosReales(filas.map((f) => ({ ...f, precio: precios.get(f.id) ?? null })));
}

/** Una venta del tianguis con su precio por pieza, en centavos. */
export type VentaDelTianguis = {
  id: number;
  modelo_id: number;
  codigo: string;
  descripcion: string;
  foto: string;
  piezas: number;
  precio: number;
  /** El precio registrado al momento de vender, o null si no tenia. */
  precio_lista: number | null;
  persona: string;
  estado: "vendida" | "cancelada";
  fecha: string;
};

/** Dias que tienen ventas, del mas reciente al mas viejo. */
export function diasConVentas(limite = 30): string[] {
  const filas = getDb()
    .prepare(
      `SELECT DISTINCT date(fecha) AS dia FROM tianguis_ventas
        ORDER BY dia DESC LIMIT ?`
    )
    .all(limite) as { dia: string }[];
  return filas.map((f) => f.dia);
}

export function hoy(): string {
  const fila = getDb().prepare("SELECT date('now','localtime') AS d").get() as { d: string };
  return fila.d;
}

/** Las ventas de un dia (YYYY-MM-DD), la mas nueva arriba. */
export function ventasDelDia(dia: string): VentaDelTianguis[] {
  const filas = getDb()
    .prepare(
      `SELECT v.id, v.modelo_id, m.codigo, m.descripcion, m.foto, v.piezas, v.precio,
              v.precio_lista, v.persona, v.estado, v.fecha
         FROM tianguis_ventas v
         JOIN modelos m ON m.id = v.modelo_id
        WHERE date(v.fecha) = ?
        ORDER BY v.fecha DESC, v.id DESC`
    )
    .all(dia) as VentaDelTianguis[];
  return conFotosReales(filas);
}
