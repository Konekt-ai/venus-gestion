"use client";

import { Boton } from "@/components/ui";
import { IconoImprimir } from "@/components/iconos";

/** Abre el dialogo de impresion del navegador. */
export function BotonImprimir({ texto = "Imprimir" }: { texto?: string }) {
  return (
    <Boton type="button" onClick={() => window.print()} className="no-imprimir">
      <IconoImprimir tamano={16} />
      {texto}
    </Boton>
  );
}
