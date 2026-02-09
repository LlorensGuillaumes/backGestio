import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '../auth/types.js';
import { getMasterDb } from '../db/masterDb.js';
import { isMasterUser } from '../auth/masterUser.js';

type PermissionAction = 'ver' | 'crear' | 'editar' | 'eliminar';

// Middleware para verificar rol mínimo
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'No autorizado',
        message: 'Debes iniciar sesión',
      });
      return;
    }

    // Master siempre tiene acceso
    if (req.user.role === 'master') {
      next();
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Acceso denegado',
        message: 'No tienes permisos suficientes para esta acción',
      });
      return;
    }

    next();
  };
}

// Middleware para verificar permiso específico sobre un menú
export function requirePermission(menuCode: string, action: PermissionAction) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'No autorizado',
          message: 'Debes iniciar sesión',
        });
        return;
      }

      // Master siempre tiene acceso
      if (isMasterUser(req.user.userId)) {
        next();
        return;
      }

      // Admin tiene todos los permisos sobre su base de datos
      if (req.user.role === 'admin') {
        next();
        return;
      }

      const masterDb = getMasterDb();

      // Obtener el ID de la base de datos actual
      const baseDatos = await masterDb('bases_datos')
        .where('db_name', req.user.currentDatabase)
        .first();

      if (!baseDatos) {
        res.status(403).json({
          error: 'Acceso denegado',
          message: 'Base de datos no encontrada',
        });
        return;
      }

      // Obtener el menú
      const menu = await masterDb('menus').where('codigo', menuCode).first();

      if (!menu) {
        res.status(403).json({
          error: 'Acceso denegado',
          message: 'Menú no encontrado',
        });
        return;
      }

      // Verificar configuración global para módulo óptica
      if (menu.requiere_modulo_optica) {
        const config = await masterDb('configuracion_global')
          .where('clave', 'mostrar_modulo_optica')
          .first();

        if (config?.valor !== 'true') {
          res.status(403).json({
            error: 'Acceso denegado',
            message: 'El módulo de óptica está desactivado',
          });
          return;
        }
      }

      // Verificar permiso específico del usuario
      const permiso = await masterDb('permisos_usuario')
        .where('id_usuario', req.user.userId)
        .where('id_base_datos', baseDatos.id)
        .where('id_menu', menu.id)
        .first();

      if (!permiso) {
        res.status(403).json({
          error: 'Acceso denegado',
          message: 'No tienes permisos para acceder a este recurso',
        });
        return;
      }

      const actionColumn = `puede_${action}`;
      if (!permiso[actionColumn]) {
        res.status(403).json({
          error: 'Acceso denegado',
          message: `No tienes permiso para ${action} en este módulo`,
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Error verificando permisos:', error);
      res.status(500).json({
        error: 'Error interno',
        message: 'Error al verificar permisos',
      });
    }
  };
}

// Middleware solo para Master
export function requireMaster(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({
      error: 'No autorizado',
      message: 'Debes iniciar sesión',
    });
    return;
  }

  if (!isMasterUser(req.user.userId)) {
    res.status(403).json({
      error: 'Acceso denegado',
      message: 'Esta acción solo puede ser realizada por el administrador Master',
    });
    return;
  }

  next();
}

// Middleware para Admin o Master
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({
      error: 'No autorizado',
      message: 'Debes iniciar sesión',
    });
    return;
  }

  if (req.user.role !== 'master' && req.user.role !== 'admin') {
    res.status(403).json({
      error: 'Acceso denegado',
      message: 'Esta acción requiere permisos de administrador',
    });
    return;
  }

  next();
}
