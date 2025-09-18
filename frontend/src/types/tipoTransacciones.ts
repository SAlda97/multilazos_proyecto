// src/types/tipoTransacciones.ts
export interface TipoTransaccion {
  id_tipo_transaccion: number;
  nombre_tipo_transaccion: string;
}

export interface PagedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
