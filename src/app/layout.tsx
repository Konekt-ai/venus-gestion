import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BarraLateral, BarraMovil, EncabezadoMovil } from "@/components/Navegacion";

export const metadata: Metadata = {
  title: "Venus Bodega",
  description: "Control de inventario y ubicaciones de la bodega",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Sin maximumScale: la gente necesita poder acercar para leer un codigo.
  themeColor: "#17130f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX">
      <body className="min-h-screen">
        <div className="flex min-h-screen">
          <BarraLateral />
          <div className="flex min-w-0 flex-1 flex-col">
            <EncabezadoMovil />
            {/* pb-24 deja aire para que la barra de abajo no tape el contenido */}
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-24 sm:px-8 sm:py-8 md:pb-10">
              {children}
            </main>
          </div>
        </div>
        <BarraMovil />
      </body>
    </html>
  );
}
