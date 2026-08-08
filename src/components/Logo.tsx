/**
 * El logo de la tienda, en la esquina superior izquierda.
 *
 * Recibe la ruta del archivo ya resuelta (la busca el servidor en
 * src/lib/logo.ts). Si no hay archivo, dibuja el nombre con tipografia
 * imitando el orden del logo real: la linea de arriba, el nombre grande
 * en cursiva y "BOUTIQUE" espaciado abajo.
 */
export function Logo({
  archivo,
  compacto = false,
}: {
  archivo: string | null;
  compacto?: boolean;
}) {
  if (archivo) {
    return (
      // Se usa <img> y no next/image a proposito: es un archivo local que
      // no necesita optimizarse, y asi los SVG funcionan sin configuracion
      // extra.
      //
      // En la barra lateral manda el ancho, porque el logo lleva dos
      // renglones de letra chica ("PURA MODA IS" y "BOUTIQUE") que a poca
      // altura no se alcanzan a leer. En el celular manda el alto, que es
      // lo que escasea en el encabezado.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={archivo}
        alt="Venus Boutique"
        className={
          compacto
            ? "h-9 w-auto object-contain object-left"
            : "h-auto w-full max-w-[11.5rem] object-contain object-left"
        }
      />
    );
  }

  return (
    <span className="flex flex-col leading-none">
      <span
        className={`font-semibold uppercase tracking-[0.18em] text-[var(--color-humo)] ${
          compacto ? "text-[0.5rem]" : "text-[0.55rem]"
        }`}
      >
        Pura moda is
      </span>
      <span
        className={`marca my-0.5 text-[var(--color-tinta)] ${
          compacto ? "text-2xl" : "text-3xl"
        }`}
      >
        Venus
      </span>
      <span
        className={`font-semibold uppercase tracking-[0.3em] text-[var(--color-humo)] ${
          compacto ? "text-[0.5rem]" : "text-[0.55rem]"
        }`}
      >
        Boutique
      </span>
    </span>
  );
}
