"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SVGProps } from "react";
import {
  IconoAjustes,
  IconoConteo,
  IconoEntrada,
  IconoPersona,
  IconoHistorial,
  IconoInicio,
  IconoPrenda,
  IconoSalida,
  IconoUbicacion,
} from "@/components/iconos";
import { Logo } from "@/components/Logo";
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
  // No hay icono de persona en la familia; la etiqueta hace de gafete,
  // que es lo mas cercano a "quien trabaja aqui".
  { href: "/personal", texto: "Personal", Icono: IconoPersona },
  { href: "/configuracion", texto: "Ajustes", Icono: IconoAjustes },
];

// En el celular solo caben los mas usados; el resto vive en Ajustes.
const EN_CELULAR = ["/", "/modelos", "/ubicaciones", "/salidas", "/conteo"];
const ENLACES_MOVIL = ENLACES.filter((e) => EN_CELULAR.includes(e.href));

function estaActivo(pathname: string, href: string, exacto?: boolean) {
  return exacto ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}

export function BarraLateral({ logo }: { logo: string | null }) {
  const pathname = usePathname();

  return (
    <aside className="no-imprimir hidden shrink-0 flex-col border-r border-[var(--color-linea)] bg-[var(--color-beige)] md:flex md:w-56 lg:w-60">
      <Link href="/" className="capitone block border-b border-[var(--color-linea-fuerte)] px-5 py-5">
        <Logo archivo={logo} />
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
                  ? "bg-[var(--color-papel)] font-semibold text-[var(--color-vino)]"
                  : "font-medium text-[var(--color-humo)] hover:bg-[var(--color-papel)]/60 hover:text-[var(--color-tinta)]"
              }`}
            >
              {activo && (
                <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-[var(--color-vino)]" />
              )}
              <Icono tamano={19} />
              {texto}
            </Link>
          );
        })}
      </nav>

      <footer className="border-t border-[var(--color-linea-fuerte)] px-5 py-4">
        <p className="text-[0.65rem] leading-relaxed text-[var(--color-humo)]">
          Todo se guarda en esta computadora.
        </p>
        <p className="mt-2 text-[0.65rem] leading-relaxed text-[var(--color-humo)]/75">
          Software por{" "}
          <span className="font-semibold text-[var(--color-tinta)]">{DESARROLLADOR}</span>
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
    <nav className="no-imprimir margen-abajo-seguro fixed inset-x-0 bottom-0 z-40 flex border-t border-[var(--color-linea-fuerte)] bg-[var(--color-beige)] md:hidden">
      {ENLACES_MOVIL.map(({ href, texto, Icono, exacto }) => {
        const activo = estaActivo(pathname, href, exacto);
        return (
          <Link
            key={href}
            href={href}
            aria-current={activo ? "page" : undefined}
            className={`relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[0.7rem] font-medium ${
              activo ? "text-[var(--color-vino)]" : "text-[var(--color-humo)]"
            }`}
          >
            {activo && (
              <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-[var(--color-vino)]" />
            )}
            <Icono tamano={22} />
            {texto}
          </Link>
        );
      })}
    </nav>
  );
}

/** Encabezado que solo aparece en celular. */
export function EncabezadoMovil({ logo }: { logo: string | null }) {
  return (
    <header className="no-imprimir capitone encabezado-seguro sticky top-0 z-30 flex items-center justify-between border-b border-[var(--color-linea-fuerte)] pb-3 md:hidden">
      <Link href="/">
        <Logo archivo={logo} compacto />
      </Link>
      <Link
        href="/configuracion"
        aria-label="Ajustes"
        className="toque -mr-2 flex items-center justify-center text-[var(--color-humo)] transition-colors hover:text-[var(--color-tinta)]"
      >
        <IconoAjustes tamano={21} />
      </Link>
    </header>
  );
}
