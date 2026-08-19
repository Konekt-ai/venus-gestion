import {
  buscarModelos,
  conteoAbierto,
  lineasDeConteo,
  listarConteos,
} from "@/lib/consultas";
import { PanelConteo } from "@/components/PanelConteo";
import { IniciarConteo } from "@/components/IniciarConteo";
import { BotonEnlace, Insignia, Tarjeta, TituloPagina, Vacio } from "@/components/ui";
import { IconoPrenda, IconoUbicacion } from "@/components/iconos";
import type { ModeloElegible } from "@/components/ArmadorEnvio";

export const dynamic = "force-dynamic";

export default function PaginaConteo() {
  const abierto = conteoAbierto();
  const historial = listarConteos(10).filter((c) => c.estado === "cerrado");

  if (!abierto) {
    return (
      <div className="space-y-5">
        <TituloPagina
          titulo="Conteo de bodega"
          descripcion="Revisa rack por rack y deja el sistema igual a lo que hay fisicamente."
        />

        <Tarjeta className="space-y-3">
          <h2 className="titulo text-lg">¿Como funciona?</h2>
          <ol className="ml-5 list-decimal space-y-1.5 text-sm leading-relaxed text-[var(--color-humo)] marker:text-[var(--color-oro)]">
            <li>Inicias el conteo y recorres la bodega con el celular.</li>
            <li>Por cada modelo escribes el codigo y cuantas piezas ves.</li>
            <li>Nada cambia mientras cuentas: puedes dejarlo a medias y seguir despues.</li>
            <li>Al cerrarlo, el sistema ajusta solo los modelos que no cuadraron.</li>
          </ol>
        </Tarjeta>

        <IniciarConteo />

        {historial.length > 0 && (
          <section>
            <h2 className="titulo mb-3 text-xl">Conteos anteriores</h2>
            <Tarjeta className="!p-0">
              <ul className="divide-y divide-[var(--color-linea)]">
                {historial.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{c.nombre}</span>
                      <span className="block text-xs text-[var(--color-humo)]">
                        Cerrado el {c.cerrado_en?.slice(0, 16)}
                      </span>
                    </span>
                    <span className="shrink-0">
                      <Insignia tono="ok">Cerrado</Insignia>
                    </span>
                  </li>
                ))}
              </ul>
            </Tarjeta>
          </section>
        )}
      </div>
    );
  }

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

  if (modelos.length === 0) {
    return (
      <Vacio
        icono={<IconoPrenda tamano={24} />}
        titulo="No hay modelos que contar"
        descripcion="Da de alta el catalogo antes de hacer un conteo."
      />
    );
  }

  const lineas = lineasDeConteo(abierto.id);

  return (
    <div className="space-y-5">
      <TituloPagina
        titulo={abierto.nombre}
        descripcion={`Conteo abierto desde el ${abierto.iniciado_en.slice(0, 16)}. Puedes salir y volver: lo capturado se guarda.`}
      />

      <PanelConteo conteoId={abierto.id} modelos={modelos} lineas={lineas} />

      {/* Envueltos juntos para que el space-y de la pagina no separe el
          boton de su explicacion. */}
      <div>
        <div className="flex justify-center">
          <BotonEnlace
            href="/modelos?orden=ubicacion"
            variante="secundario"
            className="w-full justify-center sm:w-auto"
          >
            <IconoUbicacion tamano={16} />
            Ver la lista por ubicacion
          </BotonEnlace>
        </div>
        <p className="mt-2 text-center text-xs text-[var(--color-humo)]">
          Para recorrer la bodega en orden.
        </p>
      </div>
    </div>
  );
}
