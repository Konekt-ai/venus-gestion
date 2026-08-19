import Link from "next/link";
import { notFound } from "next/navigation";
import { buscarModelos, obtenerUbicacion } from "@/lib/consultas";
import { AccionesUbicacion } from "@/components/AccionesUbicacion";
import { BotonEnlace, EnlaceVolver, Existencia, Tarjeta, Vacio } from "@/components/ui";
import { FotoModelo } from "@/components/FotoModelo";
import { IconoCaja, IconoEtiqueta } from "@/components/iconos";

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
      <EnlaceVolver href="/ubicaciones">Volver a ubicaciones</EnlaceVolver>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="codigo text-3xl sm:text-4xl">{ubicacion.codigo}</h1>
          <p className="mt-1 text-sm text-[var(--color-humo)]">
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
          <IconoEtiqueta tamano={16} />
          Etiqueta
        </BotonEnlace>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Tarjeta className="text-center">
          <p className="etiqueta">Modelos aqui</p>
          <p className="titulo mt-1 text-3xl tabular-nums">{modelos.length}</p>
        </Tarjeta>
        <Tarjeta className="text-center">
          <p className="etiqueta">Piezas en total</p>
          <p className="titulo mt-1 text-3xl tabular-nums">
            {totalPiezas.toLocaleString("es-MX")}
          </p>
        </Tarjeta>
      </div>

      {modelos.length === 0 ? (
        <Vacio
          icono={<IconoCaja tamano={24} />}
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
          <h2 className="titulo mb-3 text-xl">Que hay guardado aqui</h2>
          <Tarjeta className="!p-0">
            <ul className="divide-y divide-[var(--color-linea)]">
              {modelos.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/modelos/${m.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-[var(--color-oro-tenue)]"
                  >
                    <FotoModelo
                      foto={m.foto || null}
                      descripcion={m.descripcion}
                      tamano="mini"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="codigo block">{m.codigo}</span>
                      <span className="block truncate text-sm text-[var(--color-humo)]">
                        {m.descripcion}
                      </span>
                    </span>
                    <span className="shrink-0">
                      <Existencia cantidad={m.existencia} minimo={m.minimo} />
                    </span>
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
