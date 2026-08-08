/**
 * Resolvedor de modulos para las pruebas.
 *
 * El codigo de la app importa sin extension ("./esquema"), que es lo
 * normal en Next. Node en cambio exige la extension exacta. Este hook
 * reintenta agregando .ts / .tsx cuando la ruta no resuelve sola, para
 * poder probar los modulos reales sin ensuciarlos con extensiones.
 */
export async function resolve(especificador, contexto, siguiente) {
  try {
    return await siguiente(especificador, contexto);
  } catch (error) {
    const esRelativo = especificador.startsWith("./") || especificador.startsWith("../");
    const sinExtension = !/\.[a-z]+$/i.test(especificador);

    if (esRelativo && sinExtension) {
      for (const extension of [".ts", ".tsx", "/index.ts"]) {
        try {
          return await siguiente(especificador + extension, contexto);
        } catch {
          // se prueba la siguiente extension
        }
      }
    }

    throw error;
  }
}
