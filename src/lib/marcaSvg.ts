/**
 * El dibujo del icono, en un solo lugar.
 *
 * La "V" va como trazo y no como texto: asi no depende de que exista
 * Georgia ni de que el generador de imagenes traiga una fuente, y se ve
 * igual en el navegador, en el iPhone y en Android.
 *
 * Los colores son los del logo de la tienda: tinta negra sobre marfil,
 * con el filete en vino.
 */
export function marcaSvg(recortable = false): string {
  const cuerpo =
    `<path d="M150 150h55l51 170 51-170h55l-77 242h-58z" fill="#1a1613"/>` +
    `<rect x="150" y="416" width="212" height="8" rx="4" fill="#8c2740"/>`;

  // Android le recorta hasta el 20% de cada orilla al icono "maskable",
  // asi que el dibujo se encoge y el fondo llega hasta el borde.
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">` +
    `<rect width="512" height="512" ${recortable ? "" : 'rx="96"'} fill="#eee5d4"/>` +
    (recortable ? `<g transform="translate(51.2 51.2) scale(0.8)">${cuerpo}</g>` : cuerpo) +
    `</svg>`
  );
}

/** El mismo dibujo listo para usarse como src de una imagen. */
export function marcaDataUri(recortable = false): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(marcaSvg(recortable))}`;
}
