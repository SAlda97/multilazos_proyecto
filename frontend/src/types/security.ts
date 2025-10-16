// src/types/security.ts
export type UsuarioDTO = {
  id_usuario: number;
  username: string;
  nombre_completo: string;
  activo: boolean;
  roles?: { id_rol:number; nombre_rol:string }[];
  roles_nombres?: string;
};

export type RolDTO = {
  id_rol: number;
  nombre_rol: string;
  descripcion?: string | null;
};

export type PermisoDTO = {
  id_permiso: number;
  codigo: string;
  descripcion?: string | null;
};

export type LoginResponse = {
  id_usuario: number;
  username: string;
  nombre_completo: string;
  activo: boolean;
  roles: { id_rol:number; nombre_rol:string }[];
  permisos: { id_permiso:number; codigo:string }[];
};
