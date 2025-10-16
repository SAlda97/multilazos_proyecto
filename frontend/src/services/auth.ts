// src/services/auth.ts
import http from "../api/http";

export type AuthUser = {
  id_usuario: number;
  username: string;
  nombre_completo: string;
  activo: boolean;
  roles?: { id_rol:number; nombre_rol:string }[];
  permisos?: { id_permiso:number; codigo:string }[];
};

export async function loginApi(payload: { username: string; password: string }) {
  // Devuelve el usuario (backend ya valida hash y activo)
  const { data } = await http.post<AuthUser>("/auth/login", payload);
  return data;
}

export async function meApi() {
  // Si quieres validar sesión en backend (opcional)
  const { data } = await http.get<AuthUser>("/auth/me");
  return data;
}

export async function logoutApi() {
  try { await http.post("/auth/logout", {}); } catch { /* opcional */ }
}
