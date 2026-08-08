"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { iniciarConteo } from "@/acciones/conteos";
import { Aviso, Boton, Tarjeta } from "@/components/ui";
import { IconoConteo } from "@/components/iconos";

/** Arranca un conteo nuevo, con un nombre para distinguirlo despues. */
export function IniciarConteo() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");
  const [enviando, iniciar] = useTransition();

  function empezar(e: React.FormEvent) {
    e.preventDefault();
    iniciar(async () => {
      const r = await iniciarConteo(nombre);
      if (r.ok) router.refresh();
      else setError(r.error);
    });
  }

  return (
    <Tarjeta className="space-y-3">
      {error && <Aviso tipo="error">{error}</Aviso>}

      <form onSubmit={empezar} className="space-y-3">
        <div>
          <label htmlFor="nombre-conteo" className="etiqueta">
            Nombre del conteo (opcional)
          </label>
          <input
            id="nombre-conteo"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Conteo de fin de mes"
            autoComplete="off"
            className="campo"
          />
        </div>
        <Boton type="submit" disabled={enviando} className="w-full !py-3.5 !text-base sm:w-auto">
          <IconoConteo tamano={18} />
          {enviando ? "Iniciando..." : "Empezar a contar"}
        </Boton>
      </form>
    </Tarjeta>
  );
}
