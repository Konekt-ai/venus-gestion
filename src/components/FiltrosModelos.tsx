"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { UbicacionConTotales } from "@/lib/consultas";

/**
 * Filtros de la lista de modelos.
 * Se guardan en la direccion (?existencia=sin) para que una busqueda
 * util se pueda dejar en favoritos o mandar por mensaje.
 */
export function FiltrosModelos({
  ubicaciones,
  prefijos,
}: {
  ubicaciones: UbicacionConTotales[];
  prefijos: { prefijo: string; total: number; nombre?: string }[];
}) {
  const router = useRouter();
  const parametros = useSearchParams();

  function cambiar(clave: string, valor: string) {
    const p = new URLSearchParams(parametros.toString());
    if (valor) p.set(clave, valor);
    else p.delete(clave);
    // 'sinubicacion' y 'ubicacion' se contradicen: al usar uno se limpia el otro.
    if (clave === "ubicacion" && valor) p.delete("sinubicacion");
    router.replace(`/modelos?${p.toString()}`);
  }

  const hayFiltros = ["existencia", "ubicacion", "prefijo", "sinubicacion", "orden"].some((c) =>
    parametros.get(c)
  );

  // shrink-0: dentro de la tira ningun select debe encogerse, o un nombre
  // de linea largo aplasta a los demas.
  const claseSelect =
    "campo !w-auto min-w-0 shrink-0 cursor-pointer !py-3 !pl-3 !pr-8 sm:!py-2 sm:!text-sm";

  return (
    // En celular los filtros son una tira que se desliza de lado: apilados
    // ocupaban tres renglones antes de ver el primer modelo.
    <div className="no-imprimir -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:items-center sm:overflow-visible sm:px-0 sm:pb-0">
      <select
        aria-label="Filtrar por existencia"
        value={parametros.get("existencia") ?? ""}
        onChange={(e) => cambiar("existencia", e.target.value)}
        className={claseSelect}
      >
        <option value="">Todas las existencias</option>
        <option value="con">Solo lo que hay</option>
        <option value="bajo">Por acabarse</option>
        <option value="sin">Agotados</option>
      </select>

      {ubicaciones.length > 0 && (
        <select
          aria-label="Filtrar por ubicacion"
          value={
            parametros.get("sinubicacion") === "1" ? "SIN" : (parametros.get("ubicacion") ?? "")
          }
          onChange={(e) => {
            if (e.target.value === "SIN") {
              const p = new URLSearchParams(parametros.toString());
              p.delete("ubicacion");
              p.set("sinubicacion", "1");
              router.replace(`/modelos?${p.toString()}`);
            } else {
              const p = new URLSearchParams(parametros.toString());
              p.delete("sinubicacion");
              if (e.target.value) p.set("ubicacion", e.target.value);
              else p.delete("ubicacion");
              router.replace(`/modelos?${p.toString()}`);
            }
          }}
          className={claseSelect}
        >
          <option value="">Toda la bodega</option>
          <option value="SIN">Sin ubicacion</option>
          {ubicaciones.map((u) => (
            <option key={u.id} value={u.id}>
              {u.codigo} ({u.total_modelos})
            </option>
          ))}
        </select>
      )}

      {prefijos.length > 1 && (
        <select
          aria-label="Filtrar por linea"
          value={parametros.get("prefijo") ?? ""}
          onChange={(e) => cambiar("prefijo", e.target.value)}
          className={claseSelect}
        >
          <option value="">Todas las lineas</option>
          {prefijos.map((p) => (
            <option key={p.prefijo || "sin"} value={p.prefijo}>
              {p.prefijo || "Sin letras"}
              {p.nombre ? ` — ${p.nombre}` : ""} ({p.total})
            </option>
          ))}
        </select>
      )}

      <select
        aria-label="Ordenar"
        value={parametros.get("orden") ?? ""}
        onChange={(e) => cambiar("orden", e.target.value)}
        className={claseSelect}
      >
        <option value="">Ordenar por codigo</option>
        <option value="ubicacion">Por ubicacion</option>
        <option value="existencia">Mas piezas primero</option>
        <option value="reciente">Modificados al final</option>
      </select>

      {hayFiltros && (
        <button
          type="button"
          onClick={() => {
            const q = parametros.get("q");
            router.replace(q ? `/modelos?q=${encodeURIComponent(q)}` : "/modelos");
          }}
          className="shrink-0 rounded-sm px-3 py-3 text-sm font-semibold text-[var(--color-vino)] hover:bg-[var(--color-crema)] sm:py-2"
        >
          Quitar filtros
        </button>
      )}
    </div>
  );
}
