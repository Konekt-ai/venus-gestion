import "server-only";
import { getDb } from "./db";

/**
 * Ajustes del sistema.
 *
 * Se guardan en la tabla config, uno por renglon, para poder prender y
 * apagar partes del sistema sin tocar el codigo ni volver a compilar.
 */

export type Ajustes = {
  /** El tianguis se maneja aparte; por ahora el cliente no lo usa. */
  usaTianguis: boolean;
  /** Nombre del negocio, para las hojas impresas. */
  negocio: string;

  /**
   * Impresora de etiquetas, con el nombre que le da Windows.
   *
   * Vacio quiere decir que no hay ninguna elegida y que el sistema no
   * intenta imprimir directo: cae a la hoja carta de siempre. Se deja
   * asi de omision para que una instalacion sin impresora funcione.
   */
  impresoraEtiquetas: string;

  /**
   * Medidas de la etiqueta, en milimetros.
   *
   * Van en la base y no en constantes porque el rollo cambia de un
   * pedido a otro, y porque una etiqueta girada se termina de cuadrar
   * con la impresora enfrente, probando. Asi se ajusta desde el celular
   * sin volver a compilar ni ir a la bodega.
   */
  etiquetaAnchoMm: number;
  etiquetaAltoMm: number;
  /** Hueco entre una etiqueta y la siguiente en el rollo. */
  etiquetaSeparacionMm: number;
  etiquetaAltoBarrasMm: number;
  /** Que tan oscuro quema el cabezal (0 a 15) y que tan rapido avanza. */
  etiquetaDensidad: number;
  etiquetaVelocidad: number;
  /** 0 o 90. El rollo del cliente va girado. */
  etiquetaGiro: number;
  /** Corrimiento fino en milimetros, para cuadrar la impresion. */
  etiquetaDesplazaX: number;
  etiquetaDesplazaY: number;
  /** Cuantas etiquetas como maximo salen de un solo boton. */
  etiquetaTope: number;
};

const POR_OMISION: Ajustes = {
  // Apagado a peticion del cliente: primero bodega y tienda.
  // La informacion del tianguis NO se borra, solo se deja de mostrar.
  usaTianguis: false,
  negocio: "Venus Boutique",

  // Sin impresora elegida: el sistema arranca imprimiendo en hoja y el
  // cliente elige la suya en Ajustes cuando quiera.
  impresoraEtiquetas: "",
  etiquetaAnchoMm: 50,
  etiquetaAltoMm: 25,
  etiquetaSeparacionMm: 2,
  etiquetaAltoBarrasMm: 14,
  etiquetaDensidad: 8,
  etiquetaVelocidad: 4,
  etiquetaGiro: 90,
  etiquetaDesplazaX: 0,
  etiquetaDesplazaY: 0,
  etiquetaTope: 60,
};

/**
 * Lee un numero de la configuracion.
 *
 * Si el renglon trae basura (alguien escribio "cinco", o quedo vacio),
 * se usa el valor de siempre en vez de mandarle NaN a la impresora, que
 * responderia con una etiqueta en blanco y nadie sabria por que.
 */
function numero(mapa: Map<string, string>, clave: string, porOmision: number): number {
  if (!mapa.has(clave)) return porOmision;
  const n = Number(mapa.get(clave));
  return Number.isFinite(n) ? n : porOmision;
}

export function leerAjustes(): Ajustes {
  const db = getDb();
  const filas = db.prepare("SELECT clave, valor FROM config").all() as {
    clave: string;
    valor: string;
  }[];
  const mapa = new Map(filas.map((f) => [f.clave, f.valor]));

  return {
    usaTianguis: mapa.has("usa_tianguis")
      ? mapa.get("usa_tianguis") === "1"
      : POR_OMISION.usaTianguis,
    negocio: mapa.get("negocio") || POR_OMISION.negocio,

    impresoraEtiquetas: mapa.get("impresora_etiquetas") || POR_OMISION.impresoraEtiquetas,
    etiquetaAnchoMm: numero(mapa, "etiqueta_ancho_mm", POR_OMISION.etiquetaAnchoMm),
    etiquetaAltoMm: numero(mapa, "etiqueta_alto_mm", POR_OMISION.etiquetaAltoMm),
    etiquetaSeparacionMm: numero(mapa, "etiqueta_separacion_mm", POR_OMISION.etiquetaSeparacionMm),
    etiquetaAltoBarrasMm: numero(mapa, "etiqueta_alto_barras_mm", POR_OMISION.etiquetaAltoBarrasMm),
    etiquetaDensidad: numero(mapa, "etiqueta_densidad", POR_OMISION.etiquetaDensidad),
    etiquetaVelocidad: numero(mapa, "etiqueta_velocidad", POR_OMISION.etiquetaVelocidad),
    etiquetaGiro: numero(mapa, "etiqueta_giro", POR_OMISION.etiquetaGiro),
    etiquetaDesplazaX: numero(mapa, "etiqueta_desplaza_x", POR_OMISION.etiquetaDesplazaX),
    etiquetaDesplazaY: numero(mapa, "etiqueta_desplaza_y", POR_OMISION.etiquetaDesplazaY),
    etiquetaTope: numero(mapa, "etiqueta_tope", POR_OMISION.etiquetaTope),
  };
}

export function guardarAjuste(clave: string, valor: string) {
  const db = getDb();
  db.prepare(
    `INSERT INTO config (clave, valor) VALUES (?, ?)
     ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor`
  ).run(clave, valor);
}

/**
 * Atajo: casi todas las pantallas solo necesitan saber si mostrar o no
 * lo del tianguis.
 */
export function usaTianguis(): boolean {
  return leerAjustes().usaTianguis;
}
