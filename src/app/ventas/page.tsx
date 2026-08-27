import Link from "next/link";
import { exigirEntrada } from "@/lib/acceso";
import {
  desempenoVendedoras,
  hayCaja,
  hayQueSurtir,
  masVendidos,
  PERIODOS,
  pesos,
  resumenVentas,
  ventasPorDia,
  type Periodo,
} from "@/lib/ventas";
import { FotoModelo } from "@/components/FotoModelo";
import { Cifra, Insignia, Tarjeta, TituloPagina, Vacio } from "@/components/ui";
import { IconoCaja, IconoEstrella, IconoPersona, IconoSalida } from "@/components/iconos";

export const dynamic = "force-dynamic";

type Params = Promise<{ [k: string]: string | string[] | undefined }>;

const CHIP = "shrink-0 rounded-sm border px-3 py-3 text-sm font-semibold whitespace-nowrap sm:py-1.5";
const PRENDIDO = "border-[var(--color-vino)] bg-[var(--color-vino-palido)] text-[var(--color-vino)]";
const APAGADO = "border-[var(--color-linea)] bg-[var(--color-papel)] text-[var(--color-humo)]";

/** Los dias de la semana, para no escribir "2026-08-26" en la grafica. */
function diaCorto(fecha: string): string {
  const [a, m, d] = fecha.split("-").map(Number);
  const nombres = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
  return `${nombres[new Date(a, m - 1, d).getDay()]} ${d}`;
}

/**
 * Ventas de la tienda, vistas desde bodega.
 *
 * Las escribe la caja en esta misma base; aqui solo se leen. Contesta
 * las tres preguntas que el cliente decia que su sistema no le
 * contestaba: que se vende mas, cuanto vendio cada vendedora, y —la que
 * de verdad le sirve a bodega— que hay que mandar a la tienda mañana.
 */
export default async function VentasDeTienda({ searchParams }: { searchParams: Params }) {
  await exigirEntrada();
  const sp = await searchParams;
  const pedido = typeof sp.periodo === "string" ? sp.periodo : "";
  const periodo: Periodo = PERIODOS.some((p) => p.valor === pedido)
    ? (pedido as Periodo)
    : "semana";

  if (!hayCaja()) {
    return (
      <div className="space-y-5">
        <TituloPagina
          titulo="Ventas de la tienda"
          descripcion="Lo que se cobra en la caja aparece aqui."
        />
        <Vacio
          icono={<IconoCaja tamano={24} />}
          titulo="Todavia no hay caja conectada"
          descripcion="En cuanto la caja de la tienda empiece a cobrar sobre esta misma base, aqui van a salir solas las ventas, lo que mas se vende y lo que vendio cada vendedora."
        />
      </div>
    );
  }

  const resumen = resumenVentas(periodo);
  const porDia = ventasPorDia(periodo);
  const top = masVendidos(periodo);
  const vendedoras = desempenoVendedoras(periodo);
  const surtir = hayQueSurtir();
  const maximo = Math.max(1, ...porDia.map((d) => d.total));

  return (
    <div className="space-y-5">
      <TituloPagina
        titulo="Ventas de la tienda"
        descripcion="Lo que la caja cobro. Bodega no lo escribe: solo lo lee."
      />

      <div className="no-imprimir -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {PERIODOS.map((p) => (
          <Link
            key={p.valor}
            href={`/ventas?periodo=${p.valor}`}
            aria-current={periodo === p.valor ? "true" : undefined}
            className={`${CHIP} ${periodo === p.valor ? PRENDIDO : APAGADO}`}
          >
            {p.nombre}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Cifra texto="Vendido" valor={pesos(resumen.total)} />
        <Cifra texto="Tickets" valor={resumen.tickets.toLocaleString("es-MX")} />
        <Cifra texto="Piezas" valor={resumen.piezas.toLocaleString("es-MX")} />
        <Cifra texto="Ticket promedio" valor={pesos(resumen.promedio)} />
      </div>

      {resumen.canceladas > 0 && (
        <p className="border-l-2 border-[var(--color-linea-fuerte)] bg-[var(--color-crema)] px-3 py-2 text-xs leading-relaxed text-[var(--color-humo)]">
          En este periodo se cancelaron {resumen.canceladas}{" "}
          {resumen.canceladas === 1 ? "venta" : "ventas"}. Las canceladas no cuentan en los
          numeros de arriba y sus piezas ya regresaron a la tienda.
        </p>
      )}

      {resumen.tickets === 0 ? (
        <Vacio
          icono={<IconoCaja tamano={24} />}
          titulo="No hay ventas en este periodo"
          descripcion="Prueba con un rango mas largo."
        />
      ) : (
        <>
          {porDia.length > 1 && (
            <Tarjeta>
              <h2 className="titulo text-lg">Dia por dia</h2>
              <div className="mt-4 flex items-end gap-1.5 sm:gap-2.5">
                {porDia.map((d) => (
                  <div key={d.dia} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                    <span className="text-[0.65rem] font-semibold tabular-nums text-[var(--color-humo)]">
                      {Math.round(d.total / 100).toLocaleString("es-MX")}
                    </span>
                    {/* La barra en porcentaje del dia mas alto: sin eje, que
                        aqui lo que importa es comparar unos dias con otros. */}
                    <div
                      className="w-full rounded-t-sm bg-[var(--color-vino)]"
                      style={{ height: `${Math.max(4, (d.total / maximo) * 120)}px` }}
                      title={`${diaCorto(d.dia)}: ${pesos(d.total)}, ${d.piezas} piezas`}
                    />
                    <span className="w-full truncate text-center text-[0.65rem] text-[var(--color-humo)]">
                      {diaCorto(d.dia)}
                    </span>
                  </div>
                ))}
              </div>
            </Tarjeta>
          )}

          {surtir.length > 0 && (
            <Tarjeta className="space-y-3">
              <div>
                <h2 className="titulo flex items-center gap-2 text-lg">
                  <span className="text-[var(--color-oro)]">
                    <IconoSalida tamano={19} />
                  </span>
                  Hay que mandar a la tienda
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-humo)]">
                  Se estan vendiendo, ya casi no quedan alla, y aqui si hay para surtir.
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {surtir.map((m) => (
                  <Link
                    key={m.codigo}
                    href={`/modelos/${m.modelo_id}`}
                    className="flex items-center gap-3 rounded-sm border border-[var(--color-linea)] bg-[var(--color-papel)] p-2.5 transition-colors hover:border-[var(--color-oro)]"
                  >
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-sm bg-[var(--color-crema)]">
                      <FotoModelo foto={m.foto || null} descripcion={m.descripcion} tamano="mini" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="codigo text-sm">{m.codigo}</div>
                      <div className="truncate text-xs text-[var(--color-humo)]">
                        {m.descripcion}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Insignia tono="vino">Quedan {m.en_tienda} en tienda</Insignia>
                        <Insignia tono="ok">{m.existencia} en bodega</Insignia>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </Tarjeta>
          )}

          <Tarjeta className="space-y-3">
            <div>
              <h2 className="titulo flex items-center gap-2 text-lg">
                <span className="text-[var(--color-oro)]">
                  <IconoEstrella tamano={19} />
                </span>
                Lo que mas se vendio
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-humo)]">
                Contado de los tickets, no de lo que dice el catalogo.
              </p>
            </div>

            <div className="-mx-4 overflow-x-auto sm:mx-0">
              <table className="w-full min-w-[34rem] text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-linea)] text-left">
                    <th className="etiqueta !mb-0 px-4 py-2 sm:px-2">Modelo</th>
                    <th className="etiqueta !mb-0 px-4 py-2 text-right sm:px-2">Piezas</th>
                    <th className="etiqueta !mb-0 px-4 py-2 text-right sm:px-2">Importe</th>
                    <th className="etiqueta !mb-0 px-4 py-2 text-right sm:px-2">Queda</th>
                  </tr>
                </thead>
                <tbody>
                  {top.map((m) => (
                    <tr key={m.codigo} className="border-b border-[var(--color-linea)]">
                      <td className="px-4 py-2.5 sm:px-2">
                        {m.modelo_id ? (
                          <Link href={`/modelos/${m.modelo_id}`} className="hover:underline">
                            <span className="codigo">{m.codigo}</span>
                            <span className="ml-2 text-xs text-[var(--color-humo)]">
                              {m.descripcion}
                            </span>
                          </Link>
                        ) : (
                          <>
                            <span className="codigo">{m.codigo}</span>
                            <span className="ml-2 text-xs text-[var(--color-humo)]">
                              {m.descripcion}
                            </span>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums sm:px-2">{m.piezas}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums sm:px-2">
                        {pesos(m.importe)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs tabular-nums text-[var(--color-humo)] sm:px-2">
                        {m.en_tienda} tienda · {m.existencia} bodega
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Tarjeta>

          {vendedoras.length > 0 && (
            <Tarjeta className="space-y-3">
              <div>
                <h2 className="titulo flex items-center gap-2 text-lg">
                  <span className="text-[var(--color-oro)]">
                    <IconoPersona tamano={19} />
                  </span>
                  Como le fue a cada vendedora
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-humo)]">
                  Cada ticket queda firmado con el PIN de quien cobro.
                </p>
              </div>

              <div className="-mx-4 overflow-x-auto sm:mx-0">
                <table className="w-full min-w-[30rem] text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-linea)] text-left">
                      <th className="etiqueta !mb-0 px-4 py-2 sm:px-2">Vendedora</th>
                      <th className="etiqueta !mb-0 px-4 py-2 text-right sm:px-2">Tickets</th>
                      <th className="etiqueta !mb-0 px-4 py-2 text-right sm:px-2">Piezas</th>
                      <th className="etiqueta !mb-0 px-4 py-2 text-right sm:px-2">Vendido</th>
                      <th className="etiqueta !mb-0 px-4 py-2 text-right sm:px-2">Promedio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendedoras.map((v) => (
                      <tr key={v.vendedora} className="border-b border-[var(--color-linea)]">
                        <td className="px-4 py-2.5 font-semibold sm:px-2">{v.vendedora}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums sm:px-2">{v.tickets}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums sm:px-2">{v.piezas}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums sm:px-2">
                          {pesos(v.total)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-humo)] sm:px-2">
                          {pesos(v.promedio)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Tarjeta>
          )}
        </>
      )}
    </div>
  );
}
