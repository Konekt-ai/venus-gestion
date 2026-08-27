/**
 * Codigos de barras Code 128.
 *
 * El lector de codigos de barras se conecta por USB y se comporta como
 * un teclado: al leer una etiqueta escribe el codigo y da Enter. Por eso
 * no hace falta nada especial en el sistema para usarlo, solo que las
 * etiquetas lleven un codigo que el lector entienda.
 *
 * Se usa Code 128, subconjunto B: acepta letras, numeros y espacios, que
 * es justo lo que traen los codigos del negocio ("VD 194", "VN 178").
 * Se dibuja a mano en vez de traer una libreria porque son treinta
 * lineas y asi el sistema no depende de nada mas para imprimir.
 */

/**
 * Los 107 dibujos del Code 128.
 *
 * Cada uno son los anchos de sus barras y espacios, alternando y
 * empezando por barra: "212222" es barra de 2, espacio de 1, barra de 2,
 * espacio de 2, barra de 2, espacio de 2.
 */
const DIBUJOS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312",
  "132212", "221213", "221312", "231212", "112232", "122132", "122231", "113222",
  "123122", "123221", "223211", "221132", "221231", "213212", "223112", "312131",
  "311222", "321122", "321221", "312212", "322112", "322211", "212123", "212321",
  "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121",
  "313121", "211331", "231131", "213113", "213311", "213131", "311123", "311321",
  "331121", "312113", "312311", "332111", "314111", "221411", "431111", "111224",
  "111422", "121124", "121421", "141122", "141221", "112214", "112412", "122114",
  "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112",
  "421211", "212141", "214121", "412121", "111143", "111341", "131141", "114113",
  "114311", "411113", "411311", "113141", "114131", "311141", "411131", "211412",
  "211214", "211232", "2331112",
];

/** Se saca solo para poder probar que un lector leeria bien lo dibujado. */
export const DIBUJOS_CODE128 = DIBUJOS;

const INICIO_B = 104;
const FIN = 106;

/** true si el texto se puede imprimir como codigo de barras. */
export function sePuedeCodificar(texto: string): boolean {
  if (!texto) return false;
  for (const letra of texto) {
    const n = letra.codePointAt(0) ?? 0;
    if (n < 32 || n > 126) return false;
  }
  return true;
}

/**
 * Convierte el texto en la lista de barras y espacios.
 *
 * Devuelve los anchos en modulos: el primero es barra, el segundo
 * espacio, y asi. Los dos extremos llevan ademas el margen en blanco
 * que el lector necesita para saber donde empieza y donde termina.
 */
export function trazarBarras(texto: string): { anchos: number[]; total: number } {
  if (!sePuedeCodificar(texto)) {
    throw new Error(`No se puede hacer codigo de barras de "${texto}".`);
  }

  const valores = [INICIO_B];
  for (const letra of texto) valores.push((letra.codePointAt(0) ?? 0) - 32);

  // La suma de control: cada valor pesa por el lugar que ocupa. El de
  // inicio pesa 1, el primero del texto 1, el segundo 2, y asi.
  let suma = INICIO_B;
  for (let i = 1; i < valores.length; i++) suma += valores[i] * i;
  valores.push(suma % 103);

  valores.push(FIN);

  const anchos: number[] = [];
  for (const v of valores) {
    for (const ancho of DIBUJOS[v]) anchos.push(Number(ancho));
  }

  return { anchos, total: anchos.reduce((a, b) => a + b, 0) };
}

/**
 * El codigo de barras ya dibujado, listo para meter en la pagina.
 *
 * Sale como SVG y no como imagen para que se imprima con el filo de la
 * impresora: un dibujo de puntos se ve borroso y hay lectores que ya no
 * lo agarran.
 */
export function svgDeBarras(texto: string, alto = 40): string {
  const { anchos, total } = trazarBarras(texto);

  // Margen en blanco a los lados. Sin el, un lector puede leer de mas o
  // simplemente no encontrar el principio del codigo.
  const margen = 10;
  const ancho = total + margen * 2;

  let x = margen;
  const barras: string[] = [];
  anchos.forEach((w, i) => {
    // Los pares son barra, los impares espacio.
    if (i % 2 === 0) barras.push(`<rect x="${x}" y="0" width="${w}" height="${alto}"/>`);
    x += w;
  });

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ancho} ${alto}" ` +
    `preserveAspectRatio="none" shape-rendering="crispEdges" fill="#000">` +
    barras.join("") +
    `</svg>`
  );
}
