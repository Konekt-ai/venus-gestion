import Link from "next/link";
import { buscarModelos, listarRemisiones, resumen } from "@/lib/consultas";
import { ArmadorEnvio, type ModeloElegible } from "@/components/ArmadorEnvio";
import { Insignia, Tarjeta, TituloPagina } from "@/components/ui";
import { IconoRegresar, IconoTianguis, IconoTienda } from "@/components/iconos";
import type { Destino } from "@/lib/tipos";

export const dynamic = "force-dynamic";

type Params = Promise<{ [k: string]: string | string[] | undefined }>;

const PESTANAS = [
  { clave: "tienda", texto: "Sacar a tienda", Icono: IconoTienda },
  { clave: "tianguis", texto: "Sacar a tianguis", Icono: IconoTianguis },
  { clave: "regreso-tianguis", texto: "Regreso de tianguis", Icono: IconoRegresar },
  { clave: "regreso-tienda", texto: "Regreso de tienda", Icono: IconoRegresar },
] as const;

type Clave = (typeof PESTANAS)[number]["clave"];

function interpretar(clave: string): { clase: "envio" | "retorno"; destino: Destino } {
  switch (clave as Clave) {
    case "tianguis":
      return { clase: "envio", destino: "TIANGUIS" };
    case "regreso-tianguis":
      return { clase: "retorno", destino: "TIANGUIS" };
    case "regreso-tienda":
      return { clase: "retorno", destino: "TIENDA" };
    default:
      return { clase: "envio", destino: "TIENDA" };
  }
}

export default async function PaginaSalidas({ searchParams }: { searchParams: Params }) {
  const sp = await searchParams;
  const clave = (typeof sp.modo === "string" ? sp.modo : "tienda") as Clave;
  const modo = interpretar(clave);

  const modelos: ModeloElegible[] = buscarModelos({ limite: 2000 }).map((m) => ({
    id: m.id,
    codigo: m.codigo,
    codigo_norm: m.codigo_norm,
    numero: m.numero,
    descripcion: m.descripcion,
    existencia: m.existencia,
    en_tienda: m.en_tienda,
    en_tianguis: m.en_tianguis,
    ubicacion_codigo: m.ubicacion_codigo,
  }));

  const datos = resumen();
  const remisiones = listarRemisiones(5);

  return (
    <div className="space-y-5">
      <TituloPagina
        titulo="Salidas y regresos"
        descripcion="Registra lo que sale de bodega y lo que vuelve. Al confirmar se genera una hoja con folio para firmar."
      />

      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <Tarjeta className="!p-3 text-center">
          <p className="etiqueta !mb-0">En tienda</p>
          <p className="titulo text-3xl tabular-nums">{datos.piezas_tienda}</p>
        </Tarjeta>
        <Tarjeta className="!p-3 text-center">
          <p className="etiqueta !mb-0">En tianguis</p>
          <p className="titulo text-3xl tabular-nums">{datos.piezas_tianguis}</p>
        </Tarjeta>
      </div>

      <div className="flex flex-wrap gap-2">
        {PESTANAS.map(({ clave: c, texto, Icono }) => {
          const activa = c === clave;
          return (
            <Link
              key={c}
              href={`/salidas?modo=${c}`}
              className={`inline-flex items-center gap-2 rounded-sm border px-3.5 py-2 text-sm font-semibold transition-colors ${
                activa
                  ? "border-[var(--color-vino)] bg-[var(--color-vino-palido)] text-[var(--color-vino)]"
                  : "border-[var(--color-linea-fuerte)] bg-[var(--color-papel)] text-[var(--color-humo)] hover:border-[var(--color-oro)] hover:text-[var(--color-tinta)]"
              }`}
            >
              <Icono tamano={17} />
              {texto}
            </Link>
          );
        })}
      </div>

      <ArmadorEnvio
        key={clave}
        modelos={modelos}
        modo={{ clase: modo.clase, destino: modo.destino }}
      />

      {remisiones.length > 0 && (
        <section>
          <h2 className="titulo mb-3 text-xl">Ultimas hojas</h2>
          <Tarjeta className="!p-0">
            <ul className="divide-y divide-[var(--color-linea)]">
              {remisiones.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/remisiones/${r.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-[var(--color-oro-tenue)]"
                  >
                    <span className="min-w-0">
                      <span className="codigo block text-sm">{r.folio}</span>
                      <span className="block text-xs text-[var(--color-humo)]">
                        {r.fecha.slice(0, 16)}
                        {r.persona && ` · ${r.persona}`}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <Insignia tono={r.tipo === "envio" ? "vino" : "ok"}>
                        {r.tipo === "envio" ? "Salida" : "Regreso"} · {r.destino}
                      </Insignia>
                      <span className="text-sm font-semibold tabular-nums">
                        {r.total_piezas} pzas
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Tarjeta>
        </section>
      )}
    </div>
  );
}
