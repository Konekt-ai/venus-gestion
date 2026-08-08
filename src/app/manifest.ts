import type { MetadataRoute } from "next";

/**
 * Ficha del sistema para cuando alguien lo agrega a la pantalla de inicio
 * del telefono. Sin esto se abre como una pagina cualquiera: con barra de
 * direcciones y con el icono generico del navegador.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Venus Bodega",
    short_name: "Venus",
    description: "Control de inventario y ubicaciones de la bodega",
    lang: "es-MX",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#faf6ee",
    theme_color: "#eee5d4",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icono/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icono/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icono/512m", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Accesos que aparecen al mantener presionado el icono.
    shortcuts: [
      { name: "Conteo", short_name: "Conteo", url: "/conteo" },
      { name: "Salidas", short_name: "Salidas", url: "/salidas" },
      { name: "Modelos", short_name: "Modelos", url: "/modelos" },
    ],
  };
}
