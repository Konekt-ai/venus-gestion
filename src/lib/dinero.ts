/**
 * El dinero se guarda en centavos, siempre como numero entero.
 *
 * Con decimales, sumar 33.33 tres veces no da 100 y el corte de caja
 * termina desfasado por unos centavos que nadie sabe de donde salieron.
 * Con enteros eso no puede pasar.
 *
 * Es una copia de lo que ya usa la caja de la tienda, a proposito: los
 * dos sistemas escriben la MISMA tabla de precios, asi que tienen que
 * entender el dinero exactamente igual.
 */

/** 65000 -> "$650.00" */
export function pesos(centavos: number): string {
  const signo = centavos < 0 ? "-" : "";
  const abs = Math.abs(Math.round(centavos));
  const enteros = Math.floor(abs / 100);
  const decimales = abs % 100;
  return `${signo}$${enteros.toLocaleString("es-MX")}.${String(decimales).padStart(2, "0")}`;
}

/** 65000 -> "650.00", para los campos de captura, sin el signo. */
export function pesosSimple(centavos: number): string {
  const abs = Math.abs(Math.round(centavos));
  return `${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/**
 * Convierte lo que se teclea a centavos.
 *
 * Aguanta "650", "650.5", "650.50", "$650" y "1,300", que es como la
 * gente escribe un precio de verdad. Devuelve null si no se entiende,
 * para poder distinguir "no se puso nada" de "se puso cero".
 */
export function aCentavos(entrada: string): number | null {
  const limpio = (entrada ?? "").replace(/[$\s,]/g, "").trim();
  if (!limpio) return null;
  if (!/^\d*\.?\d*$/.test(limpio)) return null;
  const valor = Number(limpio);
  if (!Number.isFinite(valor) || valor < 0) return null;
  return Math.round(valor * 100);
}
