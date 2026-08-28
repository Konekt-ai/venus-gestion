/**
 * Junta el material del cliente para llevarlo en la USB.
 *
 *   npm run material
 *
 * El repositorio NO lleva las fotos, el logo ni el catalogo: son del
 * cliente y quedan fuera de GitHub a proposito. Entonces un  git clone
 * en la computadora de la bodega baja el sistema, pero **vacio**: cero
 * modelos y sin logo.
 *
 * Este script arma una carpeta chica (unos 5 MB) con exactamente eso que
 * falta. Se copia a la USB, se deja junto al proyecto clonado, y
 * INSTALAR.bat la encuentra y la acomoda sola.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const destino = process.argv[2] || path.join(path.dirname(raiz), "MATERIAL-VENUS");

/** Lo que hay que llevar, y por que. */
const PIEZAS = [
  { de: "public", a: "public", que: "Las fotos de las prendas y el logo" },
  { de: "src/datos/catalogo.json", a: "src/datos/catalogo.json", que: "Los modelos con su ficha" },
];

let archivos = 0;
let bytes = 0;

function copiar(desde, hacia) {
  const info = fs.statSync(desde);
  if (info.isDirectory()) {
    fs.mkdirSync(hacia, { recursive: true });
    for (const entrada of fs.readdirSync(desde)) {
      copiar(path.join(desde, entrada), path.join(hacia, entrada));
    }
  } else {
    fs.mkdirSync(path.dirname(hacia), { recursive: true });
    fs.copyFileSync(desde, hacia);
    archivos++;
    bytes += info.size;
  }
}

const faltan = PIEZAS.filter((p) => !fs.existsSync(path.join(raiz, p.de)));
if (faltan.length) {
  console.error("No encontre esto, que es justo lo que hay que llevar:\n");
  for (const f of faltan) console.error(`  - ${f.de}   (${f.que})`);
  console.error("\nSin eso, la computadora del cliente arranca sin fotos y sin modelos.");
  process.exit(1);
}

if (fs.existsSync(destino)) fs.rmSync(destino, { recursive: true, force: true });

for (const pieza of PIEZAS) {
  copiar(path.join(raiz, pieza.de), path.join(destino, pieza.a));
}

// Una nota adentro, por si la carpeta se separa de la conversacion.
fs.writeFileSync(
  path.join(destino, "LEEME.txt"),
  [
    "MATERIAL DE VENUS BOUTIQUE",
    "",
    "Esto es lo que NO viaja en GitHub porque es del cliente:",
    "las fotos de las prendas, el logo y el catalogo con sus fichas.",
    "",
    "COMO SE USA",
    "",
    "  1. Clona el sistema en la computadora de la bodega:",
    "       git clone https://github.com/Konekt-ai/venus-gestion.git",
    "",
    "  2. Copia ESTA carpeta completa junto a la carpeta venus-gestion,",
    "     o adentro de ella. Cualquiera de las dos sirve.",
    "",
    "  3. Corre INSTALAR.bat. El la encuentra sola y acomoda todo.",
    "",
    "Si no se copia, el sistema arranca igual pero SIN modelos y SIN fotos.",
    "",
    "Software desarrollado por Konekt.",
    "",
  ].join("\r\n"),
  "utf8"
);

const mb = (bytes / 1024 / 1024).toFixed(1);

console.log(`Listo:  ${destino}`);
console.log(`        ${archivos.toLocaleString("es-MX")} archivos, ${mb} MB\n`);
console.log("Lleva esa carpeta en la USB. En la computadora del cliente:\n");
console.log("  1. git clone https://github.com/Konekt-ai/venus-gestion.git");
console.log("  2. Copia MATERIAL-VENUS junto a la carpeta venus-gestion");
console.log("  3. Doble clic en INSTALAR.bat\n");
