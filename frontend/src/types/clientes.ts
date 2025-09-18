export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type Cliente = {
  id_cliente: number;
  nombre_cliente: string;
  apellido_cliente: string;
  id_tipo_cliente: number;                // FK
  fecha_creacion: string;                 // ISO string
  usuario_creacion: string;               // informativo
  fecha_modificacion: string | null;
  usuario_modificacion: string | null;
};

// Para crear/actualizar desde UI
export type ClienteCreate = {
  nombre_cliente: string;
  apellido_cliente: string;
  id_tipo_cliente: number;
};

export type ClienteUpdate = ClienteCreate;

export type ClientesQuery = {
  page?: number;          // página 1..N
  page_size?: number;     // tamaño de página
  search?: string;        // texto libre (nombre/apellido)
  id_tipo_cliente?: number; // filtro por tipo
};