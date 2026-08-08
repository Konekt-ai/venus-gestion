import Link from "next/link";
import {
  buscarModelos,
  conteoAbierto,
  lineasDeConteo,
  listarConteos,
} from "@/lib/consultas";
import { PanelConteo } from "@/components/PanelConteo";
import { IniciarConteo } from "@/components/IniciarConteo";
import { Insignia, Tarjeta, TituloPagina, Vacio } from "@/components/ui";
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
          <h2 className="text-base font-bold">¿Como funciona?</h2>
          <ol className="ml-5 list-decimal space-y-1.5 text-sm text-[var(--color-suave)]">
            <li>Inicias el conteo y recorres la bodega con el celular.</li>
            <li>Por cada modelo escribes el codigo y cuantas piezas ves.</li>
            <li>Nada cambia mientras cuentas: puedes dejarlo a medias y seguir despues.</li>
            <li>Al cerrarlo, el sistema ajusta solo los modelos que no cuadraron.</li>
          </ol>
        </Tarjeta>

        <IniciarConteo />

        {historial.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-bold">Conteos anteriores</h2>
            <Tarjeta className="!p-0">
              <ul className="divide-y divide-[var(--color-borde)]">
                {historial.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{c.nombre}</span>
                      <span className="block text-xs text-[var(--color-suave)]">
                        Cerrado el {c.cerrado_en?.slice(0, 16)}
                      </span>
                    </span>
                    <Insignia tono="ok">Cerrado</Insignia>
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
  }));

  if (modelos.length === 0) {
    return (
      <Vacio
        icono="👗"
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

      <p className="text-center text-sm text-[var(--color-suave)]">
        <Link href="/modelos?orden=ubicacion" className="font-semibold hover:underline">
          Ver la lista ordenada por ubicacion
        </Link>{" "}
        para recorrer la bodega en orden.
      </p>
    </div>
  );
}
