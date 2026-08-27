"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { normalizarCodigo } from "@/lib/codigos";
import type { Resultado } from "@/lib/tipos";
import { exigirAcceso } from "@/lib/acceso";

/**
 * Nombres de las lineas.
 *
 * Las letras del codigo dicen de que linea es la prenda: "VN 178" es un
 * vestido de Nelly. Aqui se le pone nombre a cada prefijo para que en
 * pantalla no aparezcan solo dos letras sueltas.
 */
export async function guardarLinea(prefijo: string, nombre: string): Promise<Resultado> {
  await exigirAcceso();
  const clave = normalizarCodigo(prefijo);
  const texto = nombre.trim();

  if (!clave) return { ok: false, error: "Escribe las letras de la linea." };

  const db = getDb();

  // Sin nombre se entiende que se quiere quitar la etiqueta.
  if (!texto) {
    db.prepare("DELETE FROM lineas WHERE prefijo = ?").run(clave);
    revalidatePath("/", "layout");
    return { ok: true, mensaje: `Se quito el nombre de ${clave}.` };
  }

  db.prepare(
    `INSERT INTO lineas (prefijo, nombre) VALUES (?, ?)
     ON CONFLICT(prefijo) DO UPDATE SET nombre = excluded.nombre`
  ).run(clave, texto);

  revalidatePath("/", "layout");
  return { ok: true, mensaje: `${clave} = ${texto}` };
}
