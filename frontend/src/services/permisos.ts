// src/services/permisos.ts
import http from "../api/http";
import type { PermisoDTO } from "../types/security";

export async function listPermisos(params?: {
  q?: string;
  codigo?: string;
  descripcion?: string;
}): Promise<PermisoDTO[]> {
  const res = await http.get("/seguridad/permisos/", { params });
  const payload = res.data;
  // Normaliza ambos formatos de respuesta:
  // - Array directo: [ {..}, {..} ]
  // - Objeto con results: { results: [ {..}, {..} ] }
  if (Array.isArray(payload)) return payload as PermisoDTO[];
  if (payload && Array.isArray(payload.results)) return payload.results as PermisoDTO[];
  return [];
}
export async function createPermiso(payload: { codigo: string; descripcion?: string | null }) {
  return http.post("/seguridad/permisos/", payload);
}
export async function updatePermiso(id:number, payload: { codigo: string; descripcion?: string | null }) {
  return http.put(`/seguridad/permisos/${id}/`, payload);
}
export async function deletePermiso(id:number) {
  return http.delete(`/seguridad/permisos/${id}/`);
}
