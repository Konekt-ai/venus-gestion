import { normalizarCodigo, normalizarTexto, partirCodigo } from "./codigos";

/** Lo minimo que necesita un modelo para poder buscarse en el telefono. */
export type Buscable = {
  codigo: string;
  codigo_norm: string;
  numero: number | null;
  descripcion: string;
};

/**
 * Filtra y ordena una lista ya cargada en el telefono, con la misma
 * tolerancia que el buscador del servidor: "84" encuentra "084" y
 * "vd194" encuentra "VD 194". Primero el codigo exacto, luego el numero,
 * luego lo que empieza igual y al final la descripcion.
 */
export function buscarEnLista<T extends Buscable>(lista: T[], texto: string, limite = 8): T[] {
  const limpio = texto.trim();
  if (!limpio) return [];

  const norm = normalizarCodigo(limpio);
  const libre = normalizarTexto(limpio);
  const { numero } = partirCodigo(limpio);

  return lista
    .map((m) => {
      // Menor puntaje = mas arriba en la lista.
      let puntaje = 99;
      if (m.codigo_norm === norm) puntaje = 0;
      else if (numero !== null && m.numero === numero) puntaje = 1;
      else if (norm && m.codigo_norm.startsWith(norm)) puntaje = 2;
      else if (norm && m.codigo_norm.includes(norm)) puntaje = 3;
      else if (libre && normalizarTexto(m.descripcion).includes(libre)) puntaje = 4;
      return { m, puntaje };
    })
    .filter((x) => x.puntaje < 99)
    .sort((a, b) => a.puntaje - b.puntaje || a.m.codigo.localeCompare(b.m.codigo))
    .slice(0, limite)
    .map((x) => x.m);
}
