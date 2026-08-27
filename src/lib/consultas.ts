import "server-only";
import { getDb } from "./db";
import { normalizarCodigo, normalizarTexto, partirCodigo } from "./codigos";
import { hayFoto } from "./fotos";
import type {
  Persona,
  Conteo,
  ConteoLineaConModelo,
  Linea,
  Modelo,
  ModeloConUbicacion,
  MovimientoConModelo,
  Remision,
  Ubicacion,
} from "./tipos";

const CAMPOS_MODELO = `
  m.*,
  u.codigo AS ubicacion_codigo,
  u.zona   AS ubicacion_zona
`;


/**
 * Deja en blanco la foto de los modelos cuyo archivo no esta en el disco.
 *
 * La carpeta de fotos no viaja en el repositorio (son del cliente), asi
 * que una copia recien clonada tiene los modelos apuntando a fotos que
 * no existen. Vaciarlo aqui, de una vez, hace que todas las pantallas
 * dibujen la percha en vez de una imagen rota.
 */
export function conFotosReales<T extends { foto: string }>(filas: T[]): T[] {
  return filas.map((f) => (hayFoto(f.foto) ? f : { ...f, foto: "" }));
}

/* ============================================================
   BUSQUEDA
   ============================================================ */

export type FiltrosBusqueda = {
  q?: string;
  ubicacionId?: number | null;
  /** Solo los modelos a los que todavia no se les asigno un lugar. */
  sinUbicacion?: boolean;
  /** Filtra por la linea del codigo: VD, VN, PD... */
  prefijo?: string;
  categoria?: string;
  /** Solo los que el cliente marco como "mas vendidos". */
  soloDestacados?: boolean;
  /**
   * Muestra los modelos dados de baja en vez de los activos.
   * Es la unica forma de encontrarlos para volver a activarlos.
   */
  archivados?: boolean;
  /** 'todos' | 'con' (hay piezas) | 'sin' (agotado) | 'bajo' (por debajo del minimo) */
  existencia?: string;
  /** 'codigo' | 'existencia' | 'reciente' | 'ubicacion' */
  orden?: string;
  limite?: number;
};

/**
 * Busca modelos de forma tolerante a como se escriben los codigos.
 *
 * Buscar "84" encuentra el modelo "084"; buscar "vd194" o "VD 194"
 * encuentran el mismo. Tambien busca dentro de la descripcion, la tela
 * y los colores, porque muchas veces solo recuerdan "el midi de olanes".
 */
export function buscarModelos(filtros: FiltrosBusqueda = {}): ModeloConUbicacion[] {
  const db = getDb();
  const q = (filtros.q ?? "").trim();
  const limite = Math.min(filtros.limite ?? 300, 2000);

  const condiciones: string[] = [filtros.archivados ? "m.activo = 0" : "m.activo = 1"];
  const params: Record<string, unknown> = { limite };

  if (q) {
    const norm = normalizarCodigo(q);
    const texto = normalizarTexto(q);
    const { prefijo, numero } = partirCodigo(q);

    params.exacto = norm;
    params.likeCodigo = `%${norm}%`;
    params.iniciaCodigo = `${norm}%`;
    params.likeTexto = `%${texto}%`;
    params.numero = numero;
    params.prefijo = prefijo;

    condiciones.push(`(
      m.codigo_norm = @exacto
      OR m.codigo_norm LIKE @iniciaCodigo
      OR m.codigo_norm LIKE @likeCodigo
      OR (@numero IS NOT NULL AND m.numero = @numero)
      OR m.descripcion LIKE @likeTexto
      OR m.tela        LIKE @likeTexto
      OR m.colores     LIKE @likeTexto
      OR m.tallas      LIKE @likeTexto
      OR m.notas       LIKE @likeTexto
    )`);
  }

  if (filtros.ubicacionId != null) {
    condiciones.push("m.ubicacion_id = @ubicacionId");
    params.ubicacionId = filtros.ubicacionId;
  }

  if (filtros.sinUbicacion) {
    condiciones.push("m.ubicacion_id IS NULL");
  }

  if (filtros.prefijo) {
    condiciones.push("m.prefijo = @prefijoFiltro");
    params.prefijoFiltro = normalizarCodigo(filtros.prefijo);
  }

  if (filtros.categoria) {
    condiciones.push("m.categoria = @categoria");
    params.categoria = normalizarTexto(filtros.categoria);
  }

  if (filtros.soloDestacados) {
    condiciones.push("m.destacado = 1");
  }

  switch (filtros.existencia) {
    case "con":
      condiciones.push("m.existencia > 0");
      break;
    case "sin":
      condiciones.push("m.existencia <= 0");
      break;
    case "bajo":
      condiciones.push("m.minimo > 0 AND m.existencia <= m.minimo");
      break;
  }

  // Relevancia: primero la coincidencia exacta de codigo, luego por
  // numero, luego los que empiezan igual, y al final el texto libre.
  // Sin busqueda no se ordena por relevancia: en SQLite un ORDER BY
  // que empieza con un numero suelto se lee como "la columna N", no
  // como una constante, y la consulta truena.
  const relevancia = q
    ? `CASE
         WHEN m.codigo_norm = @exacto THEN 0
         WHEN @numero IS NOT NULL AND m.numero = @numero AND m.prefijo = @prefijo THEN 1
         WHEN m.codigo_norm LIKE @iniciaCodigo THEN 2
         WHEN @numero IS NOT NULL AND m.numero = @numero THEN 3
         ELSE 4
       END`
    : "";

  let orden: string;
  switch (filtros.orden) {
    case "existencia":
      orden = "m.existencia DESC, m.prefijo, m.numero";
      break;
    case "reciente":
      orden = "m.actualizado_en DESC";
      break;
    case "ubicacion":
      orden = "u.zona IS NULL, u.zona, u.rack, u.nivel, m.prefijo, m.numero";
      break;
    default:
      orden = "m.prefijo, m.numero, m.codigo_norm";
  }

  const ordenFinal = [relevancia, orden].filter(Boolean).join(", ");

  const sql = `
    SELECT ${CAMPOS_MODELO}
    FROM modelos m
    LEFT JOIN ubicaciones u ON u.id = m.ubicacion_id
    WHERE ${condiciones.join(" AND ")}
    ORDER BY ${ordenFinal}
    LIMIT @limite
  `;

  return conFotosReales(db.prepare(sql).all(params) as ModeloConUbicacion[]);
}

/* ============================================================
   MODELOS
   ============================================================ */

export function obtenerModelo(id: number): ModeloConUbicacion | null {
  const db = getDb();
  const fila = db
    .prepare(
      `SELECT ${CAMPOS_MODELO}
       FROM modelos m
       LEFT JOIN ubicaciones u ON u.id = m.ubicacion_id
       WHERE m.id = ?`
    )
    .get(id) as ModeloConUbicacion | undefined;
  return fila ? conFotosReales([fila])[0] : null;
}

export function obtenerModeloPorCodigo(codigo: string): ModeloConUbicacion | null {
  const db = getDb();
  const fila = db
    .prepare(
      `SELECT ${CAMPOS_MODELO}
       FROM modelos m
       LEFT JOIN ubicaciones u ON u.id = m.ubicacion_id
       WHERE m.codigo_norm = ?`
    )
    .get(normalizarCodigo(codigo)) as ModeloConUbicacion | undefined;
  return fila ? conFotosReales([fila])[0] : null;
}

export function movimientosDeModelo(modeloId: number, limite = 50): MovimientoConModelo[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT mv.*, m.codigo AS modelo_codigo, m.descripcion AS modelo_descripcion
       FROM movimientos mv
       JOIN modelos m ON m.id = mv.modelo_id
       WHERE mv.modelo_id = ?
       ORDER BY mv.fecha DESC, mv.id DESC
       LIMIT ?`
    )
    .all(modeloId, limite) as MovimientoConModelo[];
}

/* ============================================================
   UBICACIONES
   ============================================================ */

export type UbicacionConTotales = Ubicacion & {
  total_modelos: number;
  total_piezas: number;
};

export function listarUbicaciones(): UbicacionConTotales[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT u.*,
              COUNT(m.id)                      AS total_modelos,
              COALESCE(SUM(m.existencia), 0)   AS total_piezas
       FROM ubicaciones u
       LEFT JOIN modelos m ON m.ubicacion_id = u.id AND m.activo = 1
       GROUP BY u.id
       ORDER BY u.zona, u.rack, u.nivel`
    )
    .all() as UbicacionConTotales[];
}

export function obtenerUbicacion(id: number): Ubicacion | null {
  const db = getDb();
  const fila = db.prepare("SELECT * FROM ubicaciones WHERE id = ?").get(id) as
    | Ubicacion
    | undefined;
  return fila ?? null;
}

/* ============================================================
   CATALOGOS Y LINEAS
   ============================================================ */

export function listarCatalogo(tipo: string): string[] {
  const db = getDb();
  const filas = db
    .prepare("SELECT valor FROM catalogos WHERE tipo = ? ORDER BY orden, valor")
    .all(tipo) as { valor: string }[];
  return filas.map((f) => f.valor);
}

export function listarLineas(): Linea[] {
  const db = getDb();
  return db.prepare("SELECT * FROM lineas ORDER BY orden, prefijo").all() as Linea[];
}

/** Prefijo -> nombre de la linea, para mostrar "VN = Vestidos de Nelly". */
export function nombresDeLineas(): Map<string, string> {
  return new Map(listarLineas().map((l) => [l.prefijo, l.nombre]));
}

/** Prefijos que realmente se estan usando en los modelos capturados. */
export function prefijosEnUso(): { prefijo: string; total: number }[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT prefijo, COUNT(*) AS total
       FROM modelos WHERE activo = 1
       GROUP BY prefijo ORDER BY total DESC, prefijo`
    )
    .all() as { prefijo: string; total: number }[];
}

/**
 * Tipos de prenda que de verdad hay capturados, del mas comun al menos.
 * Se cuentan aqui y no se listan a mano porque el catalogo del cliente
 * crece: si un dia da de alta un CHALECO nuevo, aparece solo.
 */
export function categoriasEnUso(): { categoria: string; total: number }[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT categoria, COUNT(*) AS total
       FROM modelos WHERE activo = 1 AND categoria <> ''
       GROUP BY categoria ORDER BY total DESC, categoria`
    )
    .all() as { categoria: string; total: number }[];
}

/* ============================================================
   MOVIMIENTOS Y REMISIONES
   ============================================================ */

export function movimientosRecientes(limite = 50): MovimientoConModelo[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT mv.*, m.codigo AS modelo_codigo, m.descripcion AS modelo_descripcion
       FROM movimientos mv
       JOIN modelos m ON m.id = mv.modelo_id
       ORDER BY mv.fecha DESC, mv.id DESC
       LIMIT ?`
    )
    .all(limite) as MovimientoConModelo[];
}

export function listarRemisiones(limite = 100): Remision[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM remisiones ORDER BY fecha DESC, id DESC LIMIT ?")
    .all(limite) as Remision[];
}

export function obtenerRemision(id: number): Remision | null {
  const db = getDb();
  const fila = db.prepare("SELECT * FROM remisiones WHERE id = ?").get(id) as
    | Remision
    | undefined;
  return fila ?? null;
}

export function lineasDeRemision(remisionId: number): MovimientoConModelo[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT mv.*, m.codigo AS modelo_codigo, m.descripcion AS modelo_descripcion
       FROM movimientos mv
       JOIN modelos m ON m.id = mv.modelo_id
       WHERE mv.remision_id = ?
       ORDER BY m.prefijo, m.numero`
    )
    .all(remisionId) as MovimientoConModelo[];
}

/* ============================================================
   CONTEOS
   ============================================================ */

export function conteoAbierto(): Conteo | null {
  const db = getDb();
  const fila = db
    .prepare("SELECT * FROM conteos WHERE estado = 'abierto' ORDER BY id DESC LIMIT 1")
    .get() as Conteo | undefined;
  return fila ?? null;
}

export function listarConteos(limite = 50): Conteo[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM conteos ORDER BY iniciado_en DESC LIMIT ?")
    .all(limite) as Conteo[];
}

export function obtenerConteo(id: number): Conteo | null {
  const db = getDb();
  const fila = db.prepare("SELECT * FROM conteos WHERE id = ?").get(id) as Conteo | undefined;
  return fila ?? null;
}

export function lineasDeConteo(conteoId: number): ConteoLineaConModelo[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT cl.*,
              m.codigo      AS modelo_codigo,
              m.descripcion AS modelo_descripcion,
              u.codigo      AS ubicacion_codigo
       FROM conteo_lineas cl
       JOIN modelos m ON m.id = cl.modelo_id
       LEFT JOIN ubicaciones u ON u.id = m.ubicacion_id
       WHERE cl.conteo_id = ?
       ORDER BY u.zona, u.rack, u.nivel, m.prefijo, m.numero`
    )
    .all(conteoId) as ConteoLineaConModelo[];
}

/* ============================================================
   RESUMEN PARA LA PANTALLA DE INICIO
   ============================================================ */

export type Resumen = {
  total_modelos: number;
  total_piezas: number;
  piezas_tienda: number;
  piezas_tianguis: number;
  agotados: number;
  bajos: number;
  sin_ubicacion: number;
  total_ubicaciones: number;
  /**
   * false mientras la bodega no se haya contado ni una vez.
   * Recien instalado, el catalogo esta cargado pero todo vale cero: los
   * avisos de "agotado" son ruido y lo que hace falta es cargar las
   * cantidades, no surtir.
   */
  ya_hubo_inventario: boolean;
};

export function resumen(): Resumen {
  const db = getDb();
  const r = db
    .prepare(
      `SELECT
         COUNT(*)                                                   AS total_modelos,
         COALESCE(SUM(existencia), 0)                               AS total_piezas,
         COALESCE(SUM(en_tienda), 0)                                AS piezas_tienda,
         COALESCE(SUM(en_tianguis), 0)                              AS piezas_tianguis,
         COALESCE(SUM(CASE WHEN existencia <= 0 THEN 1 ELSE 0 END), 0) AS agotados,
         COALESCE(SUM(CASE WHEN minimo > 0 AND existencia > 0 AND existencia <= minimo
                           THEN 1 ELSE 0 END), 0)                   AS bajos,
         COALESCE(SUM(CASE WHEN ubicacion_id IS NULL THEN 1 ELSE 0 END), 0) AS sin_ubicacion
       FROM modelos WHERE activo = 1`
    )
    .get() as Omit<Resumen, "total_ubicaciones">;

  const u = db.prepare("SELECT COUNT(*) AS n FROM ubicaciones WHERE activa = 1").get() as {
    n: number;
  };

  // Cualquier movimiento sirve como senal de que ya empezaron a usarlo.
  const mov = db.prepare("SELECT EXISTS(SELECT 1 FROM movimientos) AS hay").get() as {
    hay: number;
  };

  return { ...r, total_ubicaciones: u.n, ya_hubo_inventario: mov.hay === 1 };
}

/** Modelos que ya se agotaron o van bajos, para avisar en el inicio. */
export function modelosPorSurtir(limite = 12): ModeloConUbicacion[] {
  const db = getDb();
  return conFotosReales(db
    .prepare(
      `SELECT ${CAMPOS_MODELO}
       FROM modelos m
       LEFT JOIN ubicaciones u ON u.id = m.ubicacion_id
       WHERE m.activo = 1
         AND (m.existencia <= 0 OR (m.minimo > 0 AND m.existencia <= m.minimo))
       ORDER BY m.existencia, m.prefijo, m.numero
       LIMIT ?`
    )
    .all(limite) as ModeloConUbicacion[]);
}

export function todosLosModelos(): Modelo[] {
  const db = getDb();
  return conFotosReales(
    db.prepare("SELECT * FROM modelos WHERE activo = 1 ORDER BY prefijo, numero").all() as Modelo[]
  );
}

/* ============================================================
   PERSONAL
   ============================================================ */

/** Personal activo, para elegir quien hace cada movimiento. */
export function listarPersonal(soloActivos = true): Persona[] {
  const db = getDb();
  const donde = soloActivos ? "WHERE activo = 1" : "";
  return db
    .prepare(`SELECT * FROM personal ${donde} ORDER BY activo DESC, orden, nombre`)
    .all() as Persona[];
}
