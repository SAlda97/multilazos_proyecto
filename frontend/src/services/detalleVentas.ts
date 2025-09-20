import http from '../api/http';
import type { DetalleVenta } from "../types/detalleVentas";

export async function listDetalleVentas(id_venta: number) {
  const res = await http.get<{ count: number; subtotal: string; results: DetalleVenta[] }>(`/ventas/${id_venta}/detalle/`);
  return res.data;
}

export async function createDetalleVenta(id_venta: number, data: { id_producto: number; cantidad: number|string }) {
  const res = await http.post(`/ventas/${id_venta}/detalle/`, data);
  return res.data;
}

export async function updateDetalleVenta(id_venta: number, id_detalle_venta: number, body: { cantidad: number; }) {
  const res = await http.put(`/ventas/${id_venta}/detalle/${id_detalle_venta}/`, body);
  return res.data;
}
export async function deleteDetalleVenta(id_venta: number, id_detalle_venta: number) {
  const res = await http.delete(`/ventas/${id_venta}/detalle/${id_detalle_venta}/`);
  return res.data;
}
