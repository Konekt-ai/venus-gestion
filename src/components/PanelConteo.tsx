"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { anotarConteo, borrarLineaConteo, cerrarConteo } from "@/acciones/conteos";
import { normalizarCodigo, normalizarTexto, partirCodigo } from "@/lib/codigos";
import { Aviso, Boton, Insignia, Tarjeta } from "@/components/ui";
import type { ConteoLineaConModelo } from "@/lib/tipos";
import type { ModeloElegible } from "@/components/ArmadorEnvio";

/**
 * Captura de un conteo fisico.
 *
 * El flujo esta pensado para hacerse de pie frente al rack, con el
 * celular: se escribe el codigo, aparece la prenda, se teclea cuantas
 * hay y con Enter se pasa a la siguiente. Nada toca el inventario
 * hasta cerrar el conteo.
 */
export function PanelConteo({
  conteoId,
  modelos,
  lineas,
}: {
  conteoId: number;
  modelos: ModeloElegible[];
  lineas: ConteoLineaConModelo[];
}) {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState("");
  const [elegido, setElegido] = useState<ModeloElegible | null>(null);
  const [cantidad, setCantidad] = useState("");
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [enviando, iniciar] = useTransition();
  const campoBusqueda = useRef<HTMLInputElement>(null);
  const campoCantidad = useRef<HTMLInputElement>(null);

  const yaContados = useMemo(() => new Set(lineas.map((l) => l.modelo_id)), [lineas]);

  const sugerencias = useMemo(() => {
    const texto = busqueda.trim();
    if (!texto) return [];

    const norm = normalizarCodigo(texto);
    const libre = normalizarTexto(texto);
    const { numero } = partirCodigo(texto);

    return modelos
      .map((m) => {
        let puntaje = 99;
        if (m.codigo_norm === norm) puntaje = 0;
        else if (numero !== null && m.numero === numero) puntaje = 1;
        else if (m.codigo_norm.startsWith(norm)) puntaje = 2;
        else if (m.codigo_norm.includes(norm)) puntaje = 3;
        else if (normalizarTexto(m.descripcion).includes(libre)) puntaje = 4;
        return { m, puntaje };
      })
      .filter((x) => x.puntaje < 99)
      .sort((a, b) => a.puntaje - b.puntaje || a.m.codigo.localeCompare(b.m.codigo))
      .slice(0, 6)
      .map((x) => x.m);
  }, [busqueda, modelos]);

  function elegir(m: ModeloElegible) {
    setElegido(m);
    setBusqueda("");
    const yaEsta = lineas.find((l) => l.modelo_id === m.id);
    setCantidad(yaEsta ? String(yaEsta.contado) : "");
    setMensaje(null);
    // El foco salta solo al campo de cantidad para no tener que tocar.
    setTimeout(() => campoCantidad.current?.focus(), 30);
  }

  function anotar(e: React.FormEvent) {
    e.preventDefault();
    if (!elegido) return;

    const n = parseInt(cantidad, 10);
    if (!Number.isFinite(n) || n < 0) {
      setMensaje({ tipo: "error", texto: "Escribe cuantas piezas hay (0 si no queda ninguna)." });
      return;
    }

    iniciar(async () => {
      const r = await anotarConteo(conteoId, elegido.id, n);
      if (r.ok) {
        const dif = r.datos?.diferencia ?? 0;
        setMensaje({
          tipo: "ok",
          texto:
            dif === 0
              ? `${elegido.codigo}: cuadra con lo registrado.`
              : `${elegido.codigo}: ${dif > 0 ? "sobran" : "faltan"} ${Math.abs(dif)} contra lo registrado.`,
        });
        setElegido(null);
        setCantidad("");
        router.refresh();
        setTimeout(() => campoBusqueda.current?.focus(), 30);
      } else {
        setMensaje({ tipo: "error", texto: r.error });
      }
    });
  }

  function quitar(modeloId: number) {
    iniciar(async () => {
      await borrarLineaConteo(conteoId, modeloId);
      router.refresh();
    });
  }

  const conDiferencia = lineas.filter((l) => l.contado !== l.esperado);

  return (
    <div className="space-y-4">
      {mensaje && <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>}

      <Tarjeta className="space-y-3">
        {!elegido ? (
          <>
            <label htmlFor="buscar-conteo" className="etiqueta !mb-0">
              ¿Que modelo estas contando?
            </label>
            <input
              id="buscar-conteo"
              ref={campoBusqueda}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Escribe el codigo de la etiqueta"
              autoComplete="off"
              className="campo !py-3.5 !text-base"
            />

            {busqueda.trim() && sugerencias.length === 0 && (
              <p className="text-sm text-[var(--color-suave)]">
                No encontre ese modelo. Revisa el codigo o dalo de alta primero.
              </p>
            )}

            {sugerencias.length > 0 && (
              <ul className="divide-y divide-[var(--color-borde)] overflow-hidden rounded-lg border border-[var(--color-borde)]">
                {sugerencias.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => elegir(m)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition hover:bg-[var(--color-marca-50)]"
                    >
                      <span className="min-w-0">
                        <span className="codigo block text-sm">{m.codigo}</span>
                        <span className="block truncate text-xs text-[var(--color-suave)]">
                          {m.descripcion}
                          {m.ubicacion_codigo && ` · 📍 ${m.ubicacion_codigo}`}
                        </span>
                      </span>
                      {yaContados.has(m.id) && <Insignia tono="ok">Ya contado</Insignia>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <form onSubmit={anotar} className="space-y-3">
            <div>
              <p className="codigo text-xl">{elegido.codigo}</p>
              <p className="text-sm text-[var(--color-suave)]">{elegido.descripcion}</p>
              {elegido.ubicacion_codigo && (
                <p className="mt-1 text-sm">📍 {elegido.ubicacion_codigo}</p>
              )}
            </div>

            <div>
              <label htmlFor="cantidad-conteo" className="etiqueta">
                ¿Cuantas piezas hay fisicamente?
              </label>
              <input
                id="cantidad-conteo"
                ref={campoCantidad}
                type="number"
                min={0}
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                inputMode="numeric"
                required
                className="campo sin-flechas !py-4 text-center !text-3xl !font-bold"
              />
              <p className="mt-1 text-xs text-[var(--color-suave)]">
                Cuenta lo que ves, sin fijarte en lo que dice el sistema.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Boton type="submit" disabled={enviando} className="flex-1 sm:flex-none">
                {enviando ? "Guardando..." : "Anotar y seguir"}
              </Boton>
              <Boton
                type="button"
                variante="secundario"
                onClick={() => {
                  setElegido(null);
                  setCantidad("");
                  setTimeout(() => campoBusqueda.current?.focus(), 30);
                }}
              >
                Cancelar
              </Boton>
            </div>
          </form>
        )}
      </Tarjeta>

      <div className="grid grid-cols-3 gap-3">
        <Tarjeta className="!p-3 text-center">
          <p className="etiqueta !mb-0">Contados</p>
          <p className="text-2xl font-bold">{lineas.length}</p>
        </Tarjeta>
        <Tarjeta className="!p-3 text-center">
          <p className="etiqueta !mb-0">Cuadran</p>
          <p className="text-2xl font-bold">{lineas.length - conDiferencia.length}</p>
        </Tarjeta>
        <Tarjeta className="!p-3 text-center">
          <p className="etiqueta !mb-0">Con diferencia</p>
          <p
            className={`text-2xl font-bold ${
              conDiferencia.length > 0 ? "text-[var(--color-aviso-700)]" : ""
            }`}
          >
            {conDiferencia.length}
          </p>
        </Tarjeta>
      </div>

      {lineas.length > 0 && (
        <Tarjeta className="!p-0">
          <div className="border-b border-[var(--color-borde)] px-4 py-3">
            <h2 className="font-bold">Lo que llevas contado</h2>
          </div>
          <ul className="divide-y divide-[var(--color-borde)]">
            {lineas.map((l) => {
              const dif = l.contado - l.esperado;
              return (
                <li key={l.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="codigo text-sm">{l.modelo_codigo}</p>
                    <p className="truncate text-xs text-[var(--color-suave)]">
                      {l.modelo_descripcion}
                      {l.ubicacion_codigo && ` · 📍 ${l.ubicacion_codigo}`}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm">
                      <span className="font-bold">{l.contado}</span>
                      <span className="text-[var(--color-suave)]"> / {l.esperado}</span>
                    </p>
                    {dif !== 0 && (
                      <p
                        className={`text-xs font-bold ${
                          dif > 0 ? "text-[var(--color-ok-700)]" : "text-[var(--color-alto-700)]"
                        }`}
                      >
                        {dif > 0 ? `+${dif}` : dif}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => quitar(l.modelo_id)}
                    aria-label={`Quitar ${l.modelo_codigo} del conteo`}
                    className="rounded-lg px-2 py-1 text-[var(--color-suave)] hover:bg-slate-100"
                  >
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
        </Tarjeta>
      )}

      <CerrarConteo conteoId={conteoId} totalLineas={lineas.length} conDiferencia={conDiferencia.length} />
    </div>
  );
}

function CerrarConteo({
  conteoId,
  totalLineas,
  conDiferencia,
}: {
  conteoId: number;
  totalLineas: number;
  conDiferencia: number;
}) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, iniciar] = useTransition();
  const [error, setError] = useState("");

  function cerrar() {
    iniciar(async () => {
      const r = await cerrarConteo(conteoId);
      if (r.ok) {
        router.push("/conteo");
        router.refresh();
      } else {
        setError(r.error);
      }
    });
  }

  if (totalLineas === 0) return null;

  return (
    <Tarjeta className="space-y-3">
      <div>
        <h2 className="text-base font-bold">Terminar el conteo</h2>
        <p className="mt-1 text-sm text-[var(--color-suave)]">
          {conDiferencia === 0 ? (
            "Todo cuadra: al cerrar no cambiara ninguna existencia."
          ) : (
            <>
              Se ajustaran <strong>{conDiferencia}</strong>{" "}
              {conDiferencia === 1 ? "modelo" : "modelos"} para que el sistema quede igual a lo que
              contaste. Queda registrado en el historial.
            </>
          )}
        </p>
      </div>

      {error && <Aviso tipo="error">{error}</Aviso>}

      <div className="flex flex-wrap gap-2">
        {confirmando ? (
          <>
            <Boton onClick={cerrar} disabled={enviando}>
              {enviando ? "Cerrando..." : "Si, cerrar y ajustar"}
            </Boton>
            <Boton variante="secundario" onClick={() => setConfirmando(false)}>
              Todavia no
            </Boton>
          </>
        ) : (
          <Boton onClick={() => setConfirmando(true)}>Cerrar conteo</Boton>
        )}
      </div>
    </Tarjeta>
  );
}
