// src/services/roles.ts
import http from "../api/http";
import type { RolDTO } from "../types/security";

export async function listRoles(params?: { q?: string }) {
  const { data } = await http.get<{ results: RolDTO[] }>("/seguridad/roles/", { params });
  return data.results;
}
export async function createRol(payload: { nombre_rol: string; descripcion?: string | null }) {
  return http.post("/seguridad/roles/", payload);
}
export async function updateRol(id:number, payload: { nombre_rol: string; descripcion?: string | null }) {
  return http.put(`/seguridad/roles/${id}/`, payload);
}
export async function deleteRol(id:number) {
  return http.delete(`/seguridad/roles/${id}/`);
}
export async function setPermisosRol(id_rol:number, permisos:number[]) {
  return http.post(`/seguridad/roles/${id_rol}/permisos/`, { permisos });
}
