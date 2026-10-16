import Link from "next/link";
import { diasConVentas, hoy, ventasDelDia } from "@/lib/tianguis";
import { CancelarVentaTianguis } from "@/components/CancelarVentaTianguis";
import { FotoModelo } from "@/components/FotoModelo";
import { Insignia, Tarjeta, TituloPagina, Vacio } from "@/components/ui";
import { IconoHistorial } from "@/components/iconos";
import { exigirEntrada } from "@/lib/acceso";

export const dynamic = "force-dynamic";

type Params = Promise<{ [k: string]: string | string[] | undefined }>;

/** "2026-10-15" -> "jueves 15 de octubre". */
function nombreDelDia(dia: string): string {
  const [a, m, d] = dia.split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/**
 * Las ventas del tianguis, SIN precio: que se vendio y cuantas.
 *
 * Lo ven los vendedores, asi que el dinero ni siquiera se lee de la base
 * (ver lib/tianguis.ts). Sirve para revisar el dia y para corregir una
 * venta que se registro mal.
 */
export default async function PaginaVentasTianguis({ searchParams }: { searchParams: Params }) {
  await exigirEntrada();
  const sp = await searchParams;

  const deHoy = hoy();
  const dias = diasConVentas(14);
  const pedido = typeof sp.dia === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.dia) ? sp.dia : "";
  const dia = pedido || deHoy;
  // Hoy siempre se ofrece, aunque todavia no haya ventas.
  const chips = dias.includes(deHoy) ? dias : [deHoy, ...dias];

  const ventas = ventasDelDia(dia);
  const vendidas = ventas.filter((v) => v.estado === "vendida");
  const piezas = vendidas.reduce((s, v) => s + v.piezas, 0);

  return (
    <div className="space-y-4">
      <TituloPagina
        titulo="Ventas del tianguis"
        descripcion={
          vendidas.length > 0
            ? `${dia === deHoy ? "Hoy" : nombreDelDia(dia)}: ${piezas} ${
                piezas === 1 ? "pieza vendida" : "piezas vendidas"
              } en ${vendidas.length} ${vendidas.length === 1 ? "venta" : "ventas"}.`
            : undefined
        }
      />

      {chips.length > 1 && (
        <div className="desliza-h -mx-4 flex gap-2 px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {chips.map((d) => (
            <Link
              key={d}
              href={d === deHoy ? "/tianguis/ventas" : `/tianguis/ventas?dia=${d}`}
              className={`inline-flex min-h-11 shrink-0 items-center rounded-sm border px-3 text-sm font-semibold whitespace-nowrap sm:min-h-9 ${
                d === dia
                  ? "border-transparent bg-[var(--color-vino)] text-white"
                  : "border-[var(--color-linea)] bg-[var(--color-papel)] text-[var(--color-humo)]"
              }`}
            >
              {d === deHoy ? "Hoy" : nombreDelDia(d)}
            </Link>
          ))}
        </div>
      )}

      {ventas.length === 0 ? (
        <Vacio
          icono={<IconoHistorial tamano={24} />}
          titulo={dia === deHoy ? "Todavia no hay ventas hoy" : "No hubo ventas ese dia"}
          descripcion="Cada venta que se registre en el tianguis aparece aqui, con el modelo y las piezas."
        />
      ) : (
        <Tarjeta className="!p-0">
          <ul className="divide-y divide-[var(--color-linea)]">
            {ventas.map((v) => {
              const cancelada = v.estado === "cancelada";
              return (
                <li
                  key={v.id}
                  className={`flex items-center gap-3 px-3 py-2.5 sm:px-4 ${cancelada ? "opacity-55" : ""}`}
                >
                  <FotoModelo foto={v.foto || null} descripcion={v.descripcion} tamano="mini" />
                  <div className="min-w-0 flex-1">
                    <p className={`codigo text-base ${cancelada ? "line-through" : ""}`}>{v.codigo}</p>
                    <p className="truncate text-xs text-[var(--color-humo)]">{v.descripcion}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-[var(--color-humo)]">
                      {v.fecha.slice(11, 16)}
                      {v.persona && ` · ${v.persona}`}
                      {cancelada && <Insignia tono="alto">Cancelada</Insignia>}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end">
                    <span className="text-xl leading-none font-bold tabular-nums">{v.piezas}</span>
                    <span className="text-[0.7rem] text-[var(--color-humo)]">
                      {v.piezas === 1 ? "pieza" : "piezas"}
                    </span>
                    {!cancelada && <CancelarVentaTianguis ventaId={v.id} />}
                  </div>
                </li>
              );
            })}
          </ul>
        </Tarjeta>
      )}
    </div>
  );
}
