import "server-only";
import fs from "node:fs";
import path from "node:path";

/**
 * Que fotos del catalogo estan realmente en el disco.
 *
 * La carpeta public no viaja en el repositorio: son las fotos del
 * cliente. Entonces una copia recien clonada tiene los 129 modelos en la
 * base, cada uno apuntando a su foto, pero sin los archivos.
 *
 * Sin esta comprobacion el navegador pinta 129 iconos de imagen rota,
 * que se ve mucho peor que no tener foto. Con ella, el sistema dibuja su
 * percha de siempre y se ve entero.
 *
 * Se lee una sola vez al arrancar: las fotos llegan con la instalacion y
 * no cambian mientras el sistema corre. Si se agregan despues (por
 * ejemplo con "npm run catalogo"), se ven al reiniciar.
 */

const CARPETA = path.join(process.cwd(), "public");

let disponibles: Set<string> | null = null;

function leerCarpeta(relativa: string, prefijo: string, dentro: Set<string>) {
  try {
    for (const archivo of fs.readdirSync(path.join(CARPETA, relativa))) {
      if (archivo.endsWith(".jpg") || archivo.endsWith(".png") || archivo.endsWith(".webp")) {
        dentro.add(prefijo + archivo);
      }
    }
  } catch {
    // La carpeta no esta: es el caso normal de una copia sin fotos.
  }
}

function catalogoEnDisco(): Set<string> {
  if (disponibles) return disponibles;

  const encontradas = new Set<string>();
  leerCarpeta("catalogo", "/catalogo/", encontradas);
  leerCarpeta("catalogo/mini", "/catalogo/mini/", encontradas);
  leerCarpeta("fotos", "/fotos/", encontradas);

  disponibles = encontradas;
  return encontradas;
}

/**
 * true si el archivo existe y se puede mostrar.
 * Las rutas que no son del catalogo (una foto de otro lado) se dan por
 * buenas: no es asunto de este modulo verificarlas.
 */
export function hayFoto(ruta: string | null | undefined): boolean {
  if (!ruta) return false;
  if (!ruta.startsWith("/catalogo/") && !ruta.startsWith("/fotos/")) return true;
  return catalogoEnDisco().has(ruta);
}

/** Cuantas fotos del catalogo estan en disco. Lo usa Ajustes para avisar. */
export function totalFotos(): number {
  let n = 0;
  for (const r of catalogoEnDisco()) {
    if (r.startsWith("/catalogo/") && !r.startsWith("/catalogo/mini/")) n++;
  }
  return n;
}
