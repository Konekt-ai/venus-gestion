import type Database from "better-sqlite3";
import { normalizarCodigo, normalizarTexto, partirCodigo } from "./codigos";
import { CATALOGO, type FilaCatalogo } from "../datos/catalogo";

/**
 * Puesta en marcha del sistema.
 *
 * El catalogo real del cliente (sus 129 modelos, con foto) vive en
 * src/datos/catalogo.json, sacado de su PDF. De ahi salen dos cosas:
 *
 *   sembrarCatalogo()     deja los modelos listos, con existencia en CERO.
 *                         Es lo que corre la primera vez en la bodega: el
 *                         catalogo dice QUE se vende, no CUANTO hay. Las
 *                         cantidades salen del primer conteo fisico.
 *
 *   sembrarDemostracion() lo mismo, pero ademas inventa ubicaciones y
 *                         existencias para que la demostracion publica se
 *                         vea viva. NUNCA se usa en la bodega.
 */

const MODELOS: FilaCatalogo[] = CATALOGO;

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
export const TOTAL_CATALOGO = MODELOS.length;

/**
 * Carga el catalogo en una base vacia.
 * No hace nada si ya hay modelos: nunca pisa lo que el cliente capturo.
 * Devuelve cuantos modelos quedaron cargados.
 */
export function sembrarCatalogo(db: Database.Database): number {
  const yaHay = db.prepare("SELECT COUNT(*) AS n FROM modelos").get() as { n: number };
  if (yaHay.n > 0) return 0;

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

    for (const m of MODELOS) {
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
  return MODELOS.length;
}

/**
 * Ubicaciones y existencias inventadas para la demostracion publica.
 *
 * Se reparte el catalogo entre dos zonas de tres racks para que se vea
 * como se veria una bodega ya acomodada. Las cantidades salen de una
 * cuenta fija a partir del codigo, no al azar: asi la demostracion se
 * ve igual cada vez que se reinicia.
 */
export function sembrarDemostracion(db: Database.Database): void {
  const modelos = db
    .prepare("SELECT id, codigo_norm FROM modelos WHERE activo = 1 ORDER BY id")
    .all() as { id: number; codigo_norm: string }[];

  if (modelos.length === 0) return;

  const yaTieneUbicaciones = db.prepare("SELECT COUNT(*) AS n FROM ubicaciones").get() as {
    n: number;
  };

  const insertarUbicacion = db.prepare(
    `INSERT OR IGNORE INTO ubicaciones (codigo, zona, rack, nivel, descripcion, orden)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const preparar = db.transaction(() => {
    if (yaTieneUbicaciones.n === 0) {
      let orden = 0;
      for (const zona of ["A", "B"]) {
        for (let rack = 1; rack <= 3; rack++) {
          for (let nivel = 1; nivel <= 3; nivel++) {
            const r = String(rack).padStart(2, "0");
            insertarUbicacion.run(
              `${zona}-${r}-${nivel}`,
              zona,
              r,
              String(nivel),
              zona === "A" && rack === 1 ? "Entrando a la derecha" : "",
              orden++
            );
          }
        }
      }
    }

    const ubicaciones = db.prepare("SELECT id FROM ubicaciones ORDER BY orden, id").all() as {
      id: number;
    }[];

    const acomodar = db.prepare(
      "UPDATE modelos SET ubicacion_id = ?, existencia = ?, minimo = ? WHERE id = ?"
    );
    const movimiento = db.prepare(
      `INSERT INTO movimientos
         (modelo_id, tipo, cantidad, existencia_antes, existencia_despues, ubicacion_id, nota)
       VALUES (?, 'entrada', ?, 0, ?, ?, 'Existencia inicial (demostracion)')`
    );

    modelos.forEach((m, i) => {
      // Cuenta estable a partir del codigo: la demostracion se ve igual
      // cada vez que se reinicia, en vez de cambiar sola.
      const semilla = [...m.codigo_norm].reduce((s, c) => s + c.charCodeAt(0), 0);
      const piezas = semilla % 7 === 0 ? 0 : (semilla % 34) + 3;
      const ubicacion = ubicaciones.length ? ubicaciones[i % ubicaciones.length].id : null;

      acomodar.run(ubicacion, piezas, 8, m.id);
      if (piezas > 0) movimiento.run(m.id, piezas, piezas, ubicacion);
    });
  });

  preparar();
}
