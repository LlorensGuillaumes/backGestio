import { getMasterDb } from '../db/masterDb.js';
import { hashPassword, isValidPassword } from '../auth/password.js';
import type {
  Usuario,
  UsuarioBaseDatos,
  BaseDatos,
  DatabaseAccess,
  UserWithPermissions,
  MenuPermission,
} from '../auth/types.js';

interface CreateUserInput {
  username: string;
  password: string;
  nombre: string;
  email?: string;
  databases?: Array<{ id: number; rol: 'admin' | 'user' }>;
}

interface UpdateUserInput {
  username?: string;
  nombre?: string;
  email?: string;
  activo?: boolean;
}

export async function createUser(input: CreateUserInput): Promise<Usuario> {
  const masterDb = getMasterDb();

  const validation = isValidPassword(input.password);
  if (!validation.valid) {
    throw new Error(validation.message);
  }

  // Detectar estructura de la tabla usuarios
  const columns = await masterDb.raw(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'usuarios' AND table_schema = 'public'
  `);
  const columnNames = columns.rows.map((r: { column_name: string }) => r.column_name.toLowerCase());

  // Debug: ver columnas detectadas
  console.log('Columnas detectadas en usuarios:', columnNames);

  const hasNombreUsuario = columnNames.includes('nombreusuario');
  const hasUsername = columnNames.includes('username');
  const hasPasswordHash = columnNames.includes('passwordhash');
  const hasPassword_hash = columnNames.includes('password_hash');

  console.log('hasPasswordHash:', hasPasswordHash, 'hasPassword_hash:', hasPassword_hash);

  // Determinar qué columna usar para el username
  const usernameColumn = hasNombreUsuario ? 'nombreUsuario' : 'username';

  // Verificar usuario existente
  const existingUser = await masterDb<Usuario>('usuarios')
    .where(usernameColumn, input.username)
    .first();

  if (existingUser) {
    throw new Error('El nombre de usuario ya existe');
  }

  const passwordHashValue = await hashPassword(input.password);

  // Preparar datos de inserción según las columnas existentes
  const insertData: Record<string, unknown> = {
    email: input.email || '',
    activo: true,
  };

  // Asignar password hash a la columna correcta
  if (hasPasswordHash) {
    insertData.passwordHash = passwordHashValue;
  } else if (hasPassword_hash) {
    insertData.password_hash = passwordHashValue;
  }

  // Asignar username a la columna correcta
  if (hasNombreUsuario) {
    insertData.nombreUsuario = input.username;
  }
  if (hasUsername) {
    insertData.username = input.username;
  }

  // Asignar nombre
  if (columnNames.includes('nombre')) {
    insertData.nombre = input.nombre;
  }

  console.log('insertData:', JSON.stringify(insertData, null, 2));

  const [user] = await masterDb<Usuario>('usuarios')
    .insert(insertData)
    .returning('*');

  // Asignar a las bases de datos seleccionadas
  if (input.databases && input.databases.length > 0) {
    for (const db of input.databases) {
      await assignUserToDatabase(user.id, db.id, db.rol);
    }
  }

  return user;
}

export async function updateUser(
  userId: number,
  input: UpdateUserInput
): Promise<Usuario | null> {
  const masterDb = getMasterDb();

  if (input.username) {
    const existingUser = await masterDb<Usuario>('usuarios')
      .where('username', input.username)
      .whereNot('id', userId)
      .first();

    if (existingUser) {
      throw new Error('El nombre de usuario ya existe');
    }
  }

  const [user] = await masterDb<Usuario>('usuarios')
    .where('id', userId)
    .update({
      ...input,
      updated_at: new Date(),
    })
    .returning('*');

  return user || null;
}

export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string
): Promise<boolean> {
  const masterDb = getMasterDb();
  const { verifyPassword } = await import('../auth/password.js');

  // Detectar columna de password
  const columns = await masterDb.raw(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'usuarios' AND table_schema = 'public'
  `);
  const columnNames = columns.rows.map((r: { column_name: string }) => r.column_name.toLowerCase());
  const passwordColumn = columnNames.includes('passwordhash') ? 'passwordHash' : 'password_hash';

  const user = await masterDb<Usuario>('usuarios').where('id', userId).first();

  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  // Obtener el hash actual (puede estar en passwordHash o password_hash)
  const currentHash = (user as Record<string, unknown>)[passwordColumn] as string ||
                      (user as Record<string, unknown>)['passwordHash'] as string ||
                      (user as Record<string, unknown>)['password_hash'] as string;

  const isCurrentValid = await verifyPassword(currentPassword, currentHash);
  if (!isCurrentValid) {
    throw new Error('La contraseña actual es incorrecta');
  }

  const validation = isValidPassword(newPassword);
  if (!validation.valid) {
    throw new Error(validation.message);
  }

  const newPasswordHash = await hashPassword(newPassword);

  await masterDb('usuarios').where('id', userId).update({
    [passwordColumn]: newPasswordHash,
    updated_at: new Date(),
  });

  return true;
}

export async function resetPassword(
  userId: number,
  newPassword: string
): Promise<boolean> {
  const masterDb = getMasterDb();

  // Detectar columna de password
  const columns = await masterDb.raw(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'usuarios' AND table_schema = 'public'
  `);
  const columnNames = columns.rows.map((r: { column_name: string }) => r.column_name.toLowerCase());
  const passwordColumn = columnNames.includes('passwordhash') ? 'passwordHash' : 'password_hash';

  const validation = isValidPassword(newPassword);
  if (!validation.valid) {
    throw new Error(validation.message);
  }

  const newPasswordHash = await hashPassword(newPassword);

  const result = await masterDb('usuarios').where('id', userId).update({
    [passwordColumn]: newPasswordHash,
    updated_at: new Date(),
  });

  return result > 0;
}

export async function getUserById(userId: number): Promise<Usuario | null> {
  const masterDb = getMasterDb();

  const user = await masterDb<Usuario>('usuarios').where('id', userId).first();

  return user || null;
}

export async function getUsersByDatabase(
  databaseId: number
): Promise<UserWithPermissions[]> {
  const masterDb = getMasterDb();

  // Detectar columnas disponibles
  const columns = await masterDb.raw(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'usuarios' AND table_schema = 'public'
  `);
  const columnNames = columns.rows.map((r: { column_name: string }) => r.column_name.toLowerCase());

  const hasNombreUsuario = columnNames.includes('nombreusuario');
  const hasNombre = columnNames.includes('nombre');

  // Construir select dinámico
  const selectColumns = [
    'usuarios.id',
    hasNombreUsuario ? 'usuarios.nombreUsuario as username' : 'usuarios.username',
    hasNombre ? 'usuarios.nombre' : (hasNombreUsuario ? 'usuarios.nombreUsuario as nombre' : masterDb.raw("'' as nombre")),
    'usuarios.email',
    'usuarios.activo',
    'usuarios_bases_datos.rol',
  ];

  const users = await masterDb('usuarios')
    .join('usuarios_bases_datos', 'usuarios.id', 'usuarios_bases_datos.id_usuario')
    .where('usuarios_bases_datos.id_base_datos', databaseId)
    .where('usuarios_bases_datos.activo', true)
    .select(...selectColumns);

  const result: UserWithPermissions[] = [];

  for (const user of users) {
    const permisos = await getUserPermissions(user.id, databaseId);
    result.push({
      ...user,
      permisos,
    });
  }

  return result;
}

export async function getUserPermissions(
  userId: number,
  databaseId: number
): Promise<MenuPermission[]> {
  const masterDb = getMasterDb();

  const permisos = await masterDb('permisos_usuario')
    .join('menus', 'permisos_usuario.id_menu', 'menus.id')
    .where('permisos_usuario.id_usuario', userId)
    .where('permisos_usuario.id_base_datos', databaseId)
    .select(
      'menus.id as menuId',
      'menus.codigo',
      'menus.nombre_es as nombreEs',
      'menus.nombre_ca as nombreCa',
      'menus.grupo',
      'permisos_usuario.puede_ver as puedeVer',
      'permisos_usuario.puede_crear as puedeCrear',
      'permisos_usuario.puede_editar as puedeEditar',
      'permisos_usuario.puede_eliminar as puedeEliminar'
    );

  return permisos;
}

export async function getUserDatabases(userId: number): Promise<DatabaseAccess[]> {
  const masterDb = getMasterDb();

  const databases = await masterDb<UsuarioBaseDatos & BaseDatos>('usuarios_bases_datos')
    .join('bases_datos', 'usuarios_bases_datos.id_base_datos', 'bases_datos.id')
    .where('usuarios_bases_datos.id_usuario', userId)
    .where('usuarios_bases_datos.activo', true)
    .where('bases_datos.activa', true)
    .select(
      'bases_datos.id',
      'bases_datos.nombre',
      'bases_datos.db_name as dbName',
      'bases_datos.serie_facturacion as serieFacturacion',
      'usuarios_bases_datos.rol'
    );

  return databases;
}

export async function assignUserToDatabase(
  userId: number,
  databaseId: number,
  rol: 'admin' | 'user'
): Promise<UsuarioBaseDatos> {
  const masterDb = getMasterDb();

  // Verificar si ya existe la relación
  const existing = await masterDb<UsuarioBaseDatos>('usuarios_bases_datos')
    .where('id_usuario', userId)
    .where('id_base_datos', databaseId)
    .first();

  if (existing) {
    // Actualizar el rol y activar
    const [updated] = await masterDb<UsuarioBaseDatos>('usuarios_bases_datos')
      .where('id', existing.id)
      .update({ rol, activo: true })
      .returning('*');
    return updated;
  }

  // Crear nueva relación
  const [relation] = await masterDb<UsuarioBaseDatos>('usuarios_bases_datos')
    .insert({
      id_usuario: userId,
      id_base_datos: databaseId,
      rol,
      activo: true,
    })
    .returning('*');

  return relation;
}

export async function removeUserFromDatabase(
  userId: number,
  databaseId: number
): Promise<boolean> {
  const masterDb = getMasterDb();

  const result = await masterDb('usuarios_bases_datos')
    .where('id_usuario', userId)
    .where('id_base_datos', databaseId)
    .update({ activo: false });

  return result > 0;
}

export async function deleteUser(userId: number): Promise<boolean> {
  const masterDb = getMasterDb();

  // El CASCADE se encarga de eliminar registros relacionados
  const result = await masterDb('usuarios').where('id', userId).delete();

  return result > 0;
}

export async function listAllUsers(): Promise<Usuario[]> {
  const masterDb = getMasterDb();

  // Detectar columnas disponibles
  const columns = await masterDb.raw(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'usuarios' AND table_schema = 'public'
  `);
  const columnNames = columns.rows.map((r: { column_name: string }) => r.column_name.toLowerCase());

  const hasNombreUsuario = columnNames.includes('nombreusuario');
  const hasNombre = columnNames.includes('nombre');

  // Construir query con alias para normalizar columnas
  let query = masterDb('usuarios').where('activo', true);

  if (hasNombreUsuario) {
    query = query.select(
      'id',
      'nombreUsuario as username',
      hasNombre ? 'nombre' : masterDb.raw("nombreUsuario as nombre"),
      'email',
      'activo'
    );
  } else {
    query = query.select('id', 'username', 'nombre', 'email', 'activo');
  }

  const orderColumn = hasNombre ? 'nombre' : (hasNombreUsuario ? 'nombreUsuario' : 'id');
  return query.orderBy(orderColumn);
}
