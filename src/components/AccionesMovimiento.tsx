"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SVGProps } from "react";
import { registrarMovimiento } from "@/acciones/movimientos";
import { Aviso, Boton } from "@/components/ui";
import {
  IconoEditar,
  IconoEntrada,
  IconoRegresar,
  IconoTianguis,
  IconoTienda,
} from "@/components/iconos";
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
  Icono: (p: SVGProps<SVGSVGElement> & { tamano?: number }) => React.ReactElement;
  pregunta: string;
  color: string;
};

const ENTRA = "border-[var(--color-verde)]/25 bg-[var(--color-verde-palido)] text-[var(--color-verde)] hover:border-[var(--color-verde)]";
const SALE = "border-[var(--color-vino)]/25 bg-[var(--color-vino-palido)] text-[var(--color-vino)] hover:border-[var(--color-vino)]";

const OPCIONES: Opcion[] = [
  {
    tipo: "entrada",
    texto: "Entraron",
    Icono: IconoEntrada,
    pregunta: "¿Cuantas piezas entraron a bodega?",
    color: ENTRA,
  },
  {
    tipo: "salida_tienda",
    texto: "A tienda",
    Icono: IconoTienda,
    pregunta: "¿Cuantas piezas se llevaron a la tienda?",
    color: SALE,
  },
  {
    tipo: "salida_tianguis",
    texto: "A tianguis",
    Icono: IconoTianguis,
    pregunta: "¿Cuantas piezas se llevaron al tianguis?",
    color: SALE,
  },
  {
    tipo: "retorno_tianguis",
    texto: "Regreso de tianguis",
    Icono: IconoRegresar,
    pregunta: "¿Cuantas piezas regresaron del tianguis?",
    color: ENTRA,
  },
  {
    tipo: "retorno_tienda",
    texto: "Regreso de tienda",
    Icono: IconoRegresar,
    pregunta: "¿Cuantas piezas regresaron de la tienda?",
    color: ENTRA,
  },
  {
    tipo: "ajuste",
    texto: "Corregir",
    Icono: IconoEditar,
    pregunta: "¿Con cuantas piezas debe quedar? Se registrara la correccion.",
    color:
      "border-[var(--color-linea-fuerte)] bg-[var(--color-papel)] text-[var(--color-humo)] hover:border-[var(--color-oro)]",
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
          {visibles.map(({ tipo, texto, Icono, color }) => (
            <button
              key={tipo}
              type="button"
              onClick={() => abrir(OPCIONES.find((o) => o.tipo === tipo)!)}
              className={`flex flex-col items-center gap-2 rounded-sm border px-3 py-4 text-sm font-semibold transition-colors ${color}`}
            >
              <Icono tamano={24} />
              {texto}
            </button>
          ))}
        </div>
      ) : (
        <form
          onSubmit={confirmar}
          className="space-y-3 rounded-sm border border-[var(--color-oro)] bg-[var(--color-papel)] p-4"
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
