import { Suspense } from "react";
import Link from "next/link";
import { modelosPorSurtir, movimientosRecientes, resumen } from "@/lib/consultas";
import { Buscador } from "@/components/Buscador";
import { Cifra, Existencia, PastillaUbicacion, Tarjeta, Vacio } from "@/components/ui";
import {
  IconoConteo,
  IconoEntrada,
  IconoMas,
  IconoPrenda,
  IconoSalida,
} from "@/components/iconos";
import { NOMBRE_MOVIMIENTO } from "@/lib/tipos";

export const dynamic = "force-dynamic";

const ACCESOS = [
  {
    href: "/modelos/nuevo",
    Icono: IconoMas,
    titulo: "Dar de alta un modelo",
    texto: "Registrar una prenda nueva en el catalogo",
  },
  {
    href: "/entradas",
    Icono: IconoEntrada,
    titulo: "Llego mercancia",
    texto: "Sumar piezas que acaban de entrar a bodega",
  },
  {
    href: "/salidas",
    Icono: IconoSalida,
    titulo: "Sacar a tienda o tianguis",
    texto: "Armar el envio y generar la hoja para firmar",
  },
  {
    href: "/conteo",
    Icono: IconoConteo,
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
    <div className="space-y-8">
      <section>
        <h1 className="titulo text-[1.75rem] leading-tight sm:text-[2.125rem]">
          {bodegaVacia ? "Bienvenido a Venus" : "¿Que buscamos hoy?"}
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-humo)]">
          {bodegaVacia
            ? "Empieza dando de alta tus modelos o subiendo la lista que ya tienes."
            : "Escribe el codigo del modelo y te digo cuantas piezas hay y en que rack estan."}
        </p>

        <div className="mt-4">
          <Suspense fallback={<div className="h-[52px] rounded-sm bg-[var(--color-papel)]" />}>
            <Buscador autoFoco />
          </Suspense>
        </div>
      </section>

      {bodegaVacia ? (
        <Vacio
          icono={<IconoPrenda tamano={24} />}
          titulo="Todavia no hay modelos registrados"
          descripcion="Puedes capturarlos uno por uno, o subir de golpe la lista que ya tienes en Excel desde Ajustes."
          accion={
            <div className="flex flex-wrap justify-center gap-2">
              <Link
                href="/modelos/nuevo"
                className="rounded-sm bg-[var(--color-vino)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-vino-oscuro)]"
              >
                Dar de alta el primero
              </Link>
              <Link
                href="/configuracion"
                className="rounded-sm border border-[var(--color-linea-fuerte)] bg-white px-4 py-2.5 text-sm font-semibold hover:border-[var(--color-oro)]"
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
                  tono="oro"
                  href="/modelos?sinubicacion=1"
                />
              )}
            </section>
          )}
        </>
      )}

      <section>
        <h2 className="titulo mb-3 text-xl">¿Que quieres hacer?</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {ACCESOS.map(({ href, Icono, titulo, texto }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-start gap-3.5 rounded-sm border border-[var(--color-linea)] bg-[var(--color-papel)] p-4 transition-colors hover:border-[var(--color-oro)]"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-[var(--color-crema)] text-[var(--color-oro)] transition-colors group-hover:bg-[var(--color-oro-palido)]">
                <Icono tamano={19} />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">{titulo}</span>
                <span className="mt-0.5 block text-sm leading-relaxed text-[var(--color-humo)]">
                  {texto}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {porSurtir.length > 0 && (
        <section>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="titulo text-xl">Hay que surtir</h2>
            <Link
              href="/modelos?existencia=bajo"
              className="text-sm font-semibold text-[var(--color-vino)] hover:underline"
            >
              Ver todos
            </Link>
          </div>
          <div className="overflow-hidden rounded-sm border border-[var(--color-linea)] bg-[var(--color-papel)]">
            <ul className="divide-y divide-[var(--color-linea)]">
              {porSurtir.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/modelos/${m.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-[var(--color-oro-tenue)]"
                  >
                    <span className="min-w-0">
                      <span className="codigo block">{m.codigo}</span>
                      <span className="block truncate text-sm text-[var(--color-humo)]">
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
          </div>
        </section>
      )}

      {recientes.length > 0 && (
        <section>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="titulo text-xl">Ultimos movimientos</h2>
            <Link
              href="/movimientos"
              className="text-sm font-semibold text-[var(--color-vino)] hover:underline"
            >
              Ver historial
            </Link>
          </div>
          <div className="overflow-hidden rounded-sm border border-[var(--color-linea)] bg-[var(--color-papel)]">
            <ul className="divide-y divide-[var(--color-linea)]">
              {recientes.map((mv) => {
                const diferencia = mv.existencia_despues - mv.existencia_antes;
                return (
                  <li key={mv.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="min-w-0">
                      <span className="codigo block text-sm">{mv.modelo_codigo}</span>
                      <span className="block text-xs text-[var(--color-humo)]">
                        {NOMBRE_MOVIMIENTO[mv.tipo] ?? mv.tipo} · {mv.fecha.slice(0, 16)}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                      {mv.tipo === "conteo"
                        ? `= ${mv.existencia_despues}`
                        : diferencia > 0
                          ? `+${diferencia}`
                          : diferencia}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
