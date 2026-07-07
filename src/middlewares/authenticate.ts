import type { Request, Response, NextFunction } from 'express';
import type { Knex } from 'knex';
import {
  extractTokenFromHeader,
  verifyToken,
  createAuthenticatedUser,
  type AuthenticatedUser,
  type JWTPayload,
} from '../auth/index.js';
import { getMasterDb } from '../db/masterDb.js';
import { hashToken } from '../auth/jwt.js';

// Extender el tipo Request de Express para incluir el usuario autenticado
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      masterDb?: Knex;
      tenantDb?: Knex;
    }
  }
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      res.status(401).json({
        error: 'No autorizado',
        message: 'Token de autenticación no proporcionado',
      });
      return;
    }

    let payload: JWTPayload;
    try {
      payload = verifyToken(token);
    } catch (error) {
      res.status(401).json({
        error: 'No autorizado',
        message: 'Token inválido o expirado',
      });
      return;
    }

    // Verificar que la sesión no haya sido revocada (solo para usuarios no-master)
    if (payload.userId !== 'master') {
      const masterDb = getMasterDb();
      const tokenHash = hashToken(token);

      const session = await masterDb('sesiones_activas')
        .where('token_hash', tokenHash)
        .where('revoked', false)
        .where('expires_at', '>', new Date())
        .first();

      if (!session) {
        res.status(401).json({
          error: 'No autorizado',
          message: 'Sesión inválida o expirada',
        });
        return;
      }
    }

    // Obtener la base de datos actual del header o usar la primera disponible
    const currentDatabase =
      (req.headers['x-database'] as string) ||
      payload.currentDatabase ||
      payload.databases[0]?.dbName;

    if (!currentDatabase) {
      res.status(403).json({
        error: 'Acceso denegado',
        message: 'No tienes acceso a ninguna base de datos',
      });
      return;
    }

    // Verificar que el usuario tenga acceso a la base de datos solicitada
    const hasAccess =
      payload.role === 'master' ||
      payload.databases.some((db) => db.dbName === currentDatabase);

    if (!hasAccess) {
      res.status(403).json({
        error: 'Acceso denegado',
        message: 'No tienes acceso a esta base de datos',
      });
      return;
    }

    req.user = createAuthenticatedUser(payload, currentDatabase);
    req.masterDb = getMasterDb();

    next();
  } catch (error) {
    console.error('Error en autenticación:', error);
    res.status(500).json({
      error: 'Error interno',
      message: 'Error al verificar autenticación',
    });
  }
}

// Middleware opcional que permite acceso sin autenticación
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractTokenFromHeader(req.headers.authorization);

  if (!token) {
    next();
    return;
  }

  try {
    const payload = verifyToken(token);
    const currentDatabase =
      (req.headers['x-database'] as string) ||
      payload.currentDatabase ||
      payload.databases[0]?.dbName;

    if (currentDatabase) {
      req.user = createAuthenticatedUser(payload, currentDatabase);
      req.masterDb = getMasterDb();
    }
  } catch {
    // Token inválido, pero continuamos sin usuario
  }

  next();
}
