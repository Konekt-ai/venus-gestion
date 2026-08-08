/**
 * Datos de marca y creditos del software.
 *
 * Estan en un solo lugar para que el nombre y el aviso de derechos
 * salgan iguales en la pantalla y en los documentos que se imprimen.
 */

export const NOMBRE_SISTEMA = "Venus";
export const DESARROLLADOR = "Konekt";

/** El año se calcula al mostrarlo para no tener que actualizarlo a mano. */
export function anioActual(): number {
  return new Date().getFullYear();
}

/** Aviso corto, para pies de pagina y barras laterales. */
export function creditoCorto(): string {
  return `© ${anioActual()} ${DESARROLLADOR}`;
}

/** Aviso completo, para Ajustes y documentos impresos. */
export function creditoCompleto(): string {
  return `Software desarrollado por ${DESARROLLADOR}. © ${anioActual()} ${DESARROLLADOR}. Todos los derechos reservados.`;
}
