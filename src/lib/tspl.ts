import { codigoParaBarras } from "./barras";

/**
 * Etiquetas para la impresora de rollo.
 *
 * La TSC TE200 no entiende paginas ni HTML: entiende TSPL, su propio
 * lenguaje de comandos. Se le mandan renglones de texto y ella dibuja.
 * Este archivo arma esos renglones y nada mas; quien se los entrega a
 * la impresora es lib/impresora.ts.
 *
 * Va aparte y SIN "server-only" a proposito: asi se puede probar con
 * npm test, que es la unica forma de saber si una etiqueta esta bien
 * armada sin gastar rollo del cliente.
 */

/**
 * La TE200 imprime a 203 puntos por pulgada, o sea 8 puntos por
 * milimetro. TSPL acepta milimetros solo en SIZE y GAP; todas las
 * coordenadas y los altos van en puntos.
 */
export const PUNTOS_POR_MM = 8;

export function puntos(mm: number): number {
  return Math.round(mm * PUNTOS_POR_MM);
}

export type Plantilla = {
  anchoMm: number;
  altoMm: number;
  separacionMm: number;
  altoBarrasMm: number;
  densidad: number;
  velocidad: number;
  /** 0 o 90. El rollo del cliente lleva el texto girado. */
  giro: number;
  desplazaXMm: number;
  desplazaYMm: number;
};

export type PrendaAEtiquetar = {
  codigo: string;
  descripcion: string;
};

/**
 * Deja un texto en algo que TSPL pueda llevar dentro de comillas.
 *
 * Las comillas cierran el argumento y un salto de linea corta el
 * comando, asi que una descripcion como VESTIDO 24" partiria la
 * etiqueta a la mitad o, peor, dejaria a la impresora interpretando
 * basura como comandos. Se cambian por comilla simple y se recorta.
 */
export function limpiarTexto(texto: string, maximo: number): string {
  return (texto ?? "")
    .replace(/[\r\n]+/g, " ")
    .replace(/"/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximo);
}

/**
 * Lo que mide cada letra en las fuentes de la impresora, en puntos.
 *
 * Son fuentes de ancho fijo grabadas en la TE200, asi que se sabe de
 * antemano cuanto ocupa un texto sin tener que medirlo: son los anchos
 * del manual de TSPL a 203 puntos por pulgada.
 */
const ANCHO_DE_FUENTE: Record<string, number> = {
  "1": 8,
  "2": 12,
  "3": 16,
  "4": 24,
};

/** Donde empieza a dibujarse todo, contado desde la orilla. */
const MARGEN_MM = 3;
/** Lo que se deja libre al final del renglon, para que no se salga. */
const COLA_MM = 2;

/** Cuantas letras caben a lo largo de un renglon, con esa fuente. */
function cabenEnRenglon(largoMm: number, fuente: string): number {
  const ancho = ANCHO_DE_FUENTE[fuente] ?? 8;
  const util = puntos(largoMm) - puntos(MARGEN_MM + COLA_MM);
  return Math.max(6, Math.floor(util / ancho));
}

/**
 * Una etiqueta lista para mandar, con sus N copias.
 *
 * El orden de los comandos no es libre: SIZE y GAP describen el rollo y
 * tienen que ir antes que CLS, porque CLS limpia el area de dibujo y
 * necesita saber de que tamano es. PRINT va hasta el final.
 */
const FUENTE_MARCA = "2";
const FUENTE_CODIGO = "3";
const FUENTE_DESCRIPCION = "1";

export function armarEtiqueta(
  prenda: PrendaAEtiquetar,
  copias: number,
  p: Plantilla
): string {
  const cantidad = Math.max(1, Math.floor(copias));
  const codigo = codigoParaBarras(prenda.codigo);

  const anchoPuntos = puntos(p.anchoMm);
  const altoBarras = puntos(p.altoBarrasMm);
  const margen = puntos(MARGEN_MM);

  const girado = p.giro === 90;

  // Con el texto girado, el largo util del renglon es el alto de la
  // etiqueta, y los renglones avanzan a lo ancho en vez de hacia abajo.
  const largoUtilMm = girado ? p.altoMm : p.anchoMm;

  // Cada renglon se recorta a lo que de verdad cabe con SU fuente: la
  // impresora no acomoda el texto sobrante, lo dibuja fuera del papel.
  const marca = limpiarTexto("Venus", cabenEnRenglon(largoUtilMm, FUENTE_MARCA));
  const descripcion = limpiarTexto(
    prenda.descripcion,
    cabenEnRenglon(largoUtilMm, FUENTE_DESCRIPCION)
  );

  const lineas: string[] = [
    // El espacio antes de "mm" es obligatorio: sin el, la impresora
    // ignora la medida y usa la ultima que tenga guardada.
    `SIZE ${p.anchoMm} mm,${p.altoMm} mm`,
    `GAP ${p.separacionMm} mm,0`,
    "DIRECTION 1",
    `REFERENCE ${puntos(p.desplazaXMm)},${puntos(p.desplazaYMm)}`,
    // 1252 es la pagina de codigos de Windows para espanol: es la que
    // hace pareja con mandar los bytes en latin1.
    "CODEPAGE 1252",
    `DENSITY ${Math.min(15, Math.max(0, Math.round(p.densidad)))}`,
    `SPEED ${Math.max(1, Math.round(p.velocidad))}`,
    "CLS",
  ];

  if (girado) {
    // Girado 90 grados el origen de cada objeto queda en el borde
    // derecho, y cada renglon nuevo se corre hacia la izquierda.
    let x = anchoPuntos - margen;
    lineas.push(`TEXT ${x},${margen},"${FUENTE_MARCA}",90,1,1,"${marca}"`);
    x -= puntos(4);
    lineas.push(
      `BARCODE ${x},${margen},"128",${altoBarras},1,90,2,2,"${codigo}"`
    );
    x -= altoBarras + puntos(1.5);
    lineas.push(`TEXT ${x},${margen},"${FUENTE_CODIGO}",90,1,1,"${codigo}"`);
    x -= puntos(4);
    if (descripcion) lineas.push(`TEXT ${x},${margen},"${FUENTE_DESCRIPCION}",90,1,1,"${descripcion}"`);
  } else {
    let y = margen;
    lineas.push(`TEXT ${margen},${y},"${FUENTE_MARCA}",0,1,1,"${marca}"`);
    y += puntos(4);
    lineas.push(
      `BARCODE ${margen},${y},"128",${altoBarras},1,0,2,2,"${codigo}"`
    );
    y += altoBarras + puntos(1.5);
    lineas.push(`TEXT ${margen},${y},"${FUENTE_CODIGO}",0,1,1,"${codigo}"`);
    y += puntos(4);
    if (descripcion) lineas.push(`TEXT ${margen},${y},"${FUENTE_DESCRIPCION}",0,1,1,"${descripcion}"`);
  }

  // Las N copias se piden una sola vez, con PRINT 1,N. Repetir el
  // bloque N veces tambien imprimiria, pero manda N trabajos al
  // cabezal y entre uno y otro el rollo se recalibra: salen torcidas.
  lineas.push(`PRINT 1,${cantidad}`);

  // La impresora espera renglones al estilo Windows.
  return lineas.join("\r\n") + "\r\n";
}

/** Varias prendas, cada una con su cantidad, en un solo envio. */
export function armarLote(
  prendas: { prenda: PrendaAEtiquetar; copias: number }[],
  p: Plantilla
): string {
  return prendas.map((x) => armarEtiqueta(x.prenda, x.copias, p)).join("");
}

/**
 * El texto convertido a los bytes que viajan a la impresora.
 *
 * latin1 y no utf8: con utf8 una ene ocupa dos bytes y la impresora,
 * que esta leyendo en CODEPAGE 1252, dibujaria dos garabatos en su
 * lugar. Es el error mas facil de cometer aqui y el mas dificil de
 * ver, porque solo se nota en las prendas que llevan ene o acento.
 */
export function aBytes(tspl: string): Buffer {
  return Buffer.from(tspl, "latin1");
}
