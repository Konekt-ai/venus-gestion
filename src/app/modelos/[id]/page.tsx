import { notFound } from "next/navigation";
import { movimientosDeModelo, nombresDeLineas, obtenerModelo } from "@/lib/consultas";
import { AccionesMovimiento } from "@/components/AccionesMovimiento";
import {
  BotonEnlace,
  EnlaceVolver,
  Existencia,
  Insignia,
  PastillaUbicacion,
  Tarjeta,
} from "@/components/ui";
import { IconoEditar, IconoEstrella } from "@/components/iconos";
import { NOMBRE_MOVIMIENTO } from "@/lib/tipos";

export const dynamic = "force-dynamic";

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="etiqueta !mb-0.5">{etiqueta}</dt>
      <dd className="text-sm font-medium">{valor || "—"}</dd>
    </div>
  );
}

export default async function FichaModelo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const modelo = obtenerModelo(parseInt(id, 10));

  if (!modelo) notFound();

  const historial = movimientosDeModelo(modelo.id, 40);
  const nombreLinea = modelo.prefijo ? nombresDeLineas().get(modelo.prefijo) : undefined;

  return (
    <div className="space-y-5">
      <EnlaceVolver href="/modelos">Volver a modelos</EnlaceVolver>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="codigo text-3xl sm:text-4xl">{modelo.codigo}</h1>
          <p className="titulo mt-1 text-lg text-[var(--color-humo)]">{modelo.descripcion}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <PastillaUbicacion
              codigo={modelo.ubicacion_codigo}
              href={modelo.ubicacion_id ? `/ubicaciones/${modelo.ubicacion_id}` : undefined}
            />
            {nombreLinea && (
              <Insignia>
                {modelo.prefijo} · {nombreLinea}
              </Insignia>
            )}
            {modelo.categoria && <Insignia>{modelo.categoria}</Insignia>}
            {Boolean(modelo.destacado) && (
              <Insignia tono="oro">
                <IconoEstrella tamano={12} />
                Mas vendido
              </Insignia>
            )}
          </div>
        </div>

        <div className="no-imprimir flex w-full gap-2 sm:w-auto">
          <BotonEnlace
            href={`/modelos/${modelo.id}/editar`}
            variante="secundario"
            className="w-full !py-3 sm:w-auto sm:!py-2.5"
          >
            <IconoEditar tamano={16} />
            Editar
          </BotonEnlace>
        </div>
      </div>

      {/* Apiladas, las tres cifras empujaban fuera de pantalla "¿Que paso con
          este modelo?", que es a lo que se entra estando frente al rack. */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        <Tarjeta className="col-span-2 text-center sm:col-span-1">
          <p className="etiqueta">En bodega</p>
          <div className="mt-1">
            <Existencia cantidad={modelo.existencia} minimo={modelo.minimo} tamano="grande" />
          </div>
        </Tarjeta>
        <Tarjeta className="text-center !p-4 sm:!p-5">
          <p className="etiqueta">En la tienda</p>
          <p className="titulo mt-1 text-3xl tabular-nums">{modelo.en_tienda}</p>
        </Tarjeta>
        <Tarjeta className="text-center !p-4 sm:!p-5">
          <p className="etiqueta">En el tianguis</p>
          <p className="titulo mt-1 text-3xl tabular-nums">{modelo.en_tianguis}</p>
        </Tarjeta>
      </div>

      <section className="no-imprimir">
        <h2 className="titulo mb-3 text-xl">¿Que paso con este modelo?</h2>
        <AccionesMovimiento
          modeloId={modelo.id}
          existencia={modelo.existencia}
          enTienda={modelo.en_tienda}
          enTianguis={modelo.en_tianguis}
        />
      </section>

      <Tarjeta>
        <h2 className="titulo mb-4 text-xl">Datos de la prenda</h2>
        <dl className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          <Dato etiqueta="Tallas" valor={modelo.tallas} />
          <Dato etiqueta="Colores" valor={modelo.colores} />
          <Dato etiqueta="Tela" valor={modelo.tela} />
          <Dato
            etiqueta="Avisar bajo"
            valor={modelo.minimo > 0 ? `${modelo.minimo} piezas` : "No avisar"}
          />
        </dl>
        {modelo.notas && (
          <div className="mt-5 border-l-2 border-[var(--color-oro)] bg-[var(--color-oro-tenue)] px-3 py-2 text-sm">
            <span className="etiqueta">Notas</span>
            {modelo.notas}
          </div>
        )}
      </Tarjeta>

      <section>
        <h2 className="titulo mb-3 text-xl">Historial</h2>
        {historial.length === 0 ? (
          <Tarjeta>
            <p className="text-sm text-[var(--color-humo)]">
              Todavia no hay movimientos registrados.
            </p>
          </Tarjeta>
        ) : (
          <Tarjeta className="!p-0">
            <ul className="divide-y divide-[var(--color-linea)]">
              {historial.map((mv) => {
                const diferencia = mv.existencia_despues - mv.existencia_antes;
                return (
                  <li key={mv.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        {NOMBRE_MOVIMIENTO[mv.tipo] ?? mv.tipo}
                      </p>
                      <p className="text-xs text-[var(--color-humo)]">
                        {mv.fecha.slice(0, 16)}
                        {mv.persona && ` · ${mv.persona}`}
                        {mv.nota && ` · ${mv.nota}`}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={`text-sm font-semibold tabular-nums ${
                          diferencia > 0
                            ? "text-[var(--color-verde)]"
                            : diferencia < 0
                              ? "text-[var(--color-rojo)]"
                              : "text-[var(--color-humo)]"
                        }`}
                      >
                        {diferencia > 0 ? `+${diferencia}` : diferencia}
                      </p>
                      <p className="text-xs text-[var(--color-humo)]">
                        quedaron {mv.existencia_despues}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Tarjeta>
        )}
      </section>
    </div>
  );
}
