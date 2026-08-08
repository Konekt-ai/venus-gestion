import Link from "next/link";
import { notFound } from "next/navigation";
import { lineasDeRemision, obtenerRemision } from "@/lib/consultas";
import { BotonImprimir } from "@/components/BotonImprimir";

export const dynamic = "force-dynamic";

/**
 * Hoja de remision imprimible.
 *
 * Sustituye la hoja del cuaderno con la que comparan bodega contra
 * tienda: lleva folio, fecha, el detalle de lo que salio y espacio
 * para las dos firmas.
 */
export default async function HojaRemision({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const remision = obtenerRemision(parseInt(id, 10));

  if (!remision) notFound();

  const lineas = lineasDeRemision(remision.id);
  const esEnvio = remision.tipo === "envio";
  const destino = remision.destino === "TIENDA" ? "TIENDA" : "TIANGUIS";

  return (
    <div className="space-y-5">
      <div className="no-imprimir flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/salidas"
          className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-suave)] hover:text-[var(--color-texto)]"
        >
          ← Volver a salidas
        </Link>
        <BotonImprimir texto="🖨️ Imprimir hoja" />
      </div>

      <div className="hoja rounded-xl border border-[var(--color-borde)] bg-white p-6 sm:p-8">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold">VENUS</h1>
            <p className="text-sm text-slate-600">Control de bodega</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              {esEnvio ? "Salida de bodega" : "Regreso a bodega"}
            </p>
            <p className="codigo text-2xl">{remision.folio}</p>
            <p className="text-sm text-slate-600">{remision.fecha.slice(0, 16)}</p>
          </div>
        </header>

        <div className="grid gap-4 border-b border-slate-300 py-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {esEnvio ? "Destino" : "Viene de"}
            </p>
            <p className="text-base font-bold">{destino}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {esEnvio ? "Lo lleva" : "Lo entrega"}
            </p>
            <p className="text-base font-bold">{remision.persona || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Total de piezas
            </p>
            <p className="text-base font-bold">{remision.total_piezas}</p>
          </div>
        </div>

        <table className="mt-4 w-full text-left text-sm">
          <thead className="border-b border-slate-400 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="py-2 font-semibold">#</th>
              <th className="py-2 font-semibold">Codigo</th>
              <th className="py-2 font-semibold">Descripcion</th>
              <th className="py-2 text-right font-semibold">Piezas</th>
              <th className="py-2 text-right font-semibold">Quedaron</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {lineas.map((l, i) => (
              <tr key={l.id}>
                <td className="py-2 text-slate-400">{i + 1}</td>
                <td className="codigo py-2">{l.modelo_codigo}</td>
                <td className="py-2">{l.modelo_descripcion}</td>
                <td className="py-2 text-right text-base font-bold">{l.cantidad}</td>
                <td className="py-2 text-right text-slate-500">{l.existencia_despues}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-slate-800">
            <tr>
              <td colSpan={3} className="py-3 text-right font-bold uppercase">
                Total
              </td>
              <td className="py-3 text-right text-lg font-bold">{remision.total_piezas}</td>
              <td />
            </tr>
          </tfoot>
        </table>

        {remision.nota && (
          <p className="mt-4 border-l-4 border-slate-300 pl-3 text-sm text-slate-600">
            <strong>Nota:</strong> {remision.nota}
          </p>
        )}

        <div className="mt-12 grid gap-8 sm:grid-cols-2">
          <div className="border-t border-slate-400 pt-2 text-center text-sm text-slate-600">
            Entrega (bodega)
          </div>
          <div className="border-t border-slate-400 pt-2 text-center text-sm text-slate-600">
            Recibe ({destino.toLowerCase()})
          </div>
        </div>
      </div>
    </div>
  );
}
