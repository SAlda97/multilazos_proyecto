export interface Gasto {
  id_gasto: number;
  nombre_gasto: string;
  monto_gasto: string | number;
  id_fecha: number;                 // id de dim_fecha (int)
  fecha?: string; // NUEVO
  id_categoria_gastos: number;
  nombre_categoria_gasto?: string | null;
  fecha_creacion?: string | null;
  fecha_modificacion?: string | null;
}

export interface PagedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
