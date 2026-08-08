import { Suspense } from "react";
import Link from "next/link";
import { buscarModelos, listarUbicaciones, nombresDeLineas, prefijosEnUso } from "@/lib/consultas";
import { Buscador } from "@/components/Buscador";
import { FiltrosModelos } from "@/components/FiltrosModelos";
import {
  BotonEnlace,
  Existencia,
  Insignia,
  PastillaUbicacion,
  TituloPagina,
  Vacio,
} from "@/components/ui";

export const dynamic = "force-dynamic";

type Params = Promise<{ [k: string]: string | string[] | undefined }>;

function uno(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

export default async function PaginaModelos({ searchParams }: { searchParams: Params }) {
  const sp = await searchParams;

  const q = uno(sp.q);
  const existencia = uno(sp.existencia);
  const orden = uno(sp.orden) || "codigo";
  const ubicacionParam = uno(sp.ubicacion);
  const sinUbicacion = uno(sp.sinubicacion) === "1";

  const modelos = buscarModelos({
    q,
    existencia,
    orden,
    sinUbicacion,
    prefijo: uno(sp.prefijo),
    ubicacionId: ubicacionParam ? parseInt(ubicacionParam, 10) : null,
  });

  const ubicaciones = listarUbicaciones();
  const nombresLinea = nombresDeLineas();
  // El filtro de lineas muestra "VN — Vestidos de Nelly" cuando ya se
  // le puso nombre al prefijo en Ajustes.
  const prefijos = prefijosEnUso().map((p) => ({
    ...p,
    nombre: nombresLinea.get(p.prefijo) ?? "",
  }));
  const totalPiezas = modelos.reduce((s, m) => s + m.existencia, 0);

  return (
    <div className="space-y-4">
      <TituloPagina
        titulo="Modelos"
        descripcion={
          q
            ? `Resultados para "${q}"`
            : "Todo lo que hay registrado en la bodega"
        }
        accion={
          <BotonEnlace href="/modelos/nuevo" className="no-imprimir">
            ➕ Nuevo modelo
          </BotonEnlace>
        }
      />

      <Suspense fallback={<div className="h-14 rounded-lg bg-white" />}>
        <Buscador valorInicial={q} enVivo />
      </Suspense>

      <Suspense fallback={null}>
        <FiltrosModelos ubicaciones={ubicaciones} prefijos={prefijos} />
      </Suspense>

      {modelos.length === 0 ? (
        <Vacio
          icono="🔍"
          titulo={q ? `No encontre nada con "${q}"` : "No hay modelos con esos filtros"}
          descripcion={
            q
              ? "Prueba escribiendo solo el numero (por ejemplo 194 en vez de VD 194), o parte de la descripcion."
              : "Quita algun filtro para ver mas resultados."
          }
          accion={
            q ? (
              <BotonEnlace href={`/modelos/nuevo?codigo=${encodeURIComponent(q)}`}>
                Dar de alta {q.toUpperCase()}
              </BotonEnlace>
            ) : undefined
          }
        />
      ) : (
        <>
          <p className="text-sm text-[var(--color-suave)]">
            <strong className="text-[var(--color-texto)]">{modelos.length}</strong>{" "}
            {modelos.length === 1 ? "modelo" : "modelos"} ·{" "}
            <strong className="text-[var(--color-texto)]">
              {totalPiezas.toLocaleString("es-MX")}
            </strong>{" "}
            piezas en bodega
          </p>

          {/* Tabla en computadora */}
          <div className="hidden overflow-hidden rounded-xl border border-[var(--color-borde)] bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--color-borde)] bg-slate-50 text-xs uppercase tracking-wide text-[var(--color-suave)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Codigo</th>
                  <th className="px-4 py-3 font-semibold">Descripcion</th>
                  <th className="px-4 py-3 font-semibold">Tallas</th>
                  <th className="px-4 py-3 font-semibold">Tela</th>
                  <th className="px-4 py-3 font-semibold">Ubicacion</th>
                  <th className="px-4 py-3 text-right font-semibold">Bodega</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-borde)]">
                {modelos.map((m) => (
                  <tr key={m.id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/modelos/${m.id}`} className="codigo hover:underline">
                        {m.codigo}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/modelos/${m.id}`} className="block hover:underline">
                        {m.descripcion}
                      </Link>
                      {(m.en_tienda > 0 || m.en_tianguis > 0) && (
                        <span className="mt-1 flex gap-1">
                          {m.en_tienda > 0 && (
                            <Insignia tono="marca">{m.en_tienda} en tienda</Insignia>
                          )}
                          {m.en_tianguis > 0 && (
                            <Insignia tono="marca">{m.en_tianguis} en tianguis</Insignia>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-suave)]">{m.tallas || "—"}</td>
                    <td className="px-4 py-3 text-[var(--color-suave)]">{m.tela || "—"}</td>
                    <td className="px-4 py-3">
                      <PastillaUbicacion
                        codigo={m.ubicacion_codigo}
                        href={m.ubicacion_id ? `/ubicaciones/${m.ubicacion_id}` : undefined}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Existencia cantidad={m.existencia} minimo={m.minimo} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tarjetas en celular */}
          <ul className="space-y-2 md:hidden">
            {modelos.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/modelos/${m.id}`}
                  className="block rounded-xl border border-[var(--color-borde)] bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="codigo text-base">{m.codigo}</div>
                      <div className="mt-0.5 text-sm text-[var(--color-suave)]">
                        {m.descripcion}
                      </div>
                    </div>
                    <Existencia cantidad={m.existencia} minimo={m.minimo} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <PastillaUbicacion codigo={m.ubicacion_codigo} />
                    {m.tallas && <Insignia>{m.tallas}</Insignia>}
                    {m.en_tienda > 0 && <Insignia tono="marca">{m.en_tienda} en tienda</Insignia>}
                    {m.en_tianguis > 0 && (
                      <Insignia tono="marca">{m.en_tianguis} en tianguis</Insignia>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
