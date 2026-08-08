import "server-only";
import fs from "node:fs";
import path from "node:path";

/**
 * Busca el archivo del logo de la tienda.
 *
 * Basta con dejarlo en  public/  con el nombre "logo" y su extension.
 * Si no esta, el sistema dibuja el nombre con tipografia, asi que nunca
 * se queda un hueco y el dia que se copie el archivo aparece solo.
 *
 * Orden de preferencia:
 *   public/logo.svg    el mejor: nitido a cualquier tamano
 *   public/logo.png    con fondo transparente
 *   public/logo.webp
 *   public/logo.jpg
 */
const NOMBRES = ["logo.svg", "logo.png", "logo.webp", "logo.jpg", "logo.jpeg"];

export function rutaLogo(): string | null {
  for (const nombre of NOMBRES) {
    try {
      if (fs.existsSync(path.join(process.cwd(), "public", nombre))) {
        return `/${nombre}`;
      }
    } catch {
      // Si no se puede leer la carpeta, se usa el respaldo tipografico.
    }
  }
  return null;
}
