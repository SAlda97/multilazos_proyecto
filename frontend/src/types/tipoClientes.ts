export interface TipoCliente {
  id_tipo_cliente: number;
  nombre_tipo_cliente: string;
  tasa_interes_default: number; // llega como número
}

export interface PagedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
