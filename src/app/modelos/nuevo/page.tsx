import { listarCatalogo, listarUbicaciones } from "@/lib/consultas";
import { FormularioModelo } from "@/components/FormularioModelo";
import { TituloPagina } from "@/components/ui";
import { exigirEntrada } from "@/lib/acceso";
import { hayTablaPrecios } from "@/lib/precios";

export const dynamic = "force-dynamic";

type Params = Promise<{ [k: string]: string | string[] | undefined }>;

export default async function NuevoModelo({ searchParams }: { searchParams: Params }) {
  await exigirEntrada();
  const sp = await searchParams;
  const codigoSugerido = typeof sp.codigo === "string" ? sp.codigo : "";

  return (
    <div>
      <TituloPagina
        titulo="Nuevo modelo"
        descripcion="Registra una prenda para poder buscarla y saber donde esta."
      />
      <FormularioModelo
        hayPrecios={hayTablaPrecios()}
        ubicaciones={listarUbicaciones()}
        codigoSugerido={codigoSugerido}
        catalogos={{
          tallas: listarCatalogo("talla"),
          colores: listarCatalogo("color"),
          telas: listarCatalogo("tela"),
          categorias: listarCatalogo("categoria"),
        }}
      />
    </div>
  );
}
