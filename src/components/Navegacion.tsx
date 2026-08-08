"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Navegacion principal.
 * En computadora va como barra lateral fija; en celular se convierte
 * en una barra de accesos abajo, al alcance del pulgar.
 */

const ENLACES = [
  { href: "/", texto: "Inicio", icono: "🏠", exacto: true },
  { href: "/modelos", texto: "Modelos", icono: "👗" },
  { href: "/ubicaciones", texto: "Ubicaciones", icono: "📍" },
  { href: "/salidas", texto: "Salidas", icono: "📦" },
  { href: "/entradas", texto: "Entradas", icono: "📥" },
  { href: "/conteo", texto: "Conteo", icono: "✅" },
  { href: "/movimientos", texto: "Historial", icono: "🕘" },
  { href: "/configuracion", texto: "Ajustes", icono: "⚙️" },
];

// En el celular solo caben los mas usados; el resto vive en Ajustes.
const ENLACES_MOVIL = ENLACES.filter((e) =>
  ["/", "/modelos", "/ubicaciones", "/salidas", "/conteo"].includes(e.href)
);

function estaActivo(pathname: string, href: string, exacto?: boolean) {
  return exacto ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}

export function BarraLateral() {
  const pathname = usePathname();

  return (
    <aside className="no-imprimir hidden md:flex md:w-56 lg:w-64 shrink-0 flex-col border-r border-[var(--color-borde)] bg-white">
      <Link href="/" className="flex items-center gap-2 px-5 py-5">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--color-marca-700)] text-lg font-bold text-white">
          V
        </span>
        <span>
          <span className="block text-base font-bold leading-tight">Venus</span>
          <span className="block text-xs text-[var(--color-suave)]">Bodega</span>
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1 px-3 pb-4">
        {ENLACES.map((enlace) => {
          const activo = estaActivo(pathname, enlace.href, enlace.exacto);
          return (
            <Link
              key={enlace.href}
              href={enlace.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                activo
                  ? "bg-[var(--color-marca-50)] text-[var(--color-marca-700)]"
                  : "text-[var(--color-suave)] hover:bg-slate-50 hover:text-[var(--color-texto)]"
              }`}
            >
              <span aria-hidden="true" className="text-base">
                {enlace.icono}
              </span>
              {enlace.texto}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function BarraMovil() {
  const pathname = usePathname();

  return (
    <nav className="no-imprimir fixed inset-x-0 bottom-0 z-40 flex border-t border-[var(--color-borde)] bg-white md:hidden">
      {ENLACES_MOVIL.map((enlace) => {
        const activo = estaActivo(pathname, enlace.href, enlace.exacto);
        return (
          <Link
            key={enlace.href}
            href={enlace.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
              activo ? "text-[var(--color-marca-700)]" : "text-[var(--color-suave)]"
            }`}
          >
            <span aria-hidden="true" className="text-lg leading-none">
              {enlace.icono}
            </span>
            {enlace.texto}
          </Link>
        );
      })}
    </nav>
  );
}

/** Encabezado que solo aparece en celular, con el nombre y acceso a ajustes. */
export function EncabezadoMovil() {
  return (
    <header className="no-imprimir sticky top-0 z-30 flex items-center justify-between border-b border-[var(--color-borde)] bg-white px-4 py-3 md:hidden">
      <Link href="/" className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-marca-700)] text-sm font-bold text-white">
          V
        </span>
        <span className="text-base font-bold">Venus Bodega</span>
      </Link>
      <Link
        href="/configuracion"
        aria-label="Ajustes"
        className="rounded-lg px-2 py-1 text-lg text-[var(--color-suave)]"
      >
        ⚙️
      </Link>
    </header>
  );
}
