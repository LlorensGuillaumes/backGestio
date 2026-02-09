import { getMasterDb } from '../db/masterDb.js';
import type {
  Menu,
  PermisoUsuario,
  MenuPermission,
  ConfiguracionGlobal,
} from '../auth/types.js';

interface PermissionInput {
  idMenu: number;
  puedeVer: boolean;
  puedeCrear: boolean;
  puedeEditar: boolean;
  puedeEliminar: boolean;
}

export async function getAllMenus(): Promise<Menu[]> {
  const masterDb = getMasterDb();

  return masterDb<Menu>('menus').orderBy('grupo').orderBy('orden');
}

export async function getMenusByGroup(grupo: string): Promise<Menu[]> {
  const masterDb = getMasterDb();

  return masterDb<Menu>('menus').where('grupo', grupo).orderBy('orden');
}

export async function getVisibleMenus(
  userId: number,
  databaseId: number
): Promise<Menu[]> {
  const masterDb = getMasterDb();

  // Verificar si el módulo óptica está activado
  const opticaConfig = await masterDb<ConfiguracionGlobal>('configuracion_global')
    .where('clave', 'mostrar_modulo_optica')
    .first();

  const mostrarOptica = opticaConfig?.valor === 'true';

  // Obtener menús con permisos de visualización
  let query = masterDb('menus')
    .join('permisos_usuario', 'menus.id', 'permisos_usuario.id_menu')
    .where('permisos_usuario.id_usuario', userId)
    .where('permisos_usuario.id_base_datos', databaseId)
    .where('permisos_usuario.puede_ver', true);

  if (!mostrarOptica) {
    query = query.where('menus.requiere_modulo_optica', false);
  }

  return query
    .select('menus.*')
    .orderBy('menus.grupo')
    .orderBy('menus.orden');
}

export async function setUserPermissions(
  userId: number,
  databaseId: number,
  permissions: PermissionInput[],
  isMasterUser: boolean = false
): Promise<MenuPermission[]> {
  const masterDb = getMasterDb();

  // Usar transacción para consistencia
  return masterDb.transaction(async (trx) => {
    // Si NO es master, obtener los menús solo_master para excluirlos
    let soloMasterMenuIds: number[] = [];
    if (!isMasterUser) {
      const soloMasterMenus = await trx('menus').where('solo_master', true).select('id');
      soloMasterMenuIds = soloMasterMenus.map(m => m.id);
    }

    // Eliminar permisos existentes (excepto solo_master si no es master)
    let deleteQuery = trx('permisos_usuario')
      .where('id_usuario', userId)
      .where('id_base_datos', databaseId);

    if (!isMasterUser && soloMasterMenuIds.length > 0) {
      deleteQuery = deleteQuery.whereNotIn('id_menu', soloMasterMenuIds);
    }
    await deleteQuery.delete();

    // Filtrar permisos de menús solo_master si no es master
    let permissionsToInsert = permissions;
    if (!isMasterUser && soloMasterMenuIds.length > 0) {
      permissionsToInsert = permissions.filter(p => !soloMasterMenuIds.includes(p.idMenu));
    }

    // Insertar nuevos permisos
    if (permissionsToInsert.length > 0) {
      const records = permissionsToInsert.map((p) => ({
        id_usuario: userId,
        id_base_datos: databaseId,
        id_menu: p.idMenu,
        puede_ver: p.puedeVer,
        puede_crear: p.puedeCrear,
        puede_editar: p.puedeEditar,
        puede_eliminar: p.puedeEliminar,
      }));

      await trx('permisos_usuario').insert(records);
    }

    // Retornar los permisos actualizados
    const result = await trx('permisos_usuario')
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

    return result;
  });
}

export async function grantFullAccess(
  userId: number,
  databaseId: number
): Promise<void> {
  const masterDb = getMasterDb();
  const menus = await getAllMenus();

  const permissions: PermissionInput[] = menus.map((menu) => ({
    idMenu: menu.id,
    puedeVer: true,
    puedeCrear: true,
    puedeEditar: true,
    puedeEliminar: true,
  }));

  await setUserPermissions(userId, databaseId, permissions);
}

export async function revokeAllAccess(
  userId: number,
  databaseId: number
): Promise<void> {
  const masterDb = getMasterDb();

  await masterDb('permisos_usuario')
    .where('id_usuario', userId)
    .where('id_base_datos', databaseId)
    .delete();
}

export async function checkPermission(
  userId: number,
  databaseId: number,
  menuCode: string,
  action: 'ver' | 'crear' | 'editar' | 'eliminar'
): Promise<boolean> {
  const masterDb = getMasterDb();

  const menu = await masterDb<Menu>('menus').where('codigo', menuCode).first();

  if (!menu) {
    return false;
  }

  // Verificar módulo óptica si es necesario
  if (menu.requiere_modulo_optica) {
    const opticaConfig = await masterDb<ConfiguracionGlobal>('configuracion_global')
      .where('clave', 'mostrar_modulo_optica')
      .first();

    if (opticaConfig?.valor !== 'true') {
      return false;
    }
  }

  const permiso = await masterDb<PermisoUsuario>('permisos_usuario')
    .where('id_usuario', userId)
    .where('id_base_datos', databaseId)
    .where('id_menu', menu.id)
    .first();

  if (!permiso) {
    return false;
  }

  const actionColumn = `puede_${action}` as keyof PermisoUsuario;
  return !!permiso[actionColumn];
}

// Configuración global
export async function getGlobalConfig(): Promise<ConfiguracionGlobal[]> {
  const masterDb = getMasterDb();

  return masterDb<ConfiguracionGlobal>('configuracion_global').orderBy('clave');
}

export async function getGlobalConfigValue(
  clave: string
): Promise<string | null> {
  const masterDb = getMasterDb();

  const config = await masterDb<ConfiguracionGlobal>('configuracion_global')
    .where('clave', clave)
    .first();

  return config?.valor || null;
}

export async function setGlobalConfigValue(
  clave: string,
  valor: string
): Promise<ConfiguracionGlobal | null> {
  const masterDb = getMasterDb();

  const [config] = await masterDb<ConfiguracionGlobal>('configuracion_global')
    .where('clave', clave)
    .update({ valor })
    .returning('*');

  return config || null;
}

export async function isOpticaModuleEnabled(): Promise<boolean> {
  const valor = await getGlobalConfigValue('mostrar_modulo_optica');
  return valor === 'true';
}
