import http from '../api/http';
import type { Producto, PagedResponse } from "../types/productos";

export async function listProductos(params: {
  page?: number; page_size?: number; search?: string; id_categoria?: number;
}) {
  const res = await http.get<PagedResponse<Producto>>("/productos/", {
    params: {
      page: params.page,
      page_size: params.page_size,
      search: params.search,
      id_categoria: params.id_categoria,
    },
  });
  return res.data;
}

export async function createProducto(payload: {
  nombre_producto: string;
  precio_unitario: number;
  costo_unitario: number;
  id_categoria: number;
}) {
  const res = await http.post<Producto>("/productos/", payload);
  return res.data;
}

export async function updateProducto(id: number, payload: {
  nombre_producto: string;
  precio_unitario: number;
  costo_unitario: number;
  id_categoria: number;
}) {
  const res = await http.put<Producto>(`/productos/${id}/`, payload);
  return res.data;
}

export async function deleteProducto(id: number) {
  const res = await http.delete<{ detail: string }>(`/productos/${id}/`);
  return res.data;
}
