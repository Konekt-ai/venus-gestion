/**
 * Esquema de la base de datos (SQLite).
 *
 * Va como texto dentro de un modulo TypeScript a proposito: asi el
 * esquema viaja dentro del build de Next y no depende de que el
 * archivo .sql siga en su lugar cuando la app corre en la bodega.
 *
 * Todo el inventario se lleva POR MODELO (una existencia total por
 * codigo). Tallas, colores y tela se guardan como datos descriptivos
 * del modelo, tal como aparecen en el cuaderno.
 */
export const ESQUEMA = `
PRAGMA foreign_keys = ON;

-- ------------------------------------------------------------
-- Lineas: el prefijo de letras del codigo y a que corresponde.
-- Ej. VN = "Vestidos de Nelly", VD = "Vestidos", PD = "Palazzo".
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lineas (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  prefijo      TEXT    NOT NULL UNIQUE,
  nombre       TEXT    NOT NULL,
  color        TEXT    NOT NULL DEFAULT '#64748b',
  orden        INTEGER NOT NULL DEFAULT 0,
  creado_en    TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

-- ------------------------------------------------------------
-- Ubicaciones fisicas de la bodega.
-- Jerarquia libre: Zona > Rack > Nivel. Cualquiera puede ir vacio,
-- asi funciona igual para racks, tarimas, cajas o mesas.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ubicaciones (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo       TEXT    NOT NULL UNIQUE,
  zona         TEXT    NOT NULL,
  rack         TEXT    NOT NULL DEFAULT '',
  nivel        TEXT    NOT NULL DEFAULT '',
  descripcion  TEXT    NOT NULL DEFAULT '',
  activa       INTEGER NOT NULL DEFAULT 1,
  orden        INTEGER NOT NULL DEFAULT 0,
  creado_en    TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_ubicaciones_zona ON ubicaciones(zona, rack, nivel);

-- ------------------------------------------------------------
-- Modelos: el catalogo de prendas.
-- 'codigo' se guarda como lo escribe el cliente ("VD 194").
-- 'codigo_norm' es la version sin espacios ni guiones ("VD194")
-- y es la que se usa para buscar y para evitar duplicados.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS modelos (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo        TEXT    NOT NULL,
  codigo_norm   TEXT    NOT NULL UNIQUE,
  prefijo       TEXT    NOT NULL DEFAULT '',
  numero        INTEGER,
  descripcion   TEXT    NOT NULL DEFAULT '',
  categoria     TEXT    NOT NULL DEFAULT '',
  tallas        TEXT    NOT NULL DEFAULT '',
  colores       TEXT    NOT NULL DEFAULT '',
  tela          TEXT    NOT NULL DEFAULT '',
  existencia    INTEGER NOT NULL DEFAULT 0,
  en_tienda     INTEGER NOT NULL DEFAULT 0,
  en_tianguis   INTEGER NOT NULL DEFAULT 0,
  minimo        INTEGER NOT NULL DEFAULT 0,
  ubicacion_id  INTEGER REFERENCES ubicaciones(id) ON DELETE SET NULL,
  foto          TEXT    NOT NULL DEFAULT '',
  notas         TEXT    NOT NULL DEFAULT '',
  destacado     INTEGER NOT NULL DEFAULT 0,
  activo        INTEGER NOT NULL DEFAULT 1,
  creado_en     TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
  actualizado_en TEXT   NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_modelos_norm      ON modelos(codigo_norm);
CREATE INDEX IF NOT EXISTS idx_modelos_prefijo   ON modelos(prefijo, numero);
CREATE INDEX IF NOT EXISTS idx_modelos_ubicacion ON modelos(ubicacion_id);
CREATE INDEX IF NOT EXISTS idx_modelos_activo    ON modelos(activo);

-- ------------------------------------------------------------
-- Remisiones: agrupa un envio completo (la hoja del cuaderno).
-- Una remision a TIENDA con 8 modelos = una sola hoja imprimible.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS remisiones (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  folio        TEXT    NOT NULL UNIQUE,
  destino      TEXT    NOT NULL,
  tipo         TEXT    NOT NULL,
  persona      TEXT    NOT NULL DEFAULT '',
  nota         TEXT    NOT NULL DEFAULT '',
  estado       TEXT    NOT NULL DEFAULT 'abierta',
  total_piezas INTEGER NOT NULL DEFAULT 0,
  fecha        TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
  cerrada_en   TEXT
);

CREATE INDEX IF NOT EXISTS idx_remisiones_estado ON remisiones(estado, fecha DESC);

-- ------------------------------------------------------------
-- Movimientos: historial de todo lo que entra y sale.
-- 'cantidad' siempre es positiva; el 'tipo' define si suma o resta.
--   entrada           llego mercancia a bodega       (+bodega)
--   salida_tienda     salio a la tienda              (-bodega, +tienda)
--   salida_tianguis   salio al tianguis              (-bodega, +tianguis)
--   retorno_tienda    regreso de la tienda           (+bodega, -tienda)
--   retorno_tianguis  regreso del tianguis           (+bodega, -tianguis)
--   ajuste            correccion manual              (+/-bodega)
--   conteo            cuadre por inventario fisico   (=bodega)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS movimientos (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  modelo_id          INTEGER NOT NULL REFERENCES modelos(id) ON DELETE CASCADE,
  tipo               TEXT    NOT NULL,
  cantidad           INTEGER NOT NULL,
  existencia_antes   INTEGER NOT NULL DEFAULT 0,
  existencia_despues INTEGER NOT NULL DEFAULT 0,
  ubicacion_id       INTEGER REFERENCES ubicaciones(id) ON DELETE SET NULL,
  remision_id        INTEGER REFERENCES remisiones(id) ON DELETE SET NULL,
  persona            TEXT    NOT NULL DEFAULT '',
  nota               TEXT    NOT NULL DEFAULT '',
  fecha              TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_mov_modelo   ON movimientos(modelo_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_mov_fecha    ON movimientos(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_mov_remision ON movimientos(remision_id);

-- ------------------------------------------------------------
-- Conteos fisicos: para cuadrar la bodega contra lo que dice
-- el sistema, sin tocar las existencias hasta cerrar el conteo.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conteos (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre       TEXT    NOT NULL,
  estado       TEXT    NOT NULL DEFAULT 'abierto',
  nota         TEXT    NOT NULL DEFAULT '',
  iniciado_en  TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
  cerrado_en   TEXT
);

CREATE TABLE IF NOT EXISTS conteo_lineas (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  conteo_id    INTEGER NOT NULL REFERENCES conteos(id) ON DELETE CASCADE,
  modelo_id    INTEGER NOT NULL REFERENCES modelos(id) ON DELETE CASCADE,
  esperado     INTEGER NOT NULL DEFAULT 0,
  contado      INTEGER NOT NULL DEFAULT 0,
  fecha        TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
  UNIQUE(conteo_id, modelo_id)
);

CREATE INDEX IF NOT EXISTS idx_conteo_lineas ON conteo_lineas(conteo_id);

-- ------------------------------------------------------------
-- Catalogos: valores sugeridos al capturar (telas, colores,
-- tallas, categorias). Sirven para autocompletar, no obligan.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS catalogos (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo   TEXT    NOT NULL,
  valor  TEXT    NOT NULL,
  orden  INTEGER NOT NULL DEFAULT 0,
  UNIQUE(tipo, valor)
);

-- ------------------------------------------------------------
-- Configuracion general (nombre del negocio, folio actual, etc.)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS config (
  clave  TEXT PRIMARY KEY,
  valor  TEXT NOT NULL
);
`;
