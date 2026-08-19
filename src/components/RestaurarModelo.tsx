"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { restaurarModelo } from "@/acciones/modelos";
import { Boton } from "@/components/ui";

/**
 * Devuelve al catalogo un modelo que se habia dado de baja.
 *
 * Dar de baja no borra nada, pero sin esto el modelo desaparecia de
 * todas las busquedas y no habia forma de recuperarlo desde el sistema:
 * una baja por equivocacion no tenia vuelta atras.
 */
export function RestaurarModelo({ modeloId, codigo }: { modeloId: number; codigo: string }) {
  const router = useRouter();
  const [enviando, iniciar] = useTransition();
  const [error, setError] = useState("");

  function restaurar() {
    iniciar(async () => {
      const r = await restaurarModelo(modeloId);
      if (r.ok) router.refresh();
      else setError(r.error);
    });
  }

  return (
    <span className="flex flex-col items-end gap-1">
      <Boton
        variante="secundario"
        onClick={restaurar}
        disabled={enviando}
        aria-label={`Regresar ${codigo} al catalogo`}
        className="!px-3 !py-2 !text-xs"
      >
        {enviando ? "Regresando..." : "Regresar al catalogo"}
      </Boton>
      {error && <span className="text-xs text-[var(--color-rojo)]">{error}</span>}
    </span>
  );
}
