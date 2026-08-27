import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BarraLateral, BarraMovil, EncabezadoMovil } from "@/components/Navegacion";
import { AvisoDemo } from "@/components/AvisoDemo";
import { rutaLogo } from "@/lib/logo";
import { puedeEntrar } from "@/lib/acceso";

export const metadata: Metadata = {
  title: "Venus Bodega",
  description: "Control de inventario y ubicaciones de la bodega",
  applicationName: "Venus Bodega",
  appleWebApp: {
    capable: true,
    title: "Venus", // el nombre que queda bajo el icono en el iPhone
    statusBarStyle: "default",
  },
  // iOS convierte solo cualquier serie de digitos en un enlace para
  // llamar por telefono. Con codigos como "VD 194" y columnas de
  // cantidades, la pantalla se llenaria de textos azules subrayados.
  formatDetection: { telephone: false, date: false, address: false, email: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Sin maximumScale: la gente necesita poder acercar para leer un codigo.
  // viewportFit "cover" hace que la pagina use toda la pantalla del
  // telefono; el espacio del notch y la barra de gestos se respeta
  // despues con las areas seguras, no dejando franjas en blanco.
  viewportFit: "cover",
  // En Android encoge la pagina al abrir el teclado, para que la barra de
  // abajo se reacomode encima en vez de quedar tapada.
  interactiveWidget: "resizes-content",
  themeColor: "#eee5d4",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // El archivo del logo se busca aqui, en el servidor, y se reparte a la
  // barra y al encabezado, que corren en el navegador y no pueden leer disco.
  const logo = rutaLogo();

  // Quien no ha escrito la contrasena solo puede estar viendo /entrar,
  // porque las demas paginas lo mandan alla antes de armar nada. Aqui
  // solo se decide si va con el sistema alrededor o sin nada.
  const paso = await puedeEntrar();

  return (
    <html lang="es-MX">
      {/* min-h-dvh y no min-h-screen: 100vh incluye el alto de la barra
          de direcciones del celular y deja contenido cortado abajo. */}
      <body className="min-h-dvh">
        {!paso ? (
          children
        ) : (
        <>
        <div className="flex min-h-dvh">
          <BarraLateral logo={logo} />
          <div className="flex min-w-0 flex-1 flex-col">
            <EncabezadoMovil logo={logo} />
            <AvisoDemo />
            {/* En celular el contenido termina por encima de la barra de
                abajo; en computadora esa barra no existe y sobra el hueco. */}
            <main className="espacio-barra-inferior mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-8 sm:py-8 md:!pb-10">
              {children}
            </main>
          </div>
        </div>
        <BarraMovil />
        </>
        )}
      </body>
    </html>
  );
}
