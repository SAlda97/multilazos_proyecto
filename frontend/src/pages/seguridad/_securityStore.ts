// Simple store en localStorage para evidenciar la interfaz.
// Cuando haya backend, se reemplaza por fetch/RTK Query sin tocar las páginas.

export type Usuario = {
  id_usuario: number;
  username: string;
  nombre_completo: string;
  activo: boolean;
};

export type Rol = {
  id_rol: number;
  nombre_rol: string;
  descripcion?: string;
};

export type Permiso = {
  id_permiso: number;
  codigo: string;       // ej: VENTAS_LEER
  descripcion?: string;
};

// Relaciones N..M (exactamente como en el script)
export type UsuarioRol = { id_usuario: number; id_rol: number };
export type RolPermiso = { id_rol: number; id_permiso: number };

const KEY = "mlz_security_store_v1";

type Data = {
  usuarios: Usuario[];
  roles: Rol[];
  permisos: Permiso[];
  usuario_roles: UsuarioRol[];
  rol_permisos: RolPermiso[];
};

const seed: Data = {
  usuarios: [
    { id_usuario: 1, username: "admin", nombre_completo: "Administrador", activo: true },
    { id_usuario: 2, username: "ventas1", nombre_completo: "Operador Ventas", activo: true },
  ],
  roles: [
    { id_rol: 1, nombre_rol: "Administrador", descripcion: "Acceso total" },
    { id_rol: 2, nombre_rol: "Ventas", descripcion: "Gestión de ventas" },
  ],
  permisos: [
    { id_permiso: 1, codigo: "VENTAS_LEER", descripcion: "Ver ventas" },
    { id_permiso: 2, codigo: "VENTAS_EDITAR", descripcion: "Crear/Editar ventas" },
    { id_permiso: 3, codigo: "CLIENTES_ADMIN", descripcion: "CRUD clientes" },
    { id_permiso: 4, codigo: "SEGURIDAD_ADMIN", descripcion: "Administrar seguridad" },
  ],
  usuario_roles: [
    { id_usuario: 1, id_rol: 1 },
    { id_usuario: 2, id_rol: 2 },
  ],
  rol_permisos: [
    { id_rol: 1, id_permiso: 1 },
    { id_rol: 1, id_permiso: 2 },
    { id_rol: 1, id_permiso: 3 },
    { id_rol: 1, id_permiso: 4 },
    { id_rol: 2, id_permiso: 1 },
    { id_rol: 2, id_permiso: 2 },
  ],
};

function load(): Data {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      localStorage.setItem(KEY, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw) as Data;
  } catch {
    localStorage.setItem(KEY, JSON.stringify(seed));
    return seed;
  }
}

function save(data: Data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export const SecurityStore = {
  getAll: (): Data => load(),

  // ==== Usuarios ====
  createUsuario(u: Omit<Usuario, "id_usuario">) {
    const db = load();
    const nextId = Math.max(0, ...db.usuarios.map(x => x.id_usuario)) + 1;
    db.usuarios.push({ id_usuario: nextId, ...u });
    save(db);
    return nextId;
  },
  updateUsuario(u: Usuario) {
    const db = load();
    db.usuarios = db.usuarios.map(x => (x.id_usuario === u.id_usuario ? u : x));
    save(db);
  },
  deleteUsuario(id_usuario: number) {
    const db = load();
    db.usuarios = db.usuarios.filter(x => x.id_usuario !== id_usuario);
    db.usuario_roles = db.usuario_roles.filter(x => x.id_usuario !== id_usuario);
    save(db);
  },

  // ==== Roles ====
  createRol(r: Omit<Rol, "id_rol">) {
    const db = load();
    const nextId = Math.max(0, ...db.roles.map(x => x.id_rol)) + 1;
    db.roles.push({ id_rol: nextId, ...r });
    save(db);
    return nextId;
  },
  updateRol(r: Rol) {
    const db = load();
    db.roles = db.roles.map(x => (x.id_rol === r.id_rol ? r : x));
    save(db);
  },
  deleteRol(id_rol: number) {
    const db = load();
    db.roles = db.roles.filter(x => x.id_rol !== id_rol);
    db.usuario_roles = db.usuario_roles.filter(x => x.id_rol !== id_rol);
    db.rol_permisos = db.rol_permisos.filter(x => x.id_rol !== id_rol);
    save(db);
  },

  // ==== Permisos ====
  createPermiso(p: Omit<Permiso, "id_permiso">) {
    const db = load();
    const nextId = Math.max(0, ...db.permisos.map(x => x.id_permiso)) + 1;
    db.permisos.push({ id_permiso: nextId, ...p });
    save(db);
    return nextId;
  },
  updatePermiso(p: Permiso) {
    const db = load();
    db.permisos = db.permisos.map(x => (x.id_permiso === p.id_permiso ? p : x));
    save(db);
  },
  deletePermiso(id_permiso: number) {
    const db = load();
    db.permisos = db.permisos.filter(x => x.id_permiso !== id_permiso);
    db.rol_permisos = db.rol_permisos.filter(x => x.id_permiso !== id_permiso);
    save(db);
  },

  // ==== Relaciones ====
  setRolesDeUsuario(id_usuario: number, roles: number[]) {
    const db = load();
    db.usuario_roles = [
      ...db.usuario_roles.filter(x => x.id_usuario !== id_usuario),
      ...roles.map(id_rol => ({ id_usuario, id_rol }))
    ];
    save(db);
  },
  setPermisosDeRol(id_rol: number, permisos: number[]) {
    const db = load();
    db.rol_permisos = [
      ...db.rol_permisos.filter(x => x.id_rol !== id_rol),
      ...permisos.map(id_permiso => ({ id_rol, id_permiso }))
    ];
    save(db);
  },
};
