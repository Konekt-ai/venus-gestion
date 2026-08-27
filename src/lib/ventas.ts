import "server-only";
import { getDb } from "./db";
import { conFotosReales } from "./consultas";

/**
 * Lo que se vendio en la tienda.
 *
 * Las ventas las escribe la caja, que trabaja sobre esta misma base de
 * datos. Aqui nunca se escriben: solo se leen para los reportes. Por eso
 * todo este archivo es de puras consultas.
 *
 * Las tablas de la caja pueden no existir todavia: mientras no se
 * instale la caja en la tienda, esta base solo tiene lo de bodega. Todas
 * las funciones responden vacio en ese caso, sin reventar.
 *
 * El dinero se guarda en centavos, en numeros enteros. Nunca en
 * decimales: 0.1 + 0.2 no da 0.3 en una computadora y las sumas del dia
 * terminarian sin cuadrar por centavos.
 */

/** true cuando la caja de la tienda ya escribio en esta base. */
export function hayCaja(): boolean {
  const fila = getDb()
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'caja_ventas'")
    .get();
  return Boolean(fila);
}

export type Periodo = "hoy" | "semana" | "mes" | "todo";

export const PERIODOS: { valor: Periodo; nombre: string }[] = [
  { valor: "hoy", nombre: "Hoy" },
  { valor: "semana", nombre: "Ultimos 7 dias" },
  { valor: "mes", nombre: "Ultimos 30 dias" },
  { valor: "todo", nombre: "Todo" },
];

/**
 * Desde que fecha cuenta cada periodo.
 *
 * Se calcula en SQLite y no en JavaScript para que use la misma hora
 * local que uso la caja al guardar la venta. Si se mezclaran las dos,
 * las ventas de la noche podrian caer en el dia equivocado.
 */
function desde(periodo: Periodo): string {
  if (periodo === "todo") return "0000-01-01";
  const dias = periodo === "hoy" ? "0" : periodo === "semana" ? "6" : "29";
  const fila = getDb()
    .prepare(`SELECT date('now','localtime','-${dias} day') AS d`)
    .get() as { d: string };
  return fila.d;
}

export type ResumenVentas = {
  tickets: number;
  piezas: number;
  total: number;
  promedio: number;
  canceladas: number;
};

/** Los numeros de arriba: cuanto se vendio y en cuantos tickets. */
export function resumenVentas(periodo: Periodo): ResumenVentas {
  if (!hayCaja()) return { tickets: 0, piezas: 0, total: 0, promedio: 0, canceladas: 0 };

  const fila = getDb()
    .prepare(
      `SELECT
         COUNT(*)                                            AS tickets,
         COALESCE(SUM(piezas), 0)                            AS piezas,
         COALESCE(SUM(total), 0)                             AS total,
         (SELECT COUNT(*) FROM caja_ventas
           WHERE estado = 'cancelada' AND date(fecha) >= ?)  AS canceladas
       FROM caja_ventas
       WHERE estado = 'cobrada' AND date(fecha) >= ?`
    )
    .get(desde(periodo), desde(periodo)) as Omit<ResumenVentas, "promedio">;

  return {
    ...fila,
    promedio: fila.tickets > 0 ? Math.round(fila.total / fila.tickets) : 0,
  };
}

export type ModeloVendido = {
  modelo_id: number | null;
  codigo: string;
  descripcion: string;
  foto: string;
  piezas: number;
  importe: number;
  en_tienda: number;
  existencia: number;
};

/**
 * Lo que mas se vende, de verdad.
 *
 * Hasta ahora "mas vendido" era lo que el cliente marco en su catalogo,
 * que es lo que el creia. Esto es lo que la caja registro.
 */
export function masVendidos(periodo: Periodo, limite = 12): ModeloVendido[] {
  if (!hayCaja()) return [];

  const filas = getDb()
    .prepare(
      `SELECT
         l.modelo_id,
         l.codigo,
         MAX(l.descripcion)              AS descripcion,
         COALESCE(MAX(m.foto), '')       AS foto,
         COALESCE(MAX(m.en_tienda), 0)   AS en_tienda,
         COALESCE(MAX(m.existencia), 0)  AS existencia,
         SUM(l.piezas)                   AS piezas,
         SUM(l.importe)                  AS importe
       FROM caja_venta_lineas l
       JOIN caja_ventas v ON v.id = l.venta_id
       LEFT JOIN modelos m ON m.id = l.modelo_id
       WHERE v.estado = 'cobrada' AND date(v.fecha) >= ?
       GROUP BY l.codigo
       ORDER BY piezas DESC, importe DESC
       LIMIT ?`
    )
    .all(desde(periodo), limite) as ModeloVendido[];

  return conFotosReales(filas);
}

export type DesempenoVendedora = {
  vendedora: string;
  tickets: number;
  piezas: number;
  total: number;
  promedio: number;
};

/** Cuanto vendio cada quien. Es lo que se usa para las comisiones. */
export function desempenoVendedoras(periodo: Periodo): DesempenoVendedora[] {
  if (!hayCaja()) return [];

  const filas = getDb()
    .prepare(
      `SELECT
         CASE WHEN vendedora = '' THEN 'Sin firmar' ELSE vendedora END AS vendedora,
         COUNT(*)                  AS tickets,
         COALESCE(SUM(piezas), 0)  AS piezas,
         COALESCE(SUM(total), 0)   AS total
       FROM caja_ventas
       WHERE estado = 'cobrada' AND date(fecha) >= ?
       GROUP BY vendedora
       ORDER BY total DESC`
    )
    .all(desde(periodo)) as Omit<DesempenoVendedora, "promedio">[];

  return filas.map((f) => ({
    ...f,
    promedio: f.tickets > 0 ? Math.round(f.total / f.tickets) : 0,
  }));
}

export type DiaDeVentas = { dia: string; total: number; piezas: number };

/** Dia por dia, para ver la forma de la semana. */
export function ventasPorDia(periodo: Periodo): DiaDeVentas[] {
  if (!hayCaja()) return [];

  return getDb()
    .prepare(
      `SELECT date(fecha) AS dia, SUM(total) AS total, SUM(piezas) AS piezas
       FROM caja_ventas
       WHERE estado = 'cobrada' AND date(fecha) >= ?
       GROUP BY dia
       ORDER BY dia`
    )
    .all(desde(periodo)) as DiaDeVentas[];
}

/**
 * Lo que se esta vendiendo y ya casi no hay en la tienda.
 *
 * Es la pregunta que de verdad le sirve a bodega: no "que se vendio",
 * sino "que hay que mandar mañana". Solo aparece lo que ademas si hay
 * en bodega para surtir.
 */
export function hayQueSurtir(limite = 8): ModeloVendido[] {
  if (!hayCaja()) return [];

  const filas = getDb()
    .prepare(
      `SELECT
         m.id                       AS modelo_id,
         m.codigo,
         m.descripcion,
         m.foto,
         m.en_tienda,
         m.existencia,
         SUM(l.piezas)              AS piezas,
         SUM(l.importe)             AS importe
       FROM caja_venta_lineas l
       JOIN caja_ventas v ON v.id = l.venta_id
       JOIN modelos m     ON m.id = l.modelo_id
       WHERE v.estado = 'cobrada'
         AND date(v.fecha) >= date('now','localtime','-29 day')
         AND m.activo = 1
         AND m.en_tienda <= 2
         AND m.existencia > 0
       GROUP BY m.id
       ORDER BY piezas DESC
       LIMIT ?`
    )
    .all(limite) as ModeloVendido[];

  return conFotosReales(filas);
}

/** Los pesos y centavos, escritos como se leen. */
export function pesos(centavos: number): string {
  return (centavos / 100).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  });
}
