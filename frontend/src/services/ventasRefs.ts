// src/services/ventasRefs.ts
import http from "../api/http";

export interface VentaRef {
  id_venta: number;
  cliente: string;
  tipo_transaccion: string;
}

export async function listVentasRefs() {
  const res = await http.get<{count:number; results:any[]}>(`/ventas/`, { params: { page:1, page_size: 1000 }});
  const rows = res.data.results.map(v=>({
    id_venta: v.id_venta,
    cliente: v.cliente,
    tipo_transaccion: v.tipo_transaccion
  })) as VentaRef[];
  return rows;
}
