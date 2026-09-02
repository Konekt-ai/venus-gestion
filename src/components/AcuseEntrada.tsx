"use client";

import Link from "next/link";
import { BotonEtiquetas } from "@/components/BotonEtiquetas";
import { Aviso, Boton, Tarjeta } from "@/components/ui";
import type { EntradaRegistrada } from "@/acciones/movimientos";

/**
 * Lo que se ve justo despues de registrar produccion nueva.
 *
 * El cliente lo pidio asi: registrar la entrada y etiquetarla tienen
 * que ser practicamente un solo movimiento. Por eso la pantalla no se
 * va a ningun lado al confirmar; se queda aqui, con un renglon por
 * prenda y su boton de imprimir con la cantidad que acaba de entrar ya
 * puesta. Dos toques y las etiquetas estan saliendo.
 */
export function AcuseEntrada({
  entrada,
  hayImpresora,
  tope,
  alRegistrarOtra,
}: {
  entrada: EntradaRegistrada;
  hayImpresora: boolean;
  tope: number;
  alRegistrarOtra: () => void;
}) {
  const todas = entrada.lineas
    .map((l) => `${l.modeloId}x${l.cantidad}`)
    .join(",");

  return (
    <div className="space-y-4">
      <Aviso tipo="ok">
        {entrada.piezas === 1
          ? "Entro 1 pieza."
          : `Entraron ${entrada.piezas} piezas`}
        {entrada.lineas.length > 1 && ` de ${entrada.lineas.length} modelos`}.
      </Aviso>

      <Tarjeta className="space-y-3">
        <div>
          <h2 className="titulo text-lg">Etiquetar lo que acaba de entrar</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-humo)]">
            La cantidad ya viene puesta con las piezas que registraste. Puedes
            cambiarla antes de imprimir.
          </p>
        </div>

        <div className="space-y-3">
          {entrada.lineas.map((l) => (
            <div
              key={l.modeloId}
              className="flex flex-col gap-2.5 border-t border-[var(--color-linea)] pt-3 first:border-t-0 first:pt-0 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0">
                <Link
                  href={`/modelos/${l.modeloId}`}
                  className="codigo text-base hover:underline"
                >
                  {l.codigo}
                </Link>
                <div className="truncate text-sm text-[var(--color-humo)]">
                  {l.descripcion}
                </div>
                <div className="mt-0.5 text-xs text-[var(--color-humo)]">
                  Entraron {l.cantidad}
                  {/* El "despues" viene de la accion, no del modelo que
                      tenia la pantalla: ese traia el valor de antes. */}
                  {" · "}quedan {l.despues} en bodega
                </div>
              </div>

              <div className="shrink-0 sm:w-auto">
                <BotonEtiquetas
                  modeloId={l.modeloId}
                  codigo={l.codigo}
                  cantidadInicial={l.cantidad}
                  hayImpresora={hayImpresora}
                  tope={tope}
                />
              </div>
            </div>
          ))}
        </div>

        {entrada.lineas.length > 1 && (
          <Link
            href={`/modelos/etiquetas?ids=${todas}`}
            className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--color-humo)] underline underline-offset-2 hover:text-[var(--color-tinta)]"
          >
            Imprimir todas en hoja
          </Link>
        )}
      </Tarjeta>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Boton type="button" onClick={alRegistrarOtra} className="w-full sm:w-auto">
          Registrar otra entrada
        </Boton>
        <Link
          href="/modelos?orden=reciente"
          className="inline-flex min-h-11 w-full items-center justify-center rounded-sm border border-[var(--color-linea-fuerte)] bg-[var(--color-papel)] px-4 text-sm font-semibold hover:border-[var(--color-oro)] sm:w-auto"
        >
          Ver los modelos
        </Link>
      </div>
    </div>
  );
}
