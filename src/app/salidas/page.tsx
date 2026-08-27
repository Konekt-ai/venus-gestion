import Link from "next/link";
import { buscarModelos, listarRemisiones, resumen } from "@/lib/consultas";
import { usaTianguis } from "@/lib/ajustes";
import { ArmadorEnvio, type ModeloElegible } from "@/components/ArmadorEnvio";
import { Insignia, Tarjeta, TituloPagina } from "@/components/ui";
import { IconoRegresar, IconoTianguis, IconoTienda } from "@/components/iconos";
import type { Destino } from "@/lib/tipos";
import { exigirEntrada } from "@/lib/acceso";

export const dynamic = "force-dynamic";

type Params = Promise<{ [k: string]: string | string[] | undefined }>;

// La marca "esTianguis" es lo unico que decide si la pestana se ofrece: el
// dia que el cliente prenda el tianguis, las cuatro vuelven solas.
const PESTANAS = [
  { clave: "tienda", texto: "Sacar a tienda", Icono: IconoTienda, esTianguis: false },
  { clave: "tianguis", texto: "Sacar a tianguis", Icono: IconoTianguis, esTianguis: true },
  {
    clave: "regreso-tianguis",
    texto: "Regreso de tianguis",
    Icono: IconoRegresar,
    esTianguis: true,
  },
  { clave: "regreso-tienda", texto: "Regreso de tienda", Icono: IconoRegresar, esTianguis: false },
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
  await exigirEntrada();
  const sp = await searchParams;
  const conTianguis = usaTianguis();
  const pestanas = PESTANAS.filter((p) => conTianguis || !p.esTianguis);

  // Un enlace guardado al tianguis (o el boton de atras) no debe dejar
  // armando un envio que ya no se puede ver en ningun lado: cae a tienda.
  const pedida = (typeof sp.modo === "string" ? sp.modo : "tienda") as Clave;
  const clave: Clave = pestanas.some((p) => p.clave === pedida) ? pedida : "tienda";
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
    foto: m.foto,
  }));

  const datos = resumen();
  const remisiones = listarRemisiones(5);

  return (
    <div className="space-y-5">
      <TituloPagina
        titulo="Salidas y regresos"
        descripcion="Registra lo que sale de bodega y lo que vuelve. Al confirmar se genera una hoja con folio para firmar."
      />

      <div
        className={`grid gap-3 ${conTianguis ? "grid-cols-2 sm:max-w-md" : "sm:max-w-[13rem]"}`}
      >
        <Tarjeta className="!p-3 text-center">
          <p className="etiqueta !mb-0">En tienda</p>
          <p className="titulo text-3xl tabular-nums">{datos.piezas_tienda}</p>
        </Tarjeta>
        {conTianguis && (
          <Tarjeta className="!p-3 text-center">
            <p className="etiqueta !mb-0">En tianguis</p>
            <p className="titulo text-3xl tabular-nums">{datos.piezas_tianguis}</p>
          </Tarjeta>
        )}
      </div>

      {/* Dos y dos en el celular: sueltas se acomodan en tres renglones
          desparejos y empujan el buscador fuera de la primera pantalla. */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {pestanas.map(({ clave: c, texto, Icono }) => {
          const activa = c === clave;
          return (
            <Link
              key={c}
              href={`/salidas?modo=${c}`}
              className={`flex min-h-14 items-center justify-center gap-2 rounded-sm border px-3 py-2 text-center text-sm leading-tight font-semibold transition-colors sm:min-h-0 sm:justify-start sm:px-3.5 ${
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
                    className="flex flex-col gap-1.5 px-4 py-3 transition-colors hover:bg-[var(--color-oro-tenue)] sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                  >
                    <span className="min-w-0">
                      <span className="codigo block text-sm">{r.folio}</span>
                      <span className="block truncate text-xs text-[var(--color-humo)]">
                        {r.fecha.slice(0, 16)}
                        {r.persona && ` · ${r.persona}`}
                      </span>
                    </span>
                    <span className="flex flex-wrap items-center gap-2 sm:shrink-0">
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
