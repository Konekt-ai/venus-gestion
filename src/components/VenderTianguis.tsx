"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cancelarVentaTianguis, registrarVentaTianguis } from "@/acciones/tianguis";
import { aCentavos, pesos, pesosSimple } from "@/lib/dinero";
import { buscarEnLista } from "@/lib/busqueda";
import { FotoModelo } from "@/components/FotoModelo";
import { QuienVende, useQuienVende } from "@/components/QuienVende";
import { Aviso, Boton, Tarjeta } from "@/components/ui";
import { IconoCerrar } from "@/components/iconos";

export type ModeloParaVender = {
  id: number;
  codigo: string;
  codigo_norm: string;
  numero: number | null;
  descripcion: string;
  tallas: string;
  colores: string;
  foto: string;
  en_tianguis: number;
  precio: number | null;
};

type Hecha = { texto: string; ventaId: number };

/**
 * Registrar una venta en el tianguis, con el telefono en la mano.
 *
 * Buscar, elegir, cuantas y en cuanto, y listo. El precio ya viene puesto
 * con el registrado; si se dio en otro precio se cambia ahi mismo y solo
 * cuenta para esta venta. Despues de vender la pantalla queda lista para
 * la siguiente, con un "deshacer" por si se pico mal.
 */
export function VenderTianguis({
  modelos,
  personal,
  preseleccionado = null,
}: {
  modelos: ModeloParaVender[];
  personal: { id: number; nombre: string; puesto: string }[];
  preseleccionado?: number | null;
}) {
  const router = useRouter();
  const buscador = useRef<HTMLInputElement>(null);
  const [busqueda, setBusqueda] = useState("");
  const [elegidoId, setElegidoId] = useState<number | null>(preseleccionado);
  const [piezas, setPiezas] = useState(1);
  const [precio, setPrecio] = useState("");
  const [vendedor, setVendedor] = useQuienVende();
  const [error, setError] = useState("");
  const [hecha, setHecha] = useState<Hecha | null>(null);
  const [enviando, iniciar] = useTransition();

  // Se busca en la lista que llega del servidor: asi, despues de cada
  // venta (que refresca la pagina), las piezas que se ven son las de ahora.
  const elegido = modelos.find((m) => m.id === elegidoId) ?? null;
  const sugerencias = useMemo(() => buscarEnLista(modelos, busqueda), [modelos, busqueda]);

  useEffect(() => {
    if (elegido) {
      setPiezas(1);
      setPrecio(elegido.precio ? pesosSimple(elegido.precio) : "");
    }
    // Solo al cambiar de prenda; si se recarga la lista no se pisa lo tecleado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elegidoId]);

  function elegir(id: number) {
    setElegidoId(id);
    setBusqueda("");
    setError("");
    setHecha(null);
  }

  function soltar() {
    setElegidoId(null);
    setError("");
    // De vuelta al buscador, que es lo siguiente que se va a usar.
    setTimeout(() => buscador.current?.focus(), 0);
  }

  const centavos = aCentavos(precio);
  const total = centavos !== null ? centavos * piezas : null;
  const otroPrecio =
    elegido?.precio != null && centavos !== null && centavos > 0 && centavos !== elegido.precio;

  function vender() {
    if (!elegido) return;
    setError("");
    if (piezas < 1) {
      setError("Escribe cuantas piezas se vendieron.");
      return;
    }
    if (piezas > elegido.en_tianguis) {
      setError(`Solo hay ${elegido.en_tianguis} en el tianguis.`);
      return;
    }
    if (centavos === null || centavos <= 0) {
      setError("Escribe el precio al que se vendio cada pieza.");
      return;
    }

    iniciar(async () => {
      const r = await registrarVentaTianguis({
        modeloId: elegido.id,
        piezas,
        precio: centavos,
        persona: vendedor,
      });
      if (r.ok && r.datos) {
        setHecha({ texto: r.mensaje ?? "Se registro la venta.", ventaId: r.datos.ventaId });
        setElegidoId(null);
        router.refresh();
        setTimeout(() => buscador.current?.focus(), 0);
      } else if (!r.ok) {
        setError(r.error);
      }
    });
  }

  function deshacer() {
    if (!hecha) return;
    iniciar(async () => {
      const r = await cancelarVentaTianguis(hecha.ventaId);
      if (r.ok) {
        setHecha(null);
        setError("");
        router.refresh();
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      {hecha && (
        <div className="flex items-center justify-between gap-3 rounded-sm border-l-2 border-[var(--color-verde)] bg-[var(--color-verde-palido)] px-4 py-3 text-sm font-medium text-[var(--color-verde)]">
          <span>{hecha.texto}</span>
          <button
            type="button"
            onClick={deshacer}
            disabled={enviando}
            className="toque shrink-0 px-2 font-semibold underline underline-offset-2"
          >
            Deshacer
          </button>
        </div>
      )}

      {!elegido ? (
        <Tarjeta className="space-y-3">
          <label htmlFor="buscar-venta" className="etiqueta !mb-0">
            ¿Que se vendio?
          </label>
          <input
            id="buscar-venta"
            ref={buscador}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => {
              // El lector de codigos escribe el codigo y da Enter: con eso
              // se elige directo, sin tener que tocar la pantalla.
              if (e.key === "Enter" && sugerencias.length > 0) {
                e.preventDefault();
                elegir(sugerencias[0].id);
              }
            }}
            placeholder="Codigo o descripcion: VD 194, 84, midi..."
            autoComplete="off"
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            autoFocus
            className="campo !py-3.5 !text-lg"
          />

          {busqueda.trim() && sugerencias.length === 0 && (
            <p className="text-sm text-[var(--color-humo)]">
              No esta en el inventario del tianguis. Si si lo traen, hay que darle salida al
              tianguis desde bodega primero.
            </p>
          )}

          {sugerencias.length > 0 && (
            <ul className="divide-y divide-[var(--color-linea)] overflow-hidden rounded-sm border border-[var(--color-linea)]">
              {sugerencias.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => elegir(m.id)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[var(--color-vino-palido)] active:bg-[var(--color-vino-palido)]"
                  >
                    <FotoModelo foto={m.foto || null} descripcion={m.descripcion} tamano="mini" />
                    <span className="min-w-0 flex-1">
                      <span className="codigo block text-base">{m.codigo}</span>
                      <span className="block truncate text-xs text-[var(--color-humo)]">
                        {m.descripcion}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-xs">
                      <span className="block font-semibold">
                        {m.precio ? pesos(m.precio) : "Sin precio"}
                      </span>
                      <span className="block text-[var(--color-humo)]">hay {m.en_tianguis}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!busqueda.trim() && (
            <p className="text-sm text-[var(--color-humo)]">
              Hay {modelos.length} {modelos.length === 1 ? "modelo" : "modelos"} en el tianguis.{" "}
              <Link href="/tianguis/inventario" className="font-semibold text-[var(--color-vino)]">
                Ver el inventario
              </Link>
            </p>
          )}
        </Tarjeta>
      ) : (
        <Tarjeta className="space-y-4">
          <div className="flex items-start gap-3">
            {/* En grande: es el momento de comparar con la prenda que se
                tiene en la mano antes de cobrar. */}
            <div className="h-32 w-24 shrink-0 overflow-hidden rounded-sm bg-[var(--color-crema)]">
              <FotoModelo foto={elegido.foto || null} descripcion={elegido.descripcion} tamano="grande" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="codigo text-2xl">{elegido.codigo}</p>
              <p className="text-sm text-[var(--color-humo)]">{elegido.descripcion}</p>
              {elegido.tallas && (
                <p className="mt-1 text-xs text-[var(--color-humo)]">Tallas {elegido.tallas}</p>
              )}
              <p className="mt-1.5 text-sm font-semibold">
                Hay {elegido.en_tianguis} en el tianguis
              </p>
            </div>
            <button
              type="button"
              onClick={soltar}
              aria-label="Elegir otro modelo"
              className="toque -mr-2 -mt-2 flex shrink-0 items-center justify-center text-[var(--color-humo)]"
            >
              <IconoCerrar tamano={20} />
            </button>
          </div>

          <div>
            <span className="etiqueta">Piezas</span>
            {/* Botones grandes de menos y mas: casi siempre es 1 o 2, y asi
                no hay que abrir el teclado. */}
            <div className="flex items-stretch gap-2">
              <button
                type="button"
                onClick={() => setPiezas((n) => Math.max(1, n - 1))}
                aria-label="Una pieza menos"
                className="h-14 w-14 shrink-0 rounded-sm border border-[var(--color-linea-fuerte)] bg-[var(--color-papel)] text-2xl font-bold active:bg-[var(--color-crema)]"
              >
                −
              </button>
              <input
                type="number"
                min={1}
                max={elegido.en_tianguis}
                value={piezas}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  setPiezas(Number.isFinite(n) ? n : 0);
                }}
                onFocus={(e) => e.currentTarget.select()}
                inputMode="numeric"
                aria-label="Piezas vendidas"
                className="campo sin-flechas !h-14 text-center !text-2xl !font-bold"
              />
              <button
                type="button"
                onClick={() => setPiezas((n) => Math.min(elegido.en_tianguis, n + 1))}
                aria-label="Una pieza mas"
                className="h-14 w-14 shrink-0 rounded-sm border border-[var(--color-linea-fuerte)] bg-[var(--color-papel)] text-2xl font-bold active:bg-[var(--color-crema)]"
              >
                +
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="precio-venta" className="etiqueta">
              Precio por pieza
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xl font-bold text-[var(--color-humo)]">
                $
              </span>
              <input
                id="precio-venta"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                onFocus={(e) => e.currentTarget.select()}
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00"
                className="campo !h-14 !pl-8 !text-2xl !font-bold"
              />
            </div>
            <p className="mt-1 text-xs text-[var(--color-humo)]">
              {elegido.precio
                ? `Precio registrado: ${pesos(elegido.precio)}.`
                : "Esta prenda no tiene precio registrado: escribe en cuanto se vendio."}
              {otroPrecio && (
                <strong className="font-semibold text-[var(--color-ambar)]">
                  {" "}
                  Se vende en otro precio; solo cuenta para esta venta.
                </strong>
              )}
            </p>
          </div>

          <QuienVende personal={personal} valor={vendedor} alCambiar={setVendedor} />

          <div className="pegado-arriba-barra -mx-5 -mb-5 space-y-2 border-t border-[var(--color-linea)] bg-[var(--color-crema)] px-5 py-3 md:!static">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">
                {piezas} {piezas === 1 ? "pieza" : "piezas"}
              </span>
              <span className="text-xl font-bold tabular-nums">
                {total !== null ? pesos(total) : "—"}
              </span>
            </div>
            {error && <Aviso tipo="error">{error}</Aviso>}
            <Boton onClick={vender} disabled={enviando} className="w-full !py-4 !text-base">
              {enviando ? "Guardando..." : "Registrar venta"}
            </Boton>
          </div>
        </Tarjeta>
      )}

      {!elegido && error && <Aviso tipo="error">{error}</Aviso>}
    </div>
  );
}
