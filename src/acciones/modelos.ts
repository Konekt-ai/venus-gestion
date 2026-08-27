"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { normalizarCodigo, normalizarTexto, partirCodigo, validarCodigo } from "@/lib/codigos";
import { aplicarMovimiento, ErrorInventario } from "@/lib/inventario";
import type { Resultado } from "@/lib/tipos";
import { exigirAcceso } from "@/lib/acceso";

function texto(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}

function entero(v: FormDataEntryValue | null, porDefecto = 0): number {
  const n = parseInt(texto(v), 10);
  return Number.isFinite(n) ? n : porDefecto;
}

function refrescar() {
  revalidatePath("/", "layout");
}

/**
 * Crea o actualiza un modelo.
 * Si viene 'id' edita; si no, da de alta.
 */
export async function guardarModelo(_previo: unknown, form: FormData): Promise<Resultado<number>> {
  await exigirAcceso();
  const db = getDb();

  const id = entero(form.get("id"), 0);
  const codigoCrudo = texto(form.get("codigo"));

  const errorCodigo = validarCodigo(codigoCrudo);
  if (errorCodigo) return { ok: false, error: errorCodigo };

  const codigoNorm = normalizarCodigo(codigoCrudo);
  const { prefijo, numero } = partirCodigo(codigoCrudo);

  const descripcion = normalizarTexto(texto(form.get("descripcion")));
  if (!descripcion) return { ok: false, error: "Escribe la descripcion de la prenda." };

  const ubicacionId = entero(form.get("ubicacion_id"), 0) || null;
  const minimo = Math.max(0, entero(form.get("minimo"), 0));

  const campos = {
    codigo: codigoCrudo.toUpperCase(),
    codigo_norm: codigoNorm,
    prefijo,
    numero,
    descripcion,
    categoria: normalizarTexto(texto(form.get("categoria"))),
    tallas: normalizarTexto(texto(form.get("tallas"))),
    colores: normalizarTexto(texto(form.get("colores"))),
    tela: normalizarTexto(texto(form.get("tela"))),
    minimo,
    ubicacion_id: ubicacionId,
    notas: texto(form.get("notas")),
    foto: texto(form.get("foto")),
    destacado: form.get("destacado") ? 1 : 0,
  };

  // El codigo no puede repetirse: es como identifican la prenda.
  const choque = db
    .prepare("SELECT id, codigo FROM modelos WHERE codigo_norm = ? AND id <> ?")
    .get(codigoNorm, id) as { id: number; codigo: string } | undefined;

  if (choque) {
    return { ok: false, error: `El codigo ${choque.codigo} ya esta registrado.` };
  }

  try {
    if (id > 0) {
      db.prepare(
        `UPDATE modelos SET
           codigo = @codigo, codigo_norm = @codigo_norm, prefijo = @prefijo, numero = @numero,
           descripcion = @descripcion, categoria = @categoria, tallas = @tallas,
           colores = @colores, tela = @tela, minimo = @minimo, ubicacion_id = @ubicacion_id,
           notas = @notas, foto = @foto, destacado = @destacado,
           actualizado_en = datetime('now','localtime')
         WHERE id = @id`
      ).run({ ...campos, id });

      refrescar();
      return { ok: true, datos: id, mensaje: `Se guardo ${campos.codigo}.` };
    }

    // Alta: la existencia inicial entra como movimiento de entrada,
    // asi queda registrada en el historial desde el primer dia.
    const existenciaInicial = Math.max(0, entero(form.get("existencia"), 0));

    const nuevoId = db.transaction(() => {
      const info = db
        .prepare(
          `INSERT INTO modelos
             (codigo, codigo_norm, prefijo, numero, descripcion, categoria,
              tallas, colores, tela, minimo, ubicacion_id, notas, foto, destacado)
           VALUES (@codigo, @codigo_norm, @prefijo, @numero, @descripcion, @categoria,
                   @tallas, @colores, @tela, @minimo, @ubicacion_id, @notas, @foto, @destacado)`
        )
        .run(campos);

      const creadoId = Number(info.lastInsertRowid);

      if (existenciaInicial > 0) {
        aplicarMovimiento(db, {
          modeloId: creadoId,
          tipo: "entrada",
          cantidad: existenciaInicial,
          nota: "Existencia inicial al dar de alta el modelo",
        });
      }

      return creadoId;
    })();

    refrescar();
    return { ok: true, datos: nuevoId, mensaje: `Se dio de alta ${campos.codigo}.` };
  } catch (e) {
    if (e instanceof ErrorInventario) return { ok: false, error: e.message };
    return { ok: false, error: "No se pudo guardar el modelo. Intenta de nuevo." };
  }
}

/** Cambia la ubicacion de un modelo sin tocar existencias. */
export async function cambiarUbicacion(
  modeloId: number,
  ubicacionId: number | null
): Promise<Resultado> {
  await exigirAcceso();
  const db = getDb();
  db.prepare(
    "UPDATE modelos SET ubicacion_id = ?, actualizado_en = datetime('now','localtime') WHERE id = ?"
  ).run(ubicacionId, modeloId);
  refrescar();
  return { ok: true, mensaje: "Se actualizo la ubicacion." };
}

/**
 * Da de baja un modelo. No borra el registro: lo marca inactivo para
 * conservar su historial de movimientos.
 */
export async function archivarModelo(modeloId: number): Promise<Resultado> {
  await exigirAcceso();
  const db = getDb();
  db.prepare(
    "UPDATE modelos SET activo = 0, actualizado_en = datetime('now','localtime') WHERE id = ?"
  ).run(modeloId);
  refrescar();
  return { ok: true, mensaje: "El modelo se archivo." };
}

export async function restaurarModelo(modeloId: number): Promise<Resultado> {
  await exigirAcceso();
  const db = getDb();
  db.prepare(
    "UPDATE modelos SET activo = 1, actualizado_en = datetime('now','localtime') WHERE id = ?"
  ).run(modeloId);
  refrescar();
  return { ok: true, mensaje: "El modelo se restauro." };
}

/** Agrega un valor nuevo a un catalogo (tela, color, talla, categoria). */
export async function agregarACatalogo(tipo: string, valor: string): Promise<Resultado> {
  await exigirAcceso();
  const limpio = normalizarTexto(valor);
  if (!limpio) return { ok: false, error: "Escribe un valor." };

  const db = getDb();
  db.prepare("INSERT OR IGNORE INTO catalogos (tipo, valor, orden) VALUES (?, ?, 999)").run(
    tipo,
    limpio
  );
  refrescar();
  return { ok: true, mensaje: `Se agrego "${limpio}".` };
}
