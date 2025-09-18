// src/types/categoriaProductos.ts
export interface CategoriaProducto {
  id_categoria: number;
  nombre_categoria: string;
}

export interface PagedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
