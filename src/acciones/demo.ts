"use server";

import { revalidatePath } from "next/cache";
import { getDb, MODO_DEMO } from "@/lib/db";
import { sembrarCatalogo, sembrarDemostracion } from "@/lib/siembra";
import type { Resultado } from "@/lib/tipos";

/**
 * Deja la demostracion como recien abierta.
 *
 * Sirve para volver a ensenarla desde cero despues de que alguien la
 * estuvo probando. Solo existe en modo demostracion: en la bodega esto
 * borraria el inventario de verdad, asi que ni siquiera se ofrece.
 */
export async function reiniciarDemo(): Promise<Resultado> {
  if (!MODO_DEMO) {
    return { ok: false, error: "Esto solo se puede hacer en la demostracion." };
  }

  const db = getDb();

  try {
    db.transaction(() => {
      db.exec(`
        DELETE FROM conteo_lineas;
        DELETE FROM conteos;
        DELETE FROM movimientos;
        DELETE FROM remisiones;
        DELETE FROM modelos;
        DELETE FROM ubicaciones;
        DELETE FROM lineas;
        DELETE FROM config;
      `);
      sembrarCatalogo(db);
      sembrarDemostracion(db);
    })();
  } catch {
    return { ok: false, error: "No se pudo reiniciar la demostracion." };
  }

  revalidatePath("/", "layout");
  return { ok: true, mensaje: "La demostracion quedo como nueva." };
}
