import http from '../api/http';
import { PagedResponse, TipoCliente } from '../types/tipoClientes';

export async function fetchTipoClientes(params:{page?:number;page_size?:number;q?:string}) {
  const { page = 1, page_size = 10, q } = params;
  const { data } = await http.get<PagedResponse<TipoCliente>>('/tipo-clientes/', {
    params: { page, page_size, q: q || undefined },
  });
  return data;
}

export async function createTipoCliente(payload: { nombre_tipo_cliente: string; tasa_interes_default: number }) {
  const { data } = await http.post<TipoCliente>('/tipo-clientes/', payload);
  return data;
}

export async function updateTipoCliente(
  id: number,
  payload: { nombre_tipo_cliente: string; tasa_interes_default: number }
) {
  // PATCH para enviar solo campos cambiados; puedes usar PUT si prefieres
  const { data } = await http.patch<TipoCliente>(`/tipo-clientes/${id}/`, payload);
  return data;
}

export async function deleteTipoCliente(id: number) {
  await http.delete(`/tipo-clientes/${id}/`);
}