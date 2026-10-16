import { inventarioTianguis } from "@/lib/tianguis";
import { InventarioTianguis } from "@/components/InventarioTianguis";
import { TituloPagina, Vacio } from "@/components/ui";
import { IconoTianguis } from "@/components/iconos";
import { exigirEntrada } from "@/lib/acceso";

export const dynamic = "force-dynamic";

export default async function PaginaInventarioTianguis() {
  await exigirEntrada();
  const modelos = inventarioTianguis();
  const piezas = modelos.reduce((s, m) => s + m.en_tianguis, 0);

  return (
    <div className="space-y-4">
      <TituloPagina
        titulo="Inventario del tianguis"
        descripcion={
          modelos.length > 0
            ? `${piezas} ${piezas === 1 ? "pieza" : "piezas"} de ${modelos.length} ${
                modelos.length === 1 ? "modelo" : "modelos"
              }. Toca una prenda para venderla.`
            : undefined
        }
      />

      {modelos.length === 0 ? (
        <Vacio
          icono={<IconoTianguis tamano={24} />}
          titulo="Todavia no hay nada en el tianguis"
          descripcion="Aqui aparece todo lo que se mande al tianguis desde bodega o desde la tienda, en cuanto se registre la salida."
        />
      ) : (
        <InventarioTianguis modelos={modelos} />
      )}
    </div>
  );
}
