export interface CuotaEstado {
  id_cuota: number;
  id_venta: number;
  numero_cuota: number;
  id_fecha_venc: number;
  fecha_venc: string | null;          // yyyy-mm-dd
  monto_programado: string;           // como string desde backend
  monto_pagado: string;
  saldo_pendiente: string;
  estado: "pendiente" | "parcial" | "pagada";
}
