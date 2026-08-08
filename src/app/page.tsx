import { Suspense } from "react";
import Link from "next/link";
import { modelosPorSurtir, movimientosRecientes, resumen } from "@/lib/consultas";
import { Buscador } from "@/components/Buscador";
import { Cifra, Existencia, PastillaUbicacion, Tarjeta, Vacio } from "@/components/ui";
import { NOMBRE_MOVIMIENTO } from "@/lib/tipos";

export const dynamic = "force-dynamic";

const ACCESOS = [
  {
    href: "/modelos/nuevo",
    icono: "➕",
    titulo: "Dar de alta un modelo",
    texto: "Registrar una prenda nueva en el catalogo",
  },
  {
    href: "/entradas",
    icono: "📥",
    titulo: "Llego mercancia",
    texto: "Sumar piezas que acaban de entrar a bodega",
  },
  {
    href: "/salidas",
    icono: "📦",
    titulo: "Sacar a tienda o tianguis",
    texto: "Armar el envio y generar la hoja para firmar",
  },
  {
    href: "/conteo",
    icono: "✅",
    titulo: "Contar la bodega",
    texto: "Revisar rack por rack y cuadrar existencias",
  },
];

export default function Inicio() {
  const datos = resumen();
  const porSurtir = modelosPorSurtir(6);
  const recientes = movimientosRecientes(6);
  const bodegaVacia = datos.total_modelos === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">
          {bodegaVacia ? "Bienvenido a Venus Bodega" : "¿Que buscamos hoy?"}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-suave)]">
          {bodegaVacia
            ? "Empieza dando de alta tus modelos o importando la lista que ya tienes."
            : "Escribe el codigo del modelo y te digo cuantos hay y en que rack esta."}
        </p>
      </div>

      <Suspense fallback={<div className="h-14 rounded-lg bg-white" />}>
        <Buscador autoFoco />
      </Suspense>

      {bodegaVacia ? (
        <Vacio
          icono="👗"
          titulo="Todavia no hay modelos registrados"
          descripcion="Puedes capturarlos uno por uno, o subir de golpe la lista que ya tienes en Excel desde Ajustes."
          accion={
            <div className="flex flex-wrap justify-center gap-2">
              <Link
                href="/modelos/nuevo"
                className="rounded-lg bg-[var(--color-marca-700)] px-4 py-2.5 text-sm font-semibold text-white"
              >
                Dar de alta el primero
              </Link>
              <Link
                href="/configuracion"
                className="rounded-lg border border-[var(--color-borde)] bg-white px-4 py-2.5 text-sm font-semibold"
              >
                Importar desde Excel
              </Link>
            </div>
          }
        />
      ) : (
        <>
          <section>
            <h2 className="sr-only">Resumen</h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Cifra
                valor={datos.total_piezas.toLocaleString("es-MX")}
                texto="Piezas en bodega"
                href="/modelos"
              />
              <Cifra
                valor={datos.total_modelos.toLocaleString("es-MX")}
                texto="Modelos distintos"
                href="/modelos"
              />
              <Cifra
                valor={datos.piezas_tienda.toLocaleString("es-MX")}
                texto="Estan en la tienda"
                href="/movimientos?tipo=salida_tienda"
              />
              <Cifra
                valor={datos.piezas_tianguis.toLocaleString("es-MX")}
                texto="Estan en el tianguis"
                href="/movimientos?tipo=salida_tianguis"
              />
            </div>
          </section>

          {(datos.agotados > 0 || datos.bajos > 0 || datos.sin_ubicacion > 0) && (
            <section className="grid gap-3 sm:grid-cols-3">
              {datos.agotados > 0 && (
                <Cifra
                  valor={datos.agotados}
                  texto={datos.agotados === 1 ? "modelo agotado" : "modelos agotados"}
                  tono="alto"
                  href="/modelos?existencia=sin"
                />
              )}
              {datos.bajos > 0 && (
                <Cifra
                  valor={datos.bajos}
                  texto={datos.bajos === 1 ? "modelo por acabarse" : "modelos por acabarse"}
                  tono="aviso"
                  href="/modelos?existencia=bajo"
                />
              )}
              {datos.sin_ubicacion > 0 && (
                <Cifra
                  valor={datos.sin_ubicacion}
                  texto="sin ubicacion asignada"
                  tono="aviso"
                  href="/modelos?sinubicacion=1"
                />
              )}
            </section>
          )}
        </>
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold">¿Que quieres hacer?</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {ACCESOS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="flex items-start gap-3 rounded-xl border border-[var(--color-borde)] bg-white p-4 transition hover:border-[var(--color-marca-500)]"
            >
              <span aria-hidden="true" className="text-2xl">
                {a.icono}
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">{a.titulo}</span>
                <span className="mt-0.5 block text-sm text-[var(--color-suave)]">{a.texto}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {porSurtir.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Hay que surtir</h2>
            <Link
              href="/modelos?existencia=bajo"
              className="text-sm font-semibold text-[var(--color-marca-700)]"
            >
              Ver todos
            </Link>
          </div>
          <Tarjeta className="!p-0">
            <ul className="divide-y divide-[var(--color-borde)]">
              {porSurtir.map((m) => (
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
                    <span className="flex shrink-0 items-center gap-2">
                      <PastillaUbicacion codigo={m.ubicacion_codigo} />
                      <Existencia cantidad={m.existencia} minimo={m.minimo} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Tarjeta>
        </section>
      )}

      {recientes.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Ultimos movimientos</h2>
            <Link
              href="/movimientos"
              className="text-sm font-semibold text-[var(--color-marca-700)]"
            >
              Ver historial
            </Link>
          </div>
          <Tarjeta className="!p-0">
            <ul className="divide-y divide-[var(--color-borde)]">
              {recientes.map((mv) => (
                <li key={mv.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="min-w-0">
                    <span className="codigo block text-sm">{mv.modelo_codigo}</span>
                    <span className="block text-xs text-[var(--color-suave)]">
                      {NOMBRE_MOVIMIENTO[mv.tipo] ?? mv.tipo} · {mv.fecha.slice(0, 16)}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-bold">
                    {mv.tipo === "conteo"
                      ? `= ${mv.existencia_despues}`
                      : mv.existencia_despues > mv.existencia_antes
                        ? `+${mv.existencia_despues - mv.existencia_antes}`
                        : `${mv.existencia_despues - mv.existencia_antes}`}
                  </span>
                </li>
              ))}
            </ul>
          </Tarjeta>
        </section>
      )}
    </div>
  );
}
