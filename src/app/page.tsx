import { Suspense } from "react";
import Link from "next/link";
import { modelosPorSurtir, movimientosRecientes, resumen } from "@/lib/consultas";
import { usaTianguis } from "@/lib/ajustes";
import { Buscador } from "@/components/Buscador";
import { BotonEnlace, Cifra, Existencia, PastillaUbicacion, Vacio } from "@/components/ui";
import {
  IconoConteo,
  IconoEntrada,
  IconoMas,
  IconoPrenda,
  IconoSalida,
} from "@/components/iconos";
import { NOMBRE_MOVIMIENTO } from "@/lib/tipos";
import { exigirEntrada } from "@/lib/acceso";

export const dynamic = "force-dynamic";

// Nombrar el tianguis en el atajo mientras esta apagado manda a buscar una
// pestana que no existe, por eso el titulo depende del ajuste.
function accesos(conTianguis: boolean) {
  return [
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
      titulo: conTianguis ? "Sacar a tienda o tianguis" : "Sacar a tienda",
      texto: "Armar el envio y generar la hoja para firmar",
    },
    {
      href: "/conteo",
      Icono: IconoConteo,
      titulo: "Contar la bodega",
      texto: "Revisar rack por rack y cuadrar existencias",
    },
  ];
}

export default async function Inicio() {
  await exigirEntrada();
  const datos = resumen();
  const conTianguis = usaTianguis();
  const porSurtir = modelosPorSurtir(6);
  const recientes = movimientosRecientes(6);
  const bodegaVacia = datos.total_modelos === 0;
  // Recien instalado: el catalogo esta cargado pero nadie ha contado nada.
  // Ahi los avisos de "agotado" y "hay que surtir" no dicen nada util,
  // porque TODO esta en cero. Lo que hace falta es cargar las cantidades.
  const faltaInventariar = !bodegaVacia && !datos.ya_hubo_inventario;

  // Se arma aparte porque, sin la cifra del tianguis, esta es la que se
  // lleva el renglon completo del telefono.
  const cifraTienda = (
    <Cifra
      valor={datos.piezas_tienda.toLocaleString("es-MX")}
      texto="Estan en la tienda"
      href="/movimientos?tipo=salida_tienda"
    />
  );

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

      {/* El primer dia el catalogo ya esta, pero todo vale cero. En vez de
          la alarma roja de "129 agotados", que ahi no significa nada, se
          dice cual es el siguiente paso y se lleva directo a hacerlo. */}
      {faltaInventariar && (
        <section className="rounded-sm border border-[var(--color-oro)] bg-[var(--color-oro-tenue)] p-5">
          <h2 className="titulo text-xl">Falta cargar cuantas piezas hay</h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--color-humo)]">
            El catalogo ya tiene los{" "}
            <strong className="font-semibold text-[var(--color-tinta)]">
              {datos.total_modelos}
            </strong>{" "}
            modelos con su foto, pero todavia nadie ha contado la bodega, por eso todo aparece en
            cero. Recorre los racks con el celular y anota lo que veas: las cantidades quedan al
            cerrar el conteo.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <BotonEnlace href="/conteo" className="w-full justify-center sm:w-auto">
              <IconoConteo tamano={17} />
              Empezar a contar la bodega
            </BotonEnlace>
            <BotonEnlace
              href="/ubicaciones"
              variante="secundario"
              className="w-full justify-center sm:w-auto"
            >
              Antes: mapear los racks
            </BotonEnlace>
          </div>
        </section>
      )}

      {bodegaVacia ? (
        <Vacio
          icono={<IconoPrenda tamano={24} />}
          titulo="Todavia no hay modelos registrados"
          descripcion="Puedes capturarlos uno por uno, o subir de golpe la lista que ya tienes en Excel desde Ajustes."
          accion={
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
              <Link
                href="/modelos/nuevo"
                className="w-full rounded-sm bg-[var(--color-vino)] px-4 py-3 text-center text-sm font-semibold text-white hover:bg-[var(--color-vino-oscuro)] sm:w-auto"
              >
                Dar de alta el primero
              </Link>
              <Link
                href="/configuracion"
                className="w-full rounded-sm border border-[var(--color-linea-fuerte)] bg-[var(--color-papel)] px-4 py-3 text-center text-sm font-semibold hover:border-[var(--color-oro)] sm:w-auto"
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
            <div
              className={`grid grid-cols-2 gap-3 ${
                conTianguis ? "lg:grid-cols-4" : "lg:grid-cols-3"
              }`}
            >
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
              {conTianguis ? (
                <>
                  {cifraTienda}
                  <Cifra
                    valor={datos.piezas_tianguis.toLocaleString("es-MX")}
                    texto="Estan en el tianguis"
                    href="/movimientos?tipo=salida_tianguis"
                  />
                </>
              ) : (
                <div className="col-span-2 lg:col-span-1">{cifraTienda}</div>
              )}
            </div>
          </section>

          {!faltaInventariar &&
            (datos.agotados > 0 || datos.bajos > 0 || datos.sin_ubicacion > 0) && (
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
          {accesos(conTianguis).map(({ href, Icono, titulo, texto }) => (
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

      {!faltaInventariar && porSurtir.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="titulo text-xl">Hay que surtir</h2>
            <Link
              href="/modelos?existencia=bajo"
              className="-my-2 inline-flex min-h-11 shrink-0 items-center px-1 text-sm font-semibold text-[var(--color-vino)] hover:underline"
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
                    <span className="min-w-0 flex-1">
                      <span className="codigo block">{m.codigo}</span>
                      <span className="block truncate text-sm text-[var(--color-humo)]">
                        {m.descripcion}
                      </span>
                      {/* La ubicacion baja al bloque de texto: arriba se comia
                          el ancho de la descripcion y dos modelos parecidos
                          se veian identicos al quedar truncados. */}
                      <span className="mt-1 flex">
                        <PastillaUbicacion codigo={m.ubicacion_codigo} />
                      </span>
                    </span>
                    <span className="shrink-0">
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
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="titulo text-xl">Ultimos movimientos</h2>
            <Link
              href="/movimientos"
              className="-my-2 inline-flex min-h-11 shrink-0 items-center px-1 text-sm font-semibold text-[var(--color-vino)] hover:underline"
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
                    <span
                      className={`shrink-0 text-base font-semibold tabular-nums ${
                        mv.tipo === "conteo"
                          ? "text-[var(--color-humo)]"
                          : diferencia > 0
                            ? "text-[var(--color-verde)]"
                            : diferencia < 0
                              ? "text-[var(--color-rojo)]"
                              : "text-[var(--color-humo)]"
                      }`}
                    >
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
