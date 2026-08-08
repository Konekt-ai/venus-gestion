import type Database from "better-sqlite3";

/**
 * Datos de ejemplo.
 *
 * Son los modelos de la lista de "MODELOS MAS VENDIDOS" del cliente, con
 * ubicaciones y existencias inventadas. Sirven para dos cosas:
 *
 *   - probar el sistema en la computadora   (npm run datos:ejemplo)
 *   - llenar la demostracion publica         (VENUS_DEMO=1)
 *
 * Viven aqui, y no dentro del script, para que la demo y las pruebas usen
 * exactamente la misma lista y no se desincronicen.
 */

/** codigo, descripcion, tallas, colores, tela, categoria, ubicacion, piezas */
type FilaEjemplo = [string, string, string, string, string, string, string, number];

const MODELOS: FilaEjemplo[] = [
  ["VD 194", "VESTIDO MIDI OLANES", "GDE - XL - 2XL", "VARIADO", "POWER SATEN", "VESTIDO", "A-01-1", 24],
  ["084", "VESTIDO MAXI DE COPAS SATEN", "CH - M - GDE", "VARIADO", "POWER SATEN", "VESTIDO", "A-01-2", 18],
  ["VD 302", "VESTIDO MANGA MARIPOSA", "GDE - XL - 2XL", "VARIADO", "POWER SATEN", "VESTIDO", "A-01-3", 31],
  ["VD 342", "VESTIDO MIDI OLAN CAMPESINO", "M - GDE - XL", "VARIADO", "POWER SATEN", "VESTIDO", "A-02-1", 12],
  ["004", "VESTIDO SATEN VUELO CORTO", "CH - M - GDE - XL", "VARIADO", "POWER SATEN", "VESTIDO", "A-02-2", 27],
  ["VD 496", "VESTIDO DE TIRAS EN ESPALDA", "CH - UNITALLA", "VARIADO", "POWER SATEN", "VESTIDO", "A-02-3", 9],
  ["VD 410", "VESTIDO ARGOLLA SATEN", "CH - M", "NEGRO", "POWER SATEN", "VESTIDO", "A-03-1", 15],
  ["005", "VESTIDO TECNO MAXI COPA", "GDE - XL", "VARIADO", "TECNO CREPE", "VESTIDO", "A-03-2", 21],
  ["VD 446", "VESTIDO PASTELON MAXI", "VARIADO", "VARIADO", "TECNO CREPE", "VESTIDO", "A-03-3", 6],
  ["PD 46", "PANTALON VOGUE", "", "VARIADO", "POWER SATEN", "PANTALON", "B-01-1", 33],
  ["NP 284", "PANTALON FAJO Y HEBILLA", "M - GDE - XL", "NEGRO", "TECNO CREPE", "PANTALON", "B-01-2", 14],
  ["PD 320", "PALAZZO MONO", "M - XL", "VARIADO", "TECNO CREPE", "PALAZZO", "B-01-3", 19],
  ["CD 281", "CONJUNTO CHALECO Y PANTALON", "M - GDE - XL", "NEGRO Y BEIGE", "BARBIE TWILL", "CONJUNTO", "B-02-1", 8],
  ["202", "BLAZER MANGA 3/4", "VARIADO", "COLORES BASICOS", "TECNO CREPE", "BLAZER", "B-02-2", 0],
];

/** Que significan las letras de cada codigo. */
const LINEAS: [string, string][] = [
  ["VD", "Vestidos"],
  ["PD", "Palazzos"],
  ["NP", "Pantalones"],
  ["CD", "Conjuntos"],
];

const ZONAS = ["A", "B"];
const RACKS_POR_ZONA = 3;
const NIVELES_POR_RACK = 3;

/**
 * Llena una base vacia con los datos de ejemplo.
 * No hace nada si ya hay modelos, para no duplicar ni pisar datos reales.
 * Devuelve cuantos modelos quedaron cargados.
 */
export function sembrarEjemplo(db: Database.Database): number {
  const yaHay = db.prepare("SELECT COUNT(*) AS n FROM modelos").get() as { n: number };
  if (yaHay.n > 0) return 0;

  const cargar = db.transaction(() => {
    // --- Ubicaciones ---
    const insertarUbicacion = db.prepare(
      `INSERT OR IGNORE INTO ubicaciones (codigo, zona, rack, nivel, descripcion, orden)
       VALUES (?, ?, ?, ?, ?, ?)`
    );

    let orden = 0;
    for (const zona of ZONAS) {
      for (let rack = 1; rack <= RACKS_POR_ZONA; rack++) {
        for (let nivel = 1; nivel <= NIVELES_POR_RACK; nivel++) {
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

    const porCodigo = new Map(
      (db.prepare("SELECT id, codigo FROM ubicaciones").all() as {
        id: number;
        codigo: string;
      }[]).map((u) => [u.codigo, u.id])
    );

    // --- Lineas ---
    const insertarLinea = db.prepare(
      `INSERT INTO lineas (prefijo, nombre) VALUES (?, ?)
       ON CONFLICT(prefijo) DO UPDATE SET nombre = excluded.nombre`
    );
    for (const [prefijo, nombre] of LINEAS) insertarLinea.run(prefijo, nombre);

    // --- Modelos ---
    const insertarModelo = db.prepare(
      `INSERT INTO modelos
         (codigo, codigo_norm, prefijo, numero, descripcion, categoria,
          tallas, colores, tela, ubicacion_id, minimo, destacado)
       VALUES (@codigo, @codigo_norm, @prefijo, @numero, @descripcion, @categoria,
               @tallas, @colores, @tela, @ubicacion_id, @minimo, 1)`
    );

    const insertarMovimiento = db.prepare(
      `INSERT INTO movimientos
         (modelo_id, tipo, cantidad, existencia_antes, existencia_despues, ubicacion_id, nota)
       VALUES (?, 'entrada', ?, 0, ?, ?, 'Existencia inicial (datos de ejemplo)')`
    );

    const fijarExistencia = db.prepare("UPDATE modelos SET existencia = ? WHERE id = ?");

    for (const [codigo, descripcion, tallas, colores, tela, categoria, ubic, piezas] of MODELOS) {
      const norm = codigo.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
      const partes = norm.match(/^([A-Z]*)(\d*)/);
      const ubicacionId = porCodigo.get(ubic) ?? null;

      const info = insertarModelo.run({
        codigo,
        codigo_norm: norm,
        prefijo: partes?.[1] ?? "",
        numero: partes?.[2] ? parseInt(partes[2], 10) : null,
        descripcion,
        categoria,
        tallas,
        colores,
        tela,
        ubicacion_id: ubicacionId,
        minimo: 10,
      });

      const id = Number(info.lastInsertRowid);

      if (piezas > 0) {
        fijarExistencia.run(piezas, id);
        insertarMovimiento.run(id, piezas, piezas, ubicacionId);
      }
    }
  });

  cargar();
  return MODELOS.length;
}

/** Cuantos modelos trae la lista de ejemplo, sin tocar la base. */
export const TOTAL_EJEMPLO = MODELOS.length;
