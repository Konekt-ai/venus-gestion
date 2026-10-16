"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelarVentaTianguis } from "@/acciones/tianguis";

/**
 * Cancela una venta registrada por error. Pide confirmar con un segundo
 * toque, porque el boton queda al alcance del pulgar en una lista larga.
 */
export function CancelarVentaTianguis({ ventaId }: { ventaId: number }) {
  const router = useRouter();
  const [seguro, setSeguro] = useState(false);
  const [error, setError] = useState("");
  const [enviando, iniciar] = useTransition();

  if (!seguro) {
    return (
      <button
        type="button"
        onClick={() => setSeguro(true)}
        className="inline-flex min-h-11 items-center px-1 text-xs font-semibold text-[var(--color-humo)] underline underline-offset-2"
      >
        Cancelar
      </button>
    );
  }

  return (
    <span className="flex flex-col items-end gap-1">
      <span className="flex gap-1">
        <button
          type="button"
          disabled={enviando}
          onClick={() =>
            iniciar(async () => {
              const r = await cancelarVentaTianguis(ventaId);
              if (r.ok) router.refresh();
              else setError(r.error);
            })
          }
          className="inline-flex min-h-11 items-center rounded-sm bg-[var(--color-rojo)] px-3 text-xs font-semibold text-white"
        >
          {enviando ? "..." : "Si, cancelar"}
        </button>
        <button
          type="button"
          onClick={() => setSeguro(false)}
          className="inline-flex min-h-11 items-center px-2 text-xs font-semibold text-[var(--color-humo)]"
        >
          No
        </button>
      </span>
      {error && <span className="text-xs text-[var(--color-rojo)]">{error}</span>}
    </span>
  );
}
