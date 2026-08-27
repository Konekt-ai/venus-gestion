import "server-only";
import crypto from "node:crypto";
import { getDb } from "./db";

/**
 * La contrasena guardada.
 *
 * El sistema vive en la computadora de la bodega y se abre desde los
 * celulares del mismo WiFi. Si esa red la comparten con la tienda o con
 * clientes, cualquiera que sepa la direccion puede entrar y mover el
 * inventario. La contrasena cierra esa puerta.
 *
 * Es OPCIONAL a proposito: mientras no se ponga una, el sistema abre
 * directo. Asi el dia de la instalacion nada se traba, y se prende
 * cuando el cliente quiera desde Ajustes.
 *
 * Es una sola contrasena para todo el negocio, no una por persona:
 * quien hizo cada movimiento se registra aparte, con la lista de
 * Personal. Aqui solo se trata de que no entre gente de fuera.
 */

function leerConfig(clave: string): string | null {
  const db = getDb();
  const fila = db.prepare("SELECT valor FROM config WHERE clave = ?").get(clave) as
    | { valor: string }
    | undefined;
  return fila?.valor ?? null;
}

function guardarConfig(clave: string, valor: string) {
  getDb()
    .prepare(
      `INSERT INTO config (clave, valor) VALUES (?, ?)
       ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor`
    )
    .run(clave, valor);
}

/** true cuando el cliente ya puso una contrasena. */
export function pideContrasena(): boolean {
  return Boolean(leerConfig("clave_hash"));
}

/**
 * Guarda la contrasena. Se guarda revuelta con scrypt y con su propia
 * sal, nunca tal cual: si alguien copia el archivo de la base, no puede
 * leerla.
 */
export function definirContrasena(nueva: string) {
  const sal = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(nueva, sal, 64).toString("hex");
  guardarConfig("clave_hash", `${sal}:${hash}`);
  // Cambiar la contrasena cierra la sesion en todos los telefonos.
  rotarToken();
}

export function quitarContrasena() {
  getDb().prepare("DELETE FROM config WHERE clave IN ('clave_hash','token_sesion')").run();
}

export function contrasenaCorrecta(intento: string): boolean {
  const guardado = leerConfig("clave_hash");
  if (!guardado) return true;

  const [sal, hash] = guardado.split(":");
  if (!sal || !hash) return false;

  const prueba = crypto.scryptSync(intento, sal, 64);
  const esperado = Buffer.from(hash, "hex");

  // Comparacion de tiempo constante: comparar con === deja ver, por lo
  // que tarda, cuantos caracteres van bien.
  if (prueba.length !== esperado.length) return false;
  return crypto.timingSafeEqual(prueba, esperado);
}

/**
 * El token vale para todas las sesiones a la vez. Cambiarlo saca a todo
 * el mundo, que es justo lo que se quiere al cambiar la contrasena.
 */
export function rotarToken(): string {
  const token = crypto.randomBytes(32).toString("hex");
  guardarConfig("token_sesion", token);
  return token;
}

export function tokenActual(): string {
  return leerConfig("token_sesion") ?? rotarToken();
}
