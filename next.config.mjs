/** @type {import('next').NextConfig} */
const nextConfig = {
  // better-sqlite3 es un modulo nativo: Next debe cargarlo desde node_modules
  // en vez de intentar empaquetarlo.
  serverExternalPackages: ["better-sqlite3"],

  // Quita el distintivo flotante que Next pone en la esquina al usar
  // "npm run dev". No tiene nada que ver con el sistema y solo confunde
  // a quien lo esta usando en la bodega.
  devIndicators: false,
};

export default nextConfig;
