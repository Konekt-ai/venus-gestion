import Link from "next/link";
import type { ReactNode } from "react";

/** Piezas visuales que se repiten en todo el sistema. */

export function Tarjeta({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-[var(--color-borde)] bg-white p-4 sm:p-5 ${className}`}
    >
      {children}
    </div>
  );
}

export function TituloPagina({
  titulo,
  descripcion,
  accion,
}: {
  titulo: string;
  descripcion?: string;
  accion?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{titulo}</h1>
        {descripcion && (
          <p className="mt-1 text-sm text-[var(--color-suave)]">{descripcion}</p>
        )}
      </div>
      {accion}
    </div>
  );
}

type Tono = "marca" | "ok" | "aviso" | "alto" | "neutro";

const TONOS: Record<Tono, string> = {
  marca: "bg-[var(--color-marca-50)] text-[var(--color-marca-700)]",
  ok: "bg-[var(--color-ok-50)] text-[var(--color-ok-700)]",
  aviso: "bg-[var(--color-aviso-50)] text-[var(--color-aviso-700)]",
  alto: "bg-[var(--color-alto-50)] text-[var(--color-alto-700)]",
  neutro: "bg-slate-100 text-slate-600",
};

export function Insignia({
  children,
  tono = "neutro",
}: {
  children: ReactNode;
  tono?: Tono;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${TONOS[tono]}`}
    >
      {children}
    </span>
  );
}

const BOTONES = {
  primario:
    "bg-[var(--color-marca-700)] text-white hover:bg-[var(--color-marca-900)] disabled:bg-slate-300",
  secundario:
    "bg-white text-[var(--color-texto)] border border-[var(--color-borde)] hover:bg-slate-50 disabled:text-slate-400",
  peligro: "bg-[var(--color-alto-600)] text-white hover:bg-[var(--color-alto-700)]",
  fantasma: "text-[var(--color-suave)] hover:bg-slate-100 hover:text-[var(--color-texto)]",
};

const BASE_BOTON =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed";

export function Boton({
  children,
  variante = "primario",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: keyof typeof BOTONES;
}) {
  return (
    <button className={`${BASE_BOTON} ${BOTONES[variante]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function BotonEnlace({
  children,
  href,
  variante = "primario",
  className = "",
}: {
  children: ReactNode;
  href: string;
  variante?: keyof typeof BOTONES;
  className?: string;
}) {
  return (
    <Link href={href} className={`${BASE_BOTON} ${BOTONES[variante]} ${className}`}>
      {children}
    </Link>
  );
}

/** Recuadro de resultado de una operacion. */
export function Aviso({
  tipo,
  children,
}: {
  tipo: "ok" | "error" | "info";
  children: ReactNode;
}) {
  const estilos = {
    ok: "border-[var(--color-ok-600)] bg-[var(--color-ok-50)] text-[var(--color-ok-700)]",
    error: "border-[var(--color-alto-600)] bg-[var(--color-alto-50)] text-[var(--color-alto-700)]",
    info: "border-[var(--color-borde)] bg-slate-50 text-[var(--color-suave)]",
  }[tipo];

  return (
    <div className={`rounded-lg border-l-4 px-4 py-3 text-sm font-medium ${estilos}`}>
      {children}
    </div>
  );
}

/** Mensaje para cuando una lista no tiene nada que mostrar. */
export function Vacio({
  icono = "📭",
  titulo,
  descripcion,
  accion,
}: {
  icono?: string;
  titulo: string;
  descripcion?: string;
  accion?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--color-borde)] bg-white px-6 py-12 text-center">
      <div className="text-4xl" aria-hidden="true">
        {icono}
      </div>
      <p className="mt-3 text-base font-semibold">{titulo}</p>
      {descripcion && (
        <p className="mx-auto mt-1 max-w-md text-sm text-[var(--color-suave)]">{descripcion}</p>
      )}
      {accion && <div className="mt-4 flex justify-center">{accion}</div>}
    </div>
  );
}

/** Cifra grande del tablero de inicio. */
export function Cifra({
  valor,
  texto,
  tono = "neutro",
  href,
}: {
  valor: number | string;
  texto: string;
  tono?: Tono;
  href?: string;
}) {
  const contenido = (
    <>
      <div className="text-2xl font-bold sm:text-3xl">{valor}</div>
      <div className="mt-0.5 text-xs font-medium text-[var(--color-suave)] sm:text-sm">{texto}</div>
    </>
  );

  const clases = `rounded-xl border border-[var(--color-borde)] p-4 ${
    tono === "neutro" ? "bg-white" : TONOS[tono]
  } ${href ? "transition hover:border-[var(--color-marca-500)]" : ""}`;

  return href ? (
    <Link href={href} className={`block ${clases}`}>
      {contenido}
    </Link>
  ) : (
    <div className={clases}>{contenido}</div>
  );
}

/**
 * Muestra la existencia con un color que se entiende de lejos:
 * rojo si no hay, ambar si va bajo, verde si hay de sobra.
 */
export function Existencia({
  cantidad,
  minimo = 0,
  tamano = "normal",
}: {
  cantidad: number;
  minimo?: number;
  tamano?: "normal" | "grande";
}) {
  const tono: Tono =
    cantidad <= 0 ? "alto" : minimo > 0 && cantidad <= minimo ? "aviso" : "ok";

  const clases =
    tamano === "grande"
      ? "px-3 py-1.5 text-xl sm:text-2xl"
      : "px-2 py-0.5 text-sm";

  return (
    <span
      className={`inline-flex items-baseline gap-1 rounded-lg font-bold ${TONOS[tono]} ${clases}`}
    >
      {cantidad}
      <span className="text-[0.65em] font-semibold opacity-70">
        {cantidad === 1 ? "pza" : "pzas"}
      </span>
    </span>
  );
}

/** Muestra la ubicacion como una pastilla, o un aviso si no tiene. */
export function PastillaUbicacion({
  codigo,
  href,
}: {
  codigo: string | null;
  href?: string;
}) {
  if (!codigo) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-[var(--color-aviso-50)] px-2 py-0.5 text-xs font-semibold text-[var(--color-aviso-700)]">
        Sin ubicacion
      </span>
    );
  }

  const contenido = (
    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
      <span aria-hidden="true">📍</span>
      {codigo}
    </span>
  );

  return href ? <Link href={href}>{contenido}</Link> : contenido;
}
