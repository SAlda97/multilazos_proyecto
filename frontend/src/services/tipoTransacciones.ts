// src/services/tipoTransacciones.ts
import  http  from '../api/http';
import type { PagedResponse } from "../types/tipoTransacciones";
import type { TipoTransaccion } from "../types/tipoTransacciones";

export async function fetchTipoTransacciones(params: { page?: number; page_size?: number; q?: string }) {
  const res = await http.get<PagedResponse<TipoTransaccion>>("/tipo-transacciones/", {
    params: { page: params.page, page_size: params.page_size, search: params.q },
  });
  return res.data;
}

export async function createTipoTransaccion(payload: { nombre_tipo_transaccion: string }) {
  const res = await http.post<TipoTransaccion>("/tipo-transacciones/", payload);
  return res.data;
}

export async function updateTipoTransaccion(id: number, payload: { nombre_tipo_transaccion: string }) {
  const res = await http.put<TipoTransaccion>(`/tipo-transacciones/${id}/`, payload);
  return res.data;
}

export async function deleteTipoTransaccion(id: number) {
  const res = await http.delete<{ detail: string }>(`/tipo-transacciones/${id}/`);
  return res.data;
}
