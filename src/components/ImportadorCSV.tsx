"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importarCSV, type ResultadoImportacion } from "@/acciones/importar";
import { Aviso, Boton, Tarjeta } from "@/components/ui";

/**
 * Sube un CSV con el catalogo.
 *
 * Siempre se hace primero una revision sin escribir nada, para que el
 * usuario vea cuantos entran y cuantos se omiten antes de aceptar.
 */
export function ImportadorCSV() {
  const router = useRouter();
  const [contenido, setContenido] = useState("");
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [vista, setVista] = useState<ResultadoImportacion | null>(null);
  const [error, setError] = useState("");
  const [listo, setListo] = useState("");
  const [procesando, iniciar] = useTransition();
  const campo = useRef<HTMLInputElement>(null);

  async function alElegirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setError("");
    setListo("");
    setVista(null);
    setNombreArchivo(archivo.name);

    const texto = await archivo.text();
    setContenido(texto);

    iniciar(async () => {
      const r = await importarCSV(texto, true);
      if (r.ok && r.datos) setVista(r.datos);
      else if (!r.ok) setError(r.error);
    });
  }

  function confirmar() {
    iniciar(async () => {
      const r = await importarCSV(contenido, false);
      if (r.ok) {
        setListo(r.mensaje ?? "Importacion terminada.");
        setVista(null);
        setContenido("");
        setNombreArchivo("");
        if (campo.current) campo.current.value = "";
        router.refresh();
      } else {
        setError(r.error);
      }
    });
  }

  function cancelar() {
    setVista(null);
    setContenido("");
    setNombreArchivo("");
    setError("");
    if (campo.current) campo.current.value = "";
  }

  return (
    <Tarjeta className="space-y-4">
      <div>
        <h2 className="text-base font-bold">Subir un archivo</h2>
        <p className="mt-1 text-sm text-[var(--color-suave)]">
          Guarda tu hoja de Excel como <strong>CSV</strong> y subela aqui. La primera fila debe
          traer los nombres de las columnas.
        </p>
      </div>

      {error && <Aviso tipo="error">{error}</Aviso>}
      {listo && <Aviso tipo="ok">{listo}</Aviso>}

      <div>
        <label htmlFor="archivo-csv" className="etiqueta">
          Archivo CSV
        </label>
        <input
          id="archivo-csv"
          ref={campo}
          type="file"
          accept=".csv,text/csv"
          onChange={alElegirArchivo}
          className="campo cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-marca-700)] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
        />
      </div>

      {procesando && !vista && (
        <p className="text-sm text-[var(--color-suave)]">Revisando el archivo...</p>
      )}

      {vista && (
        <div className="space-y-3 rounded-lg border-2 border-[var(--color-marca-500)] bg-[var(--color-marca-50)] p-4">
          <p className="font-semibold">Asi quedaria «{nombreArchivo}»:</p>

          <ul className="space-y-1 text-sm">
            <li>
              <strong>{vista.creados}</strong> modelos nuevos
            </li>
            <li>
              <strong>{vista.actualizados}</strong> modelos que ya existen y se actualizarian
            </li>
            {vista.omitidos.length > 0 && (
              <li className="text-[var(--color-alto-700)]">
                <strong>{vista.omitidos.length}</strong> renglones se omitirian
              </li>
            )}
          </ul>

          {vista.omitidos.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer font-semibold">Ver que se omite</summary>
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                {vista.omitidos.slice(0, 50).map((o) => (
                  <li key={o.fila} className="text-[var(--color-suave)]">
                    Fila {o.fila}: {o.motivo}
                  </li>
                ))}
                {vista.omitidos.length > 50 && (
                  <li className="text-[var(--color-suave)]">
                    …y {vista.omitidos.length - 50} mas
                  </li>
                )}
              </ul>
            </details>
          )}

          <p className="text-xs text-[var(--color-suave)]">
            Todavia no se ha guardado nada. Los modelos que ya existen conservan su historial: si
            la cantidad del archivo es distinta, se registra como un ajuste.
          </p>

          <div className="flex flex-wrap gap-2">
            <Boton onClick={confirmar} disabled={procesando}>
              {procesando ? "Importando..." : "Si, importar"}
            </Boton>
            <Boton variante="secundario" onClick={cancelar} disabled={procesando}>
              Cancelar
            </Boton>
          </div>
        </div>
      )}

      <details className="text-sm">
        <summary className="cursor-pointer font-semibold">¿Que columnas debe tener?</summary>
        <div className="mt-2 space-y-2 text-[var(--color-suave)]">
          <p>
            La unica obligatoria es <strong>codigo</strong> (o <strong>modelo</strong>). Las demas
            son opcionales y se reconocen con varios nombres:
          </p>
          <ul className="ml-5 list-disc space-y-0.5">
            <li>descripcion, nombre o prenda</li>
            <li>tallas, colores, tela</li>
            <li>existencia, cantidad, piezas o stock</li>
            <li>ubicacion, lugar o rack</li>
            <li>minimo, notas</li>
          </ul>
          <p>
            Si pones una ubicacion que todavia no existe, se crea sola. Descarga el inventario
            actual para ver un archivo de ejemplo con el formato exacto.
          </p>
        </div>
      </details>
    </Tarjeta>
  );
}
