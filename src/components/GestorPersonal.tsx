"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cambiarEstadoPersona, guardarPersona } from "@/acciones/personal";
import { Aviso, Boton, Tarjeta, Vacio } from "@/components/ui";
import { IconoEditar, IconoEtiqueta, IconoMas } from "@/components/iconos";
import type { Persona } from "@/lib/tipos";

/**
 * La lista de quienes trabajan en el negocio.
 *
 * Dar de baja no borra a nadie: los movimientos que ya firmo conservan
 * su nombre, asi que quien se va solo deja de aparecer entre los nombres
 * que se pueden escoger, y puede regresar cuando haga falta.
 */

// Los de siempre en una boutique. No obligan a nada: el puesto se
// escribe libre y estos solo se ofrecen como atajo al capturar.
const PUESTOS = ["Bodega", "Vendedora", "Encargada", "Chofer"];

type Mensaje = { tipo: "ok" | "error"; texto: string };

export function GestorPersonal({ personal }: { personal: Persona[] }) {
  const router = useRouter();
  // null = nadie en el formulario, 0 = dando de alta, >0 = editando a esa persona.
  const [enFormulario, setEnFormulario] = useState<number | null>(null);
  const [confirmando, setConfirmando] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);
  const [cambiando, iniciar] = useTransition();

  const activos = personal.filter((p) => p.activo === 1);
  const bajas = personal.filter((p) => p.activo !== 1);
  const editando = enFormulario ? personal.find((p) => p.id === enFormulario) : undefined;

  function cambiarEstado(persona: Persona, activo: boolean) {
    iniciar(async () => {
      const r = await cambiarEstadoPersona(persona.id, activo);
      setConfirmando(null);
      if (r.ok) {
        setMensaje({
          tipo: "ok",
          texto: activo
            ? `${persona.nombre} vuelve a la lista.`
            : `${persona.nombre} quedo dado de baja. Lo que firmo sigue en el historial.`,
        });
        router.refresh();
      } else {
        setMensaje({ tipo: "error", texto: r.error });
      }
    });
  }

  return (
    <div className="space-y-4">
      {mensaje && <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>}

      {enFormulario !== null ? (
        // La llave obliga a volver a montar el formulario al pasar de una
        // persona a otra: sin ella se quedarian los datos de la anterior.
        <FormularioPersona
          key={enFormulario}
          persona={editando}
          alTerminar={(texto) => {
            setEnFormulario(null);
            if (texto) setMensaje({ tipo: "ok", texto });
            router.refresh();
          }}
          alCancelar={() => setEnFormulario(null)}
        />
      ) : (
        personal.length > 0 && (
          <Boton
            onClick={() => {
              setMensaje(null);
              setEnFormulario(0);
            }}
            className="w-full !py-3 sm:w-auto"
          >
            <IconoMas tamano={17} />
            Agregar a alguien
          </Boton>
        )
      )}

      {personal.length === 0 && enFormulario === null && (
        <Vacio
          icono={<IconoEtiqueta tamano={24} />}
          titulo="Todavia no hay nadie en la lista"
          descripcion="Anota a quienes trabajan en el negocio. Despues, al sacar o recibir mercancia, se escoge el nombre de la lista en vez de escribirlo cada vez."
          accion={
            <Boton onClick={() => setEnFormulario(0)} className="!py-3">
              <IconoMas tamano={17} />
              Agregar al primero
            </Boton>
          }
        />
      )}

      {activos.length > 0 && (
        <Tarjeta className="!p-0">
          <ul className="divide-y divide-[var(--color-linea)]">
            {activos.map((persona) => (
              <li
                key={persona.id}
                className="flex flex-wrap items-center gap-2 px-3 py-2 sm:px-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.95rem] leading-tight font-semibold">
                    {persona.nombre}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-[var(--color-humo)]">
                    {persona.puesto || "Sin puesto"}
                  </p>
                </div>

                {confirmando === persona.id ? (
                  // En el telefono la pregunta se baja a su propio renglon:
                  // compartiendolo con el nombre, los dos botones quedaban
                  // demasiado juntos para el dedo.
                  <div className="flex w-full items-center justify-end gap-1 sm:w-auto">
                    <button
                      type="button"
                      onClick={() => cambiarEstado(persona, false)}
                      disabled={cambiando}
                      className="toque rounded-sm px-3 text-xs font-semibold text-[var(--color-rojo)] disabled:opacity-50"
                    >
                      Si, dar de baja
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmando(null)}
                      className="toque rounded-sm px-3 text-xs font-semibold text-[var(--color-humo)]"
                    >
                      Mejor no
                    </button>
                  </div>
                ) : (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      aria-label={`Editar a ${persona.nombre}`}
                      onClick={() => {
                        setMensaje(null);
                        setEnFormulario(persona.id);
                      }}
                      className="toque flex items-center justify-center rounded-sm text-[var(--color-humo)] transition-colors hover:bg-[var(--color-crema)] hover:text-[var(--color-tinta)]"
                    >
                      <IconoEditar tamano={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmando(persona.id)}
                      className="toque rounded-sm px-2 text-xs font-semibold text-[var(--color-humo)] transition-colors hover:text-[var(--color-rojo)]"
                    >
                      Dar de baja
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}

      {bajas.length > 0 && (
        <section>
          <h2 className="etiqueta">Dados de baja</h2>
          <Tarjeta className="!p-0">
            <ul className="divide-y divide-[var(--color-linea)]">
              {bajas.map((persona) => (
                <li
                  key={persona.id}
                  className="flex flex-wrap items-center gap-2 px-3 py-2 sm:px-4"
                >
                  <div className="min-w-0 flex-1 opacity-60">
                    <p className="truncate text-[0.95rem] leading-tight font-semibold">
                      {persona.nombre}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-[var(--color-humo)]">
                      {persona.puesto || "Sin puesto"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => cambiarEstado(persona, true)}
                    disabled={cambiando}
                    className="toque shrink-0 rounded-sm px-3 text-xs font-semibold text-[var(--color-vino)] transition-colors hover:bg-[var(--color-vino-palido)] disabled:opacity-50"
                  >
                    Reactivar
                  </button>
                </li>
              ))}
            </ul>
          </Tarjeta>
          <p className="mt-2 text-xs leading-relaxed text-[var(--color-humo)]">
            Nadie se borra: los movimientos que ya firmaron siguen con su nombre en el historial.
          </p>
        </section>
      )}
    </div>
  );
}

function FormularioPersona({
  persona,
  alTerminar,
  alCancelar,
}: {
  persona?: Persona;
  alTerminar: (texto?: string) => void;
  alCancelar: () => void;
}) {
  const [estado, accion, pendiente] = useActionState(guardarPersona, null);

  useEffect(() => {
    if (estado?.ok) alTerminar(estado.mensaje);
    // alTerminar se recrea en cada render del padre; seguirla aqui
    // volveria a cerrar el formulario en cuanto se reabra.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  return (
    <Tarjeta className="space-y-4">
      <h2 className="titulo text-lg">
        {persona ? `Editar a ${persona.nombre}` : "Agregar a alguien"}
      </h2>

      {estado && !estado.ok && <Aviso tipo="error">{estado.error}</Aviso>}

      <form action={accion} className="space-y-4">
        {persona && <input type="hidden" name="id" value={persona.id} />}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="nombre-persona" className="etiqueta">
              Nombre *
            </label>
            <input
              id="nombre-persona"
              name="nombre"
              defaultValue={persona?.nombre ?? ""}
              placeholder="Maria Elena"
              required
              autoComplete="off"
              className="campo"
            />
            <p className="mt-1 text-xs text-[var(--color-humo)]">
              Como le dicen en la bodega: asi se va a reconocer al firmar.
            </p>
          </div>

          <div>
            <label htmlFor="puesto-persona" className="etiqueta">
              Puesto
            </label>
            <input
              id="puesto-persona"
              name="puesto"
              list="lista-puestos"
              defaultValue={persona?.puesto ?? ""}
              placeholder="Vendedora"
              autoComplete="off"
              className="campo"
            />
            <datalist id="lista-puestos">
              {PUESTOS.map((x) => (
                <option key={x} value={x} />
              ))}
            </datalist>
            <p className="mt-1 text-xs text-[var(--color-humo)]">
              Sugerencias: {PUESTOS.join(", ")}. Puedes escribir otro.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Boton type="submit" disabled={pendiente} className="w-full !py-3 sm:w-auto">
            {pendiente ? "Guardando..." : persona ? "Guardar cambios" : "Agregar a la lista"}
          </Boton>
          <Boton
            type="button"
            variante="secundario"
            onClick={alCancelar}
            className="w-full !py-3 sm:w-auto"
          >
            Cancelar
          </Boton>
        </div>
      </form>
    </Tarjeta>
  );
}
