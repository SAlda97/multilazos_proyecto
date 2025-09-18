import  http  from "../api/http";
import type { PagedResponse, CategoriaGasto } from "../types/categoriaGastos";

export async function listCategoriaGastos(params: { page?: number; page_size?: number; search?: string }) {
  const res = await http.get<PagedResponse<CategoriaGasto>>("/categorias-gastos/", {
    params: { page: params.page, page_size: params.page_size, search: params.search },
  });
  return res.data;
}

export async function createCategoriaGasto(nombre: string) {
  const res = await http.post<CategoriaGasto>("/categorias-gastos/", { nombre_categoria: nombre });
  return res.data;
}

export async function updateCategoriaGasto(id: number, nombre: string) {
  const res = await http.put<CategoriaGasto>(`/categorias-gastos/${id}/`, { nombre_categoria: nombre });
  return res.data;
}

export async function deleteCategoriaGasto(id: number) {
  const res = await http.delete<{ detail: string }>(`/categorias-gastos/${id}/`);
  return res.data;
}
