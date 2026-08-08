import type { MetadataRoute } from "next";
import { MODO_DEMO } from "@/lib/db";

// Se resuelve al pedirlo y no al compilar: asi depende del entorno donde
// realmente corre y no de si la variable existia en la maquina que compilo.
export const dynamic = "force-dynamic";

/**
 * La demostracion es publica pero no tiene por que salir en Google:
 * es material para ensenarle el sistema a un cliente, no una pagina que
 * alguien deba encontrar buscando.
 */
export default function robots(): MetadataRoute.Robots {
  if (MODO_DEMO) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  // En la bodega esto ni siquiera se consulta: la red es local.
  return { rules: { userAgent: "*", allow: "/" } };
}
