import type { Request, Response } from 'express';
import * as userService from '../services/userService.js';
import * as permissionService from '../services/permissionService.js';
import * as databaseService from '../services/databaseService.js';
import { getMasterDb } from '../db/masterDb.js';

function getParamId(param: string | string[] | undefined): number | null {
  const value = Array.isArray(param) ? param[0] : param;
  if (!value) return null;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? null : parsed;
}

export async function listUsers(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    const masterDb = getMasterDb();

    // Si es Master, puede ver todos los usuarios con sus bases de datos asignadas
    if (req.user.role === 'master') {
      const allUsers = await userService.listAllUsers();

      // Para cada usuario, obtener todas sus bases de datos asignadas
      const users = await Promise.all(allUsers.map(async (u) => {
        const userDatabases = await masterDb('usuarios_bases_datos')
          .join('bases_datos', 'usuarios_bases_datos.id_base_datos', 'bases_datos.id')
          .where('usuarios_bases_datos.id_usuario', u.id)
          .where('usuarios_bases_datos.activo', true)
          .select(
            'bases_datos.id',
            'bases_datos.nombre',
            'bases_datos.db_name',
            'usuarios_bases_datos.rol'
          );

        // Determinar el rol principal (admin si tiene admin en alguna DB)
        const hasAdminRole = userDatabases.some(db => db.rol === 'admin');

        return {
          id: u.id,
          username: u.username,
          nombre: u.nombre,
          email: u.email,
          activo: u.activo,
          rol: hasAdminRole ? 'admin' as const : 'user' as const,
          databases: userDatabases,
          permisos: [],
        };
      }));

      res.json({ users });
      return;
    }

    // Obtener la base de datos actual
    const currentDb = await masterDb('bases_datos')
      .where('db_name', req.user.currentDatabase)
      .first();

    if (!currentDb) {
      res.status(404).json({
        error: 'No encontrado',
        message: 'Base de datos no encontrada',
      });
      return;
    }

    const users = await userService.getUsersByDatabase(currentDb.id);

    res.json({ users });
  } catch (error) {
    console.error('Error en listUsers:', error);
    res.status(500).json({
      error: 'Error interno',
      message: 'Error al listar usuarios',
    });
  }
}

export async function createUser(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    const { username, password, nombre, email, databases } = req.body;

    if (!username || !password || !nombre) {
      res.status(400).json({
        error: 'Datos incompletos',
        message: 'Se requiere username, password y nombre',
      });
      return;
    }

    const masterDb = getMasterDb();

    // Preparar asignación de bases de datos
    let dbAssignments: Array<{ id: number; rol: 'admin' | 'user' }> = [];

    if (req.user.role === 'master' && Array.isArray(databases) && databases.length > 0) {
      // Master puede asignar cualquier base de datos
      dbAssignments = databases.map((db: { id: number; rol?: string }) => ({
        id: db.id,
        rol: db.rol === 'admin' ? 'admin' as const : 'user' as const,
      }));
    } else if (Array.isArray(databases) && databases.length > 0) {
      // Admin solo puede asignar bases de datos a las que él tiene acceso
      // Obtener los IDs de las DBs que el admin tiene asignadas
      const adminDbIds = (req.user.databases || []).map(db => db.id);

      // Filtrar y validar las DBs solicitadas
      const requestedDbIds = databases.map((db: { id: number }) => db.id);
      const invalidDbs = requestedDbIds.filter((id: number) => !adminDbIds.includes(id));

      if (invalidDbs.length > 0) {
        res.status(403).json({
          error: 'No autorizado',
          message: 'No puedes asignar bases de datos a las que no tienes acceso',
        });
        return;
      }

      dbAssignments = databases.map((db: { id: number; rol?: string }) => ({
        id: db.id,
        rol: db.rol === 'admin' ? 'admin' as const : 'user' as const,
      }));
    } else {
      // Si no se especifican databases, asignar a la base de datos actual
      const currentDb = await masterDb('bases_datos')
        .where('db_name', req.user.currentDatabase)
        .first();

      if (!currentDb) {
        res.status(404).json({
          error: 'No encontrado',
          message: 'Base de datos no encontrada',
        });
        return;
      }

      dbAssignments = [{ id: currentDb.id, rol: 'user' as const }];
    }

    // Crear el usuario con las asignaciones de bases de datos
    const user = await userService.createUser({
      username,
      password,
      nombre,
      email,
      databases: dbAssignments,
    });

    // Obtener las bases de datos asignadas para la respuesta
    const userDatabases = await userService.getUserDatabases(user.id);

    res.status(201).json({
      user: {
        id: user.id,
        username: user.username || (user as Record<string, unknown>).nombreUsuario,
        nombre: user.nombre,
        email: user.email,
        activo: user.activo,
        databases: userDatabases,
      },
    });
  } catch (error) {
    console.error('Error en createUser:', error);
    const message =
      error instanceof Error ? error.message : 'Error al crear usuario';
    res.status(400).json({
      error: 'Error',
      message,
    });
  }
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    const userId = getParamId(req.params.id);

    if (userId === null) {
      res.status(400).json({
        error: 'Parámetro inválido',
        message: 'ID de usuario inválido',
      });
      return;
    }

    const { username, nombre, email, activo } = req.body;

    const user = await userService.updateUser(userId, {
      username,
      nombre,
      email,
      activo,
    });

    if (!user) {
      res.status(404).json({
        error: 'No encontrado',
        message: 'Usuario no encontrado',
      });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error('Error en updateUser:', error);
    const message =
      error instanceof Error ? error.message : 'Error al actualizar usuario';
    res.status(400).json({
      error: 'Error',
      message,
    });
  }
}

export async function deleteUser(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    const userId = getParamId(req.params.id);

    if (userId === null) {
      res.status(400).json({
        error: 'Parámetro inválido',
        message: 'ID de usuario inválido',
      });
      return;
    }

    // No permitir eliminar al propio usuario
    if (req.user.userId === userId) {
      res.status(400).json({
        error: 'No permitido',
        message: 'No puedes eliminar tu propio usuario',
      });
      return;
    }

    const deleted = await userService.deleteUser(userId);

    if (!deleted) {
      res.status(404).json({
        error: 'No encontrado',
        message: 'Usuario no encontrado',
      });
      return;
    }

    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error en deleteUser:', error);
    res.status(500).json({
      error: 'Error interno',
      message: 'Error al eliminar usuario',
    });
  }
}

export async function getUserPermissions(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    const userId = getParamId(req.params.id);

    if (userId === null) {
      res.status(400).json({
        error: 'Parámetro inválido',
        message: 'ID de usuario inválido',
      });
      return;
    }

    const masterDb = getMasterDb();

    // Obtener las bases de datos del usuario objetivo
    const userDatabases = await masterDb('usuarios_bases_datos')
      .join('bases_datos', 'usuarios_bases_datos.id_base_datos', 'bases_datos.id')
      .where('usuarios_bases_datos.id_usuario', userId)
      .where('usuarios_bases_datos.activo', true)
      .select('bases_datos.id', 'bases_datos.nombre', 'bases_datos.db_name');

    // Determinar qué base de datos usar para los permisos
    let targetDbId: number;

    if (req.user.role === 'master' && userDatabases.length > 0) {
      // Master: usar la primera base de datos del usuario
      targetDbId = userDatabases[0].id;
    } else {
      // Admin/User: usar la base de datos actual
      const currentDb = await masterDb('bases_datos')
        .where('db_name', req.user.currentDatabase)
        .first();

      if (!currentDb) {
        res.status(404).json({
          error: 'No encontrado',
          message: 'Base de datos no encontrada',
        });
        return;
      }
      targetDbId = currentDb.id;
    }

    const permisos = await userService.getUserPermissions(userId, targetDbId);
    const menus = await permissionService.getAllMenus();

    // Incluir info de las bases de datos del usuario para Master
    res.json({
      permisos,
      menus,
      userDatabases: req.user.role === 'master' ? userDatabases : undefined,
      currentDatabaseId: targetDbId,
    });
  } catch (error) {
    console.error('Error en getUserPermissions:', error);
    res.status(500).json({
      error: 'Error interno',
      message: 'Error al obtener permisos',
    });
  }
}

export async function setUserPermissions(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    const userId = getParamId(req.params.id);

    if (userId === null) {
      res.status(400).json({
        error: 'Parámetro inválido',
        message: 'ID de usuario inválido',
      });
      return;
    }

    const { permisos, databaseId } = req.body;

    if (!Array.isArray(permisos)) {
      res.status(400).json({
        error: 'Datos inválidos',
        message: 'Se requiere un array de permisos',
      });
      return;
    }

    const masterDb = getMasterDb();
    const isMasterUser = req.user.role === 'master';

    // Determinar qué base de datos usar
    let targetDbId: number;

    if (isMasterUser && databaseId) {
      // Master puede especificar la base de datos
      targetDbId = databaseId;
    } else if (isMasterUser) {
      // Master sin databaseId: usar la primera del usuario
      const userDatabases = await masterDb('usuarios_bases_datos')
        .where('id_usuario', userId)
        .where('activo', true)
        .first();

      if (!userDatabases) {
        res.status(404).json({
          error: 'No encontrado',
          message: 'Usuario sin bases de datos asignadas',
        });
        return;
      }
      targetDbId = userDatabases.id_base_datos;
    } else {
      // Admin/User: usar la base de datos actual
      const currentDb = await masterDb('bases_datos')
        .where('db_name', req.user.currentDatabase)
        .first();

      if (!currentDb) {
        res.status(404).json({
          error: 'No encontrado',
          message: 'Base de datos no encontrada',
        });
        return;
      }
      targetDbId = currentDb.id;
    }
    const updatedPermisos = await permissionService.setUserPermissions(
      userId,
      targetDbId,
      permisos,
      isMasterUser
    );

    res.json({ permisos: updatedPermisos });
  } catch (error) {
    console.error('Error en setUserPermissions:', error);
    res.status(500).json({
      error: 'Error interno',
      message: 'Error al actualizar permisos',
    });
  }
}

export async function resetUserPassword(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    const userId = getParamId(req.params.id);

    if (userId === null) {
      res.status(400).json({
        error: 'Parámetro inválido',
        message: 'ID de usuario inválido',
      });
      return;
    }

    const { newPassword } = req.body;

    if (!newPassword) {
      res.status(400).json({
        error: 'Datos incompletos',
        message: 'Se requiere la nueva contraseña',
      });
      return;
    }

    await userService.resetPassword(userId, newPassword);

    res.json({ message: 'Contraseña restablecida correctamente' });
  } catch (error) {
    console.error('Error en resetUserPassword:', error);
    const message =
      error instanceof Error ? error.message : 'Error al restablecer contraseña';
    res.status(400).json({
      error: 'Error',
      message,
    });
  }
}

export async function getMenus(req: Request, res: Response): Promise<void> {
  try {
    const menus = await permissionService.getAllMenus();
    const mostrarOptica = await permissionService.isOpticaModuleEnabled();

    res.json({
      menus,
      config: {
        mostrarModuloOptica: mostrarOptica,
      },
    });
  } catch (error) {
    console.error('Error en getMenus:', error);
    res.status(500).json({
      error: 'Error interno',
      message: 'Error al obtener menús',
    });
  }
}

export async function getAvailableDatabases(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    // Master puede ver todas las bases de datos
    if (req.user.role === 'master') {
      const databases = await databaseService.getActiveDatabases();
      res.json({ databases });
      return;
    }

    // Admin/User solo puede ver las bases de datos a las que tiene acceso
    // Normalizar formato para que coincida con BaseDatos (usando db_name en vez de dbName)
    const databases = (req.user.databases || []).map(db => ({
      id: db.id,
      nombre: db.nombre,
      db_name: db.dbName,
      serie_facturacion: db.serieFacturacion || '',
      activa: true,
    }));
    res.json({ databases });
  } catch (error) {
    console.error('Error en getAvailableDatabases:', error);
    res.status(500).json({
      error: 'Error interno',
      message: 'Error al obtener bases de datos',
    });
  }
}
