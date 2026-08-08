"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registrarMovimiento } from "@/acciones/movimientos";
import { Aviso, Boton } from "@/components/ui";
import type { TipoMovimiento } from "@/lib/tipos";

/**
 * Botones para mover existencias desde la ficha del modelo.
 *
 * Se eligio el flujo "primero que paso, luego cuantas" porque es como
 * lo dicen en voz alta: "salieron a tienda... veinte".
 */

type Opcion = {
  tipo: TipoMovimiento;
  texto: string;
  icono: string;
  pregunta: string;
  color: string;
};

const OPCIONES: Opcion[] = [
  {
    tipo: "entrada",
    texto: "Entraron",
    icono: "📥",
    pregunta: "¿Cuantas piezas entraron a bodega?",
    color: "border-[var(--color-ok-600)] bg-[var(--color-ok-50)] text-[var(--color-ok-700)]",
  },
  {
    tipo: "salida_tienda",
    texto: "A tienda",
    icono: "🏬",
    pregunta: "¿Cuantas piezas se llevaron a la tienda?",
    color: "border-[var(--color-marca-500)] bg-[var(--color-marca-50)] text-[var(--color-marca-700)]",
  },
  {
    tipo: "salida_tianguis",
    texto: "A tianguis",
    icono: "⛺",
    pregunta: "¿Cuantas piezas se llevaron al tianguis?",
    color: "border-[var(--color-marca-500)] bg-[var(--color-marca-50)] text-[var(--color-marca-700)]",
  },
  {
    tipo: "retorno_tianguis",
    texto: "Regreso de tianguis",
    icono: "↩️",
    pregunta: "¿Cuantas piezas regresaron del tianguis?",
    color: "border-[var(--color-ok-600)] bg-[var(--color-ok-50)] text-[var(--color-ok-700)]",
  },
  {
    tipo: "retorno_tienda",
    texto: "Regreso de tienda",
    icono: "↩️",
    pregunta: "¿Cuantas piezas regresaron de la tienda?",
    color: "border-[var(--color-ok-600)] bg-[var(--color-ok-50)] text-[var(--color-ok-700)]",
  },
  {
    tipo: "ajuste",
    texto: "Corregir",
    icono: "✏️",
    pregunta: "¿Con cuantas piezas debe quedar? Se registrara la correccion.",
    color: "border-[var(--color-borde)] bg-white text-[var(--color-suave)]",
  },
];

export function AccionesMovimiento({
  modeloId,
  existencia,
  enTienda,
  enTianguis,
}: {
  modeloId: number;
  existencia: number;
  enTienda: number;
  enTianguis: number;
}) {
  const router = useRouter();
  const [abierta, setAbierta] = useState<Opcion | null>(null);
  const [cantidad, setCantidad] = useState("");
  const [persona, setPersona] = useState("");
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [enviando, iniciar] = useTransition();

  // No tiene caso ofrecer "regreso de tienda" si no hay nada alla.
  const visibles = OPCIONES.filter((o) => {
    if (o.tipo === "retorno_tienda") return enTienda > 0;
    if (o.tipo === "retorno_tianguis") return enTianguis > 0;
    if (o.tipo === "salida_tienda" || o.tipo === "salida_tianguis") return existencia > 0;
    return true;
  });

  function abrir(opcion: Opcion) {
    setAbierta(opcion);
    setMensaje(null);
    // Al corregir se parte de la existencia actual; en lo demas se
    // empieza vacio para que se teclee la cantidad del movimiento.
    setCantidad(opcion.tipo === "ajuste" ? String(existencia) : "");
  }

  function confirmar(e: React.FormEvent) {
    e.preventDefault();
    if (!abierta) return;

    const n = parseInt(cantidad, 10);
    if (!Number.isFinite(n)) {
      setMensaje({ tipo: "error", texto: "Escribe una cantidad." });
      return;
    }

    // "Corregir" se captura como la existencia final, pero se guarda
    // como la diferencia contra lo que habia.
    const esAjuste = abierta.tipo === "ajuste";
    const valor = esAjuste ? n - existencia : n;

    if (esAjuste && valor === 0) {
      setMensaje({ tipo: "error", texto: "Esa es la cantidad que ya estaba registrada." });
      return;
    }

    iniciar(async () => {
      const r = await registrarMovimiento({
        modeloId,
        tipo: abierta.tipo,
        cantidad: valor,
        persona,
        nota: esAjuste ? "Correccion manual desde la ficha" : "",
      });

      if (r.ok) {
        setMensaje({ tipo: "ok", texto: r.mensaje ?? "Listo." });
        setAbierta(null);
        setCantidad("");
        setPersona("");
        router.refresh();
      } else {
        setMensaje({ tipo: "error", texto: r.error });
      }
    });
  }

  return (
    <div className="space-y-3">
      {mensaje && <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>}

      {!abierta ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {visibles.map((o) => (
            <button
              key={o.tipo}
              type="button"
              onClick={() => abrir(o)}
              className={`flex flex-col items-center gap-1 rounded-xl border-2 px-3 py-4 text-sm font-semibold transition hover:brightness-95 ${o.color}`}
            >
              <span aria-hidden="true" className="text-2xl">
                {o.icono}
              </span>
              {o.texto}
            </button>
          ))}
        </div>
      ) : (
        <form
          onSubmit={confirmar}
          className="space-y-3 rounded-xl border-2 border-[var(--color-marca-500)] bg-white p-4"
        >
          <p className="font-semibold">{abierta.pregunta}</p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="cantidad-mov" className="etiqueta">
                Piezas
              </label>
              <input
                id="cantidad-mov"
                type="number"
                min={0}
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                inputMode="numeric"
                autoFocus
                required
                className="campo sin-flechas !py-3 !text-2xl !font-bold"
              />
            </div>
            <div>
              <label htmlFor="persona-mov" className="etiqueta">
                ¿Quien? (opcional)
              </label>
              <input
                id="persona-mov"
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                placeholder="Nombre de quien lo movio"
                autoComplete="off"
                className="campo !py-3"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Boton type="submit" disabled={enviando}>
              {enviando ? "Guardando..." : "Confirmar"}
            </Boton>
            <Boton
              type="button"
              variante="secundario"
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
}
