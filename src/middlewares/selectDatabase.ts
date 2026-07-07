import type { Request, Response, NextFunction } from 'express';
import { getTenantDb, getDefaultDb } from '../db/tenantDb.js';

// Middleware para seleccionar la base de datos del tenant
export async function selectDatabase(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Si no hay usuario autenticado, usar la base de datos por defecto
    if (!req.user) {
      req.tenantDb = getDefaultDb();
      next();
      return;
    }

    const dbName = req.user.currentDatabase;

    if (!dbName) {
      res.status(400).json({
        error: 'Error de configuración',
        message: 'No se ha seleccionado ninguna base de datos',
      });
      return;
    }

    const tenantDb = await getTenantDb(dbName);

    if (!tenantDb) {
      res.status(404).json({
        error: 'Base de datos no encontrada',
        message: `La base de datos "${dbName}" no existe o no está activa`,
      });
      return;
    }

    req.tenantDb = tenantDb;
    next();
  } catch (error) {
    console.error('Error seleccionando base de datos:', error);
    res.status(500).json({
      error: 'Error interno',
      message: 'Error al conectar con la base de datos',
    });
  }
}

// Middleware combinado de autenticación + selección de BD
export function withTenantDb(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  selectDatabase(req, res, next);
}
