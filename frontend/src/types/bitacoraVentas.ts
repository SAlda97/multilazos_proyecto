export interface BitacoraVenta {
  id_bitacora: number;
  id_venta: number;
  operacion: "INSERT" | "UPDATE" | "DELETE";
  datos_anteriores: string | null;
  datos_nuevos: string | null;
  usuario_evento: string;
  fecha_evento_iso: string; // "YYYY-MM-DD HH:mm:ss"
}
