"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { leerCSV } from "@/lib/csv";
import {
  normalizarCodigo,
  normalizarTexto,
  partirCodigo,
  sinAcentos,
  validarCodigo,
} from "@/lib/codigos";
import { aplicarMovimiento } from "@/lib/inventario";
import type { Resultado } from "@/lib/tipos";

/**
 * Importacion masiva desde una hoja de calculo.
 *
 * Reconoce los encabezados escritos de varias formas porque cada quien
 * nombra distinto sus columnas ("modelo", "codigo", "clave"...).
 */

const ALIAS: Record<string, string[]> = {
  codigo: ["codigo", "código", "modelo", "clave", "cod"],
  descripcion: ["descripcion", "descripción", "nombre", "prenda", "producto"],
  tallas: ["tallas", "talla", "medidas"],
  colores: ["colores", "color"],
  tela: ["tela", "material", "telas"],
  categoria: ["categoria", "categoría", "tipo", "linea", "línea"],
  existencia: ["existencia", "existencias", "cantidad", "piezas", "stock", "total"],
  ubicacion: ["ubicacion", "ubicación", "lugar", "rack", "posicion", "posición"],
  minimo: ["minimo", "mínimo", "min"],
  notas: ["notas", "nota", "observaciones", "comentarios"],
};

function mapearColumnas(encabezados: string[]): Record<string, number> {
  const mapa: Record<string, number> = {};

  encabezados.forEach((bruto, i) => {
    const limpio = sinAcentos(bruto.trim().toLowerCase());

    for (const [campo, nombres] of Object.entries(ALIAS)) {
      if (mapa[campo] !== undefined) continue;
      if (nombres.some((n) => limpio === sinAcentos(n))) mapa[campo] = i;
    }
  });

  return mapa;
}

export type ResultadoImportacion = {
  creados: number;
  actualizados: number;
  omitidos: { fila: number; motivo: string }[];
};

/**
 * Procesa el CSV.
 * Si 'soloRevisar' es true no escribe nada: devuelve lo que pasaria.
 * Asi el usuario ve el resultado antes de aceptar.
 */
export async function importarCSV(
  contenido: string,
  soloRevisar: boolean
): Promise<Resultado<ResultadoImportacion>> {
  const filas = leerCSV(contenido);

  if (filas.length < 2) {
    return { ok: false, error: "El archivo esta vacio o no tiene datos debajo del encabezado." };
  }

  const columnas = mapearColumnas(filas[0]);

  if (columnas.codigo === undefined) {
    return {
      ok: false,
      error:
        "No encontre la columna del codigo. Debe llamarse 'codigo' o 'modelo' en la primera fila.",
    };
  }

  const db = getDb();
  const resultado: ResultadoImportacion = { creados: 0, actualizados: 0, omitidos: [] };

  const dato = (fila: string[], campo: string): string => {
    const i = columnas[campo];
    return i === undefined ? "" : (fila[i] ?? "").trim();
  };

  const aplicar = db.transaction(() => {
    // Las ubicaciones se van creando conforme aparecen en el archivo.
    const cacheUbicaciones = new Map<string, number>();

    const buscarUbicacion = (codigo: string): number | null => {
      const norm = normalizarCodigo(codigo);
      if (!norm) return null;
      if (cacheUbicaciones.has(norm)) return cacheUbicaciones.get(norm)!;

      const existente = db.prepare("SELECT id FROM ubicaciones WHERE codigo = ?").get(norm) as
        | { id: number }
        | undefined;

      if (existente) {
        cacheUbicaciones.set(norm, existente.id);
        return existente.id;
      }

      // Se parte "A-03-2" en zona/rack/nivel para que encaje con el
      // resto del sistema; si no trae guiones, todo va como zona.
      const partes = norm.split("-");
      const info = db
        .prepare("INSERT INTO ubicaciones (codigo, zona, rack, nivel) VALUES (?, ?, ?, ?)")
        .run(norm, partes[0] ?? norm, partes[1] ?? "", partes[2] ?? "");

      const id = Number(info.lastInsertRowid);
      cacheUbicaciones.set(norm, id);
      return id;
    };

    for (let i = 1; i < filas.length; i++) {
      const fila = filas[i];
      const numeroFila = i + 1;

      const codigoCrudo = dato(fila, "codigo");
      const errorCodigo = validarCodigo(codigoCrudo);

      if (errorCodigo) {
        resultado.omitidos.push({ fila: numeroFila, motivo: errorCodigo });
        continue;
      }

      const codigoNorm = normalizarCodigo(codigoCrudo);
      const { prefijo, numero } = partirCodigo(codigoCrudo);

      const existenciaTexto = dato(fila, "existencia");
      const existencia = existenciaTexto ? parseInt(existenciaTexto, 10) : 0;

      if (existenciaTexto && !Number.isFinite(existencia)) {
        resultado.omitidos.push({
          fila: numeroFila,
          motivo: `"${existenciaTexto}" no es una cantidad valida`,
        });
        continue;
      }

      const minimoTexto = dato(fila, "minimo");
      const minimo = minimoTexto ? parseInt(minimoTexto, 10) || 0 : 0;

      const ubicacionTexto = dato(fila, "ubicacion");
      const ubicacionId = ubicacionTexto ? buscarUbicacion(ubicacionTexto) : null;

      const campos = {
        codigo: codigoCrudo.toUpperCase(),
        codigo_norm: codigoNorm,
        prefijo,
        numero,
        descripcion: normalizarTexto(dato(fila, "descripcion")),
        categoria: normalizarTexto(dato(fila, "categoria")),
        tallas: normalizarTexto(dato(fila, "tallas")),
        colores: normalizarTexto(dato(fila, "colores")),
        tela: normalizarTexto(dato(fila, "tela")),
        notas: dato(fila, "notas"),
        minimo,
        ubicacion_id: ubicacionId,
      };

      const existente = db
        .prepare("SELECT id, existencia FROM modelos WHERE codigo_norm = ?")
        .get(codigoNorm) as { id: number; existencia: number } | undefined;

      if (existente) {
        // Al actualizar no se pisa la existencia con la del archivo:
        // se ajusta con un movimiento para no perder el historial.
        db.prepare(
          `UPDATE modelos SET
             codigo = @codigo, prefijo = @prefijo, numero = @numero,
             descripcion = CASE WHEN @descripcion <> '' THEN @descripcion ELSE descripcion END,
             categoria   = CASE WHEN @categoria   <> '' THEN @categoria   ELSE categoria   END,
             tallas      = CASE WHEN @tallas      <> '' THEN @tallas      ELSE tallas      END,
             colores     = CASE WHEN @colores     <> '' THEN @colores     ELSE colores     END,
             tela        = CASE WHEN @tela        <> '' THEN @tela        ELSE tela        END,
             notas       = CASE WHEN @notas       <> '' THEN @notas       ELSE notas       END,
             minimo      = @minimo,
             ubicacion_id = COALESCE(@ubicacion_id, ubicacion_id),
             activo = 1,
             actualizado_en = datetime('now','localtime')
           WHERE id = @id`
        ).run({ ...campos, id: existente.id });

        if (existenciaTexto && existencia !== existente.existencia) {
          aplicarMovimiento(db, {
            modeloId: existente.id,
            tipo: "conteo",
            cantidad: existencia,
            nota: "Ajuste por importacion de archivo",
          });
        }

        resultado.actualizados++;
      } else {
        const info = db
          .prepare(
            `INSERT INTO modelos
               (codigo, codigo_norm, prefijo, numero, descripcion, categoria,
                tallas, colores, tela, notas, minimo, ubicacion_id)
             VALUES (@codigo, @codigo_norm, @prefijo, @numero, @descripcion, @categoria,
                     @tallas, @colores, @tela, @notas, @minimo, @ubicacion_id)`
          )
          .run(campos);

        const nuevoId = Number(info.lastInsertRowid);

        if (existencia > 0) {
          aplicarMovimiento(db, {
            modeloId: nuevoId,
            tipo: "entrada",
            cantidad: existencia,
            nota: "Existencia inicial por importacion",
          });
        }

        resultado.creados++;
      }
    }

    // En modo revision se deshace todo: solo interesaba el conteo.
    if (soloRevisar) throw new SoloRevision(resultado);
  });

  try {
    aplicar();
  } catch (e) {
    if (e instanceof SoloRevision) {
      return { ok: true, datos: e.resultado };
    }
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudo procesar el archivo.",
    };
  }

  revalidatePath("/", "layout");

  const partes: string[] = [];
  if (resultado.creados) partes.push(`${resultado.creados} nuevos`);
  if (resultado.actualizados) partes.push(`${resultado.actualizados} actualizados`);
  if (resultado.omitidos.length) partes.push(`${resultado.omitidos.length} omitidos`);

  return {
    ok: true,
    datos: resultado,
    mensaje: partes.length ? `Importacion lista: ${partes.join(", ")}.` : "No habia nada que importar.",
  };
}

/** Error interno para abortar la transaccion de la revision previa. */
class SoloRevision extends Error {
  constructor(public resultado: ResultadoImportacion) {
    super("revision");
  }
}
