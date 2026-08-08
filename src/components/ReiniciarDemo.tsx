"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reiniciarDemo } from "@/acciones/demo";
import { Aviso, Boton, Tarjeta } from "@/components/ui";

/**
 * Deja la demostracion en su estado inicial.
 * Solo se muestra en la demostracion; en la bodega no existe.
 */
export function ReiniciarDemo() {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [enviando, iniciar] = useTransition();

  function reiniciar() {
    iniciar(async () => {
      const r = await reiniciarDemo();
      setMensaje(
        r.ok
          ? { tipo: "ok", texto: r.mensaje ?? "Listo." }
          : { tipo: "error", texto: r.error }
      );
      setConfirmando(false);
      if (r.ok) router.refresh();
    });
  }

  return (
    <Tarjeta className="space-y-3">
      <div>
        <h2 className="titulo text-lg">Reiniciar la demostracion</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-humo)]">
          Borra lo que se haya capturado aqui y vuelve a dejar los modelos de ejemplo, como
          recien abierta. Util para volver a ensenarla desde el principio.
        </p>
      </div>

      {mensaje && <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>}

      <div className="flex flex-col gap-2 sm:flex-row">
        {confirmando ? (
          <>
            <Boton onClick={reiniciar} disabled={enviando} className="w-full sm:w-auto">
              {enviando ? "Reiniciando..." : "Si, dejarla como nueva"}
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
            Reiniciar demostracion
          </Boton>
        )}
      </div>
    </Tarjeta>
  );
}
