import type { Request, Response } from 'express';
import * as authService from '../services/authService.js';
import * as userService from '../services/userService.js';
import * as permissionService from '../services/permissionService.js';
import * as databaseService from '../services/databaseService.js';
import { extractTokenFromHeader } from '../auth/jwt.js';
import { isMasterUser } from '../auth/masterUser.js';
import { getMasterDb } from '../db/masterDb.js';

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({
        error: 'Datos incompletos',
        message: 'Se requiere usuario y contraseña',
      });
      return;
    }

    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await authService.login(username, password, ipAddress, userAgent);

    if (!result) {
      res.status(401).json({
        error: 'Credenciales inválidas',
        message: 'Usuario o contraseña incorrectos',
      });
      return;
    }

    res.json(result);
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      error: 'Error interno',
      message: 'Error al procesar el inicio de sesión',
    });
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!req.user || !token) {
      res.status(401).json({
        error: 'No autorizado',
        message: 'No hay sesión activa',
      });
      return;
    }

    await authService.logout(req.user.userId, token);

    res.json({ message: 'Sesión cerrada correctamente' });
  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({
      error: 'Error interno',
      message: 'Error al cerrar sesión',
    });
  }
}

export async function me(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'No autorizado',
        message: 'No hay sesión activa',
      });
      return;
    }

    const masterDb = getMasterDb();

    // Obtener información del usuario y sus permisos
    let userData: Record<string, unknown>;

    if (isMasterUser(req.user.userId)) {
      // Usuario Master - sincronizar bases de datos primero
      try {
        await databaseService.syncDatabasesFromPostgres();
      } catch (syncError) {
        console.error('Error sincronizando bases de datos en /me:', syncError);
        // Continuamos aunque falle la sincronización
      }

      const allDatabases = await masterDb('bases_datos')
        .where('activa', true)
        .select('id', 'nombre', 'db_name', 'serie_facturacion');

      userData = {
        id: 'master',
        username: req.user.username,
        nombre: 'Administrador Master',
        role: 'master',
        databases: allDatabases.map((db) => ({
          id: db.id,
          nombre: db.nombre,
          dbName: db.db_name,
          rol: 'admin',
          serieFacturacion: db.serie_facturacion || 'F',
        })),
        currentDatabase: req.user.currentDatabase,
        permisos: [], // Master tiene todos los permisos
      };
    } else {
      // Usuario normal
      const user = await userService.getUserById(req.user.userId as number);

      if (!user) {
        res.status(404).json({
          error: 'No encontrado',
          message: 'Usuario no encontrado',
        });
        return;
      }

      const databases = await userService.getUserDatabases(user.id);

      // Obtener la base de datos actual
      const currentDb = await masterDb('bases_datos')
        .where('db_name', req.user.currentDatabase)
        .first();

      let permisos: unknown[] = [];
      if (currentDb) {
        permisos = await userService.getUserPermissions(user.id, currentDb.id);
      }

      userData = {
        id: user.id,
        username: user.username,
        nombre: user.nombre,
        email: user.email,
        role: req.user.role,
        databases,
        currentDatabase: req.user.currentDatabase,
        permisos,
      };
    }

    // Obtener configuración global relevante
    const mostrarOptica = await permissionService.isOpticaModuleEnabled();

    res.json({
      user: userData,
      config: {
        mostrarModuloOptica: mostrarOptica,
      },
    });
  } catch (error) {
    console.error('Error en me:', error);
    res.status(500).json({
      error: 'Error interno',
      message: 'Error al obtener información del usuario',
    });
  }
}

export async function switchDatabase(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'No autorizado',
        message: 'No hay sesión activa',
      });
      return;
    }

    const { database } = req.body;

    if (!database) {
      res.status(400).json({
        error: 'Datos incompletos',
        message: 'Se requiere el nombre de la base de datos',
      });
      return;
    }

    // Verificar que el usuario tiene acceso a la base de datos
    const hasAccess =
      req.user.role === 'master' ||
      req.user.databases.some((db) => db.dbName === database);

    if (!hasAccess) {
      res.status(403).json({
        error: 'Acceso denegado',
        message: 'No tienes acceso a esta base de datos',
      });
      return;
    }

    // Verificar que la base de datos existe y está activa
    const masterDb = getMasterDb();
    const dbExists = await masterDb('bases_datos')
      .where('db_name', database)
      .where('activa', true)
      .first();

    if (!dbExists) {
      res.status(404).json({
        error: 'No encontrado',
        message: 'Base de datos no encontrada o no está activa',
      });
      return;
    }

    res.json({
      message: 'Base de datos cambiada correctamente',
      currentDatabase: database,
    });
  } catch (error) {
    console.error('Error en switchDatabase:', error);
    res.status(500).json({
      error: 'Error interno',
      message: 'Error al cambiar de base de datos',
    });
  }
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'No autorizado',
        message: 'No hay sesión activa',
      });
      return;
    }

    if (isMasterUser(req.user.userId)) {
      res.status(400).json({
        error: 'No permitido',
        message: 'El usuario Master no puede cambiar su contraseña desde aquí',
      });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        error: 'Datos incompletos',
        message: 'Se requiere la contraseña actual y la nueva',
      });
      return;
    }

    await userService.changePassword(
      req.user.userId as number,
      currentPassword,
      newPassword
    );

    res.json({ message: 'Contraseña cambiada correctamente' });
  } catch (error) {
    console.error('Error en changePassword:', error);
    const message =
      error instanceof Error ? error.message : 'Error al cambiar la contraseña';
    res.status(400).json({
      error: 'Error',
      message,
    });
  }
}

export async function getSessions(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'No autorizado',
        message: 'No hay sesión activa',
      });
      return;
    }

    if (isMasterUser(req.user.userId)) {
      res.json({ sessions: [] });
      return;
    }

    const sessions = await authService.getActiveSessions(req.user.userId as number);

    res.json({ sessions });
  } catch (error) {
    console.error('Error en getSessions:', error);
    res.status(500).json({
      error: 'Error interno',
      message: 'Error al obtener sesiones',
    });
  }
}

export async function revokeAllSessions(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'No autorizado',
        message: 'No hay sesión activa',
      });
      return;
    }

    if (isMasterUser(req.user.userId)) {
      res.json({ message: 'No hay sesiones que revocar', count: 0 });
      return;
    }

    const count = await authService.revokeAllSessions(req.user.userId as number);

    res.json({
      message: 'Sesiones revocadas correctamente',
      count,
    });
  } catch (error) {
    console.error('Error en revokeAllSessions:', error);
    res.status(500).json({
      error: 'Error interno',
      message: 'Error al revocar sesiones',
    });
  }
}
