/** @type {import('next').NextConfig} */
const nextConfig = {
  // better-sqlite3 es un modulo nativo: Next debe cargarlo desde node_modules
  // en vez de intentar empaquetarlo.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
