"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SVGProps } from "react";
import { corregirPiezas, moverPiezas, registrarEntrada } from "@/acciones/movimientos";
import { Aviso, Boton } from "@/components/ui";
import {
  IconoAjustes,
  IconoEntrada,
  IconoRegresar,
  IconoTianguis,
  IconoTienda,
} from "@/components/iconos";
import { EN_LUGAR, LUGARES, NOMBRE_LUGAR, piezasEn, type Lugar } from "@/lib/lugares";

/**
 * Botones para mover existencias desde la ficha del modelo.
 *
 * Se eligio el flujo "primero que paso, luego cuantas" porque es como
 * lo dicen en voz alta: "salieron a tienda... veinte". Cada boton de
 * destino pregunta ademas de donde salen, porque no todo sale de bodega:
 * lo que sobro del tianguis tambien puede irse a la tienda.
 */

/** Valor centinela del desplegable: no es el nombre de nadie. */
const OTRA = "__otra__";

type Icono = (p: SVGProps<SVGSVGElement> & { tamano?: number }) => React.ReactElement;

type Accion =
  | { clase: "entrada" }
  | { clase: "mover"; destino: Lugar }
  | { clase: "corregir" };

const ENTRA = "border-[var(--color-verde)]/25 bg-[var(--color-verde-palido)] text-[var(--color-verde)] hover:border-[var(--color-verde)]";
const SALE = "border-[var(--color-vino)]/25 bg-[var(--color-vino-palido)] text-[var(--color-vino)] hover:border-[var(--color-vino)]";
const NEUTRO =
  "border-[var(--color-linea-fuerte)] bg-[var(--color-papel)] text-[var(--color-humo)] hover:border-[var(--color-oro)]";

const BOTONES: { accion: Accion; texto: string; Icono: Icono; color: string }[] = [
  { accion: { clase: "entrada" }, texto: "Entraron", Icono: IconoEntrada, color: ENTRA },
  { accion: { clase: "mover", destino: "tienda" }, texto: "A tienda", Icono: IconoTienda, color: SALE },
  { accion: { clase: "mover", destino: "tianguis" }, texto: "A tianguis", Icono: IconoTianguis, color: SALE },
  { accion: { clase: "mover", destino: "bodega" }, texto: "A bodega", Icono: IconoRegresar, color: ENTRA },
  // Se llama "Correccion de piezas" y lleva el icono de ajustes, no el de
  // lapiz: con el mismo lapiz que "Editar producto" la gente los
  // confundia. Este cuadra EXISTENCIAS; el otro cambia los DATOS.
  { accion: { clase: "corregir" }, texto: "Correccion de piezas", Icono: IconoAjustes, color: NEUTRO },
];

const PREGUNTA: Record<Lugar, string> = {
  bodega: "¿Cuantas piezas regresan a bodega?",
  tienda: "¿Cuantas piezas se llevan a la tienda?",
  tianguis: "¿Cuantas piezas se llevan al tianguis?",
};

function numero(texto: string): number {
  const n = parseInt(texto, 10);
  return Number.isFinite(n) ? n : NaN;
}

export function AccionesMovimiento({
  modeloId,
  existencia,
  enTienda,
  enTianguis,
  personal = [],
}: {
  modeloId: number;
  existencia: number;
  enTienda: number;
  enTianguis: number;
  /** Quien firma. Si llega vacia se escribe el nombre a mano, como antes. */
  personal?: { id: number; nombre: string; puesto: string }[];
}) {
  const router = useRouter();
  const cuentas = { existencia, en_tienda: enTienda, en_tianguis: enTianguis };
  const hay = (l: Lugar) => piezasEn(cuentas, l);

  const [abierta, setAbierta] = useState<Accion | null>(null);
  // Un campo por lugar. En "mover" solo se usa el del destino.
  const [cantidades, setCantidades] = useState<Record<Lugar, string>>({
    bodega: "",
    tienda: "",
    tianguis: "",
  });
  const [origen, setOrigen] = useState<Lugar>("bodega");
  const [repartir, setRepartir] = useState(false);
  const [persona, setPersona] = useState("");
  // Alguien que no esta en la lista: la bodega tambien recibe ayuda de fuera.
  const [otraPersona, setOtraPersona] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [enviando, iniciar] = useTransition();

  /** De donde pueden salir piezas para llegar a este destino. */
  const origenes = (destino: Lugar) => LUGARES.filter((l) => l !== destino && hay(l) > 0);

  // No tiene caso ofrecer "a bodega" si no hay nada fuera de bodega.
  const visibles = BOTONES.filter(
    (b) => b.accion.clase !== "mover" || origenes(b.accion.destino).length > 0
  );

  function abrir(accion: Accion) {
    setAbierta(accion);
    setMensaje(null);
    setRepartir(false);
    if (accion.clase === "corregir") {
      // Al corregir se parte de lo que hay; lo demas empieza vacio para
      // que se teclee la cantidad del movimiento.
      setCantidades({
        bodega: String(existencia),
        tienda: String(enTienda),
        tianguis: String(enTianguis),
      });
    } else {
      setCantidades({ bodega: "", tienda: "", tianguis: "" });
    }
    if (accion.clase === "mover") {
      const posibles = origenes(accion.destino);
      // Bodega es de donde sale casi todo; si no tiene, el primero que si.
      setOrigen(posibles.includes("bodega") ? "bodega" : (posibles[0] ?? "bodega"));
    }
  }

  function cambiar(lugar: Lugar, valor: string) {
    setCantidades((c) => ({ ...c, [lugar]: valor }));
  }

  function terminar(r: { ok: true; mensaje?: string } | { ok: false; error: string }) {
    if (r.ok) {
      setMensaje({ tipo: "ok", texto: r.mensaje ?? "Listo." });
      setAbierta(null);
      setPersona("");
      setOtraPersona(false);
      router.refresh();
    } else {
      setMensaje({ tipo: "error", texto: r.error });
    }
  }

  function confirmar(e: React.FormEvent) {
    e.preventDefault();
    if (!abierta) return;
    setMensaje(null);

    if (abierta.clase === "mover") {
      const n = numero(cantidades[abierta.destino]);
      if (!(n > 0)) {
        setMensaje({ tipo: "error", texto: "Escribe cuantas piezas." });
        return;
      }
      if (n > hay(origen)) {
        setMensaje({
          tipo: "error",
          texto: `No alcanza: solo hay ${hay(origen)} ${EN_LUGAR[origen]}.`,
        });
        return;
      }
      iniciar(async () =>
        terminar(
          await moverPiezas({ modeloId, origen, destino: abierta.destino, cantidad: n, persona })
        )
      );
      return;
    }

    if (abierta.clase === "entrada") {
      const lineas = LUGARES.map((l) => ({ modeloId, lugar: l, cantidad: numero(cantidades[l]) || 0 }))
        .filter((l) => l.cantidad > 0);
      if (lineas.length === 0) {
        setMensaje({ tipo: "error", texto: "Escribe cuantas piezas entraron." });
        return;
      }
      iniciar(async () => terminar(await registrarEntrada({ persona, lineas })));
      return;
    }

    const piezas = {
      bodega: numero(cantidades.bodega),
      tienda: numero(cantidades.tienda),
      tianguis: numero(cantidades.tianguis),
    };
    if (LUGARES.some((l) => !(piezas[l] >= 0))) {
      setMensaje({ tipo: "error", texto: "Escribe las piezas de cada lugar (0 si no hay)." });
      return;
    }
    iniciar(async () => terminar(await corregirPiezas({ modeloId, piezas, persona })));
  }

  const campoPiezas = (lugar: Lugar, texto: string, grande: boolean, autoFoco = false) => (
    <div key={lugar}>
      <label htmlFor={`cantidad-${lugar}`} className="etiqueta">
        {texto}
      </label>
      <input
        id={`cantidad-${lugar}`}
        type="number"
        min={0}
        value={cantidades[lugar]}
        onChange={(e) => cambiar(lugar, e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        inputMode="numeric"
        autoFocus={autoFoco}
        className={`campo sin-flechas !font-bold ${grande ? "!py-3 !text-2xl" : "!py-2.5 !text-xl"}`}
      />
    </div>
  );

  return (
    <div className="space-y-3">
      {mensaje && <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>}

      {!abierta ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {visibles.map(({ accion, texto, Icono, color }) => (
            <button
              key={texto}
              type="button"
              onClick={() => abrir(accion)}
              className={`flex min-h-24 flex-col items-center justify-center gap-2 rounded-sm border px-2 py-4 text-center text-sm leading-tight font-semibold transition-colors sm:min-h-0 sm:px-3 ${color}`}
            >
              <Icono tamano={24} />
              {texto}
            </button>
          ))}
        </div>
      ) : (
        <form
          onSubmit={confirmar}
          className="space-y-4 rounded-sm border border-[var(--color-oro)] bg-[var(--color-papel)] p-4"
        >
          {abierta.clase === "mover" && (
            <>
              <p className="font-semibold">{PREGUNTA[abierta.destino]}</p>

              {/* De donde salen. Casi siempre es bodega y ya viene puesta;
                  solo se toca cuando vienen de la tienda o el tianguis. */}
              <div>
                <span className="etiqueta">Salen de</span>
                <div className="flex flex-wrap gap-2">
                  {origenes(abierta.destino).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setOrigen(l)}
                      aria-pressed={origen === l}
                      className={`inline-flex min-h-11 items-center gap-2 rounded-sm border px-3 text-sm font-semibold transition-colors ${
                        origen === l
                          ? "border-transparent bg-[var(--color-vino)] text-white"
                          : "border-[var(--color-linea-fuerte)] bg-[var(--color-papel)] text-[var(--color-tinta)]"
                      }`}
                    >
                      {NOMBRE_LUGAR[l]}
                      <span className="tabular-nums opacity-80">{hay(l)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {campoPiezas(abierta.destino, `Piezas (hay ${hay(origen)} ${EN_LUGAR[origen]})`, true, true)}
                {firma()}
              </div>
            </>
          )}

          {abierta.clase === "entrada" && (
            <>
              <p className="font-semibold">¿Cuantas piezas entraron?</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {campoPiezas("bodega", "A bodega", true, true)}
                {repartir && campoPiezas("tienda", "Directo a la tienda", false)}
                {repartir && campoPiezas("tianguis", "Directo al tianguis", false)}
              </div>
              {!repartir && (
                <button
                  type="button"
                  onClick={() => setRepartir(true)}
                  className="-mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--color-vino)] hover:underline"
                >
                  + Algunas van directo a la tienda o al tianguis
                </button>
              )}
              {firma()}
            </>
          )}

          {abierta.clase === "corregir" && (
            <>
              <p className="font-semibold">
                ¿Con cuantas piezas debe quedar cada lugar? Se registrara la correccion.
              </p>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {LUGARES.map((l) => campoPiezas(l, NOMBRE_LUGAR[l], false, l === "bodega"))}
              </div>
              {firma()}
            </>
          )}

          {/* Con el teclado numerico encima (que no trae tecla de retorno)
              estos botones son la unica salida: no pueden partirse en dos
              renglones ni quedarse angostos. */}
          <div className="flex gap-2">
            <Boton type="submit" disabled={enviando} className="flex-1 !py-3.5 !text-base sm:flex-none">
              {enviando ? "Guardando..." : "Confirmar"}
            </Boton>
            <Boton
              type="button"
              variante="secundario"
              className="flex-1 !py-3.5 sm:flex-none"
              onClick={() => {
                setAbierta(null);
                setMensaje(null);
              }}
            >
              Cancelar
            </Boton>
          </div>
        </form>
      )}
    </div>
  );

  // Se llama como funcion y no como <Firma />: un componente definido aqui
  // dentro se volveria a montar en cada tecla y el campo perderia el foco.
  function firma() {
    return (
      <div>
        <label htmlFor="persona-mov" className="etiqueta">
          ¿Quien? (opcional)
        </label>
        {/* Se guarda el nombre como texto, igual que siempre: la lista
            solo evita teclearlo de pie frente al rack. Sin personal dado
            de alta, el desplegable estorbaria: se escribe y ya. */}
        {personal.length === 0 ? (
          <input
            id="persona-mov"
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
            placeholder="Nombre de quien lo movio"
            autoComplete="off"
            className="campo !py-3"
          />
        ) : (
          <>
            <select
              id="persona-mov"
              value={otraPersona ? OTRA : persona}
              onChange={(e) => {
                const v = e.target.value;
                setOtraPersona(v === OTRA);
                setPersona(v === OTRA ? "" : v);
              }}
              className="campo !py-3"
            >
              <option value="">Sin especificar</option>
              {personal.map((p) => (
                <option key={p.id} value={p.nombre}>
                  {p.puesto ? `${p.nombre} · ${p.puesto}` : p.nombre}
                </option>
              ))}
              <option value={OTRA}>Otra persona...</option>
            </select>
            {otraPersona && (
              <input
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                placeholder="Nombre de quien lo movio"
                aria-label="Nombre de quien lo movio"
                autoComplete="off"
                className="campo mt-2 !py-3"
              />
            )}
          </>
        )}
      </div>
    );
  }
}
