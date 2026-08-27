"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  abrirSesion,
  cerrarSesion,
  contrasenaCorrecta,
  definirContrasena,
  exigirAcceso,
  quitarContrasena,
} from "@/lib/acceso";
import type { Resultado } from "@/lib/tipos";

/** Entrar al sistema escribiendo la contrasena del negocio. */
export async function entrar(_previo: unknown, form: FormData): Promise<Resultado> {
  const intento = String(form.get("clave") ?? "");

  if (!intento) return { ok: false, error: "Escribe la contrasena." };

  if (!contrasenaCorrecta(intento)) {
    return { ok: false, error: "Esa contrasena no es. Vuelve a intentar." };
  }

  await abrirSesion();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function salir(): Promise<Resultado> {
  await cerrarSesion();
  revalidatePath("/", "layout");
  redirect("/entrar");
}

/**
 * Pone o cambia la contrasena.
 * Cambiarla saca a todos los telefonos, que es lo correcto: si se
 * cambia es porque alguien no deberia seguir entrando.
 */
export async function cambiarContrasena(
  _previo: unknown,
  form: FormData
): Promise<Resultado> {
  // Quien no ha entrado no puede cambiarla. Cuando todavia no hay
  // ninguna puesta, esto deja pasar: asi es como se pone la primera.
  await exigirAcceso();

  const nueva = String(form.get("nueva") ?? "").trim();
  const repetida = String(form.get("repetida") ?? "").trim();

  if (nueva.length < 4) return { ok: false, error: "La contrasena necesita al menos 4 letras o numeros." };
  if (nueva !== repetida) return { ok: false, error: "Las dos no son iguales. Escribelas otra vez." };

  definirContrasena(nueva);
  // Quien la acaba de poner no tiene por que volver a escribirla.
  await abrirSesion();
  revalidatePath("/", "layout");

  return {
    ok: true,
    mensaje: "Listo. Cada telefono va a pedirla una vez y despues la recuerda.",
  };
}

/** Deja el sistema abierto otra vez, sin contrasena. */
export async function abrirSinContrasena(): Promise<Resultado> {
  // Sin esto, cualquiera desde fuera podria mandar esta accion y dejar
  // el sistema abierto sin haber sabido nunca la contrasena.
  await exigirAcceso();

  quitarContrasena();
  revalidatePath("/", "layout");
  return { ok: true, mensaje: "El sistema quedo sin contrasena." };
}
