export interface CategoriaGasto {
  id_categoria_gastos: number;
  nombre_categoria: string;
}

export interface PagedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
