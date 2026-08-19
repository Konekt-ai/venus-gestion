/**
 * Mete el catalogo del cliente a la base de datos.
 *
 *   npm run catalogo:importar
 *
 * Lee src/datos/catalogo.json (lo genera scripts/preparar-catalogo.mjs a
 * partir del PDF) y da de alta los modelos.
 *
 * Es seguro correrlo las veces que haga falta: si un modelo ya existe
 * NO le toca las existencias ni la ubicacion, solo actualiza la ficha
 * (nombre, tela, foto, notas). Asi se puede recargar el catalogo sin
 * perder el inventario que ya se conto.
 *
 * Los modelos entran con existencia en CERO a proposito: el catalogo
 * dice que prendas se venden, no cuantas hay. Las cantidades salen del
 * primer conteo fisico.
 */
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { register } from "node:module";

register("./cargador-ts.mjs", import.meta.url);

const { ESQUEMA } = await import("../src/lib/esquema.ts");
const { normalizarCodigo, partirCodigo, normalizarTexto } = await import("../src/lib/codigos.ts");

const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const rutaCatalogo = path.join(raiz, "src", "datos", "catalogo.ts");
const rutaDb = process.env.VENUS_DB ?? path.join(raiz, "data", "venus.db");

if (!fs.existsSync(rutaCatalogo)) {
  console.error(
    "No encontre src/datos/catalogo.ts.\n" +
      'Genera primero el catalogo con:  npm run catalogo -- "ruta/del/catalogo.pdf"'
  );
  process.exit(1);
}

const { CATALOGO: modelos, ORIGEN: origen } = await import("../src/datos/catalogo.ts");

fs.mkdirSync(path.dirname(rutaDb), { recursive: true });
const db = new Database(rutaDb);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(ESQUEMA);

/* ---------- catalogos de apoyo ---------- */

const insertarCatalogo = db.prepare(
  "INSERT OR IGNORE INTO catalogos (tipo, valor, orden) VALUES (?, ?, 500)"
);

/* ---------- lineas (que significan las letras) ---------- */

const NOMBRES_LINEA = {
  VD: "Vestidos",
  BD: "Blusas",
  CD: "Conjuntos",
  PD: "Pantalones y palazzos",
  SD: "Shorts y sacos",
  FD: "Faldas",
  MD: "Monos",
  JD: "Jumpers",
  TD: "Tops y blusas",
  NP: "Pantalones",
};

const insertarLinea = db.prepare(
  `INSERT INTO lineas (prefijo, nombre) VALUES (?, ?)
   ON CONFLICT(prefijo) DO UPDATE SET nombre = excluded.nombre`
);

/* ---------- modelos ---------- */

const buscar = db.prepare("SELECT id, existencia FROM modelos WHERE codigo_norm = ?");

const insertar = db.prepare(
  `INSERT INTO modelos
     (codigo, codigo_norm, prefijo, numero, descripcion, categoria,
      tallas, colores, tela, foto, notas, destacado, minimo, existencia)
   VALUES (@codigo, @codigo_norm, @prefijo, @numero, @descripcion, @categoria,
           @tallas, @colores, @tela, @foto, @notas, @destacado, 0, 0)`
);

// Al actualizar no se tocan existencia, en_tienda, en_tianguis ni
// ubicacion_id: eso es inventario real y el catalogo no sabe de eso.
const actualizar = db.prepare(
  `UPDATE modelos SET
     codigo = @codigo, prefijo = @prefijo, numero = @numero,
     descripcion = @descripcion,
     categoria = CASE WHEN @categoria <> '' THEN @categoria ELSE categoria END,
     tallas    = CASE WHEN @tallas    <> '' THEN @tallas    ELSE tallas    END,
     colores   = CASE WHEN @colores   <> '' THEN @colores   ELSE colores   END,
     tela      = CASE WHEN @tela      <> '' THEN @tela      ELSE tela      END,
     foto      = CASE WHEN @foto      <> '' THEN @foto      ELSE foto      END,
     notas     = CASE WHEN @notas     <> '' THEN @notas     ELSE notas     END,
     destacado = @destacado,
     activo = 1,
     actualizado_en = datetime('now','localtime')
   WHERE id = @id`
);

let nuevos = 0;
let actualizados = 0;
const prefijosVistos = new Set();

const cargar = db.transaction(() => {
  for (const m of modelos) {
    const codigoNorm = normalizarCodigo(m.codigo);
    const { prefijo, numero } = partirCodigo(m.codigo);

    const campos = {
      codigo: m.codigo.toUpperCase(),
      codigo_norm: codigoNorm,
      prefijo,
      numero,
      descripcion: normalizarTexto(m.descripcion),
      categoria: normalizarTexto(m.categoria || ""),
      tallas: normalizarTexto(m.tallas || ""),
      colores: normalizarTexto(m.colores || ""),
      tela: normalizarTexto(m.tela || ""),
      foto: m.foto || "",
      notas: m.notas || "",
      destacado: m.destacado ? 1 : 0,
    };

    const existente = buscar.get(codigoNorm);
    if (existente) {
      actualizar.run({ ...campos, id: existente.id });
      actualizados++;
    } else {
      insertar.run(campos);
      nuevos++;
    }

    if (campos.categoria) insertarCatalogo.run("categoria", campos.categoria);
    if (campos.tela) insertarCatalogo.run("tela", campos.tela);
    if (prefijo) prefijosVistos.add(prefijo);
  }

  for (const p of prefijosVistos) {
    if (NOMBRES_LINEA[p]) insertarLinea.run(p, NOMBRES_LINEA[p]);
  }
});

cargar();

/* ---------- resumen ---------- */

const total = db.prepare("SELECT COUNT(*) AS n, COALESCE(SUM(existencia),0) AS p FROM modelos WHERE activo = 1").get();
const conFoto = db.prepare("SELECT COUNT(*) AS n FROM modelos WHERE foto <> '' AND activo = 1").get();
const ubicaciones = db.prepare("SELECT COUNT(*) AS n FROM ubicaciones").get();

console.log(`Catalogo importado (${origen})`);
console.log(`  ${nuevos} modelos nuevos`);
console.log(`  ${actualizados} ya existian y se actualizo su ficha`);
console.log("");
console.log(`  ${total.n} modelos en el sistema, ${conFoto.n} con foto`);
console.log(`  ${total.p} piezas registradas`);
console.log(`  ${ubicaciones.n} ubicaciones creadas`);

if (total.p === 0) {
  console.log("");
  console.log("  Los modelos entraron con existencia en cero, que es lo correcto:");
  console.log("  el catalogo dice QUE se vende, no CUANTO hay.");
  console.log("  El siguiente paso es contar la bodega desde la pantalla de Conteo.");
}

db.close();
