// src/services/pagos.ts
import http from "../api/http";
import type { Pago } from "../types/pagos";

export async function listPagos(params: {
  q?: string; tipo?: "Todos"|"Contado"|"Crédito";
  desde?: string; hasta?: string; min?: string; max?: string;
  page?: number; page_size?: number;
}) {
  const res = await http.get<{count:number; results: Pago[]}>(`/pagos/`, { params });
  // normaliza numeric fields
  res.data.results = res.data.results.map(p=>({ ...p, monto_pago: Number(p.monto_pago) }));
  return res.data;
}

export async function createPago(data: { id_venta: number; fecha_iso: string; monto_pago: number }) {
  const res = await http.post(`/pagos/`, data);
  return res.data;
}

export async function updatePago(id_pago: number, data: { fecha_iso: string; monto_pago: number }) {
  const res = await http.put(`/pagos/${id_pago}/`, data);
  return res.data;
}

export async function deletePago(id_pago: number) {
  const res = await http.delete(`/pagos/${id_pago}/`);
  return res.data;
}
