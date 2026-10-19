import Link from "next/link";
import { exigirEntrada } from "@/lib/acceso";
import {
  hayVentas,
  ORIGENES,
  PERIODOS,
  pesos,
  resumenVentas,
  ventasIndividuales,
  type Origen,
  type Periodo,
  type VentaIndividual,
} from "@/lib/ventas";
import { hoy } from "@/lib/tianguis";
import { Cifra, Insignia, Tarjeta, TituloPagina, Vacio } from "@/components/ui";
import { IconoCaja } from "@/components/iconos";

export const dynamic = "force-dynamic";

type Params = Promise<{ [k: string]: string | string[] | undefined }>;

/** Cuantas ventas se muestran como maximo; arriba de eso, un periodo mas corto. */
const LIMITE = 150;

const CHIP = "shrink-0 rounded-sm border px-3 py-3 text-sm font-semibold whitespace-nowrap sm:py-1.5";
const PRENDIDO = "border-[var(--color-vino)] bg-[var(--color-vino-palido)] text-[var(--color-vino)]";
const APAGADO = "border-[var(--color-linea)] bg-[var(--color-papel)] text-[var(--color-humo)]";

/** "2026-10-19" -> "lunes 19 de octubre". */
function nombreDelDia(dia: string): string {
  const [a, m, d] = dia.split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** El dia de antes, en el mismo formato YYYY-MM-DD. */
function diaAnterior(dia: string): string {
  const [a, m, d] = dia.split("-").map(Number);
  const f = new Date(a, m - 1, d - 1);
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`;
}

function piezas(n: number) {
  return `${n} ${n === 1 ? "pieza" : "piezas"}`;
}

/**
 * Las ventas de la tienda y del tianguis, una por una.
 *
 * Las de la tienda las escribe la caja en esta misma base; las del
 * tianguis, la seccion Tianguis. Aqui solo se leen. La pantalla es la
 * lista: arriba solo lo que se vendio en total, y despues cada venta con
 * sus prendas, cuantas, a cuanto cada una y el total, agrupadas por dia.
 */
export default async function PaginaVentas({ searchParams }: { searchParams: Params }) {
  await exigirEntrada();
  const sp = await searchParams;
  const pedido = typeof sp.periodo === "string" ? sp.periodo : "";
  const periodo: Periodo = PERIODOS.some((p) => p.valor === pedido)
    ? (pedido as Periodo)
    : "semana";
  const pedidoOrigen = typeof sp.origen === "string" ? sp.origen : "";
  const origen: Origen = ORIGENES.some((o) => o.valor === pedidoOrigen)
    ? (pedidoOrigen as Origen)
    : "todo";

  // Los dos filtros viajan juntos en la direccion: cambiar uno no borra el otro.
  const liga = (cambio: { periodo?: Periodo; origen?: Origen }) => {
    const p = new URLSearchParams();
    p.set("periodo", cambio.periodo ?? periodo);
    const o = cambio.origen ?? origen;
    if (o !== "todo") p.set("origen", o);
    return `/ventas?${p.toString()}`;
  };

  if (!hayVentas()) {
    return (
      <div className="space-y-5">
        <TituloPagina
          titulo="Ventas"
          descripcion="Lo que se cobra en la tienda y lo que se vende en el tianguis aparece aqui."
        />
        <Vacio
          icono={<IconoCaja tamano={24} />}
          titulo="Todavia no hay ventas"
          descripcion="En cuanto la caja de la tienda cobre o se registre una venta en el tianguis, aqui va a salir cada venta con sus prendas y su total."
        />
      </div>
    );
  }

  const resumen = resumenVentas(periodo, origen);
  const ventas = ventasIndividuales(periodo, origen, LIMITE);

  // Agrupadas por dia, con lo que se vendio ese dia. Las canceladas se
  // ven, pero no suman.
  const deHoy = hoy();
  const ayer = diaAnterior(deHoy);
  const porDia = new Map<string, VentaIndividual[]>();
  for (const v of ventas) {
    const dia = v.fecha.slice(0, 10);
    if (!porDia.has(dia)) porDia.set(dia, []);
    porDia.get(dia)!.push(v);
  }

  return (
    <div className="space-y-5">
      <TituloPagina
        titulo="Ventas"
        descripcion="Cada venta de la tienda y del tianguis, con sus prendas y su total."
      />

      <div className="no-imprimir space-y-2">
        <div className="desliza-h -mx-4 flex gap-2 px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {PERIODOS.map((p) => (
            <Link
              key={p.valor}
              href={liga({ periodo: p.valor })}
              aria-current={periodo === p.valor ? "true" : undefined}
              className={`${CHIP} ${periodo === p.valor ? PRENDIDO : APAGADO}`}
            >
              {p.nombre}
            </Link>
          ))}
        </div>
        <div className="flex gap-2">
          {ORIGENES.map((o) => (
            <Link
              key={o.valor}
              href={liga({ origen: o.valor })}
              aria-current={origen === o.valor ? "true" : undefined}
              className={`${CHIP} flex-1 text-center sm:flex-none ${origen === o.valor ? PRENDIDO : APAGADO}`}
            >
              {o.nombre}
            </Link>
          ))}
        </div>
      </div>

      {/* En el celular el total va a lo ancho: en un tercio de pantalla una
          cantidad como $12,450.00 no cabe y se corta. */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        <div className="col-span-2 sm:col-span-1">
          <Cifra texto="Vendido" valor={pesos(resumen.total)} />
        </div>
        <Cifra texto="Ventas" valor={resumen.ventas.toLocaleString("es-MX")} />
        <Cifra texto="Piezas" valor={resumen.piezas.toLocaleString("es-MX")} />
      </div>

      {/* Con las dos juntas, cuanto fue de cada lado: es lo primero que se
          pregunta al ver el total. */}
      {origen === "todo" && resumen.totalTianguis > 0 && (
        <p className="-mt-2 text-sm text-[var(--color-humo)]">
          De eso, <strong className="text-[var(--color-tinta)]">{pesos(resumen.totalTienda)}</strong>{" "}
          en la tienda y{" "}
          <strong className="text-[var(--color-tinta)]">{pesos(resumen.totalTianguis)}</strong> en
          el tianguis.
        </p>
      )}

      {ventas.length === 0 ? (
        <Vacio
          icono={<IconoCaja tamano={24} />}
          titulo="No hay ventas en este periodo"
          descripcion="Prueba con un rango mas largo."
        />
      ) : (
        <div className="space-y-6">
          {[...porDia.entries()].map(([dia, delDia]) => {
            const validas = delDia.filter((v) => !v.cancelada);
            const total = validas.reduce((s, v) => s + v.total, 0);
            return (
              <section key={dia} className="space-y-2">
                <div className="flex items-baseline justify-between gap-3 border-b border-[var(--color-linea-fuerte)] pb-1.5">
                  <h2 className="titulo text-lg first-letter:uppercase">
                    {dia === deHoy ? "Hoy" : dia === ayer ? "Ayer" : nombreDelDia(dia)}
                  </h2>
                  <p className="text-sm text-[var(--color-humo)]">
                    <strong className="text-[var(--color-tinta)] tabular-nums">{pesos(total)}</strong>{" "}
                    en {validas.length} {validas.length === 1 ? "venta" : "ventas"}
                  </p>
                </div>
                <ul className="space-y-4">
                  {delDia.map((v) => (
                    <li key={v.clave}>
                      <TarjetaVenta venta={v} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}

          {ventas.length >= LIMITE && (
            <p className="text-center text-xs text-[var(--color-humo)]">
              Se muestran las {LIMITE} ventas mas recientes. Para ver mas atras, elige un periodo
              mas corto.
            </p>
          )}

          {resumen.canceladas > 0 && (
            <p className="border-l-2 border-[var(--color-linea-fuerte)] bg-[var(--color-crema)] px-3 py-2 text-xs leading-relaxed text-[var(--color-humo)]">
              Las ventas tachadas se cancelaron: no cuentan en los totales y sus piezas ya
              regresaron a donde estaban.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Una venta, escrita para que se entienda sin explicar nada:
 * de donde, a que hora y quien; cada prenda con "2 piezas × $600 c/u" y
 * lo que suma; y abajo el total de la venta.
 */
function TarjetaVenta({ venta }: { venta: VentaIndividual }) {
  const tachado = venta.cancelada ? "line-through" : "";
  const variasPrendas = venta.renglones.length > 1;

  return (
    // El borde de color a la izquierda y la sombra hacen que cada venta se
    // lea como una tarjeta aparte: sin ellos, una lista de ventas seguidas
    // parecia un solo ticket muy largo.
    <Tarjeta
      className={`overflow-hidden !p-0 border-l-4 shadow-sm ${
        venta.origen === "tianguis" ? "!border-l-[var(--color-oro)]" : "!border-l-[var(--color-vino)]"
      } ${venta.cancelada ? "opacity-60" : ""}`}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 pt-3 text-xs text-[var(--color-humo)]">
        <Insignia tono={venta.origen === "tianguis" ? "oro" : "vino"}>
          {venta.origen === "tianguis" ? "Tianguis" : "Tienda"}
        </Insignia>
        <span className="tabular-nums">{venta.fecha.slice(11, 16)}</span>
        {venta.folio && <span>· Ticket {venta.folio}</span>}
        {venta.vendedora && <span>· Vendio {venta.vendedora}</span>}
        {venta.cancelada && <Insignia tono="alto">Cancelada</Insignia>}
      </div>

      <ul className="px-4 py-2">
        {venta.renglones.map((r, i) => (
          <li
            key={i}
            className="flex items-start justify-between gap-3 border-b border-dashed border-[var(--color-linea)] py-2 last:border-b-0"
          >
            <div className="min-w-0">
              <p className="truncate">
                {r.modelo_id ? (
                  <Link href={`/modelos/${r.modelo_id}`} className="codigo hover:underline">
                    {r.codigo}
                  </Link>
                ) : (
                  <span className="codigo">{r.codigo}</span>
                )}
                <span className="ml-2 text-xs text-[var(--color-humo)]">{r.descripcion}</span>
              </p>
              <p className="mt-0.5 text-sm tabular-nums text-[var(--color-humo)]">
                {piezas(r.piezas)} × {pesos(r.precio)} c/u
              </p>
              {r.precio_lista !== null && (
                <p className="text-xs text-[var(--color-ambar)]">
                  Precio registrado {pesos(r.precio_lista)}
                </p>
              )}
            </div>
            {/* Con una sola prenda, su importe es el total: repetirlo dos
                veces confunde, asi que solo sale abajo. */}
            {variasPrendas && (
              <span className={`shrink-0 pt-0.5 text-sm font-semibold tabular-nums ${tachado}`}>
                {pesos(r.importe)}
              </span>
            )}
          </li>
        ))}
      </ul>

      <div className="space-y-0.5 border-t border-[var(--color-linea)] bg-[var(--color-crema)] px-4 py-2.5">
        {venta.descuento > 0 && (
          <div className="flex justify-between text-xs text-[var(--color-humo)] tabular-nums">
            <span>Descuento</span>
            <span>−{pesos(venta.descuento)}</span>
          </div>
        )}
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-semibold">
            Total de la venta
            {variasPrendas && (
              <span className="ml-1 font-normal text-[var(--color-humo)]">
                ({piezas(venta.piezas)})
              </span>
            )}
          </span>
          <span className={`text-lg font-bold tabular-nums ${tachado}`}>{pesos(venta.total)}</span>
        </div>
      </div>
    </Tarjeta>
  );
}
