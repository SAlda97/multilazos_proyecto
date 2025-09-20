export interface Venta {
  id_venta: number;
  id_cliente: number;
  cliente: string;
  id_tipo_transaccion: number;
  tipo_transaccion: string;
  id_fecha: number;
  fecha?: string; // YYYY-MM-DD
  plazo_mes: number;
  interes: string | number;
  total_venta_final: string | number;
}
