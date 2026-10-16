import type Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { normalizarCodigo, normalizarTexto, partirCodigo } from "./codigos";

/**
 * Puesta en marcha del sistema.
 *
 * El catalogo real del cliente (sus modelos, con foto) vive en
 * src/datos/catalogo.json, sacado de su PDF. De ahi salen dos cosas:
 *
 *   sembrarCatalogo()     deja los modelos listos, con existencia en CERO.
 *                         Es lo que corre la primera vez en la bodega: el
 *                         catalogo dice QUE se vende, no CUANTO hay. Las
 *                         cantidades salen del primer conteo fisico.
 *
 *   sembrarDemostracion() lo mismo, pero ademas inventa existencias en
 *                         bodega, tienda y tianguis para que la demostracion se
 *                         vea viva. NUNCA se usa en la bodega.
 */

export type FilaCatalogo = {
  codigo: string;
  descripcion: string;
  categoria: string;
  tela: string;
  tallas: string;
  colores: string;
  foto: string;
  notas: string;
  destacado: number;
};

const RUTA_CATALOGO = path.join(process.cwd(), "src", "datos", "catalogo.json");

/**
 * Los modelos del cliente, leidos del disco al arrancar.
 *
 * No viene como import: ese archivo trae la ficha de confeccion de cada
 * prenda (avios, indicaciones, proveedor), que es informacion del
 * negocio y no tiene por que viajar en el repositorio. Leyendolo asi, el
 * sistema arranca igual aunque el archivo no este: simplemente empieza
 * con el catalogo vacio y se captura a mano o se importa de Excel.
 */
function leerCatalogo(): FilaCatalogo[] {
  try {
    const crudo = JSON.parse(fs.readFileSync(RUTA_CATALOGO, "utf8"));
    const filas = Array.isArray(crudo) ? crudo : crudo.modelos;
    return Array.isArray(filas) ? (filas as FilaCatalogo[]) : [];
  } catch {
    return [];
  }
}

let cache: FilaCatalogo[] | null = null;

function modelos(): FilaCatalogo[] {
  if (!cache) cache = leerCatalogo();
  return cache;
}

/** Que significan las letras con las que empiezan los codigos. */
const NOMBRES_LINEA: Record<string, string> = {
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

/** Cuantos modelos trae el catalogo, sin tocar la base. */
export function totalCatalogo(): number {
  return modelos().length;
}

/**
 * Carga el catalogo en una base vacia.
 * No hace nada si ya hay modelos: nunca pisa lo que el cliente capturo.
 * Devuelve cuantos modelos quedaron cargados.
 */
export function sembrarCatalogo(db: Database.Database): number {
  const yaHay = db.prepare("SELECT COUNT(*) AS n FROM modelos").get() as { n: number };
  if (yaHay.n > 0) return 0;
  if (modelos().length === 0) return 0;

  const insertarModelo = db.prepare(
    `INSERT INTO modelos
       (codigo, codigo_norm, prefijo, numero, descripcion, categoria,
        tallas, colores, tela, foto, notas, destacado)
     VALUES (@codigo, @codigo_norm, @prefijo, @numero, @descripcion, @categoria,
             @tallas, @colores, @tela, @foto, @notas, @destacado)`
  );

  const insertarCatalogo = db.prepare(
    "INSERT OR IGNORE INTO catalogos (tipo, valor, orden) VALUES (?, ?, 500)"
  );

  const insertarLinea = db.prepare(
    `INSERT INTO lineas (prefijo, nombre) VALUES (?, ?)
     ON CONFLICT(prefijo) DO UPDATE SET nombre = excluded.nombre`
  );

  const cargar = db.transaction(() => {
    const prefijos = new Set<string>();

    for (const m of modelos()) {
      const { prefijo, numero } = partirCodigo(m.codigo);
      const categoria = normalizarTexto(m.categoria || "");
      const tela = normalizarTexto(m.tela || "");

      insertarModelo.run({
        codigo: m.codigo.toUpperCase(),
        codigo_norm: normalizarCodigo(m.codigo),
        prefijo,
        numero,
        descripcion: normalizarTexto(m.descripcion),
        categoria,
        tallas: normalizarTexto(m.tallas || ""),
        colores: normalizarTexto(m.colores || ""),
        tela,
        foto: m.foto || "",
        notas: m.notas || "",
        destacado: m.destacado ? 1 : 0,
      });

      if (categoria) insertarCatalogo.run("categoria", categoria);
      if (tela) insertarCatalogo.run("tela", tela);
      if (prefijo) prefijos.add(prefijo);
    }

    for (const p of prefijos) {
      if (NOMBRES_LINEA[p]) insertarLinea.run(p, NOMBRES_LINEA[p]);
    }
  });

  cargar();
  return modelos().length;
}

/**
 * Existencias inventadas para la demostracion publica.
 *
 * Se reparte el catalogo entre bodega, tienda y tianguis para que se
 * vea como se veria un negocio ya andando. Las cantidades salen de una
 * cuenta fija a partir del codigo, no al azar: asi la demostracion se
 * ve igual cada vez que se reinicia.
 */
export function sembrarDemostracion(db: Database.Database): void {
  const modelos = db
    .prepare("SELECT id, codigo_norm FROM modelos WHERE activo = 1 ORDER BY id")
    .all() as { id: number; codigo_norm: string }[];

  if (modelos.length === 0) return;

  const acomodar = db.prepare(
    "UPDATE modelos SET existencia = ?, en_tienda = ?, en_tianguis = ?, minimo = ? WHERE id = ?"
  );
  const movimiento = db.prepare(
    `INSERT INTO movimientos
       (modelo_id, tipo, cantidad, existencia_antes, existencia_despues, nota)
     VALUES (?, ?, ?, 0, ?, 'Existencia inicial (demostracion)')`
  );

  db.transaction(() => {
    for (const m of modelos) {
      // Cuenta estable a partir del codigo: la demostracion se ve igual
      // cada vez que se reinicia, en vez de cambiar sola.
      const semilla = [...m.codigo_norm].reduce((s, c) => s + c.charCodeAt(0), 0);
      const bodega = semilla % 7 === 0 ? 0 : (semilla % 34) + 3;
      const tienda = semilla % 5;
      const tianguis = semilla % 3 === 0 ? (semilla % 6) + 1 : 0;

      acomodar.run(bodega, tienda, tianguis, 8, m.id);
      if (bodega > 0) movimiento.run(m.id, "entrada", bodega, bodega);
      if (tienda > 0) movimiento.run(m.id, "entrada_tienda", tienda, tienda);
      if (tianguis > 0) movimiento.run(m.id, "entrada_tianguis", tianguis, tianguis);
    }
  })();
}
