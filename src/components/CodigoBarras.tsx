import { sePuedeCodificar, svgDeBarras } from "@/lib/barras";

/**
 * El codigo de barras de un modelo, dibujado en la pagina.
 *
 * Se puede leer del papel o directo de la pantalla: al lector le da lo
 * mismo. Si el codigo trae algo que el lector no sabria leer (un acento,
 * una ene), no se dibuja nada y se queda solo el codigo escrito, que es
 * mejor que imprimir una etiqueta que no sirve.
 */
export function CodigoBarras({
  texto,
  alto = 44,
  className = "",
}: {
  texto: string;
  alto?: number;
  className?: string;
}) {
  if (!sePuedeCodificar(texto)) return null;

  return (
    <div
      className={className}
      style={{ height: alto }}
      aria-label={`Codigo de barras de ${texto}`}
      // El SVG se arma en el servidor: no llega nada de codigo al navegador.
      dangerouslySetInnerHTML={{ __html: svgDeBarras(texto, alto) }}
    />
  );
}
