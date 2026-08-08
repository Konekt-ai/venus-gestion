import Link from "next/link";
import { notFound } from "next/navigation";
import { buscarModelos, obtenerUbicacion } from "@/lib/consultas";
import { AccionesUbicacion } from "@/components/AccionesUbicacion";
import { BotonEnlace, Existencia, Tarjeta, Vacio } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DetalleUbicacion({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ubicacionId = parseInt(id, 10);
  const ubicacion = obtenerUbicacion(ubicacionId);

  if (!ubicacion) notFound();

  const modelos = buscarModelos({ ubicacionId, orden: "codigo", limite: 1000 });
  const totalPiezas = modelos.reduce((s, m) => s + m.existencia, 0);

  return (
    <div className="space-y-5">
      <Link
        href="/ubicaciones"
        className="no-imprimir inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-suave)] hover:text-[var(--color-texto)]"
      >
        ← Volver a ubicaciones
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="codigo text-3xl sm:text-4xl">{ubicacion.codigo}</h1>
          <p className="mt-1 text-sm text-[var(--color-suave)]">
            Zona {ubicacion.zona}
            {ubicacion.rack && ` · Rack ${ubicacion.rack}`}
            {ubicacion.nivel && ` · Repisa ${ubicacion.nivel}`}
          </p>
          {ubicacion.descripcion && (
            <p className="mt-1 text-sm font-medium">{ubicacion.descripcion}</p>
          )}
        </div>
        <BotonEnlace
          href={`/ubicaciones/etiquetas?zona=${encodeURIComponent(ubicacion.zona)}`}
          variante="secundario"
          className="no-imprimir"
        >
          🖨️ Etiqueta
        </BotonEnlace>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Tarjeta className="text-center">
          <p className="etiqueta">Modelos aqui</p>
          <p className="mt-1 text-3xl font-bold">{modelos.length}</p>
        </Tarjeta>
        <Tarjeta className="text-center">
          <p className="etiqueta">Piezas en total</p>
          <p className="mt-1 text-3xl font-bold">{totalPiezas.toLocaleString("es-MX")}</p>
        </Tarjeta>
      </div>

      {modelos.length === 0 ? (
        <Vacio
          icono="📦"
          titulo="Este lugar esta vacio"
          descripcion="Cuando asignes modelos a esta ubicacion apareceran aqui."
          accion={
            <BotonEnlace href="/modelos?sinubicacion=1" variante="secundario">
              Ver modelos sin ubicacion
            </BotonEnlace>
          }
        />
      ) : (
        <section>
          <h2 className="mb-3 text-lg font-bold">Que hay guardado aqui</h2>
          <Tarjeta className="!p-0">
            <ul className="divide-y divide-[var(--color-borde)]">
              {modelos.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/modelos/${m.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-slate-50"
                  >
                    <span className="min-w-0">
                      <span className="codigo block">{m.codigo}</span>
                      <span className="block truncate text-sm text-[var(--color-suave)]">
                        {m.descripcion}
                      </span>
                    </span>
                    <Existencia cantidad={m.existencia} minimo={m.minimo} />
                  </Link>
                </li>
              ))}
            </ul>
          </Tarjeta>
        </section>
      )}

      <AccionesUbicacion ubicacion={ubicacion} totalModelos={modelos.length} />
    </div>
  );
}
