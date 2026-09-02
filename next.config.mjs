/** @type {import('next').NextConfig} */
const nextConfig = {
  // better-sqlite3 es un modulo nativo: Next debe cargarlo desde node_modules
  // en vez de intentar empaquetarlo.
  serverExternalPackages: ["better-sqlite3"],

  // El .node compilado no se ve con un import normal, asi que hay que
  // nombrarlo a mano para que viaje dentro de la funcion al desplegar en
  // Vercel. Sin esto el sitio compila pero truena al abrirlo.
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/better-sqlite3/build/Release/better_sqlite3.node",
      // El catalogo se lee del disco al arrancar, no con un import: hay
      // que nombrarlo para que viaje al desplegar la demostracion.
      "./src/datos/catalogo.json",
      // El puente con la impresora de etiquetas: sin el, el sistema
      // compila pero no encuentra como mandarle nada al rollo.
      "./windows/impresora.ps1",
    ],
  },

  // Quita el distintivo flotante que Next pone en la esquina al usar
  // "npm run dev". No tiene nada que ver con el sistema y solo confunde
  // a quien lo esta usando en la bodega.
  // Next rechaza una accion del servidor si el origen no cuadra con
  // el host. Entrando derecho por IP:puerto cuadran solos y esto no
  // hace falta; el dia que lo pongan detras de un dominio o un tunel,
  // sin esto TODO lo que se guarda deja de funcionar de golpe y las
  // paginas se siguen viendo bien. Es el fallo mas caro de encontrar
  // por telefono, asi que se deja puesto de antemano.
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "100.92.129.13:3000",
        "*.ts.net",
      ],
    },
  },

  devIndicators: false,
};

export default nextConfig;
