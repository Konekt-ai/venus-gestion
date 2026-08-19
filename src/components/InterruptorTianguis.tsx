"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cambiarUsoTianguis } from "@/acciones/personal";
import { Aviso, Insignia, Tarjeta } from "@/components/ui";
import { IconoTianguis } from "@/components/iconos";

/**
 * Prende o apaga el tianguis en todo el sistema.
 *
 * El cliente empezo solo con bodega y tienda; el dia que ponga puesto en
 * el tianguis lo prende aqui y aparecen sus pantallas. Apagarlo nunca
 * borra nada, por eso se puede probar sin miedo.
 */
export function InterruptorTianguis({ encendido }: { encendido: boolean }) {
  const router = useRouter();
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [cambiando, iniciar] = useTransition();

  function alternar() {
    iniciar(async () => {
      const r = await cambiarUsoTianguis(!encendido);
      if (r.ok) {
        setMensaje({ tipo: "ok", texto: r.mensaje ?? "Listo." });
        router.refresh();
      } else {
        setMensaje({ tipo: "error", texto: r.error });
      }
    });
  }

  return (
    <Tarjeta className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="titulo flex items-center gap-2 text-lg">
            <span className="text-[var(--color-oro)]">
              <IconoTianguis tamano={19} />
            </span>
            Tianguis
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-humo)]">
            Si el negocio pone puesto en el tianguis, prendelo: aparece como un lugar mas al que
            se puede mandar mercancia, aparte de la tienda, y se lleva su propia cuenta de lo que
            esta alla.
          </p>
        </div>

        {/* Un interruptor de verdad, no una casilla: se ve desde lejos si
            esta prendido y el area de toque cabe en el pulgar. */}
        <button
          type="button"
          role="switch"
          aria-checked={encendido}
          aria-label={encendido ? "Apagar el tianguis" : "Prender el tianguis"}
          onClick={alternar}
          disabled={cambiando}
          className="toque flex shrink-0 items-center justify-center disabled:opacity-50"
        >
          <span
            className={`flex h-7 w-12 items-center rounded-full p-1 transition-colors ${
              encendido ? "bg-[var(--color-vino)]" : "bg-[var(--color-linea-fuerte)]"
            }`}
          >
            <span
              className={`h-5 w-5 rounded-full bg-white transition-transform ${
                encendido ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Insignia tono={encendido ? "ok" : "neutro"}>
          {encendido ? "Encendido" : "Apagado"}
        </Insignia>
        <span className="text-xs text-[var(--color-humo)]">
          {cambiando ? "Guardando..." : "Se aplica en todo el sistema."}
        </span>
      </div>

      {mensaje && <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>}

      <p className="border-l-2 border-[var(--color-linea-fuerte)] bg-[var(--color-crema)] px-3 py-2 text-xs leading-relaxed text-[var(--color-humo)]">
        Apagarlo solo lo oculta. Lo que ya se haya mandado al tianguis no se borra: sigue en el
        historial y vuelve a verse tal cual en cuanto lo prendas otra vez.
      </p>
    </Tarjeta>
  );
}
