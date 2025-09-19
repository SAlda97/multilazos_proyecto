import http from '../api/http';
import type { DimFechaLookup } from "../types/dimFecha";

export async function getIdFechaByDate(fechaISO: string) {
  const res = await http.get<DimFechaLookup>("/dim-fecha/", { params: { fecha: fechaISO } });
  return res.data; // { id_fecha, fecha }
}

export async function getFechaById(id_fecha: number) {
  const res = await http.get<DimFechaLookup>(`/dim-fecha/${id_fecha}/`);
  return res.data; // { id_fecha, fecha }
}
