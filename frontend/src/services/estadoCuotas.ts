// src/services/estadoCuotas.ts
import http from "../api/http";
import type { EstadoCuota } from "../types/estadoCuotas";

export async function listEstadoCuotas(params: {
  search?: string;
  desde?: string;
  hasta?: string;
  id_venta?: number | string;
  estado?: "pendiente" | "parcial" | "pagada" | "atrasada";
  page?: number;
  page_size?: number;
}) {
  const res = await http.get<{ count:number; results: EstadoCuota[] }>("/estado-cuotas/", { params });
  return res.data;
}
