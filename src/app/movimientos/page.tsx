import Link from "next/link";
import { movimientosRecientes } from "@/lib/consultas";
import { usaTianguis } from "@/lib/ajustes";
import { Insignia, Tarjeta, TituloPagina, Vacio } from "@/components/ui";
import { IconoHistorial } from "@/components/iconos";
import { NOMBRE_MOVIMIENTO, TIPOS_MOVIMIENTO, type TipoMovimiento } from "@/lib/tipos";

export const dynamic = "force-dynamic";

type Params = Promise<{ [k: string]: string | string[] | undefined }>;

const TONO_POR_TIPO: Record<TipoMovimiento, "ok" | "vino" | "neutro"> = {
  entrada: "ok",
  retorno_tienda: "ok",
  retorno_tianguis: "ok",
  salida_tienda: "vino",
  salida_tianguis: "vino",
  ajuste: "neutro",
  conteo: "neutro",
};

export default async function PaginaMovimientos({ searchParams }: { searchParams: Params }) {
  const sp = await searchParams;
  const filtro = typeof sp.tipo === "string" ? sp.tipo : "";
  const conTianguis = usaTianguis();

  // Solo se dejan de ofrecer como filtro: lo que ya paso por el tianguis
  // sigue apareciendo en la bitacora, con su nombre de siempre.
  const tipos = TIPOS_MOVIMIENTO.filter(
    (t) => conTianguis || (t !== "salida_tianguis" && t !== "retorno_tianguis")
  );

  const todos = movimientosRecientes(400);
  const movimientos = filtro ? todos.filter((m) => m.tipo === filtro) : todos;

  // Se agrupan por dia para que se lea como una bitacora.
  const porDia = new Map<string, typeof movimientos>();
  for (const mv of movimientos) {
    const dia = mv.fecha.slice(0, 10);
    if (!porDia.has(dia)) porDia.set(dia, []);
    porDia.get(dia)!.push(mv);
  }

  return (
    <div className="space-y-5">
      <TituloPagina
        titulo="Historial"
        descripcion="Todo lo que ha entrado y salido de la bodega."
      />

      {/* Los filtros apilados empujaban el primer movimiento fuera de la
          primera pantalla: en el telefono se recorren de lado, en una sola tira. */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-x-visible sm:px-0 sm:pb-0">
        <Link
          href="/movimientos"
          className={`shrink-0 rounded-sm border px-3 py-3 text-sm font-semibold whitespace-nowrap sm:py-1.5 ${
            !filtro
              ? "border-[var(--color-vino)] bg-[var(--color-vino-palido)] text-[var(--color-vino)]"
              : "border-[var(--color-linea)] bg-[var(--color-papel)]"
          }`}
        >
          Todo
        </Link>
        {tipos.map((t) => (
          <Link
            key={t}
            href={`/movimientos?tipo=${t}`}
            className={`shrink-0 rounded-sm border px-3 py-3 text-sm font-semibold whitespace-nowrap sm:py-1.5 ${
              filtro === t
                ? "border-[var(--color-vino)] bg-[var(--color-vino-palido)] text-[var(--color-vino)]"
                : "border-[var(--color-linea)] bg-[var(--color-papel)]"
            }`}
          >
            {NOMBRE_MOVIMIENTO[t]}
          </Link>
        ))}
      </div>

      {movimientos.length === 0 ? (
        <Vacio
          icono={<IconoHistorial tamano={24} />}
          titulo="No hay movimientos todavia"
          descripcion="Cuando registres entradas o salidas apareceran aqui."
        />
      ) : (
        <div className="space-y-5">
          {[...porDia.entries()].map(([dia, delDia]) => (
            <section key={dia}>
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--color-humo)]">
                {dia}
              </h2>
              <Tarjeta className="!p-0">
                <ul className="divide-y divide-[var(--color-linea)]">
                  {delDia.map((mv) => {
                    const diferencia = mv.existencia_despues - mv.existencia_antes;
                    return (
                      <li key={mv.id}>
                        <Link
                          href={`/modelos/${mv.modelo_id}`}
                          className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-[var(--color-oro-tenue)]"
                        >
                          <span className="min-w-0">
                            <span className="codigo block text-sm">{mv.modelo_codigo}</span>
                            <span className="block truncate text-xs text-[var(--color-humo)]">
                              {mv.modelo_descripcion}
                            </span>
                            <span className="mt-1 flex flex-wrap items-center gap-1.5">
                              <Insignia tono={TONO_POR_TIPO[mv.tipo] ?? "neutro"}>
                                {NOMBRE_MOVIMIENTO[mv.tipo] ?? mv.tipo}
                              </Insignia>
                              <span className="text-xs text-[var(--color-humo)]">
                                {mv.fecha.slice(11, 16)}
                                {mv.persona && ` · ${mv.persona}`}
                              </span>
                            </span>
                          </span>
                          <span className="shrink-0 text-right">
                            <span
                              className={`block text-xl leading-none font-bold tabular-nums ${
                                diferencia > 0
                                  ? "text-[var(--color-verde)]"
                                  : diferencia < 0
                                    ? "text-[var(--color-rojo)]"
                                    : "text-[var(--color-humo)]"
                              }`}
                            >
                              {diferencia > 0 ? `+${diferencia}` : diferencia}
                            </span>
                            <span className="mt-1 block text-xs text-[var(--color-humo)]">
                              quedaron {mv.existencia_despues}
                            </span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </Tarjeta>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
