/** Tipos compartidos entre el servidor y las pantallas. */

export type Modelo = {
  id: number;
  codigo: string;
  codigo_norm: string;
  prefijo: string;
  numero: number | null;
  descripcion: string;
  categoria: string;
  tallas: string;
  colores: string;
  tela: string;
  existencia: number;
  en_tienda: number;
  en_tianguis: number;
  minimo: number;
  foto: string;
  notas: string;
  destacado: number;
  activo: number;
  creado_en: string;
  actualizado_en: string;
};

export type Linea = {
  id: number;
  prefijo: string;
  nombre: string;
  color: string;
  orden: number;
};

export const TIPOS_MOVIMIENTO = [
  "entrada",
  "entrada_tienda",
  "entrada_tianguis",
  "salida_tienda",
  "salida_tianguis",
  "retorno_tienda",
  "retorno_tianguis",
  "tienda_a_tianguis",
  "tianguis_a_tienda",
  "ajuste",
  "ajuste_tienda",
  "ajuste_tianguis",
  "conteo",
  "venta_tianguis",
  "cancelacion_tianguis",
] as const;

export type TipoMovimiento = (typeof TIPOS_MOVIMIENTO)[number];

/**
 * Movimientos que NO nacen aqui: los escribe la caja de la tienda, que
 * trabaja sobre esta misma base. Van aparte de TIPOS_MOVIMIENTO porque
 * desde bodega no se pueden crear a mano —una venta se hace cobrando—,
 * pero si se ven en el historial y se pueden filtrar.
 */
export const TIPOS_DE_LA_CAJA = ["venta", "cancelacion"] as const;

export type TipoDeCaja = (typeof TIPOS_DE_LA_CAJA)[number];

/** Todos los que pueden aparecer en el historial. */
export type TipoEnHistorial = TipoMovimiento | TipoDeCaja;

/** Como se le llama a cada movimiento en pantalla. */
export const NOMBRE_MOVIMIENTO: Record<TipoEnHistorial, string> = {
  entrada: "Entro a bodega",
  entrada_tienda: "Entro directo a tienda",
  entrada_tianguis: "Entro directo a tianguis",
  salida_tienda: "Salio a tienda",
  salida_tianguis: "Salio a tianguis",
  retorno_tienda: "Regreso de tienda",
  retorno_tianguis: "Regreso de tianguis",
  tienda_a_tianguis: "Paso de tienda a tianguis",
  tianguis_a_tienda: "Paso de tianguis a tienda",
  ajuste: "Correccion en bodega",
  ajuste_tienda: "Correccion en tienda",
  ajuste_tianguis: "Correccion en tianguis",
  conteo: "Cuadre por conteo",
  venta_tianguis: "Se vendio en el tianguis",
  cancelacion_tianguis: "Venta del tianguis cancelada",
  venta: "Se vendio en la tienda",
  cancelacion: "Venta cancelada",
};

export type Movimiento = {
  id: number;
  modelo_id: number;
  // Lo que hay guardado, que incluye lo que escribe la caja. Para CREAR
  // un movimiento desde aqui se usa TipoMovimiento, que es mas corto.
  tipo: TipoEnHistorial;
  cantidad: number;
  existencia_antes: number;
  existencia_despues: number;
  remision_id: number | null;
  persona: string;
  nota: string;
  fecha: string;
};

export type MovimientoConModelo = Movimiento & {
  modelo_codigo: string;
  modelo_descripcion: string;
};

export type Destino = "TIENDA" | "TIANGUIS";

export type Remision = {
  id: number;
  folio: string;
  destino: Destino;
  tipo: "envio" | "retorno";
  persona: string;
  nota: string;
  estado: "abierta" | "cerrada";
  total_piezas: number;
  fecha: string;
  cerrada_en: string | null;
};

export type Conteo = {
  id: number;
  nombre: string;
  estado: "abierto" | "cerrado";
  nota: string;
  iniciado_en: string;
  cerrado_en: string | null;
};

export type ConteoLinea = {
  id: number;
  conteo_id: number;
  modelo_id: number;
  esperado: number;
  contado: number;
  fecha: string;
};

export type ConteoLineaConModelo = ConteoLinea & {
  modelo_codigo: string;
  modelo_descripcion: string;
};

/** Resultado estandar de las acciones del servidor. */
export type Resultado<T = undefined> =
  | { ok: true; datos?: T; mensaje?: string }
  | { ok: false; error: string };

/** Quien trabaja en el negocio: firma los movimientos. */
export type Persona = {
  id: number;
  nombre: string;
  puesto: string;
  activo: number;
  orden: number;
};
