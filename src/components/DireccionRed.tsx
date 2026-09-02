import os from "node:os";
import { Aviso, Tarjeta } from "@/components/ui";
import { pideContrasena } from "@/lib/clave";

/**
 * Muestra las direcciones con las que entrar desde un celular.
 *
 * Es la duda numero uno al instalar: el sistema corre en la computadora
 * de la bodega, pero se quiere consultar desde el telefono mientras se
 * camina entre los racks, y ahora tambien desde fuera del negocio.
 *
 * Se separan las dos, porque no son lo mismo: una solo alcanza dentro
 * del local y la otra abre el sistema a cualquiera que este en la red
 * privada de la empresa, aunque este en su casa.
 */

/** Las 100.x son de la red privada que conecta las computadoras a distancia. */
function esRemota(ip: string): boolean {
  const primero = Number(ip.split(".")[0]);
  const segundo = Number(ip.split(".")[1]);
  return primero === 100 && segundo >= 64 && segundo <= 127;
}

function direccionesLocales(): { cercanas: string[]; remotas: string[] } {
  const interfaces = os.networkInterfaces();
  const cercanas: string[] = [];
  const remotas: string[] = [];

  for (const lista of Object.values(interfaces)) {
    for (const red of lista ?? []) {
      // Solo IPv4 de la red local: se descartan las internas (127.x)
      // y las de VirtualBox/Docker, que no sirven para el celular.
      if (red.family !== "IPv4" || red.internal) continue;
      if (esRemota(red.address)) remotas.push(red.address);
      else cercanas.push(red.address);
    }
  }

  return { cercanas, remotas };
}

function ListaDirecciones({ ips, puerto }: { ips: string[]; puerto: string }) {
  return (
    <ul className="space-y-2">
      {ips.map((ip) => (
        <li key={ip}>
          <span className="codigo inline-block rounded-sm bg-[var(--color-crema)] px-3 py-2 text-lg">
            {ip}:{puerto}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function DireccionRed() {
  const { cercanas, remotas } = direccionesLocales();
  const puerto = process.env.PORT ?? "3000";
  const conContrasena = pideContrasena();

  return (
    <Tarjeta className="space-y-4">
      <div>
        <h2 className="titulo text-lg">Entrar desde el celular</h2>
        <p className="mt-1 text-sm leading-relaxed text-[var(--color-humo)]">
          Abre el navegador del telefono y escribe la direccion. Se puede usar el
          sistema completo, no solo verlo: registrar entradas, salidas, conteos y
          mandar a imprimir etiquetas.
        </p>
      </div>

      {cercanas.length === 0 && remotas.length === 0 && (
        <p className="rounded-sm bg-[var(--color-ambar-palido)] px-3 py-2 text-sm text-[var(--color-ambar)]">
          No detecte una conexion de red. Revisa que la computadora este conectada al WiFi o por
          cable.
        </p>
      )}

      {cercanas.length > 0 && (
        <div>
          <p className="etiqueta">En el negocio, con el mismo WiFi</p>
          <ListaDirecciones ips={cercanas} puerto={puerto} />
          {cercanas.length > 1 && (
            <p className="mt-2 text-xs text-[var(--color-humo)]">
              Aparecen varias porque la computadora tiene mas de una conexion. Prueba la
              primera; si no abre, prueba la siguiente.
            </p>
          )}
        </div>
      )}

      {remotas.length > 0 && (
        <div>
          <p className="etiqueta">Desde fuera, sin estar en el negocio</p>
          <ListaDirecciones ips={remotas} puerto={puerto} />
          <p className="mt-2 text-xs leading-relaxed text-[var(--color-humo)]">
            Esta funciona desde cualquier lado, siempre que el telefono este dado de alta en
            la red privada de la empresa.
          </p>
        </div>
      )}

      {/* Sin contrasena y alcanzable desde fuera, cualquiera que este en
          esa red privada puede mover el inventario. Antes solo llegaba
          quien estuviera parado en el local; ahora no, y eso cambia la
          cuenta del riesgo. */}
      {remotas.length > 0 && !conContrasena && (
        <Aviso tipo="error">
          El sistema se puede abrir desde fuera del negocio y todavia no tiene contrasena.
          Cualquiera que entre a la red privada de la empresa puede mover el inventario.
          Conviene ponerle una aqui mismo, en Ajustes.
        </Aviso>
      )}
    </Tarjeta>
  );
}
