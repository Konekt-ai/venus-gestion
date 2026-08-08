import Link from "next/link";
import { listarUbicaciones, resumen } from "@/lib/consultas";
import { GestorUbicaciones } from "@/components/GestorUbicaciones";
import { BotonEnlace, Tarjeta, TituloPagina, Vacio } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function PaginaUbicaciones() {
  const ubicaciones = listarUbicaciones();
  const datos = resumen();

  // Se agrupan por zona para que la pantalla se parezca al recorrido
  // real de la bodega: primero la zona A completa, luego la B.
  const porZona = new Map<string, typeof ubicaciones>();
  for (const u of ubicaciones) {
    if (!porZona.has(u.zona)) porZona.set(u.zona, []);
    porZona.get(u.zona)!.push(u);
  }

  return (
    <div className="space-y-5">
      <TituloPagina
        titulo="Ubicaciones"
        descripcion="Los lugares de la bodega y que hay guardado en cada uno."
        accion={
          ubicaciones.length > 0 ? (
            <BotonEnlace href="/ubicaciones/etiquetas" variante="secundario" className="no-imprimir">
              🖨️ Imprimir etiquetas
            </BotonEnlace>
          ) : undefined
        }
      />

      {datos.sin_ubicacion > 0 && (
        <Link
          href="/modelos?sinubicacion=1"
          className="block rounded-xl border-l-4 border-[var(--color-aviso-600)] bg-[var(--color-aviso-50)] px-4 py-3 text-sm font-medium text-[var(--color-aviso-700)]"
        >
          Hay <strong>{datos.sin_ubicacion}</strong>{" "}
          {datos.sin_ubicacion === 1 ? "modelo" : "modelos"} sin lugar asignado. Tocalo para
          acomodarlos.
        </Link>
      )}

      <GestorUbicaciones hayUbicaciones={ubicaciones.length > 0} />

      {ubicaciones.length === 0 ? (
        <Vacio
          icono="📍"
          titulo="Todavia no hay ubicaciones"
          descripcion="Crea las zonas y racks de tu bodega. Despues podras imprimir una etiqueta para cada lugar y pegarla en el anaquel."
        />
      ) : (
        <div className="space-y-6">
          {[...porZona.entries()].map(([zona, lugares]) => {
            const piezasZona = lugares.reduce((s, u) => s + u.total_piezas, 0);
            return (
              <section key={zona}>
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <h2 className="text-lg font-bold">Zona {zona}</h2>
                  <span className="text-sm text-[var(--color-suave)]">
                    {lugares.length} {lugares.length === 1 ? "lugar" : "lugares"} ·{" "}
                    {piezasZona.toLocaleString("es-MX")} piezas
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {lugares.map((u) => (
                    <Link
                      key={u.id}
                      href={`/ubicaciones/${u.id}`}
                      className={`rounded-xl border p-3 transition hover:border-[var(--color-marca-500)] ${
                        u.total_modelos === 0
                          ? "border-dashed border-[var(--color-borde)] bg-slate-50"
                          : "border-[var(--color-borde)] bg-white"
                      }`}
                    >
                      <div className="codigo text-base">{u.codigo}</div>
                      {u.descripcion && (
                        <div className="mt-0.5 truncate text-xs text-[var(--color-suave)]">
                          {u.descripcion}
                        </div>
                      )}
                      <div className="mt-2 text-xs text-[var(--color-suave)]">
                        {u.total_modelos === 0 ? (
                          "Vacio"
                        ) : (
                          <>
                            <strong className="text-[var(--color-texto)]">{u.total_modelos}</strong>{" "}
                            {u.total_modelos === 1 ? "modelo" : "modelos"} ·{" "}
                            <strong className="text-[var(--color-texto)]">{u.total_piezas}</strong>{" "}
                            pzas
                          </>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {ubicaciones.length > 0 && (
        <Tarjeta>
          <h2 className="text-base font-bold">¿Como conviene nombrar los lugares?</h2>
          <p className="mt-1 text-sm text-[var(--color-suave)]">
            Lo mas practico es <strong>Zona</strong> (una letra por pared o pasillo),{" "}
            <strong>Rack</strong> (el anaquel numerado) y <strong>Nivel</strong> (la repisa,
            contando de abajo hacia arriba). Asi el codigo <span className="codigo">A-03-2</span>{" "}
            se lee solo: zona A, rack 3, segunda repisa.
          </p>
        </Tarjeta>
      )}
    </div>
  );
}
