import Link from "next/link";
import { movimientosRecientes } from "@/lib/consultas";
import { Insignia, Tarjeta, TituloPagina, Vacio } from "@/components/ui";
import { NOMBRE_MOVIMIENTO, TIPOS_MOVIMIENTO, type TipoMovimiento } from "@/lib/tipos";

export const dynamic = "force-dynamic";

type Params = Promise<{ [k: string]: string | string[] | undefined }>;

const TONO_POR_TIPO: Record<TipoMovimiento, "ok" | "marca" | "neutro"> = {
  entrada: "ok",
  retorno_tienda: "ok",
  retorno_tianguis: "ok",
  salida_tienda: "marca",
  salida_tianguis: "marca",
  ajuste: "neutro",
  conteo: "neutro",
};

export default async function PaginaMovimientos({ searchParams }: { searchParams: Params }) {
  const sp = await searchParams;
  const filtro = typeof sp.tipo === "string" ? sp.tipo : "";

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

      <div className="flex flex-wrap gap-2">
        <Link
          href="/movimientos"
          className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${
            !filtro
              ? "border-[var(--color-marca-700)] bg-[var(--color-marca-50)] text-[var(--color-marca-700)]"
              : "border-[var(--color-borde)] bg-white"
          }`}
        >
          Todo
        </Link>
        {TIPOS_MOVIMIENTO.map((t) => (
          <Link
            key={t}
            href={`/movimientos?tipo=${t}`}
            className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${
              filtro === t
                ? "border-[var(--color-marca-700)] bg-[var(--color-marca-50)] text-[var(--color-marca-700)]"
                : "border-[var(--color-borde)] bg-white"
            }`}
          >
            {NOMBRE_MOVIMIENTO[t]}
          </Link>
        ))}
      </div>

      {movimientos.length === 0 ? (
        <Vacio
          icono="🕘"
          titulo="No hay movimientos todavia"
          descripcion="Cuando registres entradas o salidas apareceran aqui."
        />
      ) : (
        <div className="space-y-5">
          {[...porDia.entries()].map(([dia, delDia]) => (
            <section key={dia}>
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--color-suave)]">
                {dia}
              </h2>
              <Tarjeta className="!p-0">
                <ul className="divide-y divide-[var(--color-borde)]">
                  {delDia.map((mv) => {
                    const diferencia = mv.existencia_despues - mv.existencia_antes;
                    return (
                      <li key={mv.id}>
                        <Link
                          href={`/modelos/${mv.modelo_id}`}
                          className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-slate-50"
                        >
                          <span className="min-w-0">
                            <span className="codigo block text-sm">{mv.modelo_codigo}</span>
                            <span className="block truncate text-xs text-[var(--color-suave)]">
                              {mv.modelo_descripcion}
                            </span>
                            <span className="mt-1 flex flex-wrap items-center gap-1.5">
                              <Insignia tono={TONO_POR_TIPO[mv.tipo] ?? "neutro"}>
                                {NOMBRE_MOVIMIENTO[mv.tipo] ?? mv.tipo}
                              </Insignia>
                              <span className="text-xs text-[var(--color-suave)]">
                                {mv.fecha.slice(11, 16)}
                                {mv.persona && ` · ${mv.persona}`}
                              </span>
                            </span>
                          </span>
                          <span className="shrink-0 text-right">
                            <span
                              className={`block text-base font-bold ${
                                diferencia > 0
                                  ? "text-[var(--color-ok-700)]"
                                  : diferencia < 0
                                    ? "text-[var(--color-alto-700)]"
                                    : "text-[var(--color-suave)]"
                              }`}
                            >
                              {diferencia > 0 ? `+${diferencia}` : diferencia}
                            </span>
                            <span className="block text-xs text-[var(--color-suave)]">
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
