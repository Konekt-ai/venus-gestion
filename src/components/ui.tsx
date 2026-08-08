import Link from "next/link";
import type { ReactNode } from "react";
import { IconoPin, IconoVacio, IconoVolver } from "@/components/iconos";

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
      className={`rounded-sm border border-[var(--color-linea)] bg-[var(--color-papel)] p-5 ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Regresar a la pantalla de arriba.
 * En el celular es la unica salida, asi que necesita area de toque de
 * verdad y no solo el texto.
 */
export function EnlaceVolver({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="no-imprimir -ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-sm px-2 text-sm font-semibold text-[var(--color-humo)] transition-colors hover:bg-[var(--color-crema)] hover:text-[var(--color-tinta)]"
    >
      <IconoVolver tamano={18} />
      {children}
    </Link>
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
    <div className="mb-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="titulo text-[1.75rem] leading-tight sm:text-[2rem]">{titulo}</h1>
          {descripcion && (
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--color-humo)]">
              {descripcion}
            </p>
          )}
        </div>
        {accion}
      </div>
      <div className="filete mt-4" />
    </div>
  );
}

type Tono = "oro" | "vino" | "ok" | "aviso" | "alto" | "neutro";

const TONOS: Record<Tono, string> = {
  oro: "bg-[var(--color-oro-palido)] text-[#7a6220]",
  vino: "bg-[var(--color-vino-palido)] text-[var(--color-vino)]",
  ok: "bg-[var(--color-verde-palido)] text-[var(--color-verde)]",
  aviso: "bg-[var(--color-ambar-palido)] text-[var(--color-ambar)]",
  alto: "bg-[var(--color-rojo-palido)] text-[var(--color-rojo)]",
  neutro: "bg-[var(--color-crema)] text-[var(--color-humo)]",
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
      className={`inline-flex items-center gap-1 rounded-sm px-2 py-1 text-xs font-semibold ${TONOS[tono]}`}
    >
      {children}
    </span>
  );
}

/**
 * Los botones responden al dedo con :active porque en el telefono no
 * existe el hover: sin esa senal, al tocar parece que no paso nada.
 */
const BOTONES = {
  primario:
    "bg-[var(--color-vino)] text-white hover:bg-[var(--color-vino-oscuro)] active:bg-[var(--color-vino-oscuro)] active:scale-[0.98] disabled:bg-[var(--color-linea-fuerte)] disabled:text-white disabled:active:scale-100",
  secundario:
    "bg-[var(--color-papel)] text-[var(--color-tinta)] border border-[var(--color-linea-fuerte)] hover:border-[var(--color-oro)] hover:bg-[var(--color-oro-tenue)] active:bg-[var(--color-oro-palido)] active:scale-[0.98] disabled:text-[var(--color-humo)] disabled:hover:border-[var(--color-linea-fuerte)] disabled:hover:bg-[var(--color-papel)] disabled:active:scale-100",
  oscuro:
    "bg-[var(--color-tinta)] text-[var(--color-oro-claro)] hover:bg-[var(--color-carbon)] active:bg-[var(--color-carbon)] active:scale-[0.98] disabled:bg-[var(--color-linea-fuerte)] disabled:text-white disabled:active:scale-100",
  peligro:
    "bg-[var(--color-rojo)] text-white hover:brightness-90 active:brightness-90 active:scale-[0.98]",
};

// min-h-11 son los 44px minimos para tocar sin fallar.
const BASE_BOTON =
  "inline-flex min-h-11 select-none items-center justify-center gap-2 rounded-sm px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed";

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
    ok: "border-[var(--color-verde)] bg-[var(--color-verde-palido)] text-[var(--color-verde)]",
    error: "border-[var(--color-rojo)] bg-[var(--color-rojo-palido)] text-[var(--color-rojo)]",
    info: "border-[var(--color-oro)] bg-[var(--color-oro-tenue)] text-[var(--color-humo)]",
  }[tipo];

  return (
    <div className={`rounded-sm border-l-2 px-4 py-3 text-sm font-medium ${estilos}`}>
      {children}
    </div>
  );
}

/** Mensaje para cuando una lista no tiene nada que mostrar. */
export function Vacio({
  icono,
  titulo,
  descripcion,
  accion,
}: {
  icono?: ReactNode;
  titulo: string;
  descripcion?: string;
  accion?: ReactNode;
}) {
  return (
    <div className="rounded-sm border border-dashed border-[var(--color-linea-fuerte)] bg-[var(--color-papel)] px-6 py-14 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-crema)] text-[var(--color-oro)]">
        {icono ?? <IconoVacio tamano={24} />}
      </div>
      <p className="titulo text-lg">{titulo}</p>
      {descripcion && (
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[var(--color-humo)]">
          {descripcion}
        </p>
      )}
      {accion && <div className="mt-5 flex justify-center">{accion}</div>}
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
      <div className="titulo text-[1.75rem] leading-none sm:text-[2rem]">{valor}</div>
      <div className="mt-1.5 text-xs leading-snug text-[var(--color-humo)] sm:text-[0.8125rem]">
        {texto}
      </div>
    </>
  );

  const base = "rounded-sm border p-4 transition-colors";
  const color =
    tono === "neutro"
      ? "border-[var(--color-linea)] bg-[var(--color-papel)]"
      : `border-transparent ${TONOS[tono]}`;
  const clases = `${base} ${color} ${href ? "hover:border-[var(--color-oro)]" : ""}`;

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
  const tono: Tono = cantidad <= 0 ? "alto" : minimo > 0 && cantidad <= minimo ? "aviso" : "ok";
  const clases =
    tamano === "grande" ? "px-3 py-1.5 text-2xl sm:text-3xl" : "px-2 py-0.5 text-sm";

  return (
    <span
      className={`inline-flex items-baseline gap-1 rounded-sm font-semibold tabular-nums ${TONOS[tono]} ${clases}`}
    >
      {cantidad}
      <span className="text-[0.72em] font-semibold">
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
      <span className="inline-flex items-center rounded-sm bg-[var(--color-ambar-palido)] px-2 py-1 text-xs font-semibold text-[var(--color-ambar)]">
        Sin ubicacion
      </span>
    );
  }

  const contenido = (
    <span className="codigo inline-flex items-center gap-1 rounded-sm bg-[var(--color-crema)] px-2 py-1 text-xs text-[var(--color-tinta)]">
      <IconoPin tamano={13} />
      {codigo}
    </span>
  );

  return href ? (
    <Link href={href} className="hover:opacity-70">
      {contenido}
    </Link>
  ) : (
    contenido
  );
}
