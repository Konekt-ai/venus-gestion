import { listarPersonal } from "@/lib/consultas";
import { inventarioTianguis } from "@/lib/tianguis";
import { CierreTianguis } from "@/components/CierreTianguis";
import { TituloPagina, Vacio } from "@/components/ui";
import { IconoRegresar } from "@/components/iconos";
import { exigirEntrada } from "@/lib/acceso";

export const dynamic = "force-dynamic";

export default async function PaginaCierreTianguis() {
  await exigirEntrada();
  const modelos = inventarioTianguis();

  return (
    <div className="space-y-4">
      <TituloPagina
        titulo="Registrar salida"
        descripcion="Al terminar el dia: todo lo que no se vendio regresa a bodega. Busca las prendas que vayan a otro lado y cambialas antes de registrar."
      />

      {modelos.length === 0 ? (
        <Vacio
          icono={<IconoRegresar tamano={24} />}
          titulo="No queda nada en el tianguis"
          descripcion="Cuando haya prendas en el tianguis, aqui se registra a donde se van al final del dia."
        />
      ) : (
        <CierreTianguis modelos={modelos} personal={listarPersonal()} />
      )}
    </div>
  );
}
