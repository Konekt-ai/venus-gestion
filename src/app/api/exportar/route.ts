import { NextResponse } from "next/server";
import { movimientosRecientes, todosLosModelos } from "@/lib/consultas";
import { getDb } from "@/lib/db";
import { escribirCSV } from "@/lib/csv";
import { NOMBRE_MOVIMIENTO, type TipoMovimiento } from "@/lib/tipos";

export const dynamic = "force-dynamic";

/**
 * Descarga del inventario en CSV, listo para abrir en Excel.
 *
 * ?tipo=inventario  (predeterminado) el catalogo con existencias
 * ?tipo=movimientos el historial completo
 */
export async function GET(peticion: Request) {
  const url = new URL(peticion.url);
  const tipo = url.searchParams.get("tipo") ?? "inventario";
  const fecha = new Date().toISOString().slice(0, 10);

  let csv: string;
  let nombre: string;

  if (tipo === "movimientos") {
    const movimientos = movimientosRecientes(100000);
    csv = escribirCSV(
      ["fecha", "codigo", "descripcion", "movimiento", "cantidad", "antes", "despues", "persona", "nota"],
      movimientos.map((m) => [
        m.fecha,
        m.modelo_codigo,
        m.modelo_descripcion,
        NOMBRE_MOVIMIENTO[m.tipo as TipoMovimiento] ?? m.tipo,
        m.cantidad,
        m.existencia_antes,
        m.existencia_despues,
        m.persona,
        m.nota,
      ])
    );
    nombre = `venus-movimientos-${fecha}.csv`;
  } else {
    const db = getDb();
    const modelos = todosLosModelos();

    // Se resuelve el codigo de ubicacion para que el archivo se
    // entienda solo, sin tener que cruzar con otra tabla.
    const ubicaciones = new Map<number, string>();
    for (const u of db.prepare("SELECT id, codigo FROM ubicaciones").all() as {
      id: number;
      codigo: string;
    }[]) {
      ubicaciones.set(u.id, u.codigo);
    }

    csv = escribirCSV(
      [
        "codigo",
        "descripcion",
        "categoria",
        "tallas",
        "colores",
        "tela",
        "existencia",
        "en_tienda",
        "en_tianguis",
        "minimo",
        "ubicacion",
        "notas",
      ],
      modelos.map((m) => [
        m.codigo,
        m.descripcion,
        m.categoria,
        m.tallas,
        m.colores,
        m.tela,
        m.existencia,
        m.en_tienda,
        m.en_tianguis,
        m.minimo,
        m.ubicacion_id ? (ubicaciones.get(m.ubicacion_id) ?? "") : "",
        m.notas,
      ])
    );
    nombre = `venus-inventario-${fecha}.csv`;
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombre}"`,
      "Cache-Control": "no-store",
    },
  });
}
