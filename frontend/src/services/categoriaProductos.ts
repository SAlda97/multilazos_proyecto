// src/services/categoriaProductos.ts
import  http  from "../api/http";
import type { PagedResponse, CategoriaProducto } from "../types/categoriaProductos";

export type ListParams = {
  search?: string;
  page?: number;
  page_size?: number;
};

export async function listCategoriaProductos(params: ListParams) {
  const res = await http.get<PagedResponse<CategoriaProducto>>(
    "/categorias-productos/",
    { params }
  );
  return res.data;
}

export async function createCategoriaProducto(nombre: string) {
  const res = await http.post<CategoriaProducto>("/categorias-productos/", {
    nombre_categoria: nombre,
  });
  return res.data;
}

export async function updateCategoriaProducto(id: number, nombre: string) {
  const res = await http.put<CategoriaProducto>(`/categorias-productos/${id}/`, {
    nombre_categoria: nombre,
  });
  return res.data;
}

export async function deleteCategoriaProducto(id: number) {
  const res = await http.delete<{ detail: string }>(`/categorias-productos/${id}/`);
  return res.data;
}