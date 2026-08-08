"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generarUbicaciones, guardarUbicacion } from "@/acciones/ubicaciones";
import { Aviso, Boton, Tarjeta } from "@/components/ui";

/**
 * Alta de ubicaciones, en dos modos:
 *  - "de golpe": genera toda una zona (racks x niveles) de una vez.
 *    Es lo que conviene la primera vez, para mapear la bodega rapido.
 *  - "una por una": para agregar un lugar suelto despues.
 */
export function GestorUbicaciones({ hayUbicaciones }: { hayUbicaciones: boolean }) {
  const router = useRouter();
  const [modo, setModo] = useState<null | "lote" | "una">(null);

  return (
    <div className="no-imprimir">
      {modo === null ? (
        <div className="flex flex-wrap gap-2">
          <Boton onClick={() => setModo("lote")}>
            {hayUbicaciones ? "➕ Crear una zona completa" : "➕ Mapear la bodega"}
          </Boton>
          <Boton variante="secundario" onClick={() => setModo("una")}>
            Agregar un lugar suelto
          </Boton>
        </div>
      ) : modo === "lote" ? (
        <FormularioLote
          alTerminar={() => {
            setModo(null);
            router.refresh();
          }}
          alCancelar={() => setModo(null)}
        />
      ) : (
        <FormularioUno
          alTerminar={() => {
            setModo(null);
            router.refresh();
          }}
          alCancelar={() => setModo(null)}
        />
      )}
    </div>
  );
}

function FormularioLote({
  alTerminar,
  alCancelar,
}: {
  alTerminar: () => void;
  alCancelar: () => void;
}) {
  const [zona, setZona] = useState("A");
  const [racks, setRacks] = useState(5);
  const [niveles, setNiveles] = useState(4);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [enviando, iniciar] = useTransition();

  const total = Math.max(0, racks) * Math.max(0, niveles);

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    iniciar(async () => {
      const r = await generarUbicaciones({
        zona,
        rackDesde: 1,
        rackHasta: racks,
        nivelDesde: 1,
        nivelHasta: niveles,
      });

      if (r.ok) alTerminar();
      else setMensaje({ tipo: "error", texto: r.error });
    });
  }

  return (
    <Tarjeta className="space-y-4">
      <div>
        <h2 className="text-base font-bold">Crear una zona completa</h2>
        <p className="mt-0.5 text-sm text-[var(--color-suave)]">
          Dile cuantos racks tiene la zona y cuantas repisas cada uno; se crean todos los lugares
          de una vez.
        </p>
      </div>

      {mensaje && <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>}

      <form onSubmit={enviar} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="zona-lote" className="etiqueta">
              Nombre de la zona
            </label>
            <input
              id="zona-lote"
              value={zona}
              onChange={(e) => setZona(e.target.value)}
              placeholder="A"
              required
              autoComplete="off"
              className="campo codigo !text-lg"
            />
          </div>
          <div>
            <label htmlFor="racks-lote" className="etiqueta">
              ¿Cuantos racks?
            </label>
            <input
              id="racks-lote"
              type="number"
              min={1}
              max={99}
              value={racks}
              onChange={(e) => setRacks(parseInt(e.target.value, 10) || 0)}
              inputMode="numeric"
              className="campo sin-flechas !text-lg"
            />
          </div>
          <div>
            <label htmlFor="niveles-lote" className="etiqueta">
              ¿Cuantas repisas cada uno?
            </label>
            <input
              id="niveles-lote"
              type="number"
              min={1}
              max={20}
              value={niveles}
              onChange={(e) => setNiveles(parseInt(e.target.value, 10) || 0)}
              inputMode="numeric"
              className="campo sin-flechas !text-lg"
            />
          </div>
        </div>

        {total > 0 && (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
            Se crearan <strong>{total}</strong> lugares, desde{" "}
            <span className="codigo">
              {zona.toUpperCase()}-01-1
            </span>{" "}
            hasta{" "}
            <span className="codigo">
              {zona.toUpperCase()}-{String(racks).padStart(2, "0")}-{niveles}
            </span>
            .
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Boton type="submit" disabled={enviando || total === 0}>
            {enviando ? "Creando..." : `Crear ${total} lugares`}
          </Boton>
          <Boton type="button" variante="secundario" onClick={alCancelar}>
            Cancelar
          </Boton>
        </div>
      </form>
    </Tarjeta>
  );
}

function FormularioUno({
  alTerminar,
  alCancelar,
}: {
  alTerminar: () => void;
  alCancelar: () => void;
}) {
  const [estado, accion, pendiente] = useActionState(guardarUbicacion, null);

  useEffect(() => {
    if (estado?.ok) alTerminar();
    // alTerminar se recrea en cada render del padre; seguirla aqui
    // volveria a cerrar el formulario en cuanto se reabra.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  return (
    <Tarjeta className="space-y-4">
      <div>
        <h2 className="text-base font-bold">Agregar un lugar</h2>
        <p className="mt-0.5 text-sm text-[var(--color-suave)]">
          Solo la zona es obligatoria. Puedes usarlo para una tarima o una mesa dejando el rack y
          la repisa vacios.
        </p>
      </div>

      {estado && !estado.ok && <Aviso tipo="error">{estado.error}</Aviso>}

      <form action={accion} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="zona-uno" className="etiqueta">
              Zona *
            </label>
            <input
              id="zona-uno"
              name="zona"
              placeholder="A"
              required
              autoComplete="off"
              className="campo codigo"
            />
          </div>
          <div>
            <label htmlFor="rack-uno" className="etiqueta">
              Rack
            </label>
            <input
              id="rack-uno"
              name="rack"
              placeholder="03"
              autoComplete="off"
              className="campo codigo"
            />
          </div>
          <div>
            <label htmlFor="nivel-uno" className="etiqueta">
              Repisa
            </label>
            <input
              id="nivel-uno"
              name="nivel"
              placeholder="2"
              autoComplete="off"
              className="campo codigo"
            />
          </div>
        </div>

        <div>
          <label htmlFor="desc-uno" className="etiqueta">
            Referencia (opcional)
          </label>
          <input
            id="desc-uno"
            name="descripcion"
            placeholder="Entrando a la derecha, junto a la ventana"
            autoComplete="off"
            className="campo"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Boton type="submit" disabled={pendiente}>
            {pendiente ? "Guardando..." : "Crear lugar"}
          </Boton>
          <Boton type="button" variante="secundario" onClick={alCancelar}>
            Cancelar
          </Boton>
        </div>
      </form>
    </Tarjeta>
  );
}
