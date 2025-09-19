export interface Producto {
  id_producto: number;
  nombre_producto: string;
  precio_unitario: string | number; // backend devuelve string en JSON
  costo_unitario: string | number;
  id_categoria: number;
  nombre_categoria?: string | null;
  fecha_creacion?: string | null;
  fecha_modificacion?: string | null;
}

export interface PagedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
