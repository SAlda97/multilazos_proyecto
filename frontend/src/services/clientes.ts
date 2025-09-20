import http from '../api/http';
import type { Cliente, PagedResponse } from "../types/clientes";

export async function listClientes(params: { page?: number; page_size?: number; search?: string }) {
  const res = await http.get<PagedResponse<Cliente>>("/clientes/", {
    params: { page: params.page, page_size: params.page_size, search: params.search },
  });
  return res.data;
}

export async function createCliente(payload: {
  nombre_cliente: string;
  apellido_cliente: string;
  id_tipo_cliente: number;
}) {
  const res = await http.post<Cliente>("/clientes/", payload);
  return res.data;
}

export async function updateCliente(
  id: number,
  payload: { nombre_cliente: string; apellido_cliente: string; id_tipo_cliente: number }
) {
  const res = await http.put<Cliente>(`/clientes/${id}/`, payload);
  return res.data;
}

export async function deleteCliente(id: number) {
  const res = await http.delete<{ detail: string }>(`/clientes/${id}/`);
  return res.data;
}

export async function getCliente(id_cliente: number) {
  const res = await http.get(`/clientes/${id_cliente}/`);
  return res.data; // ideal: { …, id_tipo_cliente, tipo_cliente?: {tasa_interes_default} }
}
