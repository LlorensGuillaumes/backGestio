import { getMasterDb } from '../db/masterDb.js';
import {
  generateToken,
  hashToken,
  verifyPassword,
  isMasterCredentials,
  createMasterToken,
  type DatabaseAccess,
  type LoginResponse,
  type Usuario,
  type BaseDatos,
  type UsuarioBaseDatos,
} from '../auth/index.js';
import { syncDatabasesFromPostgres } from './databaseService.js';

export async function login(
  username: string,
  password: string,
  ipAddress?: string,
  userAgent?: string
): Promise<LoginResponse | null> {
  const masterDb = getMasterDb();

  // Verificar si es el usuario Master
  if (isMasterCredentials(username, password)) {
    // Sincronizar bases de datos desde PostgreSQL antes de listarlas
    try {
      const syncResult = await syncDatabasesFromPostgres();
      if (syncResult.added.length > 0) {
        console.log('Bases de datos detectadas y añadidas:', syncResult.added);
      }
    } catch (syncError) {
      console.error('Error sincronizando bases de datos:', syncError);
      // Continuamos aunque falle la sincronización
    }

    // Obtener todas las bases de datos para el Master
    const allDatabases = await masterDb<BaseDatos>('bases_datos')
      .where('activa', true)
      .select('id', 'nombre', 'db_name', 'serie_facturacion');

    const databases: DatabaseAccess[] = allDatabases.map((db) => ({
      id: db.id,
      nombre: db.nombre,
      dbName: db.db_name,
      rol: 'admin' as const,
      serieFacturacion: db.serie_facturacion || 'F',
    }));

    const token = await createMasterToken(databases);

    return {
      token,
      user: {
        id: 'master',
        username,
        nombre: 'Administrador Master',
        role: 'master',
        databases,
        currentDatabase: databases[0]?.dbName || 'gestio_db',
      },
    };
  }

  // Detectar estructura de la tabla usuarios
  const columns = await masterDb.raw(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'usuarios' AND table_schema = 'public'
  `);
  const columnNames = columns.rows.map((r: { column_name: string }) => r.column_name.toLowerCase());

  const hasNombreUsuario = columnNames.includes('nombreusuario');
  const usernameColumn = hasNombreUsuario ? 'nombreUsuario' : 'username';

  // Buscar usuario en la base de datos
  const usuario = await masterDb<Usuario>('usuarios')
    .where(usernameColumn, username)
    .where('activo', true)
    .first();

  if (!usuario) {
    return null;
  }

  // Obtener el hash de la contraseña (puede estar en passwordHash o password_hash)
  const passwordHash = (usuario as Record<string, unknown>)['passwordHash'] as string ||
                       (usuario as Record<string, unknown>)['password_hash'] as string;

  // Verificar contraseña
  const passwordValid = await verifyPassword(password, passwordHash);
  if (!passwordValid) {
    return null;
  }

  // Obtener bases de datos del usuario
  const usuarioBases = await masterDb<UsuarioBaseDatos & BaseDatos>('usuarios_bases_datos')
    .join('bases_datos', 'usuarios_bases_datos.id_base_datos', 'bases_datos.id')
    .where('usuarios_bases_datos.id_usuario', usuario.id)
    .where('usuarios_bases_datos.activo', true)
    .where('bases_datos.activa', true)
    .select(
      'bases_datos.id',
      'bases_datos.nombre',
      'bases_datos.db_name',
      'bases_datos.serie_facturacion',
      'usuarios_bases_datos.rol'
    );

  if (usuarioBases.length === 0) {
    return null; // Usuario sin acceso a ninguna base de datos
  }

  const databases: DatabaseAccess[] = usuarioBases.map((ub) => ({
    id: ub.id,
    nombre: ub.nombre,
    dbName: ub.db_name,
    rol: ub.rol,
    serieFacturacion: (ub as any).serie_facturacion || 'F',
  }));

  // Determinar rol del usuario (el más alto entre sus bases de datos)
  const isAdmin = databases.some((db) => db.rol === 'admin');
  const role = isAdmin ? 'admin' : 'user';

  const token = generateToken({
    userId: usuario.id,
    username: usuario.username,
    role,
    databases,
    currentDatabase: databases[0].dbName,
  });

  // Guardar sesión
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  await masterDb('sesiones_activas').insert({
    id_usuario: usuario.id,
    token_hash: hashToken(token),
    ip_address: ipAddress,
    user_agent: userAgent,
    expires_at: expiresAt,
  });

  return {
    token,
    user: {
      id: usuario.id,
      username: usuario.username,
      nombre: usuario.nombre,
      role,
      databases,
      currentDatabase: databases[0].dbName,
    },
  };
}

export async function logout(
  userId: number | 'master',
  token: string
): Promise<boolean> {
  if (userId === 'master') {
    return true; // Master no tiene sesiones en BD
  }

  const masterDb = getMasterDb();
  const tokenHash = hashToken(token);

  const result = await masterDb('sesiones_activas')
    .where('id_usuario', userId)
    .where('token_hash', tokenHash)
    .update({ revoked: true });

  return result > 0;
}

export async function revokeAllSessions(userId: number): Promise<number> {
  const masterDb = getMasterDb();

  const result = await masterDb('sesiones_activas')
    .where('id_usuario', userId)
    .where('revoked', false)
    .update({ revoked: true });

  return result;
}

export async function getActiveSessions(
  userId: number
): Promise<{ id: number; ip_address: string; created_at: Date }[]> {
  const masterDb = getMasterDb();

  return masterDb('sesiones_activas')
    .where('id_usuario', userId)
    .where('revoked', false)
    .where('expires_at', '>', new Date())
    .select('id', 'ip_address', 'user_agent', 'created_at');
}

export async function cleanExpiredSessions(): Promise<number> {
  const masterDb = getMasterDb();

  const result = await masterDb('sesiones_activas')
    .where('expires_at', '<', new Date())
    .delete();

  return result;
}
