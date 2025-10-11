// src/services/pagosAsignaciones.ts
import http from "../api/http";

export type CuotaEstado = {
  id_cuota: number;
  numero_cuota: number;
  fecha_venc_iso: string;
  monto_programado: string; // vendrá como string del backend
  monto_asignado: string;
  saldo_pendiente: string;
};

export async function getAsignacionesPago(id_pago: number) {
  const res = await http.get<{
    pago: { id_pago:number; id_venta:number; monto_pago:string };
    venta: { id_venta:number; cliente:string; tipo_transaccion:string } | null;
    cuotas: CuotaEstado[];
    asignaciones: { id_cuota:number; monto_asignado:string }[];
  }>(`/pagos/${id_pago}/asignaciones/`);
  return res.data;
}

export async function saveAsignacionesPago(id_pago: number, items: { id_cuota:number; monto_asignado:number }[]) {
  const res = await http.post(`/pagos/${id_pago}/asignaciones/`, { items });
  return res.data;
}

export async function cuotasEstadoPorVenta(id_venta: number) {
  const res = await http.get<{count:number; results: CuotaEstado[]}>(`/ventas/${id_venta}/cuotas-estado/`);
  return res.data;
}
