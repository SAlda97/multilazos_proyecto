// src/api/tiposCliente.ts
import  http  from "../api/http";
import type { Paginated, TipoCliente } from "../types/tipoClientes";

export type TiposQuery = { q?: string; page?: number; page_size?: number };

export async function listTiposCliente(params: TiposQuery = {}) {
  const res = await http.get<Paginated<TipoCliente>>("/tipo-clientes/", { params });
  return res.data;
}

export async function createTipoCliente(payload: { nombre_tipo_cliente: string; tasa_interes_default?: number }) {
  const res = await http.post<TipoCliente>("/tipo-clientes/", payload);
  return res.data;
}

export async function updateTipoCliente(
  id: number,
  payload: { nombre_tipo_cliente: string; tasa_interes_default?: number }
) {
  const res = await http.put<TipoCliente>(`/tipo-clientes/${id}/`, payload);
  return res.data;
}

export async function removeTipoCliente(id: number) {
  await http.delete(`/tipo-clientes/${id}/`);
}
