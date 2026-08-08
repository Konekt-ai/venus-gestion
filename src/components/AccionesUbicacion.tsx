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
    <div className="no-imprimir rounded-sm border border-[var(--color-linea)] bg-[var(--color-papel)] p-4">
      <h2 className="titulo text-lg">Eliminar esta ubicacion</h2>
      <p className="mt-1 text-sm text-[var(--color-humo)]">
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

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        {confirmando ? (
          <>
            <Boton
              variante="peligro"
              onClick={eliminar}
              disabled={enviando}
              className="w-full !py-3 sm:w-auto"
            >
              {enviando ? "Eliminando..." : `Si, eliminar ${ubicacion.codigo}`}
            </Boton>
            <Boton
              variante="secundario"
              onClick={() => setConfirmando(false)}
              className="w-full sm:w-auto"
            >
              Mejor no
            </Boton>
          </>
        ) : (
          <Boton
            variante="secundario"
            onClick={() => setConfirmando(true)}
            className="w-full sm:w-auto"
          >
            Eliminar ubicacion
          </Boton>
        )}
      </div>
    </div>
  );
}
