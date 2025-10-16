// src/services/usuarios.ts
import http from "../api/http";
import type { UsuarioDTO } from "../types/security";

export async function listUsuarios(params?: {
  q?: string; username?: string; nombre?: string; activo?: 0|1; id_rol?: number;
}) {
  const { data } = await http.get<{ results: UsuarioDTO[] }>("/seguridad/usuarios/", { params });
  return data.results;
}

export async function getUsuario(id: number) {
  const { data } = await http.get<UsuarioDTO>(`/seguridad/usuarios/${id}/`);
  return data;
}

export async function createUsuario(payload: { username: string; nombre_completo: string; password: string; activo: boolean }) {
  return http.post("/seguridad/usuarios/", payload);
}

export async function updateUsuario(id: number, payload: Partial<{ username: string; nombre_completo: string; password: string; activo: boolean }>) {
  return http.put(`/seguridad/usuarios/${id}/`, payload);
}

export async function deleteUsuario(id:number) {
  return http.delete(`/seguridad/usuarios/${id}/`);
}

export async function setRolesUsuario(id_usuario: number, roles: number[]) {
  return http.post(`/seguridad/usuarios/${id_usuario}/roles/`, { roles });
}
