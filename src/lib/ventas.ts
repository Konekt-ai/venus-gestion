import "server-only";
import { getDb } from "./db";

/**
 * Lo que se vendio: en la tienda y en el tianguis.
 *
 * Las ventas de la tienda las escribe la caja, que trabaja sobre esta
 * misma base de datos; aqui nunca se escriben, solo se leen. Las del
 * tianguis son de bodega (tianguis_ventas). Este archivo junta las dos
 * para la pantalla Ventas, y todo es de puras consultas.
 *
 * Las tablas de la caja pueden no existir todavia: mientras no se
 * instale la caja en la tienda, esta base solo tiene lo de bodega. En
 * ese caso todo sale solo con lo del tianguis, sin reventar.
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

/**
 * true cuando la caja ya guarda el precio registrado de cada prenda
 * vendida, para saber si se cobro en otro.
 *
 * Solo se recuerda el si, igual que en precios.ts: si se recordara el no,
 * al actualizar la caja la columna seguiria invisible hasta reiniciar
 * bodega.
 */
let cajaConPrecioLista = false;

function cajaGuardaPrecioLista(): boolean {
  if (cajaConPrecioLista) return true;
  const columnas = getDb().prepare("PRAGMA table_info(caja_venta_lineas)").all() as { name: string }[];
  if (columnas.some((c) => c.name === "precio_lista")) cajaConPrecioLista = true;
  return cajaConPrecioLista;
}

/** true si hay algo que reportar, venga de la tienda o del tianguis. */
export function hayVentas(): boolean {
  if (hayCaja()) return true;
  return Boolean(getDb().prepare("SELECT 1 FROM tianguis_ventas LIMIT 1").get());
}

export type Periodo = "hoy" | "semana" | "mes" | "todo";

export const PERIODOS: { valor: Periodo; nombre: string }[] = [
  { valor: "hoy", nombre: "Hoy" },
  { valor: "semana", nombre: "Ultimos 7 dias" },
  { valor: "mes", nombre: "Ultimos 30 dias" },
  { valor: "todo", nombre: "Todo" },
];

/** De donde salio la venta. 'todo' junta las dos. */
export type Origen = "todo" | "tienda" | "tianguis";

export const ORIGENES: { valor: Origen; nombre: string }[] = [
  { valor: "todo", nombre: "Todo" },
  { valor: "tienda", nombre: "Tienda" },
  { valor: "tianguis", nombre: "Tianguis" },
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

/**
 * Todas las ventas como si fueran de una sola tabla, para los totales.
 *
 * Una venta del tianguis es un solo modelo; un ticket de la tienda puede
 * traer varios. Para los totales eso no importa: cada uno cuenta como
 * una venta, con sus piezas y su total. 'valida' es 1 si se cobro y 0
 * si se cancelo.
 */
function ventasUnidas(origen: Origen): string {
  const partes: string[] = [];
  if (origen !== "tianguis" && hayCaja()) {
    partes.push(`
      SELECT 'tienda' AS origen, fecha, vendedora,
             CASE WHEN estado = 'cobrada' THEN 1 ELSE 0 END AS valida,
             piezas, total
        FROM caja_ventas`);
  }
  if (origen !== "tienda") {
    partes.push(`
      SELECT 'tianguis' AS origen, fecha, persona AS vendedora,
             CASE WHEN estado = 'vendida' THEN 1 ELSE 0 END AS valida,
             piezas, piezas * precio AS total
        FROM tianguis_ventas`);
  }
  // Sin ninguna de las dos, una tabla vacia con las mismas columnas.
  if (partes.length === 0) {
    return "SELECT '' AS origen, '' AS fecha, '' AS vendedora, 0 AS valida, 0 AS piezas, 0 AS total WHERE 0";
  }
  return partes.join(" UNION ALL ");
}

export type ResumenVentas = {
  ventas: number;
  piezas: number;
  total: number;
  promedio: number;
  canceladas: number;
  /** Cuanto fue de cada lado, para decirlo debajo del total. */
  totalTienda: number;
  totalTianguis: number;
};

/**
 * Quien vendio en el periodo, para el filtro por vendedora.
 *
 * Se juntan por nombre y no por id: la caja firma con el de Personal y el
 * tianguis guarda el nombre tal cual, asi que el nombre es lo unico que
 * tienen en comun. Las ventas canceladas tambien cuentan: quien cobro y
 * luego cancelo tambien tiene que poder revisarse.
 */
export function vendedorasConVentas(periodo: Periodo, origen: Origen = "todo"): string[] {
  const filas = getDb()
    .prepare(
      `WITH todas AS (${ventasUnidas(origen)})
       SELECT DISTINCT trim(vendedora) AS nombre
         FROM todas
        WHERE date(fecha) >= ? AND trim(vendedora) <> ''
        ORDER BY nombre`
    )
    .all(desde(periodo)) as { nombre: string }[];
  return filas.map((f) => f.nombre);
}

/** Los numeros de arriba: cuanto se vendio y en cuantas ventas. */
export function resumenVentas(
  periodo: Periodo,
  origen: Origen = "todo",
  vendedora = ""
): ResumenVentas {
  const fila = getDb()
    .prepare(
      `WITH todas AS (${ventasUnidas(origen)})
       SELECT
         COALESCE(SUM(valida), 0)                                           AS ventas,
         COALESCE(SUM(CASE WHEN valida = 1 THEN piezas END), 0)             AS piezas,
         COALESCE(SUM(CASE WHEN valida = 1 THEN total END), 0)              AS total,
         COALESCE(SUM(CASE WHEN valida = 0 THEN 1 ELSE 0 END), 0)           AS canceladas,
         COALESCE(SUM(CASE WHEN valida = 1 AND origen = 'tienda' THEN total END), 0)   AS totalTienda,
         COALESCE(SUM(CASE WHEN valida = 1 AND origen = 'tianguis' THEN total END), 0) AS totalTianguis
       FROM todas
       WHERE date(fecha) >= ? AND (? = '' OR trim(vendedora) = ?)`
    )
    .get(desde(periodo), vendedora.trim(), vendedora.trim()) as Omit<ResumenVentas, "promedio">;

  return {
    ...fila,
    promedio: fila.ventas > 0 ? Math.round(fila.total / fila.ventas) : 0,
  };
}

/** Un renglon de una venta: que prenda, cuantas y a cuanto. */
export type RenglonDeVenta = {
  modelo_id: number | null;
  codigo: string;
  descripcion: string;
  piezas: number;
  /** Precio por pieza, en centavos. */
  precio: number;
  importe: number;
  /** En el tianguis: el precio registrado si se vendio en otro. */
  precio_lista: number | null;
};

/** Una venta completa, de la tienda o del tianguis. */
export type VentaIndividual = {
  origen: "tienda" | "tianguis";
  clave: string;
  /** Folio del ticket de la tienda; vacio en el tianguis. */
  folio: string;
  fecha: string;
  vendedora: string;
  cancelada: boolean;
  piezas: number;
  descuento: number;
  total: number;
  renglones: RenglonDeVenta[];
};

/**
 * Las ventas una por una, la mas nueva arriba, con sus prendas.
 *
 * Se piden las 'limite' mas recientes de cada lado y luego se juntan y
 * se recortan: asi un periodo largo no trae miles de renglones.
 */
export function ventasIndividuales(
  periodo: Periodo,
  origen: Origen = "todo",
  limite = 150,
  vendedora = ""
): VentaIndividual[] {
  const db = getDb();
  const inicio = desde(periodo);
  const quien = vendedora.trim();
  const ventas: VentaIndividual[] = [];

  if (origen !== "tianguis" && hayCaja()) {
    const tickets = db
      .prepare(
        `SELECT id, folio, fecha, vendedora, estado, piezas, descuento, total
           FROM caja_ventas
          WHERE date(fecha) >= ? AND (? = '' OR trim(vendedora) = ?)
          ORDER BY fecha DESC
          LIMIT ?`
      )
      .all(inicio, quien, quien, limite) as {
      id: string;
      folio: string;
      fecha: string;
      vendedora: string;
      estado: string;
      piezas: number;
      descuento: number;
      total: number;
    }[];

    // Una caja sin actualizar no tiene la columna: sus renglones salen sin
    // precio registrado, igual que antes.
    const renglonesDe = db.prepare(
      `SELECT modelo_id, codigo, descripcion, piezas, precio, importe,
              ${cajaGuardaPrecioLista() ? "precio_lista" : "NULL"} AS precio_lista
         FROM caja_venta_lineas WHERE venta_id = ? ORDER BY id`
    );

    for (const t of tickets) {
      const renglones = (renglonesDe.all(t.id) as RenglonDeVenta[]).map((r) => ({
        ...r,
        // Igual que en el tianguis: solo se dice cuando se cobro en otro.
        precio_lista: r.precio_lista !== null && r.precio_lista !== r.precio ? r.precio_lista : null,
      }));
      ventas.push({
        origen: "tienda",
        clave: `tienda-${t.id}`,
        folio: t.folio,
        fecha: t.fecha,
        vendedora: t.vendedora,
        cancelada: t.estado !== "cobrada",
        piezas: t.piezas,
        descuento: t.descuento,
        total: t.total,
        renglones,
      });
    }
  }

  if (origen !== "tienda") {
    const filas = db
      .prepare(
        `SELECT v.id, v.fecha, v.persona, v.estado, v.piezas, v.precio, v.precio_lista,
                v.modelo_id, m.codigo, m.descripcion
           FROM tianguis_ventas v
           JOIN modelos m ON m.id = v.modelo_id
          WHERE date(v.fecha) >= ? AND (? = '' OR trim(v.persona) = ?)
          ORDER BY v.fecha DESC, v.id DESC
          LIMIT ?`
      )
      .all(inicio, quien, quien, limite) as {
      id: number;
      fecha: string;
      persona: string;
      estado: string;
      piezas: number;
      precio: number;
      precio_lista: number | null;
      modelo_id: number;
      codigo: string;
      descripcion: string;
    }[];

    for (const v of filas) {
      const importe = v.piezas * v.precio;
      ventas.push({
        origen: "tianguis",
        clave: `tianguis-${v.id}`,
        folio: "",
        fecha: v.fecha,
        vendedora: v.persona,
        cancelada: v.estado !== "vendida",
        piezas: v.piezas,
        descuento: 0,
        total: importe,
        renglones: [
          {
            modelo_id: v.modelo_id,
            codigo: v.codigo,
            descripcion: v.descripcion,
            piezas: v.piezas,
            precio: v.precio,
            importe,
            precio_lista: v.precio_lista !== null && v.precio_lista !== v.precio ? v.precio_lista : null,
          },
        ],
      });
    }
  }

  return ventas.sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, limite);
}

/** Los pesos y centavos, escritos como se leen. */
export function pesos(centavos: number): string {
  return (centavos / 100).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  });
}
