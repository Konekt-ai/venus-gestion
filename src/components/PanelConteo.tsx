"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { anotarConteo, borrarLineaConteo, cerrarConteo } from "@/acciones/conteos";
import { normalizarCodigo, normalizarTexto, partirCodigo } from "@/lib/codigos";
import { Aviso, Boton, Insignia, Tarjeta } from "@/components/ui";
import { FotoModelo } from "@/components/FotoModelo";
import { IconoCerrar, IconoPin } from "@/components/iconos";
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

  // La linea guardada no carga la foto, solo el codigo y la descripcion:
  // se saca del catalogo que ya viene en memoria para no pedir nada mas.
  const fotoPorModelo = useMemo(
    () => new Map(modelos.map((m) => [m.id, m.foto ?? null])),
    [modelos]
  );

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
    // flushSync obliga a React a pintar YA, todavia dentro del toque del
    // dedo: asi el campo de cantidad ya existe cuando le damos el foco y
    // el telefono abre el teclado solo, sin tener que tocarlo otra vez.
    flushSync(() => {
      setElegido(m);
      setBusqueda("");
      const yaEsta = lineas.find((l) => l.modelo_id === m.id);
      setCantidad(yaEsta ? String(yaEsta.contado) : "");
      setMensaje(null);
    });
    campoCantidad.current?.focus();
    campoCantidad.current?.select();
  }

  function anotar(e: React.FormEvent) {
    e.preventDefault();
    if (!elegido) return;

    const n = parseInt(cantidad, 10);
    if (!Number.isFinite(n) || n < 0) {
      setMensaje({ tipo: "error", texto: "Escribe cuantas piezas hay (0 si no queda ninguna)." });
      return;
    }

    const modelo = elegido;

    // Se limpia y se regresa el foco AHORA, todavia dentro del gesto: el
    // teclado no alcanza a bajarse y se puede ir tecleando el siguiente
    // codigo mientras el servidor guarda el anterior.
    flushSync(() => {
      setElegido(null);
      setCantidad("");
    });
    campoBusqueda.current?.focus();

    iniciar(async () => {
      const r = await anotarConteo(conteoId, modelo.id, n);
      if (r.ok) {
        const dif = r.datos?.diferencia ?? 0;
        setMensaje({
          tipo: "ok",
          texto:
            dif === 0
              ? `${modelo.codigo}: cuadra con lo registrado.`
              : `${modelo.codigo}: ${dif > 0 ? "sobran" : "faltan"} ${Math.abs(dif)} contra lo registrado.`,
        });
        router.refresh();
      } else {
        // Si fallo, se devuelve el modelo y la cantidad tal como estaban:
        // contando de pie, perder el renglon y no saber cual fue es lo
        // peor que puede pasar. El error dice de que modelo se trata
        // porque los del servidor son genericos.
        setElegido(modelo);
        setCantidad(String(n));
        setMensaje({ tipo: "error", texto: `${modelo.codigo}: ${r.error}` });
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
            <label
              htmlFor="buscar-conteo"
              className="mb-1.5 block text-base font-semibold text-[var(--color-tinta)]"
            >
              ¿Que modelo estas contando?
            </label>
            <input
              id="buscar-conteo"
              ref={campoBusqueda}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Escribe el codigo de la etiqueta"
              autoComplete="off"
              type="search"
              inputMode="search"
              enterKeyHint="search"
              autoCorrect="off"
              autoCapitalize="characters"
              spellCheck={false}
              // Enter toma la primera sugerencia: asi se captura sin
              // levantar la vista y un lector de codigo de barras
              // Bluetooth (que teclea y manda Enter) funciona de corrido.
              onKeyDown={(e) => {
                if (e.key === "Enter" && sugerencias.length > 0) {
                  e.preventDefault();
                  elegir(sugerencias[0]);
                }
              }}
              className="campo !py-3.5 !text-base"
            />

            {busqueda.trim() && sugerencias.length === 0 && (
              <p className="text-sm text-[var(--color-humo)]">
                No encontre ese modelo. Revisa el codigo o dalo de alta primero.
              </p>
            )}

            {sugerencias.length > 0 && (
              <ul className="divide-y divide-[var(--color-linea)] overflow-hidden rounded-sm border border-[var(--color-linea)]">
                {sugerencias.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => elegir(m)}
                      className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-[var(--color-vino-palido)]"
                    >
                      {/* Con 129 modelos parecidos, la foto es lo que evita
                          contar una prenda y anotarla en otra. */}
                      <FotoModelo foto={m.foto ?? null} descripcion={m.descripcion} tamano="mini" />
                      <span className="min-w-0 flex-1">
                        <span className="codigo block text-sm">{m.codigo}</span>
                        <span className="block truncate text-xs text-[var(--color-humo)]">
                          {m.descripcion}
                          {m.ubicacion_codigo && ` · ${m.ubicacion_codigo}`}
                        </span>
                      </span>
                      {yaContados.has(m.id) && (
                        <span className="shrink-0">
                          <Insignia tono="ok">Ya contado</Insignia>
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <form onSubmit={anotar} className="space-y-3">
            {/* Aqui la foto va en grande: es el momento de comparar contra
                la prenda que se trae en la mano, antes de teclear. */}
            <div className="flex items-start gap-3">
              <div className="h-32 w-24 shrink-0">
                <FotoModelo
                  foto={elegido.foto ?? null}
                  descripcion={elegido.descripcion}
                  tamano="grande"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="codigo text-xl">{elegido.codigo}</p>
                <p className="text-sm text-[var(--color-humo)]">{elegido.descripcion}</p>
                {elegido.ubicacion_codigo && (
                  <p className="mt-1 flex items-center gap-1 text-sm text-[var(--color-humo)]">
                    <IconoPin tamano={14} />
                    {elegido.ubicacion_codigo}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="cantidad-conteo"
                className="mb-1.5 block text-base font-semibold text-[var(--color-tinta)]"
              >
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
                enterKeyHint="done"
                // Al volver a un modelo ya contado el numero viejo queda
                // seleccionado: se teclea encima sin tener que borrarlo.
                onFocus={(e) => e.currentTarget.select()}
                onClick={(e) => e.currentTarget.select()}
                required
                className="campo sin-flechas !py-4 text-center !text-3xl !font-bold"
              />
              <p className="mt-1 text-xs text-[var(--color-humo)]">
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
                  flushSync(() => {
                    setElegido(null);
                    setCantidad("");
                  });
                  campoBusqueda.current?.focus();
                }}
              >
                Cancelar
              </Boton>
            </div>
          </form>
        )}
      </Tarjeta>

      {/* La cifra va arriba del rotulo: "Con diferencia" ocupa dos
          renglones y si fuera al reves descuadraria las tres tarjetas. */}
      <div className="grid grid-cols-3 gap-2">
        <Tarjeta className="!p-3 text-center">
          <p className="text-2xl font-bold leading-none">{lineas.length}</p>
          <p className="etiqueta !mb-0 mt-1.5 leading-tight !tracking-[0.04em]">Contados</p>
        </Tarjeta>
        <Tarjeta className="!p-3 text-center">
          <p className="text-2xl font-bold leading-none">{lineas.length - conDiferencia.length}</p>
          <p className="etiqueta !mb-0 mt-1.5 leading-tight !tracking-[0.04em]">Cuadran</p>
        </Tarjeta>
        <Tarjeta className="!p-3 text-center">
          <p
            className={`text-2xl font-bold leading-none ${
              conDiferencia.length > 0 ? "text-[var(--color-ambar)]" : ""
            }`}
          >
            {conDiferencia.length}
          </p>
          <p className="etiqueta !mb-0 mt-1.5 leading-tight !tracking-[0.04em]">Con diferencia</p>
        </Tarjeta>
      </div>

      {lineas.length > 0 && (
        <Tarjeta className="!p-0">
          <div className="border-b border-[var(--color-linea)] px-4 py-3">
            <h2 className="titulo text-lg">Lo que llevas contado</h2>
          </div>
          <ul className="divide-y divide-[var(--color-linea)]">
            {lineas.map((l) => {
              const dif = l.contado - l.esperado;
              return (
                <li key={l.id} className="flex items-center gap-3 px-4 py-3">
                  <FotoModelo
                    foto={fotoPorModelo.get(l.modelo_id) ?? null}
                    descripcion={l.modelo_descripcion}
                    tamano="mini"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="codigo text-sm">{l.modelo_codigo}</p>
                    <p className="truncate text-xs text-[var(--color-humo)]">
                      {l.modelo_descripcion}
                      {l.ubicacion_codigo && ` · ${l.ubicacion_codigo}`}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-base">
                      <span className="font-bold">{l.contado}</span>
                      <span className="text-[var(--color-humo)]"> / {l.esperado}</span>
                    </p>
                    {dif !== 0 && (
                      <p
                        className={`text-sm font-bold ${
                          dif > 0 ? "text-[var(--color-verde)]" : "text-[var(--color-rojo)]"
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
                    className="-mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-sm text-[var(--color-humo)] hover:bg-[var(--color-crema)] active:bg-[var(--color-crema)]"
                  >
                    <IconoCerrar tamano={18} />
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
        <h2 className="titulo text-lg">Terminar el conteo</h2>
        <p className="mt-1 text-sm text-[var(--color-humo)]">
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

      {/* Apilados en el celular: cerrar el conteo ajusta existencias y no
          se deshace, asi que no puede quedar a 8px de "Todavia no". */}
      <div className="flex flex-col gap-2 sm:flex-row">
        {confirmando ? (
          <>
            <Boton onClick={cerrar} disabled={enviando} className="w-full !py-3.5 !text-base sm:w-auto">
              {enviando ? "Cerrando..." : "Si, cerrar y ajustar"}
            </Boton>
            <Boton
              variante="secundario"
              onClick={() => setConfirmando(false)}
              className="w-full sm:w-auto"
            >
              Todavia no
            </Boton>
          </>
        ) : (
          <Boton onClick={() => setConfirmando(true)} className="w-full sm:w-auto">
            Cerrar conteo
          </Boton>
        )}
      </div>
    </Tarjeta>
  );
}
