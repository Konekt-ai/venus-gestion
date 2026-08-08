"use client";

import { Boton } from "@/components/ui";

/** Abre el dialogo de impresion del navegador. */
export function BotonImprimir({ texto = "🖨️ Imprimir" }: { texto?: string }) {
  return (
    <Boton type="button" onClick={() => window.print()} className="no-imprimir">
      {texto}
    </Boton>
  );
}
