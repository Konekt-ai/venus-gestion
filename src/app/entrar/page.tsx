import { redirect } from "next/navigation";
import { puedeEntrar } from "@/lib/acceso";
import { rutaLogo } from "@/lib/logo";
import { Portada } from "@/components/Portada";

export const dynamic = "force-dynamic";

/**
 * La unica pantalla que se ve sin haber escrito la contrasena.
 *
 * Si el negocio no puso contrasena, o ya se entro desde este telefono,
 * aqui no hay nada que hacer: se va derecho al inicio.
 */
export default async function Entrar() {
  if (await puedeEntrar()) redirect("/");
  return <Portada logo={rutaLogo()} />;
}
