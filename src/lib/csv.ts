/**
 * Lectura y escritura de CSV.
 *
 * Se usa CSV en vez de .xlsx porque Excel lo abre y lo guarda sin
 * problema, y evita depender de librerias pesadas para algo que en
 * la practica es una tabla de texto.
 */

/**
 * Convierte el texto de un CSV en filas.
 * Respeta comillas dobles, comas dentro de comillas y saltos de linea
 * dentro de un campo entrecomillado.
 */
export function leerCSV(texto: string): string[][] {
  // Quita el BOM que Excel pone al inicio de sus CSV.
  const limpio = texto.replace(/^﻿/, "");

  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = "";
  let entreComillas = false;

  for (let i = 0; i < limpio.length; i++) {
    const c = limpio[i];

    if (entreComillas) {
      if (c === '"') {
        // Dos comillas seguidas dentro de un campo = una comilla literal.
        if (limpio[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          entreComillas = false;
        }
      } else {
        campo += c;
      }
      continue;
    }

    if (c === '"') {
      entreComillas = true;
    } else if (c === "," || c === ";") {
      fila.push(campo);
      campo = "";
    } else if (c === "\n") {
      fila.push(campo);
      filas.push(fila);
      fila = [];
      campo = "";
    } else if (c === "\r") {
      // Se ignora: el salto real lo marca el \n.
    } else {
      campo += c;
    }
  }

  // Ultimo campo/fila si el archivo no termina con salto de linea.
  if (campo !== "" || fila.length > 0) {
    fila.push(campo);
    filas.push(fila);
  }

  return filas.filter((f) => f.some((c) => c.trim() !== ""));
}

/** Escapa un valor para que Excel lo lea bien. */
function escapar(valor: unknown): string {
  const s = String(valor ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Arma un CSV a partir de encabezados y filas.
 * Lleva BOM al inicio: sin el, Excel en Windows rompe los acentos.
 */
export function escribirCSV(encabezados: string[], filas: unknown[][]): string {
  const lineas = [
    encabezados.map(escapar).join(","),
    ...filas.map((f) => f.map(escapar).join(",")),
  ];
  return "﻿" + lineas.join("\r\n");
}
