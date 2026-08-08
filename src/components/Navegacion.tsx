"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SVGProps } from "react";
import {
  IconoAjustes,
  IconoConteo,
  IconoEntrada,
  IconoHistorial,
  IconoInicio,
  IconoPrenda,
  IconoSalida,
  IconoUbicacion,
} from "@/components/iconos";
import { creditoCorto, DESARROLLADOR } from "@/lib/marca";

/**
 * Navegacion principal.
 * En computadora es una barra lateral oscura, como la pared del local;
 * en celular se vuelve una barra de accesos abajo, al alcance del pulgar.
 */

type Enlace = {
  href: string;
  texto: string;
  Icono: (p: SVGProps<SVGSVGElement> & { tamano?: number }) => React.ReactElement;
  exacto?: boolean;
};

const ENLACES: Enlace[] = [
  { href: "/", texto: "Inicio", Icono: IconoInicio, exacto: true },
  { href: "/modelos", texto: "Modelos", Icono: IconoPrenda },
  { href: "/ubicaciones", texto: "Ubicaciones", Icono: IconoUbicacion },
  { href: "/salidas", texto: "Salidas", Icono: IconoSalida },
  { href: "/entradas", texto: "Entradas", Icono: IconoEntrada },
  { href: "/conteo", texto: "Conteo", Icono: IconoConteo },
  { href: "/movimientos", texto: "Historial", Icono: IconoHistorial },
  { href: "/configuracion", texto: "Ajustes", Icono: IconoAjustes },
];

// En el celular solo caben los mas usados; el resto vive en Ajustes.
const EN_CELULAR = ["/", "/modelos", "/ubicaciones", "/salidas", "/conteo"];
const ENLACES_MOVIL = ENLACES.filter((e) => EN_CELULAR.includes(e.href));

function estaActivo(pathname: string, href: string, exacto?: boolean) {
  return exacto ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}

/** El wordmark, con el aire del letrero de la tienda. */
function Wordmark({ compacto = false }: { compacto?: boolean }) {
  return (
    <span className="flex items-baseline gap-2">
      <span
        className={`marca text-[var(--color-oro-claro)] ${compacto ? "text-xl" : "text-2xl"}`}
      >
        Venus
      </span>
      <span className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-[var(--color-humo)]">
        Bodega
      </span>
    </span>
  );
}

export function BarraLateral() {
  const pathname = usePathname();

  return (
    <aside className="no-imprimir hidden shrink-0 flex-col bg-[var(--color-tinta)] md:flex md:w-56 lg:w-60">
      <Link href="/" className="capitone block border-b border-white/8 px-6 py-6">
        <Wordmark />
      </Link>

      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-4">
        {ENLACES.map(({ href, texto, Icono, exacto }) => {
          const activo = estaActivo(pathname, href, exacto);
          return (
            <Link
              key={href}
              href={href}
              aria-current={activo ? "page" : undefined}
              className={`relative flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm transition-colors ${
                activo
                  ? "bg-white/6 font-semibold text-[var(--color-oro-claro)]"
                  : "font-medium text-white/55 hover:bg-white/4 hover:text-white/90"
              }`}
            >
              {activo && (
                <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-[var(--color-oro)]" />
              )}
              <Icono tamano={19} />
              {texto}
            </Link>
          );
        })}
      </nav>

      <footer className="border-t border-white/8 px-6 py-4">
        <p className="text-[0.65rem] leading-relaxed text-white/30">
          Todo se guarda en esta computadora.
        </p>
        <p className="mt-2 text-[0.65rem] leading-relaxed text-white/25">
          Software por{" "}
          <span className="font-semibold text-[var(--color-oro)]/70">{DESARROLLADOR}</span>
          <br />
          {creditoCorto()} · Todos los derechos reservados
        </p>
      </footer>
    </aside>
  );
}

export function BarraMovil() {
  const pathname = usePathname();

  return (
    <nav className="no-imprimir fixed inset-x-0 bottom-0 z-40 flex bg-[var(--color-tinta)] md:hidden">
      {ENLACES_MOVIL.map(({ href, texto, Icono, exacto }) => {
        const activo = estaActivo(pathname, href, exacto);
        return (
          <Link
            key={href}
            href={href}
            aria-current={activo ? "page" : undefined}
            className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[0.65rem] font-medium ${
              activo ? "text-[var(--color-oro-claro)]" : "text-white/50"
            }`}
          >
            {activo && (
              <span className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-[var(--color-oro)]" />
            )}
            <Icono tamano={21} />
            {texto}
          </Link>
        );
      })}
    </nav>
  );
}

/** Encabezado que solo aparece en celular. */
export function EncabezadoMovil() {
  return (
    <header className="no-imprimir capitone sticky top-0 z-30 flex items-center justify-between px-4 py-3 md:hidden">
      <Link href="/">
        <Wordmark compacto />
      </Link>
      <Link
        href="/configuracion"
        aria-label="Ajustes"
        className="p-1.5 text-white/60 transition-colors hover:text-[var(--color-oro-claro)]"
      >
        <IconoAjustes tamano={20} />
      </Link>
    </header>
  );
}
