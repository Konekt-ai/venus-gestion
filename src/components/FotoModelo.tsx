import { IconoPrenda } from "@/components/iconos";

/**
 * La foto de una prenda.
 *
 * Con 129 modelos en el catalogo, la foto es lo que hace que alguien
 * reconozca la prenda de un vistazo, mucho antes de leer el codigo.
 *
 * Si un modelo todavia no tiene foto se dibuja una percha en su lugar,
 * para que las listas no se descuadren con huecos de distinto alto.
 */

const TAMANOS = {
  /** En los renglones de una lista */
  mini: "h-14 w-11",
  /** En las tarjetas del catalogo */
  tarjeta: "h-full w-full",
  /** En la ficha del modelo */
  grande: "h-full w-full",
};

/**
 * Como se acomoda la foto dentro de su caja.
 *
 * El catalogo trae de todo: fotos de modelo verticales, pero tambien 27
 * dibujos tecnicos apaisados con el frente y la espalda lado a lado. En
 * una caja vertical, recortar (cover) deja de esos dibujos una tira del
 * centro donde no se reconoce la prenda. Por eso solo la miniatura
 * recorta, que es donde importa que los renglones queden parejos; en los
 * tamanos donde se mira la prenda se ve completa.
 */
const AJUSTES: Record<keyof typeof TAMANOS, string> = {
  mini: "object-cover object-top",
  tarjeta: "object-contain object-center",
  grande: "object-contain object-center",
};

export function FotoModelo({
  foto,
  descripcion,
  tamano = "mini",
  className = "",
}: {
  foto: string | null;
  descripcion?: string;
  tamano?: keyof typeof TAMANOS;
  className?: string;
}) {
  const base = `shrink-0 overflow-hidden rounded-sm bg-[var(--color-crema)] ${TAMANOS[tamano]} ${className}`;

  // Para las listas se usa la copia chica que deja preparar-catalogo:
  // /catalogo/VD194.jpg -> /catalogo/mini/VD194.jpg. Si el archivo viene
  // de otro lado (una foto que subio el usuario) se queda como esta.
  const archivo =
    foto && tamano !== "grande" && foto.startsWith("/catalogo/")
      ? foto.replace("/catalogo/", "/catalogo/mini/")
      : foto;

  // Quien consulta los modelos ya vacia este campo cuando el archivo no
  // esta en el disco (ver hayFoto en src/lib/fotos.ts), asi que aqui
  // basta con mirar si viene o no.
  if (!archivo) {
    return (
      <div
        className={`${base} flex items-center justify-center text-[var(--color-linea-fuerte)]`}
        aria-hidden="true"
      >
        <IconoPrenda tamano={tamano === "mini" ? 18 : 32} />
      </div>
    );
  }

  return (
    // Es un archivo local del propio sistema: no necesita optimizarse ni
    // pasar por el servidor de imagenes de Next.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={archivo}
      alt={descripcion ? `Foto de ${descripcion}` : ""}
      // Con 129 fotos en pantalla, cargarlas todas de golpe hace lenta
      // la lista: el navegador solo baja las que se van viendo.
      loading="lazy"
      decoding="async"
      className={`${base} ${AJUSTES[tamano]}`}
    />
  );
}
