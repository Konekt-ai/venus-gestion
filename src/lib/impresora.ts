import "server-only";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { MODO_DEMO } from "./db";
import { aBytes } from "./tspl";

const correr = promisify(execFile);

/**
 * El lado de Node de la impresora de etiquetas.
 *
 * Node no le puede hablar directo a una impresora de Windows sin
 * compilar modulos nativos, asi que se apoya en windows/impresora.ps1,
 * que es quien de verdad manda los bytes. Aqui solo se arma el archivo,
 * se llama al guion y se traduce lo que contesta.
 */

/**
 * Rutas absolutas a proposito.
 *
 * El servidor arranca como tarea programada bajo la cuenta SYSTEM, que
 * tiene otro PATH: "powershell" a secas puede no encontrarse. Es el
 * mismo problema que ya documenta windows/servidor.bat con node.exe.
 */
const POWERSHELL = path.join(
  process.env.SystemRoot || "C:\\Windows",
  "System32",
  "WindowsPowerShell",
  "v1.0",
  "powershell.exe"
);

const GUION = path.join(process.cwd(), "windows", "impresora.ps1");

/** Donde se dejan los archivos que se le mandan a la impresora. */
const CARPETA_TEMPORAL = path.join(process.cwd(), "data");

export type ImpresoraVista = {
  nombre: string;
  estado: string;
  enCola: number;
  puerto: string;
  problema: number;
};

/**
 * Lo que contesta la impresora. Se llama distinto del Resultado de
 * lib/tipos a proposito: aqui datos SIEMPRE viene cuando salio bien.
 */
export type RespuestaImpresora<T> =
  | { ok: true; datos: T }
  | { ok: false; error: string };

/** true cuando esta computadora puede imprimir de verdad. */
export function sePuedeImprimir(): boolean {
  // En la demostracion publica no hay spooler ni impresora que valga.
  return !MODO_DEMO && process.platform === "win32";
}

/**
 * Lo que dicen los numeros de error de Windows, en palabras.
 *
 * Sin esto, el de la bodega ve "error 1801" y no puede hacer nada con
 * eso. Cada mensaje dice ademas que hacer.
 */
function enPalabras(codigo: number, mensaje: string): string {
  if (codigo === 1801) {
    return "Windows no tiene ninguna impresora con ese nombre. Elige otra en Ajustes.";
  }
  if (codigo === 5) {
    return "Windows no dejo usar la impresora. Puede ser un permiso de la cuenta con la que corre el sistema.";
  }
  if (codigo === 1722) {
    return "La cola de impresion de Windows no esta corriendo. Hay que prender el servicio Spooler.";
  }
  if (codigo === 2) {
    return "Se perdio el archivo de las etiquetas antes de mandarlo. Vuelve a intentar.";
  }
  return mensaje || "No se pudo imprimir.";
}

/** Deja constancia en la misma bitacora donde escribe el servidor. */
function anotar(linea: string) {
  try {
    fs.mkdirSync(CARPETA_TEMPORAL, { recursive: true });
    fs.appendFileSync(
      path.join(CARPETA_TEMPORAL, "servidor.log"),
      `[etiquetas] ${linea}\n`
    );
  } catch {
    // Si no se puede anotar, no vale la pena tumbar la impresion.
  }
}

async function llamarGuion(argumentos: string[]): Promise<RespuestaImpresora<Record<string, unknown>>> {
  if (!sePuedeImprimir()) {
    return { ok: false, error: "Esta computadora no puede imprimir etiquetas." };
  }
  if (!fs.existsSync(GUION)) {
    return { ok: false, error: "Falta el archivo windows/impresora.ps1 del sistema." };
  }

  try {
    const { stdout } = await correr(
      POWERSHELL,
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", GUION, ...argumentos],
      { timeout: 30000, windowsHide: true, maxBuffer: 1024 * 1024 }
    );

    const crudo = String(stdout).trim();
    if (!crudo) return { ok: false, error: "La impresora no contesto nada." };

    const respuesta = JSON.parse(crudo) as Record<string, unknown>;
    if (respuesta.ok === true) return { ok: true, datos: respuesta };

    return {
      ok: false,
      error: enPalabras(Number(respuesta.codigo), String(respuesta.mensaje ?? "")),
    };
  } catch (e) {
    const texto = e instanceof Error ? e.message : String(e);
    anotar(`fallo al llamar al guion: ${texto}`);
    return { ok: false, error: "No se pudo hablar con la impresora." };
  }
}

/** Las impresoras que Windows tiene instaladas. */
export async function listarImpresoras(): Promise<ImpresoraVista[]> {
  const r = await llamarGuion(["-Accion", "listar"]);
  if (!r.ok) return [];
  const lista = r.datos.impresoras;
  return Array.isArray(lista) ? (lista as ImpresoraVista[]) : [];
}

export async function estadoImpresora(nombre: string): Promise<ImpresoraVista | null> {
  if (!nombre) return null;
  const r = await llamarGuion(["-Accion", "estado", "-Impresora", nombre]);
  if (!r.ok) return null;
  return (r.datos.impresora as ImpresoraVista) ?? null;
}

/**
 * Los envios se hacen de uno en uno.
 *
 * Dos personas pueden picarle a imprimir al mismo tiempo desde sus
 * celulares. Si los dos envios se traslapan, el que revisa el estado
 * ve la cola del otro y se confunde, o peor: se mezclan las etiquetas.
 */
let cola: Promise<unknown> = Promise.resolve();

function enFila<T>(tarea: () => Promise<T>): Promise<T> {
  const siguiente = cola.then(tarea, tarea);
  // La cola sigue viva aunque una tarea truene.
  cola = siguiente.catch(() => undefined);
  return siguiente;
}

export type Enviado = {
  bytes: number;
  enCola: number;
  aviso?: string;
};

/**
 * Manda un bloque de TSPL a la impresora.
 *
 * Nunca se dice "listo" con un solo chequeo: con la impresora apagada,
 * las llamadas de Windows contestan que todo salio bien y el trabajo se
 * queda formado. Si se creyera en eso, el de la bodega no veria salir
 * nada, le picaria otra vez, y al prender la impresora saldrian todas
 * las etiquetas juntas.
 */
export async function mandarCrudo(
  nombre: string,
  tspl: string,
  trabajo: string
): Promise<RespuestaImpresora<Enviado>> {
  if (!nombre) {
    return { ok: false, error: "No hay ninguna impresora de etiquetas elegida." };
  }

  return enFila(async () => {
    fs.mkdirSync(CARPETA_TEMPORAL, { recursive: true });
    // Nombre al azar: dos celulares pueden estar imprimiendo a la vez y
    // un nombre fijo haria que uno pisara el archivo del otro.
    const archivo = path.join(CARPETA_TEMPORAL, `etiqueta-${randomUUID()}.prn`);

    try {
      fs.writeFileSync(archivo, aBytes(tspl));

      const r = await llamarGuion([
        "-Accion",
        "imprimir",
        "-Impresora",
        nombre,
        "-Archivo",
        archivo,
        "-Trabajo",
        trabajo,
      ]);

      if (!r.ok) {
        anotar(`fallo: ${nombre}: ${r.error}`);
        return r;
      }

      const enCola = Number(r.datos.enCola ?? 0);
      const bytes = Number(r.datos.bytes ?? 0);
      anotar(`enviado: ${nombre}, ${bytes} bytes, quedan ${enCola} en cola`);

      return {
        ok: true as const,
        datos: {
          bytes,
          enCola,
          aviso:
            enCola > 0
              ? "Las etiquetas quedaron formadas pero la impresora no las esta sacando. Revisa que este prendida, con rollo y con la tapa cerrada."
              : undefined,
        },
      };
    } catch (e) {
      const texto = e instanceof Error ? e.message : String(e);
      anotar(`fallo al preparar el envio: ${texto}`);
      return { ok: false as const, error: "No se pudo preparar el envio a la impresora." };
    } finally {
      try {
        fs.unlinkSync(archivo);
      } catch {
        // Si quedo el archivo, lo peor que pasa es que ocupe unos bytes.
      }
    }
  });
}

/** Tira los trabajos que quedaron atorados en la cola. */
export async function vaciarCola(nombre: string): Promise<RespuestaImpresora<null>> {
  if (!sePuedeImprimir() || !nombre) {
    return { ok: false, error: "No hay impresora que vaciar." };
  }
  try {
    await correr(
      POWERSHELL,
      [
        "-NoProfile",
        "-Command",
        `Get-PrintJob -PrinterName '${nombre.replace(/'/g, "''")}' | Remove-PrintJob`,
      ],
      { timeout: 20000, windowsHide: true }
    );
    anotar(`cola vaciada: ${nombre}`);
    return { ok: true, datos: null };
  } catch {
    return { ok: false, error: "No se pudo vaciar la cola." };
  }
}
