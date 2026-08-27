/**
 * Arma la carpeta que se lleva en la USB a la bodega.
 *
 *   npm run paquete
 *
 * Copia el sistema completo, incluyendo node_modules y el build ya
 * hecho. Asi la instalacion en la bodega NO necesita internet: si la
 * red de alla esta lenta o caida, la instalacion igual sale.
 *
 * Lo que se lleva y lo que no:
 *   - va:    el codigo, las fotos, el logo, el catalogo del cliente,
 *            node_modules y .next (para no bajar ni compilar alla)
 *   - no va: la base de datos (alla nace limpia), el .git, el PDF
 *            original, los documentos internos y los temporales.
 *
 * La base NO se copia a proposito: si se copiara la de aqui, el cliente
 * empezaria con las pruebas que hicimos nosotros metidas en su
 * inventario. Alla se crea sola con los modelos en cero, que es como
 * debe empezar.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const destino = process.argv[2] || path.join(path.dirname(raiz), "VENUS-PARA-USB");

/** Carpetas y archivos que no viajan. */
const FUERA = new Set([
  ".git",
  ".gitignore",
  ".gitattributes",
  "data",
  "docs",
  "tsconfig.tsbuildinfo",
  ".env.local",
]);

/**
 * La lista solo vale para la raiz del proyecto.
 *
 * Aplicarla en todos los niveles rompia el paquete: dentro de
 * node_modules hay librerias con sus propias carpetas "data" y "docs",
 * y al saltarlas el sistema ya no compilaba alla.
 */
function seVa(nombre, enLaRaiz) {
  if (enLaRaiz && FUERA.has(nombre)) return true;
  if (enLaRaiz && nombre.endsWith(".pdf")) return true; // el original del cliente, 11 MB
  return false;
}

let archivos = 0;
let bytes = 0;

function copiar(desde, hacia, enLaRaiz = false) {
  fs.mkdirSync(hacia, { recursive: true });
  for (const entrada of fs.readdirSync(desde, { withFileTypes: true })) {
    if (seVa(entrada.name, enLaRaiz)) continue;
    const a = path.join(desde, entrada.name);
    const b = path.join(hacia, entrada.name);
    if (entrada.isDirectory()) {
      copiar(a, b);
    } else if (entrada.isFile()) {
      fs.copyFileSync(a, b);
      archivos++;
      bytes += fs.statSync(a).size;
    }
  }
}

/* ---------- revisiones antes de copiar ---------- */

const faltan = [];
if (!fs.existsSync(path.join(raiz, "node_modules", "next"))) {
  faltan.push("node_modules  (corre  npm install)");
}
if (!fs.existsSync(path.join(raiz, ".next", "BUILD_ID"))) {
  faltan.push(".next  (corre  npm run build)");
}

if (faltan.length) {
  console.error(
    ["Falta preparar esto antes de armar el paquete:", ...faltan.map((f) => "  - " + f)].join("\n")
  );
  process.exit(1);
}

const avisos = [];
if (!fs.existsSync(path.join(raiz, "public", "catalogo"))) {
  avisos.push("Sin  public/catalogo : los modelos van a salir sin foto.");
}
if (!fs.existsSync(path.join(raiz, "src", "datos", "catalogo.json"))) {
  avisos.push("Sin  src/datos/catalogo.json : el sistema arranca con el catalogo vacio.");
}

/* ---------- a copiar ---------- */

if (fs.existsSync(destino)) {
  fs.rmSync(destino, { recursive: true, force: true });
}

console.log("Armando el paquete. Tarda un minuto: son muchos archivos chicos.\n");
copiar(raiz, destino, true);

const mb = (bytes / 1024 / 1024).toFixed(0);

console.log(`Listo:  ${destino}`);
console.log(`        ${archivos.toLocaleString("es-MX")} archivos, ${mb} MB\n`);

if (avisos.length) {
  console.log("Avisos:");
  for (const a of avisos) console.log("  - " + a);
  console.log("");
}

console.log("En la bodega:");
console.log("  1. Copia esa carpeta al Escritorio de la computadora.");
console.log("  2. Doble clic en INSTALAR.bat (ya no necesita internet).");
console.log("  3. Doble clic en INICIAR.bat.\n");
