import { buscarModelos } from "@/lib/consultas";
import { ArmadorEnvio, type ModeloElegible } from "@/components/ArmadorEnvio";
import { BotonEnlace, Tarjeta, TituloPagina, Vacio } from "@/components/ui";
import { IconoMas, IconoPrenda } from "@/components/iconos";

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
    foto: m.foto,
  }));

  return (
    <div className="space-y-5">
      <TituloPagina
        titulo="Llego mercancia"
        descripcion="Suma a la bodega las piezas que acaban de entrar."
      />

      {modelos.length === 0 ? (
        <Vacio
          icono={<IconoPrenda tamano={24} />}
          titulo="Todavia no hay modelos"
          descripcion="Da de alta el primero y despues podras registrar entradas."
          accion={
            <BotonEnlace href="/modelos/nuevo" className="w-full sm:w-auto">
              <IconoMas tamano={16} />
              Dar de alta el primero
            </BotonEnlace>
          }
        />
      ) : (
        <ArmadorEnvio modelos={modelos} modo={{ clase: "entrada" }} />
      )}

      <Tarjeta>
        <h2 className="titulo text-lg">¿Y si el modelo es nuevo?</h2>
        <p className="mt-1 text-sm text-[var(--color-humo)]">
          Si la prenda que llego todavia no existe en el sistema, dala de alta capturando de una
          vez las piezas que llegaron.
        </p>
        {/* Antes era un enlace dentro del parrafo: es el unico camino al
            alta y con el dedo no habia donde atinarle. */}
        <BotonEnlace href="/modelos/nuevo" variante="secundario" className="mt-4 w-full sm:w-auto">
          <IconoMas tamano={16} />
          Dar de alta un modelo nuevo
        </BotonEnlace>
      </Tarjeta>
    </div>
  );
}
