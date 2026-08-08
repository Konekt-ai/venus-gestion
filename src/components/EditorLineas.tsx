"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { guardarLinea } from "@/acciones/lineas";
import { Aviso, Tarjeta } from "@/components/ui";

/**
 * Ponerle nombre a cada linea de codigos.
 *
 * Se listan los prefijos que ya aparecen en el catalogo, para no tener
 * que adivinarlos: solo hay que escribir a que corresponden.
 */
export function EditorLineas({
  prefijos,
  nombres,
}: {
  prefijos: { prefijo: string; total: number }[];
  nombres: Record<string, string>;
}) {
  const router = useRouter();
  const [borradores, setBorradores] = useState<Record<string, string>>(nombres);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [guardando, iniciar] = useTransition();

  const conLetras = prefijos.filter((p) => p.prefijo);

  function guardar(prefijo: string) {
    iniciar(async () => {
      const r = await guardarLinea(prefijo, borradores[prefijo] ?? "");
      if (r.ok) {
        setMensaje({ tipo: "ok", texto: r.mensaje ?? "Guardado." });
        router.refresh();
      } else {
        setMensaje({ tipo: "error", texto: r.error });
      }
    });
  }

  if (conLetras.length === 0) return null;

  return (
    <Tarjeta className="space-y-3">
      <div>
        <h2 className="titulo text-lg">¿Que significa cada codigo?</h2>
        <p className="mt-1 text-sm text-[var(--color-humo)]">
          Las letras del codigo dicen de que linea es la prenda. Ponles nombre y apareceran en el
          catalogo: asi cualquiera entiende que <span className="codigo">VN 178</span> es un
          vestido de Nelly.
        </p>
      </div>

      {mensaje && <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>}

      <ul className="space-y-2">
        {conLetras.map((p) => (
          <li key={p.prefijo} className="flex flex-wrap items-center gap-2">
            <span className="codigo w-14 shrink-0 rounded-md bg-[var(--color-crema)] px-2 py-1.5 text-center">
              {p.prefijo}
            </span>
            {/* En el telefono el nombre se escribe en su propio renglon: compartiendo
                el renglon con el prefijo y la cuenta se quedaba en 180px de ancho. */}
            <input
              value={borradores[p.prefijo] ?? ""}
              onChange={(e) =>
                setBorradores((prev) => ({ ...prev, [p.prefijo]: e.target.value }))
              }
              onBlur={() => {
                if ((borradores[p.prefijo] ?? "") !== (nombres[p.prefijo] ?? "")) {
                  guardar(p.prefijo);
                }
              }}
              placeholder={`¿Que es ${p.prefijo}?`}
              aria-label={`Nombre de la linea ${p.prefijo}`}
              disabled={guardando}
              autoComplete="off"
              className="campo !w-auto min-w-0 order-last basis-full !py-3 sm:order-none sm:basis-auto sm:flex-1 sm:!py-1.5"
            />
            <span className="ml-auto shrink-0 text-xs text-[var(--color-humo)] sm:ml-0">
              {p.total} {p.total === 1 ? "modelo" : "modelos"}
            </span>
          </li>
        ))}
      </ul>
    </Tarjeta>
  );
}
