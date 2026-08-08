import os from "node:os";
import { Tarjeta } from "@/components/ui";

/**
 * Muestra la direccion con la que entrar desde un celular.
 *
 * Es la duda numero uno al instalar: la app corre en la computadora de
 * la bodega, pero se quiere consultar desde el telefono mientras se
 * camina entre los racks.
 */
function direccionesLocales(): string[] {
  const interfaces = os.networkInterfaces();
  const direcciones: string[] = [];

  for (const lista of Object.values(interfaces)) {
    for (const red of lista ?? []) {
      // Solo IPv4 de la red local: se descartan las internas (127.x)
      // y las de VirtualBox/Docker, que no sirven para el celular.
      if (red.family !== "IPv4" || red.internal) continue;
      direcciones.push(red.address);
    }
  }

  return direcciones;
}

export function DireccionRed() {
  const direcciones = direccionesLocales();
  const puerto = process.env.PORT ?? "3000";

  return (
    <Tarjeta className="space-y-3">
      <div>
        <h2 className="text-base font-bold">Entrar desde el celular</h2>
        <p className="mt-1 text-sm text-[var(--color-suave)]">
          Con el celular conectado al mismo WiFi que esta computadora, abre el navegador y escribe
          esta direccion:
        </p>
      </div>

      {direcciones.length === 0 ? (
        <p className="rounded-lg bg-[var(--color-aviso-50)] px-3 py-2 text-sm text-[var(--color-aviso-700)]">
          No detecte una conexion de red. Revisa que la computadora este conectada al WiFi o por
          cable.
        </p>
      ) : (
        <ul className="space-y-2">
          {direcciones.map((ip) => (
            <li key={ip}>
              <span className="codigo inline-block rounded-lg bg-slate-100 px-3 py-2 text-lg">
                {ip}:{puerto}
              </span>
            </li>
          ))}
        </ul>
      )}

      {direcciones.length > 1 && (
        <p className="text-xs text-[var(--color-suave)]">
          Aparecen varias porque la computadora tiene mas de una conexion. Prueba la primera; si no
          abre, prueba la siguiente.
        </p>
      )}
    </Tarjeta>
  );
}
