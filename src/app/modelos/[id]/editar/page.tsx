import { notFound } from "next/navigation";
import { listarCatalogo, listarUbicaciones, obtenerModelo } from "@/lib/consultas";
import { FormularioModelo } from "@/components/FormularioModelo";
import { ArchivarModelo } from "@/components/ArchivarModelo";
import { TituloPagina } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function EditarModelo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const modelo = obtenerModelo(parseInt(id, 10));

  if (!modelo) notFound();

  return (
    <div className="space-y-6">
      <TituloPagina
        titulo={`Editar ${modelo.codigo}`}
        descripcion="Para cambiar las piezas que hay, usa los botones de la ficha: asi queda registrado el movimiento."
      />

      <FormularioModelo
        modelo={modelo}
        ubicaciones={listarUbicaciones()}
        catalogos={{
          tallas: listarCatalogo("talla"),
          colores: listarCatalogo("color"),
          telas: listarCatalogo("tela"),
          categorias: listarCatalogo("categoria"),
        }}
      />

      <ArchivarModelo modeloId={modelo.id} codigo={modelo.codigo} />
    </div>
  );
}
