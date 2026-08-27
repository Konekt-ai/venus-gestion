"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { abrirSinContrasena, cambiarContrasena, salir } from "@/acciones/acceso";
import { Aviso, Boton, Insignia, Tarjeta } from "@/components/ui";
import { IconoCandado } from "@/components/iconos";

/**
 * Contrasena de entrada al sistema.
 *
 * Es una sola para todo el negocio y es opcional: mientras no se ponga,
 * el sistema abre directo. Se prende aqui el dia que quieran, sin tocar
 * nada del inventario.
 */
export function CandadoAcceso({ puesta }: { puesta: boolean }) {
  const router = useRouter();
  const [estado, accion, guardando] = useActionState(cambiarContrasena, null);
  const [abriendo, setAbriendo] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [trabajando, iniciar] = useTransition();

  function quitar() {
    if (!confirm("El sistema va a quedar abierto: cualquiera que este en el mismo WiFi va a poder entrar sin escribir nada. Continuar?")) return;
    iniciar(async () => {
      const r = await abrirSinContrasena();
      setMensaje(r.ok ? { tipo: "ok", texto: r.mensaje ?? "Listo." } : { tipo: "error", texto: r.error });
      setAbriendo(false);
      router.refresh();
    });
  }

  function cerrar() {
    iniciar(async () => {
      await salir();
      router.refresh();
    });
  }

  return (
    <Tarjeta className="space-y-4">
      <div>
        <h2 className="titulo flex items-center gap-2 text-lg">
          <span className="text-[var(--color-oro)]">
            <IconoCandado tamano={19} />
          </span>
          Contrasena para entrar
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-humo)]">
          El sistema se abre desde los celulares del mismo WiFi. Si esa red la comparten con la
          tienda o con clientes, conviene poner contrasena: sin ella, quien sepa la direccion
          puede entrar y mover el inventario.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Insignia tono={puesta ? "ok" : "neutro"}>
          {puesta ? "Con contrasena" : "Sin contrasena"}
        </Insignia>
        <span className="text-xs text-[var(--color-humo)]">
          {puesta
            ? "Cada telefono la escribe una vez y la recuerda tres meses."
            : "Ahora mismo el sistema abre directo."}
        </span>
      </div>

      {mensaje && <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>}

      {(!puesta && !abriendo) ? (
        <Boton variante="secundario" type="button" onClick={() => setAbriendo(true)}>
          Poner una contrasena
        </Boton>
      ) : (
        <form action={accion} className="space-y-3 border-t border-[var(--color-linea)] pt-4">
          {estado && !estado.ok && <Aviso tipo="error">{estado.error}</Aviso>}
          {estado && estado.ok && <Aviso tipo="ok">{estado.mensaje}</Aviso>}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="nueva" className="etiqueta">
                {puesta ? "Contrasena nueva" : "Contrasena"}
              </label>
              <input
                id="nueva"
                name="nueva"
                type="password"
                autoComplete="new-password"
                minLength={4}
                required
                className="campo"
              />
            </div>
            <div>
              <label htmlFor="repetida" className="etiqueta">
                Escribela otra vez
              </label>
              <input
                id="repetida"
                name="repetida"
                type="password"
                autoComplete="new-password"
                minLength={4}
                required
                className="campo"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Boton type="submit" disabled={guardando}>
              {guardando ? "Guardando..." : puesta ? "Cambiar contrasena" : "Guardar contrasena"}
            </Boton>
            {!puesta && (
              <Boton variante="secundario" type="button" onClick={() => setAbriendo(false)}>
                Cancelar
              </Boton>
            )}
          </div>

          <p className="text-xs leading-relaxed text-[var(--color-humo)]">
            Apuntala en un lugar seguro. Si se pierde no hay forma de recuperarla, se tiene que
            poner otra desde esta computadora.
          </p>
        </form>
      )}

      {puesta && (
        <div className="flex flex-wrap gap-2 border-t border-[var(--color-linea)] pt-4">
          <Boton variante="secundario" type="button" onClick={cerrar} disabled={trabajando}>
            Cerrar sesion aqui
          </Boton>
          <Boton variante="peligro" type="button" onClick={quitar} disabled={trabajando}>
            Quitar la contrasena
          </Boton>
        </div>
      )}
    </Tarjeta>
  );
}
