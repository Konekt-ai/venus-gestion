"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { guardarModelo } from "@/acciones/modelos";
import { formatearCodigo } from "@/lib/codigos";
import { Aviso, Boton, Tarjeta } from "@/components/ui";
import type { ModeloConUbicacion } from "@/lib/tipos";
import type { UbicacionConTotales } from "@/lib/consultas";

/**
 * Alta y edicion de un modelo.
 *
 * Al dar de alta se puede capturar la existencia inicial; al editar no,
 * porque cambiar existencias siempre debe pasar por un movimiento para
 * que quede el rastro de quien y por que.
 */
export function FormularioModelo({
  modelo,
  ubicaciones,
  catalogos,
  codigoSugerido = "",
}: {
  modelo?: ModeloConUbicacion;
  ubicaciones: UbicacionConTotales[];
  catalogos: { tallas: string[]; colores: string[]; telas: string[]; categorias: string[] };
  codigoSugerido?: string;
}) {
  const router = useRouter();
  const [estado, accion, pendiente] = useActionState(guardarModelo, null);
  const editando = Boolean(modelo);

  const [codigo, setCodigo] = useState(modelo?.codigo ?? codigoSugerido);

  useEffect(() => {
    if (estado?.ok && estado.datos) {
      router.push(`/modelos/${estado.datos}`);
    }
  }, [estado, router]);

  return (
    <form action={accion} className="space-y-4">
      {modelo && <input type="hidden" name="id" value={modelo.id} />}

      {estado && !estado.ok && <Aviso tipo="error">{estado.error}</Aviso>}

      <Tarjeta className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="codigo" className="etiqueta">
              Codigo del modelo *
            </label>
            <input
              id="codigo"
              name="codigo"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="VD 194"
              required
              autoComplete="off"
              className="campo codigo !text-lg"
            />
            <p className="mt-1 text-xs text-[var(--color-suave)]">
              Como viene en la etiqueta. Se guardara como{" "}
              <strong>{formatearCodigo(codigo) || "—"}</strong> y se podra buscar escrito de
              cualquier forma.
            </p>
          </div>

          <div>
            <label htmlFor="categoria" className="etiqueta">
              Tipo de prenda
            </label>
            <input
              id="categoria"
              name="categoria"
              list="lista-categorias"
              defaultValue={modelo?.categoria ?? ""}
              placeholder="VESTIDO"
              autoComplete="off"
              className="campo"
            />
            <datalist id="lista-categorias">
              {catalogos.categorias.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
        </div>

        <div>
          <label htmlFor="descripcion" className="etiqueta">
            Descripcion *
          </label>
          <input
            id="descripcion"
            name="descripcion"
            defaultValue={modelo?.descripcion ?? ""}
            placeholder="VESTIDO MIDI OLANES"
            required
            autoComplete="off"
            className="campo"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="tallas" className="etiqueta">
              Tallas
            </label>
            <input
              id="tallas"
              name="tallas"
              list="lista-tallas"
              defaultValue={modelo?.tallas ?? ""}
              placeholder="GDE - XL - 2XL"
              autoComplete="off"
              className="campo"
            />
            <datalist id="lista-tallas">
              {catalogos.tallas.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>

          <div>
            <label htmlFor="colores" className="etiqueta">
              Colores
            </label>
            <input
              id="colores"
              name="colores"
              list="lista-colores"
              defaultValue={modelo?.colores ?? ""}
              placeholder="VARIADO"
              autoComplete="off"
              className="campo"
            />
            <datalist id="lista-colores">
              {catalogos.colores.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <div>
            <label htmlFor="tela" className="etiqueta">
              Tela
            </label>
            <input
              id="tela"
              name="tela"
              list="lista-telas"
              defaultValue={modelo?.tela ?? ""}
              placeholder="POWER SATEN"
              autoComplete="off"
              className="campo"
            />
            <datalist id="lista-telas">
              {catalogos.telas.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
        </div>
      </Tarjeta>

      <Tarjeta className="space-y-4">
        <h2 className="text-base font-bold">Ubicacion y existencia</h2>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label htmlFor="ubicacion_id" className="etiqueta">
              ¿En que lugar de la bodega esta?
            </label>
            <select
              id="ubicacion_id"
              name="ubicacion_id"
              defaultValue={modelo?.ubicacion_id ?? ""}
              className="campo cursor-pointer"
            >
              <option value="">Sin asignar todavia</option>
              {ubicaciones.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.codigo}
                  {u.descripcion ? ` — ${u.descripcion}` : ""}
                </option>
              ))}
            </select>
            {ubicaciones.length === 0 && (
              <p className="mt-1 text-xs text-[var(--color-suave)]">
                Todavia no hay ubicaciones.{" "}
                <Link href="/ubicaciones" className="font-semibold text-[var(--color-marca-700)]">
                  Crear las de la bodega
                </Link>
              </p>
            )}
          </div>

          {!editando && (
            <div>
              <label htmlFor="existencia" className="etiqueta">
                Piezas que hay ahora
              </label>
              <input
                id="existencia"
                name="existencia"
                type="number"
                min={0}
                defaultValue={0}
                inputMode="numeric"
                className="campo sin-flechas !text-lg"
              />
            </div>
          )}

          <div>
            <label htmlFor="minimo" className="etiqueta">
              Avisar cuando baje de
            </label>
            <input
              id="minimo"
              name="minimo"
              type="number"
              min={0}
              defaultValue={modelo?.minimo ?? 0}
              inputMode="numeric"
              className="campo sin-flechas"
            />
            <p className="mt-1 text-xs text-[var(--color-suave)]">0 = no avisar</p>
          </div>
        </div>

        <div>
          <label htmlFor="notas" className="etiqueta">
            Notas
          </label>
          <textarea
            id="notas"
            name="notas"
            rows={2}
            defaultValue={modelo?.notas ?? ""}
            placeholder="Cualquier detalle que convenga recordar"
            className="campo resize-y"
          />
        </div>

        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            name="destacado"
            defaultChecked={Boolean(modelo?.destacado)}
            className="h-5 w-5 accent-[var(--color-marca-700)]"
          />
          <span className="text-sm font-medium">
            Marcar como uno de los mas vendidos
          </span>
        </label>
      </Tarjeta>

      <div className="flex flex-wrap gap-2">
        <Boton type="submit" disabled={pendiente}>
          {pendiente ? "Guardando..." : editando ? "Guardar cambios" : "Dar de alta"}
        </Boton>
        <Link
          href={modelo ? `/modelos/${modelo.id}` : "/modelos"}
          className="inline-flex items-center justify-center rounded-lg border border-[var(--color-borde)] bg-white px-4 py-2.5 text-sm font-semibold"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
