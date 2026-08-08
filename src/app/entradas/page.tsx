import Link from "next/link";
import { buscarModelos } from "@/lib/consultas";
import { ArmadorEnvio, type ModeloElegible } from "@/components/ArmadorEnvio";
import { Tarjeta, TituloPagina } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function PaginaEntradas() {
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

  return (
    <div className="space-y-5">
      <TituloPagina
        titulo="Llego mercancia"
        descripcion="Suma a la bodega las piezas que acaban de entrar."
      />

      {modelos.length === 0 ? (
        <Tarjeta>
          <p className="text-sm">
            Todavia no hay modelos en el catalogo.{" "}
            <Link href="/modelos/nuevo" className="font-semibold text-[var(--color-marca-700)]">
              Da de alta el primero
            </Link>{" "}
            y despues podras registrar entradas.
          </p>
        </Tarjeta>
      ) : (
        <ArmadorEnvio modelos={modelos} modo={{ clase: "entrada" }} />
      )}

      <Tarjeta>
        <h2 className="text-base font-bold">¿Y si el modelo es nuevo?</h2>
        <p className="mt-1 text-sm text-[var(--color-suave)]">
          Si la prenda que llego todavia no existe en el sistema,{" "}
          <Link href="/modelos/nuevo" className="font-semibold text-[var(--color-marca-700)]">
            dala de alta aqui
          </Link>{" "}
          capturando de una vez las piezas que llegaron.
        </p>
      </Tarjeta>
    </div>
  );
}
