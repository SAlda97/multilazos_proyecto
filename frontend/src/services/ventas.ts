import  http  from '../api/http';
import type { Venta } from "../types/ventas";

export async function listVentas(params: { page?: number; page_size?: number; search?: string; id_cliente?: number; id_tipo_transaccion?: number; }) {
  const res = await http.get<{count:number; results: Venta[]}>("/ventas/", { params });
  return res.data;
}
export async function createVenta(body: { id_cliente: number; id_tipo_transaccion: number; id_fecha: number; plazo_mes?: number; }) {
  const res = await http.post<{id_venta:number}>("/ventas/", body);
  return res.data;
}
export async function updateVenta(id_venta: number, body: { id_cliente: number; id_tipo_transaccion: number; id_fecha: number; plazo_mes?: number; }) {
  const res = await http.put(`/ventas/${id_venta}/`, body);
  return res.data;
}
export async function deleteVenta(id_venta: number) {
  const res = await http.delete(`/ventas/${id_venta}/`);
  return res.data;
}
export async function ventasTotalesPorMes() {
  const res = await http.get<Array<{ mes: string; total: string }>>('/ventas/totales-mes/');
  return res.data;
}


