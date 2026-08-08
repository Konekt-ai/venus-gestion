import Link from "next/link";
import { notFound } from "next/navigation";
import { movimientosDeModelo, nombresDeLineas, obtenerModelo } from "@/lib/consultas";
import { AccionesMovimiento } from "@/components/AccionesMovimiento";
import {
  BotonEnlace,
  Existencia,
  Insignia,
  PastillaUbicacion,
  Tarjeta,
} from "@/components/ui";
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
      <Link
        href="/modelos"
        className="no-imprimir inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-suave)] hover:text-[var(--color-texto)]"
      >
        ← Volver a modelos
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="codigo text-3xl sm:text-4xl">{modelo.codigo}</h1>
          <p className="mt-1 text-base text-[var(--color-suave)]">{modelo.descripcion}</p>
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
            {Boolean(modelo.destacado) && <Insignia tono="marca">⭐ Mas vendido</Insignia>}
          </div>
        </div>

        <div className="no-imprimir flex gap-2">
          <BotonEnlace href={`/modelos/${modelo.id}/editar`} variante="secundario">
            ✏️ Editar
          </BotonEnlace>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Tarjeta className="text-center">
          <p className="etiqueta">En bodega</p>
          <div className="mt-1">
            <Existencia cantidad={modelo.existencia} minimo={modelo.minimo} tamano="grande" />
          </div>
        </Tarjeta>
        <Tarjeta className="text-center">
          <p className="etiqueta">En la tienda</p>
          <p className="mt-2 text-2xl font-bold">{modelo.en_tienda}</p>
        </Tarjeta>
        <Tarjeta className="text-center">
          <p className="etiqueta">En el tianguis</p>
          <p className="mt-2 text-2xl font-bold">{modelo.en_tianguis}</p>
        </Tarjeta>
      </div>

      <section className="no-imprimir">
        <h2 className="mb-3 text-lg font-bold">¿Que paso con este modelo?</h2>
        <AccionesMovimiento
          modeloId={modelo.id}
          existencia={modelo.existencia}
          enTienda={modelo.en_tienda}
          enTianguis={modelo.en_tianguis}
        />
      </section>

      <Tarjeta>
        <h2 className="mb-3 text-lg font-bold">Datos de la prenda</h2>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Dato etiqueta="Tallas" valor={modelo.tallas} />
          <Dato etiqueta="Colores" valor={modelo.colores} />
          <Dato etiqueta="Tela" valor={modelo.tela} />
          <Dato
            etiqueta="Avisar bajo"
            valor={modelo.minimo > 0 ? `${modelo.minimo} piezas` : "No avisar"}
          />
        </dl>
        {modelo.notas && (
          <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <span className="etiqueta">Notas</span>
            {modelo.notas}
          </div>
        )}
      </Tarjeta>

      <section>
        <h2 className="mb-3 text-lg font-bold">Historial</h2>
        {historial.length === 0 ? (
          <Tarjeta>
            <p className="text-sm text-[var(--color-suave)]">
              Todavia no hay movimientos registrados.
            </p>
          </Tarjeta>
        ) : (
          <Tarjeta className="!p-0">
            <ul className="divide-y divide-[var(--color-borde)]">
              {historial.map((mv) => {
                const diferencia = mv.existencia_despues - mv.existencia_antes;
                return (
                  <li key={mv.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        {NOMBRE_MOVIMIENTO[mv.tipo] ?? mv.tipo}
                      </p>
                      <p className="text-xs text-[var(--color-suave)]">
                        {mv.fecha.slice(0, 16)}
                        {mv.persona && ` · ${mv.persona}`}
                        {mv.nota && ` · ${mv.nota}`}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={`text-sm font-bold ${
                          diferencia > 0
                            ? "text-[var(--color-ok-700)]"
                            : diferencia < 0
                              ? "text-[var(--color-alto-700)]"
                              : "text-[var(--color-suave)]"
                        }`}
                      >
                        {diferencia > 0 ? `+${diferencia}` : diferencia}
                      </p>
                      <p className="text-xs text-[var(--color-suave)]">
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
