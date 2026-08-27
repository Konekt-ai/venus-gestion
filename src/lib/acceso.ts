import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { pideContrasena, rotarToken, tokenActual } from "./clave";

export {
  contrasenaCorrecta,
  definirContrasena,
  pideContrasena,
  quitarContrasena,
} from "./clave";

/**
 * Contrasena de entrada al sistema.
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

const COOKIE = "venus_sesion";
// Tres meses: se escribe una vez por telefono y no vuelve a estorbar.
const DURACION = 60 * 60 * 24 * 90;

/** Deja entrar: guarda la galleta en el telefono o la computadora. */
export async function abrirSesion() {
  const galletas = await cookies();
  galletas.set(COOKIE, tokenActual(), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: DURACION,
    path: "/",
  });
}

export async function cerrarSesion() {
  const galletas = await cookies();
  galletas.delete(COOKIE);
}

/** true si puede pasar: o no hay contrasena, o ya la escribio. */
export async function puedeEntrar(): Promise<boolean> {
  if (!pideContrasena()) return true;
  const galletas = await cookies();
  return galletas.get(COOKIE)?.value === tokenActual();
}

/**
 * Corta cualquier operacion que llegue sin haber pasado la contrasena.
 *
 * La pantalla de entrada tapa la aplicacion, pero no las acciones: quien
 * conozca la direccion podria mandarlas a mano sin haber entrado nunca.
 * Este candado es el que de verdad cierra, y por eso va en cada accion
 * que toca datos y en las descargas.
 */
export async function exigirAcceso() {
  if (!(await puedeEntrar())) {
    throw new Error("Necesitas escribir la contrasena para hacer esto.");
  }
}

/**
 * Candado de las pantallas.
 *
 * Va al principio de cada pagina y no solo en la plantilla de arriba:
 * aunque la plantilla no dibuje la pagina, el servidor igual la arma y
 * la manda dentro de la respuesta. Mandando a /entrar desde la pagina
 * misma, la respuesta se corta antes y el inventario no sale de aqui.
 */
export async function exigirEntrada() {
  if (!(await puedeEntrar())) redirect("/entrar");
}
