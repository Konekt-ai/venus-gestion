"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registrarCierreTianguis } from "@/acciones/tianguis";
import { buscarEnLista } from "@/lib/busqueda";
import { FotoModelo } from "@/components/FotoModelo";
import { QuienVende, useQuienVende } from "@/components/QuienVende";
import { Aviso, Boton, Tarjeta } from "@/components/ui";
import type { ModeloParaVender } from "@/components/VenderTianguis";

/**
 * A donde se va lo que no se vendio, al terminar el dia.
 *
 * Todo arranca yendose a bodega, que es lo normal. Solo se tocan las
 * prendas que van a otro lado: se busca la prenda y se dice cuantas van
 * a la tienda y cuantas se quedan en el tianguis para el siguiente dia;
 * lo demas regresa a bodega solo. Al final, un boton mueve todo junto.
 */

type Destinos = { tienda: number; queda: number };

const SIN_CAMBIO: Destinos = { tienda: 0, queda: 0 };

function piezas(n: number) {
  return `${n} ${n === 1 ? "pieza" : "piezas"}`;
}

export function CierreTianguis({
  modelos,
  personal,
}: {
  modelos: ModeloParaVender[];
  personal: { id: number; nombre: string; puesto: string }[];
}) {
  const router = useRouter();
  const [destinos, setDestinos] = useState<Record<number, Destinos>>({});
  const [abiertos, setAbiertos] = useState<Set<number>>(new Set());
  const [busqueda, setBusqueda] = useState("");
  const [persona, setPersona] = useQuienVende();
  const [confirmando, setConfirmando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [enviando, iniciar] = useTransition();

  const lista = useMemo(
    () => (busqueda.trim() ? buscarEnLista(modelos, busqueda, modelos.length) : modelos),
    [modelos, busqueda]
  );

  const de = (id: number) => destinos[id] ?? SIN_CAMBIO;
  const aBodega = (m: ModeloParaVender) => m.en_tianguis - de(m.id).tienda - de(m.id).queda;

  function poner(id: number, campo: keyof Destinos, valor: number) {
    setConfirmando(false);
    setDestinos((d) => ({
      ...d,
      [id]: { ...(d[id] ?? SIN_CAMBIO), [campo]: Math.max(0, Number.isFinite(valor) ? valor : 0) },
    }));
  }

  function todoA(m: ModeloParaVender, lugar: "bodega" | "tienda" | "queda") {
    setConfirmando(false);
    setDestinos((d) => ({
      ...d,
      [m.id]: {
        tienda: lugar === "tienda" ? m.en_tianguis : 0,
        queda: lugar === "queda" ? m.en_tianguis : 0,
      },
    }));
  }

  function alternar(id: number) {
    setAbiertos((a) => {
      const nuevo = new Set(a);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });
  }

  const pasados = modelos.filter((m) => aBodega(m) < 0);
  const totales = modelos.reduce(
    (t, m) => ({
      bodega: t.bodega + Math.max(0, aBodega(m)),
      tienda: t.tienda + de(m.id).tienda,
      queda: t.queda + de(m.id).queda,
    }),
    { bodega: 0, tienda: 0, queda: 0 }
  );

  function registrar() {
    setMensaje(null);
    if (pasados.length > 0) {
      setMensaje({
        tipo: "error",
        texto: `En ${pasados.map((m) => m.codigo).join(", ")} repartiste mas piezas de las que hay.`,
      });
      return;
    }
    if (!confirmando) {
      setConfirmando(true);
      return;
    }

    const lineas = modelos.map((m) => ({
      modeloId: m.id,
      bodega: aBodega(m),
      tienda: de(m.id).tienda,
    }));

    iniciar(async () => {
      const r = await registrarCierreTianguis({ lineas, persona });
      setConfirmando(false);
      if (r.ok) {
        setMensaje({ tipo: "ok", texto: r.mensaje ?? "Listo." });
        setDestinos({});
        setAbiertos(new Set());
        setBusqueda("");
        router.refresh();
      } else {
        setMensaje({ tipo: "error", texto: r.error });
      }
    });
  }

  const partes = [
    totales.bodega > 0 ? `${piezas(totales.bodega)} a bodega` : "",
    totales.tienda > 0 ? `${piezas(totales.tienda)} a la tienda` : "",
  ].filter(Boolean);

  return (
    <div className="space-y-3">
      {mensaje?.tipo === "ok" && <Aviso tipo="ok">{mensaje.texto}</Aviso>}

      <input
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar una prenda para mandarla a otro lado"
        aria-label="Buscar prenda"
        autoComplete="off"
        type="search"
        inputMode="search"
        enterKeyHint="search"
        autoCorrect="off"
        autoCapitalize="characters"
        spellCheck={false}
        className="campo !py-3"
      />

      <Tarjeta className="!p-0">
        {lista.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-[var(--color-humo)]">
            Ninguna prenda del tianguis coincide con esa busqueda.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--color-linea)]">
            {lista.map((m) => {
              const d = de(m.id);
              const bodega = aBodega(m);
              const abierto = abiertos.has(m.id);
              const todoBodega = d.tienda === 0 && d.queda === 0;
              const resumen = todoBodega
                ? "Todo a bodega"
                : [
                    bodega > 0 ? `${bodega} bodega` : "",
                    d.tienda > 0 ? `${d.tienda} tienda` : "",
                    d.queda > 0 ? `${d.queda} se ${d.queda === 1 ? "queda" : "quedan"}` : "",
                  ]
                    .filter(Boolean)
                    .join(" · ");

              return (
                <li key={m.id} className="px-3 py-2.5 sm:px-4">
                  <button
                    type="button"
                    onClick={() => alternar(m.id)}
                    aria-expanded={abierto}
                    className="flex w-full items-center gap-3 text-left"
                  >
                    <FotoModelo foto={m.foto || null} descripcion={m.descripcion} tamano="mini" />
                    <span className="min-w-0 flex-1">
                      <span className="codigo block text-base">{m.codigo}</span>
                      <span className="block truncate text-xs text-[var(--color-humo)]">
                        {m.descripcion}
                      </span>
                      <span
                        className={`mt-0.5 block text-xs font-semibold ${
                          bodega < 0
                            ? "text-[var(--color-rojo)]"
                            : todoBodega
                              ? "text-[var(--color-verde)]"
                              : "text-[var(--color-vino)]"
                        }`}
                      >
                        {bodega < 0 ? "Repartiste de mas" : resumen}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-xl leading-none font-bold tabular-nums">
                        {m.en_tianguis}
                      </span>
                      <span className="text-[0.7rem] font-semibold text-[var(--color-vino)]">
                        {abierto ? "Listo" : "Cambiar"}
                      </span>
                    </span>
                  </button>

                  {abierto && (
                    <div className="mt-3 space-y-2 pl-14">
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <span className="etiqueta !mb-1">A bodega</span>
                          {/* Bodega no se teclea: es lo que sobra. Asi nunca
                              se reparten mas ni menos piezas de las que hay. */}
                          <div
                            className={`flex h-[46px] items-center justify-center rounded-sm bg-[var(--color-crema)] text-lg font-bold tabular-nums ${
                              bodega < 0 ? "text-[var(--color-rojo)]" : ""
                            }`}
                          >
                            {bodega}
                          </div>
                        </div>
                        {(["tienda", "queda"] as const).map((campo) => (
                          <label key={campo} className="block">
                            <span className="etiqueta !mb-1">
                              {campo === "tienda" ? "A tienda" : "Se queda"}
                            </span>
                            <input
                              type="number"
                              min={0}
                              max={m.en_tianguis}
                              value={d[campo]}
                              onChange={(e) => poner(m.id, campo, parseInt(e.target.value, 10))}
                              onFocus={(e) => e.currentTarget.select()}
                              inputMode="numeric"
                              enterKeyHint="done"
                              className="campo sin-flechas !py-2 text-center !text-lg !font-bold"
                            />
                          </label>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(
                          [
                            ["bodega", "Todo a bodega"],
                            ["tienda", "Todo a tienda"],
                            ["queda", "Todo se queda"],
                          ] as const
                        ).map(([lugar, texto]) => (
                          <button
                            key={lugar}
                            type="button"
                            onClick={() => todoA(m, lugar)}
                            className="inline-flex min-h-9 items-center rounded-sm border border-[var(--color-linea-fuerte)] bg-[var(--color-papel)] px-2.5 text-xs font-semibold"
                          >
                            {texto}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Tarjeta>

      <Tarjeta>
        <QuienVende
          personal={personal}
          valor={persona}
          alCambiar={setPersona}
          etiqueta="¿Quien registra?"
        />
      </Tarjeta>

      {/* Pegado arriba de la barra: con muchas prendas en la lista, el
          boton tiene que estar a la mano sin bajar hasta el fondo. */}
      <div className="pegado-arriba-barra space-y-2 rounded-sm border border-[var(--color-linea)] bg-[var(--color-crema)] px-4 py-3 md:!static">
        <p className="text-sm">
          {partes.length > 0 ? (
            <>
              Se {totales.bodega + totales.tienda === 1 ? "mueve" : "mueven"}{" "}
              <strong>{partes.join(" y ")}</strong>
            </>
          ) : (
            <strong>No se mueve nada</strong>
          )}
          {totales.queda > 0 && (
            <>
              ; {piezas(totales.queda)} se {totales.queda === 1 ? "queda" : "quedan"} en el tianguis
            </>
          )}
          .
        </p>
        {mensaje?.tipo === "error" && <Aviso tipo="error">{mensaje.texto}</Aviso>}
        <div className="flex gap-2">
          <Boton
            onClick={registrar}
            disabled={enviando || partes.length === 0}
            className="flex-1 !py-4 !text-base"
          >
            {enviando ? "Guardando..." : confirmando ? "Si, registrar la salida" : "Registrar salida"}
          </Boton>
          {confirmando && (
            <Boton
              type="button"
              variante="secundario"
              onClick={() => setConfirmando(false)}
              className="!py-4"
            >
              Revisar
            </Boton>
          )}
        </div>
      </div>
    </div>
  );
}
