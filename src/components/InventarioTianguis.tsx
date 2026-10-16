"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { pesos } from "@/lib/dinero";
import { buscarEnLista } from "@/lib/busqueda";
import { FotoModelo } from "@/components/FotoModelo";
import type { ModeloParaVender } from "@/components/VenderTianguis";

/**
 * Lo que hay en el tianguis, para que quien vende sepa que trae.
 * Tocar una prenda lleva directo a venderla.
 */
export function InventarioTianguis({ modelos }: { modelos: ModeloParaVender[] }) {
  const [busqueda, setBusqueda] = useState("");
  const lista = useMemo(
    () => (busqueda.trim() ? buscarEnLista(modelos, busqueda, modelos.length) : modelos),
    [modelos, busqueda]
  );

  return (
    <div className="space-y-3">
      <input
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar: VD 194, 84, midi..."
        aria-label="Buscar en el inventario del tianguis"
        autoComplete="off"
        type="search"
        inputMode="search"
        enterKeyHint="search"
        autoCorrect="off"
        autoCapitalize="characters"
        spellCheck={false}
        className="campo !py-3"
      />

      {lista.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--color-humo)]">
          Ninguna prenda del tianguis coincide con esa busqueda.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
          {lista.map((m) => (
            <li key={m.id}>
              <Link
                href={`/tianguis?modelo=${m.id}`}
                className="block h-full overflow-hidden rounded-sm border border-[var(--color-linea)] bg-[var(--color-papel)] transition-colors hover:border-[var(--color-oro)] active:border-[var(--color-oro)]"
              >
                <div className="relative aspect-[3/4] w-full bg-[var(--color-crema)]">
                  <FotoModelo foto={m.foto || null} descripcion={m.descripcion} tamano="tarjeta" />
                  <span className="absolute right-1.5 top-1.5 rounded-sm bg-[var(--color-tinta)] px-2 py-0.5 text-sm font-bold tabular-nums text-[var(--color-marfil)]">
                    {m.en_tianguis}
                  </span>
                </div>
                <div className="p-2.5">
                  <div className="codigo text-sm">{m.codigo}</div>
                  <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-[var(--color-humo)]">
                    {m.descripcion}
                  </p>
                  {m.tallas && (
                    <p className="mt-0.5 truncate text-xs text-[var(--color-humo)]">
                      Tallas {m.tallas}
                    </p>
                  )}
                  <p className="mt-1 text-sm font-semibold tabular-nums">
                    {m.precio ? (
                      pesos(m.precio)
                    ) : (
                      <span className="text-xs text-[var(--color-ambar)]">Sin precio</span>
                    )}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
