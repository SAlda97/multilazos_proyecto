import http from "../api/http";
import type { BitacoraVenta } from "../types/bitacoraVentas";

export type BitacoraQuery = {
  q?: string;
  operacion?: "INSERT" | "UPDATE" | "DELETE";
  desde?: string;  // yyyy-mm-dd
  hasta?: string;  // yyyy-mm-dd
  venta?: string;  // id_venta
  page?: number;
  page_size?: number;
};

export async function listBitacoraVentas(qs: BitacoraQuery) {
  const res = await http.get<{ count:number; results: BitacoraVenta[] }>(`/bitacora-ventas/`, { params: qs });
  return res.data;
}
