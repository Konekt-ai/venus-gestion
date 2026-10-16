import Link from "next/link";
import { listarPersonal } from "@/lib/consultas";
import { hoy, inventarioTianguis, ventasDelDia } from "@/lib/tianguis";
import { VenderTianguis } from "@/components/VenderTianguis";
import { TituloPagina, Vacio } from "@/components/ui";
import { IconoTianguis } from "@/components/iconos";
import { exigirEntrada } from "@/lib/acceso";

export const dynamic = "force-dynamic";

type Params = Promise<{ [k: string]: string | string[] | undefined }>;

export default async function PaginaVenderTianguis({ searchParams }: { searchParams: Params }) {
  await exigirEntrada();
  const sp = await searchParams;
  const pedido = typeof sp.modelo === "string" ? parseInt(sp.modelo, 10) : NaN;

  const modelos = inventarioTianguis();
  const vendidasHoy = ventasDelDia(hoy())
    .filter((v) => v.estado === "vendida")
    .reduce((s, v) => s + v.piezas, 0);

  return (
    <div className="space-y-4">
      <TituloPagina
        titulo="Registrar venta"
        descripcion={
          vendidasHoy > 0
            ? `Hoy van ${vendidasHoy} ${vendidasHoy === 1 ? "pieza vendida" : "piezas vendidas"}.`
            : "Busca la prenda, pon cuantas y en cuanto se vendio."
        }
        accion={
          vendidasHoy > 0 ? (
            <Link
              href="/tianguis/ventas"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--color-vino)] hover:underline"
            >
              Ver las ventas de hoy
            </Link>
          ) : undefined
        }
      />

      {modelos.length === 0 ? (
        <Vacio
          icono={<IconoTianguis tamano={24} />}
          titulo="No hay nada en el tianguis"
          descripcion="Para vender, primero hay que darle salida al tianguis a las prendas desde bodega: en Salidas, o desde la ficha de cada modelo con el boton A tianguis."
        />
      ) : (
        <VenderTianguis
          modelos={modelos}
          personal={listarPersonal()}
          preseleccionado={Number.isFinite(pedido) ? pedido : null}
        />
      )}
    </div>
  );
}
