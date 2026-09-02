"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registrarEntrada, registrarRemision, type EntradaRegistrada } from "@/acciones/movimientos";
import { AcuseEntrada } from "@/components/AcuseEntrada";
import { normalizarCodigo, normalizarTexto, partirCodigo } from "@/lib/codigos";
import { Aviso, Boton, Tarjeta } from "@/components/ui";
import { FotoModelo } from "@/components/FotoModelo";
import { IconoCerrar } from "@/components/iconos";
import type { Destino } from "@/lib/tipos";

/** Version ligera del modelo: lo justo para buscar y mostrar en la lista. */
export type ModeloElegible = {
  id: number;
  codigo: string;
  codigo_norm: string;
  numero: number | null;
  descripcion: string;
  existencia: number;
  en_tienda: number;
  en_tianguis: number;
  ubicacion_codigo: string | null;
  /* Opcional a proposito: las pantallas que arman este objeto se fueron
     sumando una por una y sin foto siguen funcionando. */
  foto?: string | null;
};

type Renglon = { modelo: ModeloElegible; cantidad: number };

type Modo =
  | { clase: "envio"; destino: Destino }
  | { clase: "retorno"; destino: Destino }
  | { clase: "entrada" };

/**
 * Arma un envio, un retorno o una entrada renglon por renglon.
 *
 * Es el reemplazo directo del cuaderno: se va escribiendo codigo y
 * cantidad, y al final se confirma todo junto. Si un renglon falla
 * (por ejemplo no alcanzan las piezas) no se aplica ninguno, para no
 * dejar el inventario a medias.
 */
export function ArmadorEnvio({
  modelos,
  modo,
  // Opcionales con valor por omision: /salidas usa este mismo
  // componente en sus cuatro modos y no tiene por que enterarse de
  // que existe una impresora de etiquetas.
  hayImpresora = false,
  topeEtiquetas = 60,
}: {
  modelos: ModeloElegible[];
  modo: Modo;
  hayImpresora?: boolean;
  topeEtiquetas?: number;
}) {
  const router = useRouter();
  const [renglones, setRenglones] = useState<Renglon[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [persona, setPersona] = useState("");
  const [nota, setNota] = useState("");
  const [error, setError] = useState("");
  const [enviando, iniciar] = useTransition();
  // Solo se usa en entradas: es el acuse con los botones de etiquetar.
  const [acuse, setAcuse] = useState<EntradaRegistrada | null>(null);

  /** Cuantas piezas se pueden mover de este modelo en este modo. */
  function disponible(m: ModeloElegible): number {
    if (modo.clase === "entrada") return Infinity;
    if (modo.clase === "envio") return m.existencia;
    return modo.destino === "TIENDA" ? m.en_tienda : m.en_tianguis;
  }

  const elegibles = useMemo(
    () => modelos.filter((m) => disponible(m) > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [modelos, modo]
  );

  const sugerencias = useMemo(() => {
    const texto = busqueda.trim();
    if (!texto) return [];

    const norm = normalizarCodigo(texto);
    const libre = normalizarTexto(texto);
    const { numero } = partirCodigo(texto);
    const yaPuestos = new Set(renglones.map((r) => r.modelo.id));

    return elegibles
      .filter((m) => !yaPuestos.has(m.id))
      .map((m) => {
        // Menor puntaje = mas arriba en la lista.
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
      .slice(0, 8)
      .map((x) => x.m);
  }, [busqueda, elegibles, renglones]);

  function agregar(m: ModeloElegible) {
    setRenglones((prev) => [...prev, { modelo: m, cantidad: 1 }]);
    setBusqueda("");
    setError("");
  }

  function cambiarCantidad(id: number, valor: string) {
    const n = parseInt(valor, 10);
    setRenglones((prev) =>
      prev.map((r) => (r.modelo.id === id ? { ...r, cantidad: Number.isFinite(n) ? n : 0 } : r))
    );
  }

  function quitar(id: number) {
    setRenglones((prev) => prev.filter((r) => r.modelo.id !== id));
  }

  const totalPiezas = renglones.reduce((s, r) => s + Math.max(0, r.cantidad), 0);

  // Renglones que piden mas de lo que hay: se marcan antes de enviar.
  const excedidos = renglones.filter(
    (r) => modo.clase !== "entrada" && r.cantidad > disponible(r.modelo)
  );

  function confirmar() {
    setError("");

    if (renglones.length === 0) {
      setError("Agrega al menos un modelo.");
      return;
    }
    if (totalPiezas === 0) {
      setError("Escribe cuantas piezas de cada modelo.");
      return;
    }
    if (excedidos.length > 0) {
      setError(
        `No alcanza en ${excedidos.map((r) => r.modelo.codigo).join(", ")}. Ajusta las cantidades.`
      );
      return;
    }

    const lineas = renglones
      .filter((r) => r.cantidad > 0)
      .map((r) => ({ modeloId: r.modelo.id, cantidad: r.cantidad }));

    iniciar(async () => {
      if (modo.clase === "entrada") {
        const r = await registrarEntrada({ persona, nota, lineas });
        if (r.ok && r.datos) {
          // Ya no se navega: registrar produccion y etiquetarla son el
          // mismo momento, y cambiar de pantalla en medio los separa.
          setAcuse(r.datos);
          // Limpiar los renglones NO es cosmetico. Antes el estado se
          // borraba al desmontarse el componente por la navegacion; si
          // se queda montado con la captura puesta, se puede confirmar
          // dos veces la MISMA entrada y duplicar piezas de verdad.
          setRenglones([]);
          setPersona("");
          setNota("");
          setBusqueda("");
          setError("");
          router.refresh();
        } else if (!r.ok) setError(r.error);
        return;
      }

      const r = await registrarRemision({
        destino: modo.destino,
        tipo: modo.clase,
        persona,
        nota,
        lineas,
      });

      if (r.ok && r.datos) {
        router.push(`/remisiones/${r.datos.remisionId}`);
        router.refresh();
      } else if (!r.ok) {
        setError(r.error);
      }
    });
  }

  const textoBoton =
    modo.clase === "entrada"
      ? "Registrar entrada"
      : modo.clase === "envio"
        ? `Confirmar salida a ${modo.destino === "TIENDA" ? "tienda" : "tianguis"}`
        : `Confirmar regreso de ${modo.destino === "TIENDA" ? "tienda" : "tianguis"}`;

  // Con el acuse en pantalla, la captura ni se dibuja: asi el boton de
  // confirmar no existe y no hay forma de registrar lo mismo dos veces.
  if (acuse) {
    return (
      <AcuseEntrada
        entrada={acuse}
        hayImpresora={hayImpresora}
        tope={topeEtiquetas}
        alRegistrarOtra={() => setAcuse(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Tarjeta className="space-y-3">
        <label htmlFor="buscar-modelo" className="etiqueta !mb-0">
          Agregar modelo
        </label>
        <input
          id="buscar-modelo"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Escribe el codigo: VD 194, 84, midi..."
          autoComplete="off"
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="campo !py-3 !text-base"
        />

        {busqueda.trim() && sugerencias.length === 0 && (
          <p className="text-sm text-[var(--color-humo)]">
            No hay modelos disponibles con esa busqueda
            {modo.clase !== "entrada" && " (revisa que tengan piezas)"}.
          </p>
        )}

        {sugerencias.length > 0 && (
          <ul className="divide-y divide-[var(--color-linea)] overflow-hidden rounded-sm border border-[var(--color-linea)]">
            {sugerencias.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => agregar(m)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[var(--color-vino-palido)]"
                >
                  {/* La foto va antes que el codigo: con 129 modelos, lo que
                      confirma que es la prenda buena es verla, no leerla. */}
                  <FotoModelo foto={m.foto ?? null} descripcion={m.descripcion} tamano="mini" />
                  <span className="min-w-0 flex-1">
                    <span className="codigo block text-sm">{m.codigo}</span>
                    <span className="block truncate text-xs text-[var(--color-humo)]">
                      {m.descripcion}
                      {m.ubicacion_codigo && ` · ${m.ubicacion_codigo}`}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-[var(--color-humo)]">
                    {modo.clase === "entrada"
                      ? `hay ${m.existencia}`
                      : `disponibles ${disponible(m)}`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>

      {renglones.length > 0 && (
        <Tarjeta className="!p-0">
          <ul className="divide-y divide-[var(--color-linea)]">
            {renglones.map((r) => {
              const max = disponible(r.modelo);
              const excede = modo.clase !== "entrada" && r.cantidad > max;
              return (
                <li key={r.modelo.id} className="flex items-center gap-3 p-3">
                  <FotoModelo
                    foto={r.modelo.foto ?? null}
                    descripcion={r.modelo.descripcion}
                    tamano="mini"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="codigo text-sm">{r.modelo.codigo}</div>
                    <div className="truncate text-xs text-[var(--color-humo)]">
                      {r.modelo.descripcion}
                    </div>
                    {modo.clase !== "entrada" && (
                      <div className="mt-0.5 text-xs text-[var(--color-humo)]">
                        Disponibles: {max}
                      </div>
                    )}
                  </div>

                  <input
                    type="number"
                    min={0}
                    value={r.cantidad}
                    onChange={(e) => cambiarCantidad(r.modelo.id, e.target.value)}
                    /* Nace en 1 y el cursor cae al final: sin esto, tocar y
                       teclear 12 deja 112. */
                    onFocus={(e) => e.currentTarget.select()}
                    onClick={(e) => e.currentTarget.select()}
                    inputMode="numeric"
                    enterKeyHint="done"
                    aria-label={`Cantidad de ${r.modelo.codigo}`}
                    className={`campo sin-flechas !w-20 !py-2 text-center !text-lg !font-bold ${
                      excede ? "!border-[var(--color-rojo)]" : ""
                    }`}
                  />

                  <button
                    type="button"
                    onClick={() => quitar(r.modelo.id)}
                    aria-label={`Quitar ${r.modelo.codigo}`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm text-[var(--color-humo)] hover:bg-[var(--color-crema)] active:bg-[var(--color-crema)]"
                  >
                    <IconoCerrar tamano={18} />
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Pegado arriba de la barra de accesos: con varios renglones
              capturados, el total dejaba de verse justo cuando mas importa. */}
          <div className="pegado-arriba-barra flex items-center justify-between border-t border-[var(--color-linea)] bg-[var(--color-crema)] px-4 py-3 md:!static">
            <span className="text-sm font-semibold">
              {renglones.length} {renglones.length === 1 ? "modelo" : "modelos"}
            </span>
            <span className="text-lg font-bold">
              {totalPiezas} {totalPiezas === 1 ? "pieza" : "piezas"}
            </span>
          </div>
        </Tarjeta>
      )}

      <Tarjeta className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="persona-envio" className="etiqueta">
              {modo.clase === "entrada" ? "¿Quien recibio?" : "¿Quien se lo lleva?"} (opcional)
            </label>
            <input
              id="persona-envio"
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              placeholder="Nombre"
              autoComplete="off"
              className="campo"
            />
          </div>
          <div>
            <label htmlFor="nota-envio" className="etiqueta">
              Nota (opcional)
            </label>
            <input
              id="nota-envio"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Cualquier detalle del envio"
              autoComplete="off"
              className="campo"
            />
          </div>
        </div>

        {/* El error va JUNTO al boton, no hasta arriba: con varios
            renglones capturados, un aviso al inicio de la pagina queda
            fuera de pantalla y parece que el boton no hizo nada. */}
        {error && <Aviso tipo="error">{error}</Aviso>}

        <Boton
          onClick={confirmar}
          disabled={enviando || renglones.length === 0}
          className="w-full !py-3.5 !text-base sm:w-auto"
        >
          {enviando ? "Guardando..." : textoBoton}
        </Boton>
      </Tarjeta>
    </div>
  );
}
