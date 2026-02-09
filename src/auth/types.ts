// Tipos para el sistema de autenticación y autorización

export type UserRole = 'master' | 'admin' | 'user';

export interface DatabaseAccess {
  id: number;
  nombre: string;
  dbName: string;
  rol: 'admin' | 'user';
  serieFacturacion?: string;
}

export interface JWTPayload {
  userId: number | 'master';
  username: string;
  role: UserRole;
  databases: DatabaseAccess[];
  currentDatabase?: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  userId: number | 'master';
  username: string;
  role: UserRole;
  databases: DatabaseAccess[];
  currentDatabase: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: number | 'master';
    username: string;
    nombre: string;
    role: UserRole;
    databases: DatabaseAccess[];
    currentDatabase: string;
  };
}

export interface MenuPermission {
  menuId: number;
  codigo: string;
  nombreEs: string;
  nombreCa: string;
  grupo: string;
  puedeVer: boolean;
  puedeCrear: boolean;
  puedeEditar: boolean;
  puedeEliminar: boolean;
}

export interface UserWithPermissions {
  id: number;
  username: string;
  nombre: string;
  email: string | null;
  activo: boolean;
  rol: 'admin' | 'user';
  permisos: MenuPermission[];
}

// Tipos para la tabla de usuarios
export interface Usuario {
  id: number;
  username: string;
  password_hash: string;
  nombre: string;
  email: string | null;
  activo: boolean;
  created_at: Date;
  updated_at: Date;
}

// Tipos para bases de datos
export interface BaseDatos {
  id: number;
  nombre: string;
  db_name: string;
  db_host: string;
  db_port: number;
  serie_facturacion: string;
  activa: boolean;
  created_at: Date;
  updated_at: Date;
}

// Tipos para relación usuario-base de datos
export interface UsuarioBaseDatos {
  id: number;
  id_usuario: number;
  id_base_datos: number;
  rol: 'admin' | 'user';
  activo: boolean;
  created_at: Date;
}

// Tipos para menús
export interface Menu {
  id: number;
  codigo: string;
  nombre_es: string;
  nombre_ca: string;
  grupo: string;
  orden: number;
  requiere_modulo_optica: boolean;
  solo_master: boolean; // Módulos premium que solo Master puede asignar
}

// Tipos para permisos
export interface PermisoUsuario {
  id: number;
  id_usuario: number;
  id_base_datos: number;
  id_menu: number;
  puede_ver: boolean;
  puede_crear: boolean;
  puede_editar: boolean;
  puede_eliminar: boolean;
}

// Tipos para configuración global
export interface ConfiguracionGlobal {
  id: number;
  clave: string;
  valor: string | null;
  tipo: 'string' | 'boolean' | 'number' | 'json';
  descripcion: string | null;
  solo_master: boolean;
}

// Tipos para sesiones activas
export interface SesionActiva {
  id: number;
  id_usuario: number;
  token_hash: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
  expires_at: Date;
  revoked: boolean;
}
