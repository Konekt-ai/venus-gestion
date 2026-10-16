import "server-only";
import { getDb } from "./db";
import { conFotosReales } from "./consultas";
import { preciosDeModelos } from "./precios";

/**
 * Lo que se lee del tianguis.
 *
 * El tianguis se trabaja desde el celular de quien esta vendiendo. Por
 * eso aqui hay dos cuidados:
 *
 *   - Solo se manda al telefono lo que esta en el tianguis, no los dos
 *     mil modelos del catalogo: la senal alla suele ser mala.
 *   - Las ventas que ven los vendedores salen SIN precio. No es que la
 *     pantalla lo esconda: la consulta ni siquiera lo pide, asi que no
 *     viaja al telefono.
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

/** Una venta tal como la ven los vendedores: sin dinero. */
export type VentaSinPrecio = {
  id: number;
  modelo_id: number;
  codigo: string;
  descripcion: string;
  foto: string;
  piezas: number;
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
export function ventasDelDia(dia: string): VentaSinPrecio[] {
  const filas = getDb()
    .prepare(
      `SELECT v.id, v.modelo_id, m.codigo, m.descripcion, m.foto, v.piezas, v.persona,
              v.estado, v.fecha
         FROM tianguis_ventas v
         JOIN modelos m ON m.id = v.modelo_id
        WHERE date(v.fecha) = ?
        ORDER BY v.fecha DESC, v.id DESC`
    )
    .all(dia) as VentaSinPrecio[];
  return conFotosReales(filas);
}
