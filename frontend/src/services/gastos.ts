import http from '../api/http';
import type { Gasto, PagedResponse } from "../types/gastos";

export async function listGastos(params: {
  page?: number; page_size?: number; search?: string; id_categoria_gastos?: number;
}) {
  const res = await http.get<PagedResponse<Gasto>>("/gastos/", {
    params: {
      page: params.page,
      page_size: params.page_size,
      search: params.search,
      id_categoria_gastos: params.id_categoria_gastos,
    },
  });
  return res.data;
}

export async function createGasto(payload: {
  nombre_gasto: string;
  monto_gasto: number;
  id_fecha: number;
  id_categoria_gastos: number;
}) {
  const res = await http.post<Gasto>("/gastos/", payload);
  return res.data;
}

export async function updateGasto(id: number, payload: {
  nombre_gasto: string;
  monto_gasto: number;
  id_fecha: number;
  id_categoria_gastos: number;
}) {
  const res = await http.put<Gasto>(`/gastos/${id}/`, payload);
  return res.data;
}

export async function deleteGasto(id: number) {
  const res = await http.delete<{ detail: string }>(`/gastos/${id}/`);
  return res.data;
}
