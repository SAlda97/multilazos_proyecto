// src/services/cuotas.ts
import http from '../api/http';
import type { CuotaCredito } from '../types/cuotas';

export async function listCuotas(params: {
  q?: string; desde?: string; hasta?: string; id_venta?: number;
  page?: number; page_size?: number;
}) {
  const res = await http.get<{count:number; results: CuotaCredito[]}>('/cuotas/', { params });
  return res.data;
}

export async function asignarPagoCuota(id_cuota: number, data: { monto_pago: number|string; fecha_iso?: string }) {
  const res = await http.post(`/cuotas/${id_cuota}/asignar-pago/`, data);
  return res.data;
}
