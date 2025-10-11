import http from "../api/http";
import type { RentabResponse } from "../types/rentabilidades";

export async function getRentabilidades(params: { months?: number; id_tipo_transaccion?: 0|1|2 }) {
  const res = await http.get<RentabResponse>("/rentabilidades/resumen/", { params });
  return res.data;
}
