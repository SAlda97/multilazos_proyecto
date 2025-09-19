export interface Cliente {
  id_cliente: number;
  nombre_cliente: string;
  apellido_cliente: string;
  id_tipo_cliente: number;
  nombre_tipo_cliente?: string | null;
  fecha_creacion?: string | null;
  fecha_modificacion?: string | null;
}

export interface PagedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
