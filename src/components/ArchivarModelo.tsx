"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { archivarModelo } from "@/acciones/modelos";
import { Aviso, Boton } from "@/components/ui";

/**
 * Dar de baja un modelo.
 * Pide confirmacion escribiendo el codigo, porque es la unica accion
 * de la pantalla que quita cosas de la vista.
 */
export function ArchivarModelo({ modeloId, codigo }: { modeloId: number; codigo: string }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, iniciar] = useTransition();
  const [error, setError] = useState("");

  function archivar() {
    iniciar(async () => {
      const r = await archivarModelo(modeloId);
      if (r.ok) router.push("/modelos");
      else setError(r.error);
    });
  }

  return (
    <div className="rounded-xl border border-[var(--color-alto-100)] bg-[var(--color-alto-50)] p-4">
      <h2 className="text-base font-bold text-[var(--color-alto-700)]">
        Dar de baja este modelo
      </h2>
      <p className="mt-1 text-sm text-[var(--color-alto-700)]">
        Deja de aparecer en las busquedas, pero se conserva su historial por si hay que
        consultarlo despues.
      </p>

      {error && (
        <div className="mt-3">
          <Aviso tipo="error">{error}</Aviso>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {confirmando ? (
          <>
            <Boton variante="peligro" onClick={archivar} disabled={enviando}>
              {enviando ? "Dando de baja..." : `Si, dar de baja ${codigo}`}
            </Boton>
            <Boton variante="secundario" onClick={() => setConfirmando(false)}>
              Mejor no
            </Boton>
          </>
        ) : (
          <Boton variante="secundario" onClick={() => setConfirmando(true)}>
            Dar de baja
          </Boton>
        )}
      </div>
    </div>
  );
}
