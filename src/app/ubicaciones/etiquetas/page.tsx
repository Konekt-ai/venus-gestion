import Link from "next/link";
import { listarUbicaciones } from "@/lib/consultas";
import { BotonImprimir } from "@/components/BotonImprimir";
import { Vacio } from "@/components/ui";
import { IconoEtiqueta, IconoVolver } from "@/components/iconos";

export const dynamic = "force-dynamic";

type Params = Promise<{ [k: string]: string | string[] | undefined }>;

/**
 * Etiquetas para pegar en los racks.
 *
 * Se imprimen en hojas carta, 6 por hoja, con el codigo enorme para
 * que se lea desde el pasillo. Es lo que convierte el mapa del sistema
 * en algo util fisicamente.
 */
export default async function Etiquetas({ searchParams }: { searchParams: Params }) {
  const sp = await searchParams;
  const zonaFiltro = typeof sp.zona === "string" ? sp.zona : "";

  const todas = listarUbicaciones();
  const ubicaciones = zonaFiltro ? todas.filter((u) => u.zona === zonaFiltro) : todas;
  const zonas = [...new Set(todas.map((u) => u.zona))];

  if (todas.length === 0) {
    return (
      <Vacio
        icono={<IconoEtiqueta tamano={24} />}
        titulo="No hay ubicaciones que etiquetar"
        descripcion="Primero crea las zonas y racks de la bodega."
      />
    );
  }

  return (
    <div>
      <div className="no-imprimir mb-5">
        <Link
          href="/ubicaciones"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-humo)] transition-colors hover:text-[var(--color-tinta)]"
        >
          <IconoVolver tamano={16} />
          Volver a ubicaciones
        </Link>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="titulo text-[1.75rem] sm:text-[2rem]">Etiquetas para los racks</h1>
            <p className="mt-1.5 text-sm text-[var(--color-humo)]">
              Imprime, recorta por la linea y pega cada etiqueta en su lugar. Salen 6 por hoja.
            </p>
          </div>
          <BotonImprimir />
        </div>

        {zonas.length > 1 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/ubicaciones/etiquetas"
              className={`rounded-sm border px-3 py-1.5 text-sm font-semibold transition-colors ${
                !zonaFiltro
                  ? "border-[var(--color-vino)] bg-[var(--color-vino-palido)] text-[var(--color-vino)]"
                  : "border-[var(--color-linea-fuerte)] bg-[var(--color-papel)] text-[var(--color-humo)] hover:border-[var(--color-oro)]"
              }`}
            >
              Todas ({todas.length})
            </Link>
            {zonas.map((z) => {
              const n = todas.filter((u) => u.zona === z).length;
              return (
                <Link
                  key={z}
                  href={`/ubicaciones/etiquetas?zona=${encodeURIComponent(z)}`}
                  className={`rounded-sm border px-3 py-1.5 text-sm font-semibold transition-colors ${
                    zonaFiltro === z
                      ? "border-[var(--color-vino)] bg-[var(--color-vino-palido)] text-[var(--color-vino)]"
                      : "border-[var(--color-linea-fuerte)] bg-[var(--color-papel)] text-[var(--color-humo)] hover:border-[var(--color-oro)]"
                  }`}
                >
                  Zona {z} ({n})
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-0 print:grid-cols-2">
        {ubicaciones.map((u) => (
          <div
            key={u.id}
            className="hoja flex aspect-[3/2] flex-col items-center justify-center border border-dashed border-slate-300 p-4 text-center"
          >
            <div className="marca text-base text-[#8a6d1f]">Venus</div>
            <div className="mt-0.5 h-px w-10 bg-[#c9ad63]" />
            <div className="codigo my-3 text-5xl leading-none sm:text-6xl">{u.codigo}</div>
            <div className="text-sm text-slate-600">
              Zona {u.zona}
              {u.rack && ` · Rack ${u.rack}`}
              {u.nivel && ` · Repisa ${u.nivel}`}
            </div>
            {u.descripcion && <div className="mt-1 text-xs text-slate-500">{u.descripcion}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
