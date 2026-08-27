import type { SVGProps } from "react";

/**
 * Iconos del sistema.
 *
 * Dibujados a mano con el mismo trazo (1.5, puntas redondeadas, retícula
 * de 24) para que se vean de la misma familia. Usan currentColor, asi que
 * heredan el color del texto donde se pongan.
 */

type Props = SVGProps<SVGSVGElement> & { tamano?: number };

function Base({ tamano = 20, children, ...props }: Props) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

/* ---------- Navegacion ---------- */

export function IconoInicio(p: Props) {
  return (
    <Base {...p}>
      <path d="M3.5 10.5 12 3.75l8.5 6.75" />
      <path d="M5.5 9.5v9.25a.75.75 0 0 0 .75.75h11.5a.75.75 0 0 0 .75-.75V9.5" />
      <path d="M9.75 19.5v-5.25h4.5v5.25" />
    </Base>
  );
}

/** Percha: el catalogo de prendas. */
export function IconoPrenda(p: Props) {
  return (
    <Base {...p}>
      <path d="M12 8.25V10" />
      <path d="M10.25 5.75a1.75 1.75 0 1 1 1.75 1.75" />
      <path d="M12 10 3.9 15.6c-.85.58-.44 1.9.59 1.9h15.02c1.03 0 1.44-1.32.59-1.9L12 10Z" />
    </Base>
  );
}

/** Anaquel: las ubicaciones de la bodega. */
export function IconoUbicacion(p: Props) {
  return (
    <Base {...p}>
      <rect x="3.25" y="4.25" width="17.5" height="14" rx="1" />
      <path d="M3.25 9.5h17.5M3.25 13.5h17.5" />
      <path d="M6 18.25v1.75M18 18.25v1.75" />
    </Base>
  );
}

/** Pin: marca el lugar exacto de un modelo. */
export function IconoPin(p: Props) {
  return (
    <Base {...p}>
      <path d="M12 21c3.5-4.2 5.25-7.28 5.25-9.25a5.25 5.25 0 1 0-10.5 0C6.75 13.72 8.5 16.8 12 21Z" />
      <circle cx="12" cy="11.5" r="1.9" />
    </Base>
  );
}

export function IconoSalida(p: Props) {
  return (
    <Base {...p}>
      <path d="M13.5 4.75H6.25a1 1 0 0 0-1 1v12.5a1 1 0 0 0 1 1h7.25" />
      <path d="M17.5 12H10" />
      <path d="m15 9.25 2.75 2.75L15 14.75" />
    </Base>
  );
}

export function IconoEntrada(p: Props) {
  return (
    <Base {...p}>
      <path d="M10.5 4.75h7.25a1 1 0 0 1 1 1v12.5a1 1 0 0 1-1 1H10.5" />
      <path d="M6.5 12H14" />
      <path d="m9 9.25 2.75 2.75L9 14.75" />
    </Base>
  );
}

/** Tabla con palomita: el conteo fisico. */
export function IconoConteo(p: Props) {
  return (
    <Base {...p}>
      <path d="M9 4.75H7.25a1 1 0 0 0-1 1v13.5a1 1 0 0 0 1 1h9.5a1 1 0 0 0 1-1V5.75a1 1 0 0 0-1-1H15" />
      <rect x="9" y="3.25" width="6" height="3" rx=".75" />
      <path d="m9.75 13 1.75 1.75 3.25-3.5" />
    </Base>
  );
}

export function IconoHistorial(p: Props) {
  return (
    <Base {...p}>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 7.5V12l3 1.75" />
    </Base>
  );
}

export function IconoAjustes(p: Props) {
  return (
    <Base {...p}>
      <path d="M4 7.5h10M18 7.5h2M4 16.5h2M10 16.5h10" />
      <circle cx="16" cy="7.5" r="2.25" />
      <circle cx="8" cy="16.5" r="2.25" />
    </Base>
  );
}


/** Cabeza y hombros: el personal del negocio. */
export function IconoPersona(p: Props) {
  return (
    <Base {...p}>
      <circle cx="12" cy="8.25" r="3.5" />
      <path d="M5 19.75c0-3.2 3.13-5.25 7-5.25s7 2.05 7 5.25" />
    </Base>
  );
}

/* ---------- Acciones ---------- */

export function IconoBuscar(p: Props) {
  return (
    <Base {...p}>
      <circle cx="10.75" cy="10.75" r="6" />
      <path d="m15.25 15.25 4 4" />
    </Base>
  );
}

export function IconoMas(p: Props) {
  return (
    <Base {...p}>
      <path d="M12 5.75v12.5M5.75 12h12.5" />
    </Base>
  );
}

export function IconoEditar(p: Props) {
  return (
    <Base {...p}>
      <path d="M16.5 4.75 19.25 7.5 9 17.75l-3.5.75.75-3.5L16.5 4.75Z" />
      <path d="m14.75 6.5 2.75 2.75" />
    </Base>
  );
}

export function IconoCerrar(p: Props) {
  return (
    <Base {...p}>
      <path d="m6.75 6.75 10.5 10.5M17.25 6.75 6.75 17.25" />
    </Base>
  );
}

export function IconoImprimir(p: Props) {
  return (
    <Base {...p}>
      <path d="M7 9.25V4.75a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 .5.5v4.5" />
      <path d="M7 16.5H5.25a1 1 0 0 1-1-1v-4.25a1 1 0 0 1 1-1h13.5a1 1 0 0 1 1 1v4.25a1 1 0 0 1-1 1H17" />
      <rect x="7" y="14" width="10" height="5.75" rx=".5" />
    </Base>
  );
}

export function IconoDescargar(p: Props) {
  return (
    <Base {...p}>
      <path d="M12 4.25v10.5" />
      <path d="m8.25 11.5 3.75 3.75 3.75-3.75" />
      <path d="M4.75 17.75v1a1 1 0 0 0 1 1h12.5a1 1 0 0 0 1-1v-1" />
    </Base>
  );
}

export function IconoDocumento(p: Props) {
  return (
    <Base {...p}>
      <path d="M13.5 3.75H6.75a1 1 0 0 0-1 1v14.5a1 1 0 0 0 1 1h10.5a1 1 0 0 0 1-1V8.5l-4.75-4.75Z" />
      <path d="M13.25 3.9V8.5h4.6" />
      <path d="M8.75 13h6.5M8.75 16h4.5" />
    </Base>
  );
}

export function IconoEtiqueta(p: Props) {
  return (
    <Base {...p}>
      <path d="M11.4 4.25H5.25a1 1 0 0 0-1 1v6.15a1 1 0 0 0 .29.7l7.35 7.36a1 1 0 0 0 1.42 0l6.14-6.15a1 1 0 0 0 0-1.41L12.1 4.54a1 1 0 0 0-.7-.29Z" />
      <circle cx="8.4" cy="8.4" r="1.15" />
    </Base>
  );
}

export function IconoVolver(p: Props) {
  return (
    <Base {...p}>
      <path d="M19 12H5.25" />
      <path d="m10 6.75-4.75 5.25L10 17.25" />
    </Base>
  );
}

export function IconoRegresar(p: Props) {
  return (
    <Base {...p}>
      <path d="M4.75 8.5h11a3.75 3.75 0 0 1 0 7.5H9" />
      <path d="m8 4.75-3.5 3.75L8 12.25" />
    </Base>
  );
}

export function IconoEstrella(p: Props) {
  return (
    <Base {...p}>
      <path d="m12 4.5 2.32 4.9 5.18.74-3.75 3.76.89 5.35L12 16.72 7.36 19.25l.89-5.35L4.5 10.14l5.18-.74L12 4.5Z" />
    </Base>
  );
}

/* ---------- Lugares ---------- */

/** Local con toldo: la tienda. */
export function IconoTienda(p: Props) {
  return (
    <Base {...p}>
      <path d="M4.25 9.5v9.25a1 1 0 0 0 1 1h13.5a1 1 0 0 0 1-1V9.5" />
      <path d="M3.25 9.5 5 4.75h14l1.75 4.75a2.5 2.5 0 0 1-4.25 1.6 2.5 2.5 0 0 1-4.5 0 2.5 2.5 0 0 1-4.5 0 2.5 2.5 0 0 1-4.25-1.6Z" />
      <path d="M9.75 19.75V14.5h4.5v5.25" />
    </Base>
  );
}

/** Carpa: el tianguis. */
export function IconoTianguis(p: Props) {
  return (
    <Base {...p}>
      <path d="M12 3.75 3.25 19.25h17.5L12 3.75Z" />
      <path d="M12 3.75v15.5" />
      <path d="M8.5 19.25 12 12.5l3.5 6.75" />
    </Base>
  );
}

/* ---------- Estados ---------- */

export function IconoPalomita(p: Props) {
  return (
    <Base {...p}>
      <path d="m5.5 12.5 4.25 4.25L18.5 7.5" />
    </Base>
  );
}

export function IconoAlerta(p: Props) {
  return (
    <Base {...p}>
      <path d="M12 4.75 3.5 19.25h17L12 4.75Z" />
      <path d="M12 10v3.75" />
      <circle cx="12" cy="16.6" r=".6" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function IconoCaja(p: Props) {
  return (
    <Base {...p}>
      <path d="M20.25 8.5v7.4a1 1 0 0 1-.55.9l-7.25 3.6a1 1 0 0 1-.9 0L4.3 16.8a1 1 0 0 1-.55-.9V8.5" />
      <path d="M3.75 8.5 12 4.4l8.25 4.1L12 12.6 3.75 8.5Z" />
      <path d="M12 12.6v7.9" />
    </Base>
  );
}

export function IconoVacio(p: Props) {
  return (
    <Base {...p}>
      <path d="M3.75 8.5 12 4.4l8.25 4.1v7.4a1 1 0 0 1-.55.9l-7.25 3.6a1 1 0 0 1-.9 0L4.3 16.8a1 1 0 0 1-.55-.9V8.5Z" />
      <path d="M8.75 11.25v3.5M15.25 11.25v3.5" strokeDasharray="1 3" />
    </Base>
  );
}

/** Candado: la contrasena de entrada al sistema. */
export function IconoCandado(p: Props) {
  return (
    <Base {...p}>
      <rect x="4.75" y="10.25" width="14.5" height="9.5" rx="1.5" />
      <path d="M8.25 10.25V7.5a3.75 3.75 0 0 1 7.5 0v2.75" />
      <path d="M12 14v2" />
    </Base>
  );
}

/** Codigo de barras: las etiquetas que lee el lector. */
export function IconoCodigoBarras(p: Props) {
  return (
    <Base {...p}>
      <path d="M4 6.5v11" />
      <path d="M7 6.5v11" />
      <path d="M10 6.5v7" />
      <path d="M13.5 6.5v11" />
      <path d="M17 6.5v7" />
      <path d="M20 6.5v11" />
    </Base>
  );
}
