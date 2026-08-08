/** Tipos compartidos entre el servidor y las pantallas. */

export type Ubicacion = {
  id: number;
  codigo: string;
  zona: string;
  rack: string;
  nivel: string;
  descripcion: string;
  activa: number;
  orden: number;
};

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
  ubicacion_id: number | null;
  foto: string;
  notas: string;
  destacado: number;
  activo: number;
  creado_en: string;
  actualizado_en: string;
};

/** Modelo con los datos de su ubicacion ya resueltos, para las listas. */
export type ModeloConUbicacion = Modelo & {
  ubicacion_codigo: string | null;
  ubicacion_zona: string | null;
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
  "salida_tienda",
  "salida_tianguis",
  "retorno_tienda",
  "retorno_tianguis",
  "ajuste",
  "conteo",
] as const;

export type TipoMovimiento = (typeof TIPOS_MOVIMIENTO)[number];

/** Como se le llama a cada movimiento en pantalla. */
export const NOMBRE_MOVIMIENTO: Record<TipoMovimiento, string> = {
  entrada: "Entro a bodega",
  salida_tienda: "Salio a tienda",
  salida_tianguis: "Salio a tianguis",
  retorno_tienda: "Regreso de tienda",
  retorno_tianguis: "Regreso de tianguis",
  ajuste: "Ajuste manual",
  conteo: "Cuadre por conteo",
};

export type Movimiento = {
  id: number;
  modelo_id: number;
  tipo: TipoMovimiento;
  cantidad: number;
  existencia_antes: number;
  existencia_despues: number;
  ubicacion_id: number | null;
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
  ubicacion_codigo: string | null;
};

/** Resultado estandar de las acciones del servidor. */
export type Resultado<T = undefined> =
  | { ok: true; datos?: T; mensaje?: string }
  | { ok: false; error: string };
