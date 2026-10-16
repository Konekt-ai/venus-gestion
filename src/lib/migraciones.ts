import type Database from "better-sqlite3";

/**
 * Arreglos de datos que se corren una sola vez, al abrir la base.
 *
 * Cada uno deja su marca en config para no repetirse. No importan
 * getDb() a proposito: corren en medio de abrir la conexion.
 */

const MARCA_LUGARES = "migracion_lugares_v1";

/** "Tianguis 1", "TIANGUÍS", "tianguis-a" -> "TIANGUIS1", "TIANGUIS", "TIANGUISA" */
function soloLetras(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/** A que lugar de verdad se referia una ubicacion, si era una de esas. */
function lugarFalso(codigo: string, zona: string): "bodega" | "tienda" | "tianguis" | null {
  for (const texto of [soloLetras(codigo), soloLetras(zona)]) {
    if (texto.startsWith("TIANGUIS")) return "tianguis";
    if (texto.startsWith("TIENDA")) return "tienda";
    if (texto === "BODEGA") return "bodega";
  }
  return null;
}

/**
 * Las ubicaciones "Bodega", "Tienda" y "Tianguis".
 *
 * Cuando el tianguis venia apagado y cada modelo solo tenia un rack, en
 * la bodega crearon esas tres como si fueran racks, para poder anotar
 * donde estaban las piezas. Las piezas de esos modelos se contaban en
 * bodega aunque estuvieran en la tienda o en el tianguis.
 *
 * Aqui se pasan a la cuenta del lugar real (dejando el movimiento en el
 * historial, como cualquier salida) y esas ubicaciones se borran. Las
 * de "Bodega" solo se borran: sus piezas ya estaban donde van.
 */
function migrarUbicacionesFalsas(db: Database.Database): string[] {
  const ubicaciones = db.prepare("SELECT id, codigo, zona FROM ubicaciones").all() as {
    id: number;
    codigo: string;
    zona: string;
  }[];

  const modelosDe = db.prepare(
    "SELECT id, existencia FROM modelos WHERE ubicacion_id = ? AND existencia > 0"
  );
  const mover = db.prepare(
    `UPDATE modelos SET
       existencia  = 0,
       en_tienda   = en_tienda   + @tienda,
       en_tianguis = en_tianguis + @tianguis,
       actualizado_en = datetime('now','localtime')
     WHERE id = @id`
  );
  const anotar = db.prepare(
    `INSERT INTO movimientos (modelo_id, tipo, cantidad, existencia_antes, existencia_despues, nota)
     VALUES (?, ?, ?, ?, 0, ?)`
  );
  const soltar = db.prepare("UPDATE modelos SET ubicacion_id = NULL WHERE ubicacion_id = ?");
  const borrar = db.prepare("DELETE FROM ubicaciones WHERE id = ?");

  const hechos: string[] = [];

  for (const u of ubicaciones) {
    const lugar = lugarFalso(u.codigo, u.zona);
    if (!lugar) continue;

    let piezas = 0;
    if (lugar !== "bodega") {
      const modelos = modelosDe.all(u.id) as { id: number; existencia: number }[];
      for (const m of modelos) {
        mover.run({
          id: m.id,
          tienda: lugar === "tienda" ? m.existencia : 0,
          tianguis: lugar === "tianguis" ? m.existencia : 0,
        });
        anotar.run(
          m.id,
          lugar === "tienda" ? "salida_tienda" : "salida_tianguis",
          m.existencia,
          m.existencia,
          `Estaba anotado en la ubicacion "${u.codigo}"; se paso a la cuenta de ${lugar}`
        );
        piezas += m.existencia;
      }
    }

    soltar.run(u.id);
    borrar.run(u.id);
    hechos.push(
      lugar === "bodega"
        ? `${u.codigo}: sus piezas ya estaban en bodega`
        : `${u.codigo} -> ${lugar} (${piezas} piezas)`
    );
  }

  return hechos;
}

export function correrMigraciones(db: Database.Database): void {
  const hecha = db.prepare("SELECT 1 FROM config WHERE clave = ?").get(MARCA_LUGARES);
  if (hecha) return;

  db.transaction(() => {
    const hechos = migrarUbicacionesFalsas(db);
    db.prepare("INSERT INTO config (clave, valor) VALUES (?, ?)").run(
      MARCA_LUGARES,
      hechos.length > 0 ? hechos.join("; ") : "sin cambios"
    );
    if (hechos.length > 0) {
      console.log("Ubicaciones pasadas a su lugar real:", hechos.join("; "));
    }
  })();
}
