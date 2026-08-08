import Link from "next/link";
import { listarUbicaciones } from "@/lib/consultas";
import { BotonImprimir } from "@/components/BotonImprimir";
import { Vacio } from "@/components/ui";

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
        icono="🏷️"
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
          className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-suave)] hover:text-[var(--color-texto)]"
        >
          ← Volver a ubicaciones
        </Link>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Etiquetas para los racks</h1>
            <p className="mt-1 text-sm text-[var(--color-suave)]">
              Imprime, recorta por la linea y pega cada etiqueta en su lugar. Salen 6 por hoja.
            </p>
          </div>
          <BotonImprimir />
        </div>

        {zonas.length > 1 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/ubicaciones/etiquetas"
              className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${
                !zonaFiltro
                  ? "border-[var(--color-marca-700)] bg-[var(--color-marca-50)] text-[var(--color-marca-700)]"
                  : "border-[var(--color-borde)] bg-white"
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
                  className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${
                    zonaFiltro === z
                      ? "border-[var(--color-marca-700)] bg-[var(--color-marca-50)] text-[var(--color-marca-700)]"
                      : "border-[var(--color-borde)] bg-white"
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
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Venus · Bodega
            </div>
            <div className="codigo my-2 text-5xl leading-none sm:text-6xl">{u.codigo}</div>
            <div className="text-sm text-slate-600">
              Zona {u.zona}
              {u.rack && ` · Rack ${u.rack}`}
              {u.nivel && ` · Repisa ${u.nivel}`}
            </div>
            {u.descripcion && (
              <div className="mt-1 text-xs text-slate-500">{u.descripcion}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
