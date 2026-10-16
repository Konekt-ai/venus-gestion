"use client";

import { useEffect, useState } from "react";

/**
 * "¿Quien vende?" en el tianguis.
 *
 * Se elige una vez y el telefono lo recuerda: el mismo vendedor registra
 * todas las ventas del dia y preguntarlo cada vez estorba. Se guarda solo
 * en ese telefono; si el navegador no deja guardar, se vuelve a elegir y
 * ya.
 */

const LLAVE = "venus-tianguis-vendedor";

export function useQuienVende(): [string, (nombre: string) => void] {
  const [nombre, setNombre] = useState("");

  useEffect(() => {
    try {
      setNombre(localStorage.getItem(LLAVE) ?? "");
    } catch {
      // Navegacion privada o sin permiso: se pregunta cada vez.
    }
  }, []);

  function cambiar(nuevo: string) {
    setNombre(nuevo);
    try {
      localStorage.setItem(LLAVE, nuevo);
    } catch {
      // Igual que arriba: no pasa nada si no se puede recordar.
    }
  }

  return [nombre, cambiar];
}

export function QuienVende({
  personal,
  valor,
  alCambiar,
  etiqueta = "¿Quien vende?",
}: {
  personal: { id: number; nombre: string; puesto: string }[];
  valor: string;
  alCambiar: (nombre: string) => void;
  etiqueta?: string;
}) {
  // Sin personal dado de alta el desplegable estorbaria: se escribe y ya.
  if (personal.length === 0) {
    return (
      <div>
        <label htmlFor="quien-vende" className="etiqueta">
          {etiqueta} (opcional)
        </label>
        <input
          id="quien-vende"
          value={valor}
          onChange={(e) => alCambiar(e.target.value)}
          placeholder="Tu nombre"
          autoComplete="off"
          className="campo"
        />
      </div>
    );
  }

  // Un nombre recordado que ya no esta en la lista (lo dieron de baja)
  // se sigue mostrando para no cambiarlo a escondidas.
  const enLista = !valor || personal.some((p) => p.nombre === valor);

  return (
    <div>
      <label htmlFor="quien-vende" className="etiqueta">
        {etiqueta} (opcional)
      </label>
      <select
        id="quien-vende"
        value={valor}
        onChange={(e) => alCambiar(e.target.value)}
        className="campo cursor-pointer"
      >
        <option value="">Sin especificar</option>
        {!enLista && <option value={valor}>{valor}</option>}
        {personal.map((p) => (
          <option key={p.id} value={p.nombre}>
            {p.puesto ? `${p.nombre} · ${p.puesto}` : p.nombre}
          </option>
        ))}
      </select>
    </div>
  );
}
