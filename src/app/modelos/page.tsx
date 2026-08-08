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
import { IconoBuscar, IconoMas } from "@/components/iconos";

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
            <IconoMas tamano={17} />
            Nuevo modelo
          </BotonEnlace>
        }
      />

      <Suspense fallback={<div className="h-14 rounded-sm bg-white" />}>
        <Buscador valorInicial={q} enVivo />
      </Suspense>

      <Suspense fallback={null}>
        <FiltrosModelos ubicaciones={ubicaciones} prefijos={prefijos} />
      </Suspense>

      {modelos.length === 0 ? (
        <Vacio
          icono={<IconoBuscar tamano={24} />}
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
          <p className="text-sm text-[var(--color-humo)]">
            <strong className="font-semibold text-[var(--color-tinta)]">{modelos.length}</strong>{" "}
            {modelos.length === 1 ? "modelo" : "modelos"} ·{" "}
            <strong className="font-semibold text-[var(--color-tinta)]">
              {totalPiezas.toLocaleString("es-MX")}
            </strong>{" "}
            piezas en bodega
          </p>

          {/* Tabla en computadora */}
          <div className="hidden overflow-hidden rounded-sm border border-[var(--color-linea)] bg-[var(--color-papel)] md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--color-linea)] bg-[var(--color-crema)] text-[0.7rem] uppercase tracking-[0.08em] text-[var(--color-humo)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Codigo</th>
                  <th className="px-4 py-3 font-semibold">Descripcion</th>
                  <th className="px-4 py-3 font-semibold">Tallas</th>
                  <th className="px-4 py-3 font-semibold">Tela</th>
                  <th className="px-4 py-3 font-semibold">Ubicacion</th>
                  <th className="px-4 py-3 text-right font-semibold">Bodega</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-linea)]">
                {modelos.map((m) => (
                  <tr key={m.id} className="transition-colors hover:bg-[var(--color-oro-tenue)]">
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
                            <Insignia tono="vino">{m.en_tienda} en tienda</Insignia>
                          )}
                          {m.en_tianguis > 0 && (
                            <Insignia tono="vino">{m.en_tianguis} en tianguis</Insignia>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-humo)]">{m.tallas || "—"}</td>
                    <td className="px-4 py-3 text-[var(--color-humo)]">{m.tela || "—"}</td>
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
                  className="block rounded-sm border border-[var(--color-linea)] bg-[var(--color-papel)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="codigo text-base">{m.codigo}</div>
                      <div className="mt-0.5 text-sm text-[var(--color-humo)]">
                        {m.descripcion}
                      </div>
                    </div>
                    <Existencia cantidad={m.existencia} minimo={m.minimo} />
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <PastillaUbicacion codigo={m.ubicacion_codigo} />
                    {m.tallas && <Insignia>{m.tallas}</Insignia>}
                    {m.en_tienda > 0 && <Insignia tono="vino">{m.en_tienda} en tienda</Insignia>}
                    {m.en_tianguis > 0 && (
                      <Insignia tono="vino">{m.en_tianguis} en tianguis</Insignia>
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
