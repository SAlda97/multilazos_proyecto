// src/types/cuotas.ts
export interface CuotaCredito {
  id_cuota: number;
  id_venta: number;
  numero_cuota: number;
  id_fecha_venc: number;
  fecha_venc_iso: string | null;
  monto_programado: string; // vendrá como string desde backend
}
