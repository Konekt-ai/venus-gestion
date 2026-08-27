"use client";

import { useActionState } from "react";
import { entrar } from "@/acciones/acceso";
import { Logo } from "@/components/Logo";
import { Aviso, Boton } from "@/components/ui";

/**
 * Pantalla de entrada.
 *
 * Solo aparece cuando el negocio puso contrasena. Se ve una vez por
 * telefono: despues queda recordada tres meses.
 */
export function Portada({ logo }: { logo: string | null }) {
  const [estado, accion, pendiente] = useActionState(entrar, null);

  return (
    <main className="capitone flex min-h-dvh flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo archivo={logo} />
        </div>

        <form
          action={accion}
          className="space-y-4 rounded-sm border border-[var(--color-linea)] bg-[var(--color-papel)] p-6"
        >
          <div>
            <h1 className="titulo text-xl">Sistema de bodega</h1>
            <p className="mt-1 text-sm leading-relaxed text-[var(--color-humo)]">
              Escribe la contrasena del negocio. Solo se pide una vez en cada
              telefono o computadora.
            </p>
          </div>

          {estado && !estado.ok && <Aviso tipo="error">{estado.error}</Aviso>}

          <div>
            <label htmlFor="clave" className="etiqueta">
              Contrasena
            </label>
            <input
              id="clave"
              name="clave"
              type="password"
              autoComplete="current-password"
              autoFocus
              required
              className="campo !py-3.5 !text-base"
            />
          </div>

          <Boton type="submit" disabled={pendiente} className="w-full !py-3.5 !text-base">
            {pendiente ? "Entrando..." : "Entrar"}
          </Boton>

          <p className="text-center text-xs leading-relaxed text-[var(--color-humo)]">
            Si no la sabes, preguntale a quien lleva la bodega.
          </p>
        </form>
      </div>
    </main>
  );
}
