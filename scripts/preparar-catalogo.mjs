/**
 * Prepara el catalogo del cliente a partir de su PDF.
 *
 *   npm run catalogo -- "ruta/del/archivo.pdf"
 *
 * Deja dos cosas listas para que el sistema las use:
 *
 *   src/datos/catalogo.json     los modelos con su codigo, nombre, tela y ficha
 *   public/catalogo/*.jpg   la foto de cada prenda, ya reducida de tamano
 *
 * Se corre una sola vez (o cuando el cliente mande un PDF nuevo). El que
 * mete los datos a la base es scripts/importar-catalogo.mjs.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const rutaPdf = process.argv[2];

if (!rutaPdf || !fs.existsSync(rutaPdf)) {
  console.error("Uso: npm run catalogo -- \"ruta/del/catalogo.pdf\"");
  process.exit(1);
}

const bin = fs.readFileSync(rutaPdf);
const txt = bin.toString("latin1");

/* ============================================================
   Lectura del PDF
   Se hace a mano para no meterle una libreria de PDF al proyecto
   por algo que se corre una vez.
   ============================================================ */

const objetos = new Map();
{
  const re = /(\d+)\s+0\s+obj\b/g;
  let m;
  const marcas = [];
  while ((m = re.exec(txt))) marcas.push({ num: parseInt(m[1], 10), inicio: m.index + m[0].length });
  for (const marca of marcas) {
    const fin = txt.indexOf("endobj", marca.inicio);
    objetos.set(marca.num, { inicio: marca.inicio, fin: fin === -1 ? txt.length : fin });
  }
}

const cuerpo = (num) => {
  const o = objetos.get(num);
  return o ? txt.slice(o.inicio, o.fin) : "";
};

function kidsDe(num, vistos = new Set()) {
  if (vistos.has(num)) return [];
  vistos.add(num);
  const c = cuerpo(num);
  if (/\/Type\s*\/Page[^s]/.test(c)) return [num];
  const mk = c.match(/\/Kids\s*\[([\s\S]*?)\]/);
  if (!mk) return [];
  return [...mk[1].matchAll(/(\d+)\s+0\s+R/g)].flatMap((x) => kidsDe(parseInt(x[1], 10), vistos));
}

let raizPaginas = null;
for (const [num] of objetos) {
  if (/\/Type\s*\/Pages\b/.test(cuerpo(num))) {
    raizPaginas = num;
    break;
  }
}
const paginas = raizPaginas ? kidsDe(raizPaginas) : [];

function streamDe(num) {
  const o = objetos.get(num);
  if (!o) return null;
  const trozo = txt.slice(o.inicio, o.fin);
  const i = trozo.indexOf("stream");
  if (i === -1) return null;
  let ds = o.inicio + i + 6;
  if (bin[ds] === 13) ds++;
  if (bin[ds] === 10) ds++;
  const fin = txt.indexOf("endstream", ds);
  return { datos: bin.slice(ds, fin), dic: trozo.slice(0, i) };
}

function contenidoDe(numPagina) {
  const c = cuerpo(numPagina);
  const m = c.match(/\/Contents\s+(?:(\d+)\s+0\s+R|\[([^\]]*)\])/);
  if (!m) return "";
  const nums = m[1]
    ? [parseInt(m[1], 10)]
    : [...m[2].matchAll(/(\d+)\s+0\s+R/g)].map((x) => parseInt(x[1], 10));
  return nums
    .map((n) => {
      const s = streamDe(n);
      if (!s) return "";
      try {
        return zlib.inflateSync(s.datos).toString("latin1");
      } catch {
        return s.datos.toString("latin1");
      }
    })
    .join("\n");
}

const BARRA = String.fromCharCode(92);

function leerCadena(s, pos) {
  let fuera = "";
  let nivel = 1;
  let k = pos + 1;
  while (k < s.length && nivel > 0) {
    const c = s[k];
    if (c === BARRA) {
      const sig = s[k + 1];
      if (sig >= "0" && sig <= "7") {
        let oct = "";
        let j = k + 1;
        while (j < s.length && oct.length < 3 && s[j] >= "0" && s[j] <= "7") oct += s[j++];
        fuera += String.fromCharCode(parseInt(oct, 8));
        k = j;
        continue;
      }
      const mapa = { n: "\n", r: "\r", t: "\t" };
      fuera += mapa[sig] !== undefined ? mapa[sig] : sig;
      k += 2;
      continue;
    }
    if (c === "(") nivel++;
    if (c === ")") {
      nivel--;
      if (nivel === 0) break;
    }
    fuera += c;
    k++;
  }
  return { texto: fuera, fin: k };
}

function textoDe(contenido) {
  const salida = [];
  let k = 0;
  while (k < contenido.length) {
    const c = contenido[k];
    if (c === "(") {
      const r = leerCadena(contenido, k);
      salida.push(r.texto);
      k = r.fin + 1;
      continue;
    }
    if (c === "-" || (c >= "0" && c <= "9")) {
      let num = "";
      let j = k;
      while (j < contenido.length) {
        const d = contenido[j];
        if (d === "-" || d === "." || (d >= "0" && d <= "9")) {
          num += d;
          j++;
        } else break;
      }
      const v = parseFloat(num);
      if (!Number.isNaN(v) && v < -180) salida.push(" ");
      k = j;
      continue;
    }
    if (
      contenido.startsWith("ET", k) ||
      contenido.startsWith("Td", k) ||
      contenido.startsWith("TD", k) ||
      contenido.startsWith("T*", k)
    ) {
      salida.push("\n");
      k += 2;
      continue;
    }
    k++;
  }
  return salida
    .join("")
    .split("\n")
    .map((l) => l.trim().replace(/[ \t]+/g, " "))
    .filter(Boolean);
}

function imagenesDe(numPagina) {
  const c = cuerpo(numPagina);
  const mx = c.match(/\/XObject\s*<<([\s\S]*?)>>/);
  if (!mx) return [];
  const fuera = [];
  for (const x of mx[1].matchAll(/\/(\w+)\s+(\d+)\s+0\s+R/g)) {
    const num = parseInt(x[2], 10);
    const c2 = cuerpo(num);
    if (!/\/Subtype\s*\/Image/.test(c2)) continue;
    const s = streamDe(num);
    if (!s || !/\/DCTDecode/.test(s.dic)) continue;
    const a = c2.match(/\/Width\s+(\d+)/);
    const h = c2.match(/\/Height\s+(\d+)/);
    fuera.push({
      datos: s.datos,
      ancho: a ? parseInt(a[1], 10) : 0,
      alto: h ? parseInt(h[1], 10) : 0,
    });
  }
  return fuera;
}

/* ============================================================
   Interpretacion del catalogo
   ============================================================ */

const RE_CODIGO = /^([A-Z]{1,3})\s*(\d{2,4})\b|^(\d{3})\b/;

function partirEncabezado(linea) {
  const l = (linea || "").replace(/\s+/g, " ").trim();
  const m = l.match(RE_CODIGO);
  if (!m) return null;
  const codigo = m[3] ? m[3] : `${m[1]} ${m[2]}`;
  return { codigo, nombre: l.slice(m[0].length).replace(/^[\s:.-]+/, "").trim() };
}

/** Tipos de prenda que se reconocen por como empieza el nombre. */
const CATEGORIAS = [
  "VESTIDO",
  "CONJUNTO",
  "BLUSA",
  "PANTIBLUSA",
  "PALAZZO",
  "PANTALON",
  "SHORT",
  "FALDA",
  "SACO",
  "BLAZER",
  "CHALECO",
  "CHAMARRA",
  "ABRIGO",
  "JUMPER",
  "MONO",
  "TOP",
];

/** Cuando el nombre no dice el tipo, las letras del codigo lo delatan. */
const POR_PREFIJO = {
  VD: "VESTIDO",
  BD: "BLUSA",
  CD: "CONJUNTO",
  PD: "PANTALON",
  NP: "PANTALON",
  SD: "SHORT",
  FD: "FALDA",
  MD: "MONO",
  JD: "JUMPER",
  TD: "BLUSA",
};

function categoriaDe(nombre, codigo) {
  const n = (nombre || "").toUpperCase();
  for (const c of CATEGORIAS) if (n.startsWith(c)) return c;
  for (const c of CATEGORIAS) if (n.includes(c)) return c;
  const pre = (codigo.match(/^[A-Z]+/) || [""])[0];
  return POR_PREFIJO[pre] || "";
}

/**
 * La tabla de "mas vendidos" de las primeras paginas trae tallas y
 * colores que las fichas no tienen. Se copian a mano porque la tabla
 * sale desordenada al leerla y son solo catorce renglones.
 */
const MAS_VENDIDOS = {
  "VD 194": { tallas: "GDE - XL - 2XL", colores: "VARIADO", tela: "POWER SATEN" },
  "084": { tallas: "CH - M - GDE", colores: "VARIADO", tela: "POWER SATEN" },
  "VD 302": { tallas: "GDE - XL - 2XL", colores: "VARIADO", tela: "POWER SATEN" },
  "VD 342": { tallas: "M - GDE - XL", colores: "VARIADO", tela: "POWER SATEN" },
  "004": { tallas: "CH - M - GDE - XL", colores: "VARIADO", tela: "POWER SATEN" },
  "VD 496": { tallas: "CH - UNITALLA", colores: "VARIADO", tela: "POWER SATEN" },
  "VD 410": { tallas: "CH - M", colores: "NEGRO", tela: "POWER SATEN" },
  "005": { tallas: "GDE - XL", colores: "VARIADO", tela: "TECNO CREPE", categoria: "VESTIDO" },
  "PD 46": { tallas: "", colores: "VARIADO", tela: "POWER SATEN" },
  "NP 284": { tallas: "M - GDE - XL", colores: "NEGRO", tela: "TECNO CREPE" },
  "PD 320": { tallas: "M - XL", colores: "VARIADO", tela: "TECNO CREPE" },
  "VD 446": { tallas: "VARIADO", colores: "VARIADO", tela: "TECNO CREPE" },
  "CD 281": { tallas: "M - GDE - XL", colores: "NEGRO Y BEIGE", tela: "BARBIE TWILL" },
  "202": { tallas: "VARIADO", colores: "COLORES BASICOS", tela: "TECNO CREPE" },
};

/* ============================================================
   Recorrido
   ============================================================ */

const carpetaFotos = path.join(raiz, "public", "catalogo");
const carpetaMini = path.join(carpetaFotos, "mini");
const carpetaDatos = path.join(raiz, "src", "datos");
fs.mkdirSync(carpetaFotos, { recursive: true });
fs.mkdirSync(carpetaMini, { recursive: true });
fs.mkdirSync(carpetaDatos, { recursive: true });

// Se limpian las fotos anteriores para que no queden sobras de un PDF viejo
for (const carpeta of [carpetaFotos, carpetaMini]) {
  for (const f of fs.readdirSync(carpeta)) {
    if (f.endsWith(".jpg")) fs.unlinkSync(path.join(carpeta, f));
  }
}

const modelos = [];
const vistos = new Map();
let seccion = "MAS VENDIDOS";
let fotosGuardadas = 0;

for (const [idx, numPag] of paginas.entries()) {
  const pagina = idx + 1;
  const lineas = textoDe(contenidoDe(numPag));
  const primera = lineas[0] || "";

  if (/MODELOS\s+VARIADOS/i.test(primera)) {
    seccion = "VARIADOS";
    continue;
  }
  if (/MODELOS\s+MAS\s+VENDIDOS/i.test(primera)) continue;

  const cab = partirEncabezado(primera);
  if (!cab) continue;

  // El nombre a veces sigue en el segundo renglon porque venia cortado
  let nombre = cab.nombre;
  if (lineas[1] && !/^(DESCRIPCION|DESCRPCION|TELA|INDICACIONES|AVIOS|MEDIDAS)/i.test(lineas[1])) {
    const sig = lineas[1].trim();
    if (sig.length < 40 && !partirEncabezado(sig)) nombre = (nombre + " " + sig).trim();
  }

  // Hay nombres con la etiqueta del campo pegada por un error de captura
  nombre = nombre
    .replace(/\s*DESCRP?I?PCION.*$/i, "")
    .replace(/\s*TELA\s*:.*$/i, "")
    .replace(/[\s:.-]+$/, "")
    .trim();

  // "(NELLY)" marca al proveedor; se guarda aparte y se saca del nombre
  let proveedor = "";
  const mProv = nombre.match(/\(([A-Z\s]+)\)/i);
  if (mProv) {
    proveedor = mProv[1].trim();
    nombre = nombre.replace(mProv[0], "").replace(/\s+/g, " ").trim();
  }

  const campo = (etiqueta) => {
    const l = lineas.find((x) => new RegExp("^" + etiqueta, "i").test(x));
    return l ? l.replace(new RegExp("^" + etiqueta + "\\s*:?\\s*", "i"), "").trim() : "";
  };

  const categoria = (MAS_VENDIDOS[cab.codigo] || {}).categoria || categoriaDe(nombre, cab.codigo);

  // Si el nombre no empieza por el tipo de prenda, se antepone, para que
  // el catalogo se lea parejo: "VESTIDO MIDI OLANES" y no "MIDI OLANES".
  let descripcion = nombre;
  if (categoria && !descripcion.toUpperCase().includes(categoria)) {
    descripcion = (categoria + " " + descripcion).trim();
  }

  // Codigo repetido en el PDF: son prendas distintas con el mismo numero.
  // Se conservan las dos y se marca, para que el cliente lo resuelva.
  let codigo = cab.codigo;
  let notaCodigo = "";
  if (vistos.has(codigo)) {
    const n = vistos.get(codigo) + 1;
    vistos.set(codigo, n);
    codigo = `${cab.codigo}-${n}`;
    notaCodigo = `OJO: en el catalogo del cliente el codigo ${cab.codigo} aparece mas de una vez con prendas distintas. Este se renombro para poder cargarlo; hay que definir su codigo real.`;
  } else {
    vistos.set(codigo, 1);
  }

  // Foto: la mas grande de la pagina, reducida para que el sistema vuele
  const imgs = imagenesDe(numPag)
    .filter((im) => im.ancho >= 140 && im.alto >= 140)
    .sort((a, b) => b.ancho * b.alto - a.ancho * a.alto);

  let foto = "";
  if (imgs[0]) {
    const base = codigo.replace(/[^A-Za-z0-9-]/g, "") + ".jpg";
    try {
      // Dos tamanos del mismo archivo. El grande es para la ficha, donde
      // se mira la prenda. El chico es para las miniaturas de las listas:
      // servir ahi una foto de 720px obliga al telefono a decodificarla
      // entera para pintarla de 44px, y en una lista de 129 eso si se
      // siente en un aparato modesto.
      await sharp(imgs[0].datos)
        .rotate()
        .resize({ width: 720, height: 960, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 78, mozjpeg: true })
        .toFile(path.join(carpetaFotos, base));

      await sharp(imgs[0].datos)
        .rotate()
        .resize({ width: 260, height: 340, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 70, mozjpeg: true })
        .toFile(path.join(carpetaMini, base));

      foto = `/catalogo/${base}`;
      fotosGuardadas++;
    } catch (e) {
      console.warn(`  no se pudo guardar la foto de ${codigo}: ${e.message}`);
    }
  }

  const extra = MAS_VENDIDOS[cab.codigo] || {};

  // La ficha tecnica se guarda como nota: le sirve a quien confecciona
  const ficha = [
    campo("DESCRIPCION") && `Descripcion: ${campo("DESCRIPCION")}`,
    campo("INDICACIONES") && `Indicaciones: ${campo("INDICACIONES")}`,
    campo("AVIOS") && `Avios: ${campo("AVIOS")}`,
    proveedor && `Proveedor: ${proveedor}`,
    notaCodigo,
  ]
    .filter(Boolean)
    .join("\n");

  modelos.push({
    codigo,
    descripcion,
    categoria,
    tela: extra.tela || campo("TELA") || "",
    tallas: extra.tallas || "",
    colores: extra.colores || "",
    foto,
    notas: ficha,
    destacado: seccion === "MAS VENDIDOS" ? 1 : 0,
    pagina,
  });
}

// Se guarda como .json y no como modulo de TypeScript porque este
// archivo trae la ficha de confeccion de cada prenda (avios,
// indicaciones, proveedor): es informacion del negocio y queda fuera del
// repositorio. Siendo un dato suelto en disco, el sistema arranca igual
// aunque no este, en vez de no compilar.
const limpios = modelos.map((m) => ({
  codigo: m.codigo,
  descripcion: m.descripcion,
  categoria: m.categoria,
  tela: m.tela,
  tallas: m.tallas,
  colores: m.colores,
  foto: m.foto,
  notas: m.notas,
  destacado: m.destacado,
}));

fs.writeFileSync(
  path.join(carpetaDatos, "catalogo.json"),
  JSON.stringify(
    {
      origen: path.basename(rutaPdf),
      generado: "scripts/preparar-catalogo.mjs (npm run catalogo)",
      modelos: limpios,
    },
    null,
    2
  ) + "
"
);

const porCategoria = {};
for (const m of modelos) porCategoria[m.categoria || "(sin tipo)"] = (porCategoria[m.categoria || "(sin tipo)"] || 0) + 1;

const pesoFotos = fs
  .readdirSync(carpetaFotos)
  .reduce((s, f) => s + fs.statSync(path.join(carpetaFotos, f)).size, 0);

console.log(`Catalogo preparado desde ${path.basename(rutaPdf)}`);
console.log(`  ${modelos.length} modelos`);
console.log(`  ${modelos.filter((m) => m.destacado).length} marcados como mas vendidos`);
console.log(`  ${fotosGuardadas} fotos en public/catalogo (${(pesoFotos / 1024 / 1024).toFixed(1)} MB)`);
console.log("");
console.log("  por tipo de prenda:");
Object.entries(porCategoria)
  .sort((a, b) => b[1] - a[1])
  .forEach(([k, n]) => console.log(`    ${String(n).padStart(3)}  ${k}`));
console.log("");
console.log("Ahora corre:  npm run catalogo:importar");
