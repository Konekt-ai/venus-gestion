"use client";

import { useState } from "react";
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
  hayPrecios = false,
}: {
  ubicaciones: UbicacionConTotales[];
  prefijos: { prefijo: string; total: number; nombre?: string }[];
  /** Sin la caja instalada no hay precios que filtrar. */
  hayPrecios?: boolean;
}) {
  const router = useRouter();
  const parametros = useSearchParams();

  // ?precio=sin son los que no tienen precio; ?precio=650 los que
  // cuestan eso. "Precio exacto" solo abre el campo: el filtro se aplica
  // hasta que se escribe la cantidad y se da Enter.
  const precioActual = parametros.get("precio") ?? "";
  const [modoPrecio, setModoPrecio] = useState(
    precioActual === "sin" ? "sin" : precioActual ? "exacto" : ""
  );

  function cambiar(clave: string, valor: string) {
    const p = new URLSearchParams(parametros.toString());
    if (valor) p.set(clave, valor);
    else p.delete(clave);
    // 'sinubicacion' y 'ubicacion' se contradicen: al usar uno se limpia el otro.
    if (clave === "ubicacion" && valor) p.delete("sinubicacion");
    router.replace(`/modelos?${p.toString()}`);
  }

  // "vista" no entra: es como se ve la lista, no un filtro. Si entrara,
  // el boton aparecería solo por haber cambiado a cuadricula.
  const hayFiltros = [
    "existencia",
    "ubicacion",
    "prefijo",
    "sinubicacion",
    "orden",
    "categoria",
    "destacado",
    "precio",
  ].some((c) => parametros.get(c));

  // shrink-0: dentro de la tira ningun select debe encogerse, o un nombre
  // de linea largo aplasta a los demas.
  const claseSelect =
    "campo !w-auto min-w-0 shrink-0 cursor-pointer !py-3 !pl-3 !pr-8 sm:!py-2 sm:!text-sm";

  return (
    // En celular los filtros son una tira que se desliza de lado: apilados
    // ocupaban tres renglones antes de ver el primer modelo.
    <div className="desliza-h no-imprimir -mx-4 flex gap-2 px-4 pb-1 sm:mx-0 sm:flex-wrap sm:items-center sm:overflow-visible sm:px-0 sm:pb-0">
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

      {hayPrecios && (
        <select
          aria-label="Filtrar por precio"
          value={modoPrecio}
          onChange={(e) => {
            const modo = e.target.value;
            setModoPrecio(modo);
            if (modo === "sin") cambiar("precio", "sin");
            // Al elegir "Precio exacto" todavia no hay cantidad: se espera
            // a que la escriban. Si estaba "Sin precio", se quita, porque
            // seguiria filtrando mientras escriben y no es lo que se ve.
            else if (modo === "" || precioActual === "sin") cambiar("precio", "");
          }}
          className={claseSelect}
        >
          <option value="">Todos los precios</option>
          <option value="sin">Sin precio</option>
          <option value="exacto">Precio exacto...</option>
        </select>
      )}

      {hayPrecios && modoPrecio === "exacto" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const escrito = String(new FormData(e.currentTarget).get("precio") ?? "")
              .replace(/[$\s,]/g, "")
              .trim();
            cambiar("precio", escrito);
          }}
          className="flex shrink-0 items-center gap-1.5"
        >
          {/* key: si cambia el precio de la direccion, el campo se rehace
              con el valor nuevo en vez de quedarse con el viejo. */}
          <input
            key={precioActual}
            name="precio"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            autoFocus={!precioActual}
            defaultValue={precioActual === "sin" ? "" : precioActual}
            placeholder="$ 650"
            aria-label="Precio exacto"
            className="campo !w-28 sm:!py-2 sm:!text-sm"
          />
          <button
            type="submit"
            className="shrink-0 rounded-sm border border-[var(--color-linea-fuerte)] bg-[var(--color-papel)] px-3 py-3 text-sm font-semibold hover:border-[var(--color-oro)] sm:py-2"
          >
            Ver
          </button>
        </form>
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
            // Se conservan la busqueda y la vista: quitar filtros no
            // deberia devolver a lista a quien estaba en la cuadricula.
            const queda = new URLSearchParams();
            for (const clave of ["q", "vista"]) {
              const v = parametros.get(clave);
              if (v) queda.set(clave, v);
            }
            const cadena = queda.toString();
            setModoPrecio("");
            router.replace(cadena ? `/modelos?${cadena}` : "/modelos");
          }}
          className="shrink-0 rounded-sm px-3 py-3 text-sm font-semibold text-[var(--color-vino)] hover:bg-[var(--color-crema)] sm:py-2"
        >
          Quitar filtros
        </button>
      )}
    </div>
  );
}
