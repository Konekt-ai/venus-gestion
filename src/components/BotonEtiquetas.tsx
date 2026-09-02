"use client";

import { useState, useTransition } from "react";
import { imprimirEtiquetas, tirarCola } from "@/acciones/etiquetas";
import { Aviso, Boton, BotonEnlace } from "@/components/ui";
import { IconoEtiqueta } from "@/components/iconos";

/**
 * Imprimir las etiquetas de una prenda.
 *
 * Se usa en dos lugares y por eso vive aparte: en la ficha del modelo,
 * y en el acuse que sale despues de registrar una entrada de fabrica
 * (ahi la cantidad llega precargada con las piezas que acaban de
 * entrar, que es lo que pidio el cliente).
 *
 * Sin dialogos: en este sistema nada abre ventanas encima. Se sustituye
 * en su lugar, igual que las acciones de movimiento, para que en el
 * celular no haya que perseguir una tapa que se abre.
 */
export function BotonEtiquetas({
  modeloId,
  codigo,
  cantidadInicial = 1,
  hayImpresora,
  tope = 60,
  compacto = false,
}: {
  modeloId: number;
  codigo: string;
  cantidadInicial?: number;
  hayImpresora: boolean;
  tope?: number;
  compacto?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [cantidad, setCantidad] = useState(String(Math.max(1, cantidadInicial)));
  const [confirmando, setConfirmando] = useState(false);
  const [mensaje, setMensaje] = useState<
    { tipo: "ok" | "error" | "info"; texto: string; conCola?: boolean } | null
  >(null);
  const [enviando, empezar] = useTransition();

  const cuantas = Math.min(tope, Math.max(1, Math.floor(Number(cantidad) || 0)));

  /**
   * Sin impresora configurada el sistema no se queda inutil: manda a la
   * hoja carta de siempre, con esta prenda y su cantidad ya puestas.
   */
  if (!hayImpresora) {
    return (
      <BotonEnlace
        href={`/modelos/etiquetas?ids=${modeloId}x${Math.max(1, cantidadInicial)}`}
        variante="secundario"
        className={compacto ? "" : "w-full !py-3 sm:w-auto sm:!py-2.5"}
      >
        <IconoEtiqueta tamano={16} />
        Etiquetas en hoja
      </BotonEnlace>
    );
  }

  function imprimir() {
    empezar(async () => {
      const r = await imprimirEtiquetas([{ modeloId, cantidad: cuantas }]);
      if (!r.ok) {
        setMensaje({ tipo: "error", texto: r.error });
        return;
      }
      setConfirmando(false);
      setAbierto(false);
      const aviso = r.datos?.aviso;
      setMensaje(
        aviso
          ? { tipo: "info", texto: aviso, conCola: true }
          : { tipo: "ok", texto: r.mensaje ?? "Listo." }
      );
    });
  }

  function vaciar() {
    empezar(async () => {
      const r = await tirarCola();
      setMensaje(
        r.ok
          ? { tipo: "ok", texto: r.mensaje ?? "Cola vacia." }
          : { tipo: "error", texto: r.error }
      );
    });
  }

  if (!abierto) {
    return (
      <div className={compacto ? "space-y-2" : "w-full space-y-2 sm:w-auto"}>
        <Boton
          type="button"
          onClick={() => {
            setMensaje(null);
            setCantidad(String(Math.max(1, cantidadInicial)));
            setAbierto(true);
          }}
          className={compacto ? "" : "w-full !py-3 sm:w-auto sm:!py-2.5"}
        >
          <IconoEtiqueta tamano={16} />
          Imprimir etiquetas
        </Boton>
        {mensaje && (
          <Aviso tipo={mensaje.tipo === "info" ? "error" : mensaje.tipo}>
            {mensaje.texto}
            {mensaje.conCola && (
              <>
                {" "}
                <button
                  type="button"
                  onClick={vaciar}
                  disabled={enviando}
                  className="font-semibold underline underline-offset-2"
                >
                  Tirar lo que quedo formado
                </button>
              </>
            )}
          </Aviso>
        )}
      </div>
    );
  }

  return (
    <div className="w-full space-y-3 rounded-sm border border-[var(--color-linea-fuerte)] bg-[var(--color-papel)] p-3">
      <div>
        <label htmlFor={`cant-${modeloId}`} className="etiqueta">
          Cuantas etiquetas de {codigo}
        </label>
        <input
          id={`cant-${modeloId}`}
          type="number"
          inputMode="numeric"
          min={1}
          max={tope}
          autoFocus
          value={cantidad}
          onChange={(e) => {
            setCantidad(e.target.value);
            setConfirmando(false);
          }}
          className="campo sin-flechas !py-3 !text-2xl"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {[1, 6, 12, 24, 30].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => {
              setCantidad(String(n));
              setConfirmando(false);
            }}
            className="min-h-11 rounded-sm border border-[var(--color-linea-fuerte)] bg-[var(--color-marfil)] px-3 text-sm font-semibold hover:border-[var(--color-oro)]"
          >
            {n}
          </button>
        ))}
      </div>

      {/* Arriba de 30 se pregunta dos veces. Un cero de mas aqui se
          traduce en medio rollo desperdiciado, y una vez que salen no
          hay forma de pararlas desde el sistema. */}
      {confirmando ? (
        <Aviso tipo="error">
          Son {cuantas} etiquetas y no se pueden parar a medias. Confirma otra vez.
        </Aviso>
      ) : null}

      <div className="flex gap-2">
        <Boton
          type="button"
          onClick={() => {
            if (cuantas > 30 && !confirmando) {
              setConfirmando(true);
              return;
            }
            imprimir();
          }}
          disabled={enviando}
          className="flex-1 !py-3"
        >
          {enviando ? "Mandando..." : confirmando ? `Si, imprimir ${cuantas}` : "Imprimir"}
        </Boton>
        <Boton
          type="button"
          variante="secundario"
          onClick={() => {
            setAbierto(false);
            setConfirmando(false);
          }}
          disabled={enviando}
          className="flex-1 !py-3"
        >
          Cancelar
        </Boton>
      </div>

      {mensaje && (
        <Aviso tipo={mensaje.tipo === "info" ? "error" : mensaje.tipo}>{mensaje.texto}</Aviso>
      )}
    </div>
  );
}
