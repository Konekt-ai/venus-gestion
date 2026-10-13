import { codigoParaBarras, sePuedeCodificar, svgDeBarras } from "@/lib/barras";

/**
 * El codigo de barras de un modelo, dibujado en la pagina.
 *
 * Se puede leer del papel o directo de la pantalla: al lector le da lo
 * mismo.
 *
 * Lo que se codifica NO es el texto tal cual: se pasa por
 * codigoParaBarras, que le quita espacios y guiones. Va aqui adentro y
 * no en cada pantalla a proposito, porque si cada quien lo hiciera por
 * su cuenta, tarde o temprano una pantalla imprimiria etiquetas con el
 * espacio y esas no empatarian con las que ya estan pegadas.
 *
 * El alto puede ir en pixeles (un numero) o en cualquier medida de CSS,
 * como "10mm" para la etiqueta de rollo. El dibujo se estira a lo que
 * mida la caja.
 */
export function CodigoBarras({
  texto,
  alto = 44,
  className = "",
}: {
  texto: string;
  alto?: number | string;
  className?: string;
}) {
  const codificado = codigoParaBarras(texto);
  if (!sePuedeCodificar(codificado)) return null;

  return (
    <div
      className={className}
      style={{ height: alto }}
      aria-label={`Codigo de barras de ${texto}`}
      // El SVG se arma en el servidor: no llega nada de codigo al navegador.
      dangerouslySetInnerHTML={{
        __html: svgDeBarras(codificado, typeof alto === "number" ? alto : 40),
      }}
    />
  );
}
