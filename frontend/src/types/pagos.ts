// src/types/pagos.ts
export interface Pago {
  id_pago: number;
  id_venta: number;
  id_fecha: number;
  fecha_iso: string;      // YYYY-MM-DD
  monto_pago: number;
  venta?: {
    cliente: string;
    tipo_transaccion: "Contado" | "Crédito" | string;
  };
}
