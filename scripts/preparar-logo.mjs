/**
 * Prepara el logo de la tienda para usarse en el sistema.
 *
 *   npm run logo
 *
 * Toma el archivo que haya en public/ (logo.jpeg, logo.jpg o logo.png),
 * le quita el fondo y guarda un public/logo.png con transparencia.
 *
 * Hace falta porque un JPEG no puede tener fondo transparente: trae el
 * suyo pintado. Sin esto, el logo se veria como un recuadro pegado
 * encima del marfil de la barra.
 *
 * Como lo quita: el logo es un trazo oscuro sobre un fondo claro y
 * parejo, asi que la transparencia se calcula por que tan claro es cada
 * punto. Los puntos claros desaparecen, los oscuros se quedan, y los de
 * en medio quedan a medias, que es lo que conserva los bordes suaves de
 * la caligrafia en vez de dejarlos dentados.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const publico = path.join(raiz, "public");

// El color del trazo: la misma tinta del resto del sistema.
const TINTA = { r: 0x1a, g: 0x16, b: 0x13 };

// Por encima de este brillo se considera fondo y desaparece del todo.
const FONDO = 232;
// Por debajo de este otro se considera trazo y se queda opaco.
const TRAZO = 70;

const ENTRADAS = ["logo.jpeg", "logo.jpg", "logo.png", "logo.webp"];

const origen = ENTRADAS.map((n) => path.join(publico, n)).find((p) => fs.existsSync(p));

if (!origen) {
  console.error(
    "No encontre ningun logo en public/.\n" +
      "Guarda ahi el archivo como logo.jpeg, logo.jpg o logo.png y vuelve a intentar."
  );
  process.exit(1);
}

console.log(`Tomando ${path.basename(origen)}...`);

const imagen = sharp(origen).ensureAlpha();
const { data, info } = await imagen.raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;

const salida = Buffer.alloc(width * height * 4);
let opacos = 0;

for (let i = 0, j = 0; i < data.length; i += channels, j += 4) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];

  // Brillo percibido: el ojo no pesa igual los tres colores.
  const brillo = 0.299 * r + 0.587 * g + 0.114 * b;

  let alfa;
  if (brillo >= FONDO) alfa = 0;
  else if (brillo <= TRAZO) alfa = 255;
  else alfa = Math.round(((FONDO - brillo) / (FONDO - TRAZO)) * 255);

  // El trazo se pinta con la tinta del sistema y no con el color
  // original: asi los bordes a medias no arrastran el tono del fondo
  // viejo y no queda un halo alrededor de las letras.
  salida[j] = TINTA.r;
  salida[j + 1] = TINTA.g;
  salida[j + 2] = TINTA.b;
  salida[j + 3] = alfa;

  if (alfa > 0) opacos++;
}

const destino = path.join(publico, "logo.png");

const info2 = await sharp(salida, { raw: { width, height, channels: 4 } })
  // Recorta el aire transparente de las orillas para que el logo llene
  // el espacio que se le da en pantalla.
  .trim()
  .png({ compressionLevel: 9 })
  .toFile(destino);

const porcentaje = ((opacos / (width * height)) * 100).toFixed(1);

console.log(`Listo: public/logo.png`);
console.log(`  original  ${width} x ${height}`);
console.log(`  recortado ${info2.width} x ${info2.height}`);
console.log(`  ${porcentaje}% del area es dibujo; el resto quedo transparente`);
console.log(`  ${(info2.size / 1024).toFixed(1)} KB`);
console.log("");
console.log("El sistema prefiere logo.png sobre el original, asi que ya se usa este.");
