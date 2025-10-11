// src/services/cuotas.ts
import http from '../api/http';

export type Cuota = {
  id_cuota: number;
  id_venta: number;
  numero_cuota: number;
  fecha_venc_iso: string;
  monto_programado: string; // llega como string
  monto_asignado?: string | number;  
  saldo_pendiente?: string | number;  
  tiene_pago?: boolean;               
};

export async function listCuotas(params: {
  search?: string;
  desde?: string;
  hasta?: string;
  id_venta?: number|string;
  page?: number;
  page_size?: number;
}) {
  const res = await http.get<{count:number; results:Cuota[]}>('/cuotas/', { params });
  return res.data;
}

export async function asignarPagoCuota(payload: { id_cuota:number; monto_pago:number; fecha_iso?:string }) {
  return http.post("/cuotas/asignar-pago/", payload);
}
