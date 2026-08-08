"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { eliminarUbicacion } from "@/acciones/ubicaciones";
import { Aviso, Boton } from "@/components/ui";
import type { Ubicacion } from "@/lib/tipos";

/** Eliminar una ubicacion, avisando antes que pasara con lo que tiene dentro. */
export function AccionesUbicacion({
  ubicacion,
  totalModelos,
}: {
  ubicacion: Ubicacion;
  totalModelos: number;
}) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, iniciar] = useTransition();
  const [error, setError] = useState("");

  function eliminar() {
    iniciar(async () => {
      const r = await eliminarUbicacion(ubicacion.id);
      if (r.ok) router.push("/ubicaciones");
      else setError(r.error);
    });
  }

  return (
    <div className="no-imprimir rounded-xl border border-[var(--color-borde)] bg-white p-4">
      <h2 className="text-base font-bold">Eliminar esta ubicacion</h2>
      <p className="mt-1 text-sm text-[var(--color-suave)]">
        {totalModelos > 0 ? (
          <>
            Los <strong>{totalModelos}</strong>{" "}
            {totalModelos === 1 ? "modelo que esta" : "modelos que estan"} aqui no se borran:
            quedan como <strong>sin ubicacion</strong> para que los reacomodes.
          </>
        ) : (
          "El lugar esta vacio, se puede quitar sin afectar nada."
        )}
      </p>

      {error && (
        <div className="mt-3">
          <Aviso tipo="error">{error}</Aviso>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {confirmando ? (
          <>
            <Boton variante="peligro" onClick={eliminar} disabled={enviando}>
              {enviando ? "Eliminando..." : `Si, eliminar ${ubicacion.codigo}`}
            </Boton>
            <Boton variante="secundario" onClick={() => setConfirmando(false)}>
              Mejor no
            </Boton>
          </>
        ) : (
          <Boton variante="secundario" onClick={() => setConfirmando(true)}>
            Eliminar ubicacion
          </Boton>
        )}
      </div>
    </div>
  );
}
