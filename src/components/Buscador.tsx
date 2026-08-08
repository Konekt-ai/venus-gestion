"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { IconoBuscar } from "@/components/iconos";

/**
 * Buscador de modelos.
 *
 * Es lo que mas se usa: llega un pedido con un codigo y hay que saber
 * si hay y donde esta. Por eso el campo es grande, toma el foco solo
 * en computadora y acepta el codigo escrito de cualquier forma.
 */
export function Buscador({
  valorInicial = "",
  autoFoco = false,
  placeholder = "Busca por codigo o descripcion: VD 194, 84, midi olanes...",
  /** true = filtra en vivo la lista de la misma pagina. */
  enVivo = false,
}: {
  valorInicial?: string;
  autoFoco?: boolean;
  placeholder?: string;
  enVivo?: boolean;
}) {
  const router = useRouter();
  const parametros = useSearchParams();
  const [texto, setTexto] = useState(valorInicial);
  const input = useRef<HTMLInputElement>(null);

  // El foco automatico solo en pantallas grandes: en celular abriria
  // el teclado encima de todo apenas entrar.
  useEffect(() => {
    if (autoFoco && window.matchMedia("(min-width: 768px)").matches) {
      input.current?.focus();
    }
  }, [autoFoco]);

  // Busqueda en vivo con una pausa corta, para no navegar en cada tecla.
  useEffect(() => {
    if (!enVivo) return;
    if (texto === valorInicial) return;

    const temporizador = setTimeout(() => {
      const p = new URLSearchParams(parametros.toString());
      if (texto.trim()) p.set("q", texto.trim());
      else p.delete("q");
      router.replace(`/modelos?${p.toString()}`);
    }, 250);

    return () => clearTimeout(temporizador);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto, enVivo]);

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (enVivo) return;
    const destino = texto.trim() ? `/modelos?q=${encodeURIComponent(texto.trim())}` : "/modelos";
    router.push(destino);
  }

  return (
    <form onSubmit={enviar} className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-oro)]">
        <IconoBuscar tamano={19} />
      </span>
      <input
        ref={input}
        type="search"
        name="q"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder={placeholder}
        aria-label="Buscar modelo"
        autoComplete="off"
        className="campo !py-3.5 !pl-11 !pr-4 !text-base"
      />
    </form>
  );
}
