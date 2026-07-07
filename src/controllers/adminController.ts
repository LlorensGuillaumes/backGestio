import type { Request, Response } from 'express';
import * as databaseService from '../services/databaseService.js';
import * as userService from '../services/userService.js';
import * as permissionService from '../services/permissionService.js';
import { isMasterCredentials } from '../auth/masterUser.js';

function getParamId(param: string | string[] | undefined): number | null {
  const value = Array.isArray(param) ? param[0] : param;
  if (!value) return null;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? null : parsed;
}

function getParamString(param: string | string[] | undefined): string | null {
  const value = Array.isArray(param) ? param[0] : param;
  return value || null;
}

// Gestión de bases de datos (solo Master)
export async function listDatabases(req: Request, res: Response): Promise<void> {
  try {
    const databases = await databaseService.getAllDatabases();

    res.json({ databases });
  } catch (error) {
    console.error('Error en listDatabases:', error);
    res.status(500).json({
      error: 'Error interno',
      message: 'Error al listar bases de datos',
    });
  }
}

export async function createDatabase(req: Request, res: Response): Promise<void> {
  try {
    const { nombre, dbName, dbHost, dbPort } = req.body;

    if (!nombre || !dbName) {
      res.status(400).json({
        error: 'Datos incompletos',
        message: 'Se requiere nombre y dbName',
      });
      return;
    }

    const database = await databaseService.createDatabase({
      nombre,
      dbName,
      dbHost,
      dbPort,
    });

    res.status(201).json({ database });
  } catch (error) {
    console.error('Error en createDatabase:', error);
    const message =
      error instanceof Error ? error.message : 'Error al crear base de datos';
    res.status(400).json({
      error: 'Error',
      message,
    });
  }
}

export async function updateDatabase(req: Request, res: Response): Promise<void> {
  try {
    const id = getParamId(req.params.id);

    if (id === null) {
      res.status(400).json({
        error: 'Parámetro inválido',
        message: 'ID de base de datos inválido',
      });
      return;
    }

    const { nombre, dbHost, dbPort, activa, serieFacturacion } = req.body;

    const database = await databaseService.updateDatabase(id, {
      nombre,
      dbHost,
      dbPort,
      serie_facturacion: serieFacturacion,
      activa,
    });

    if (!database) {
      res.status(404).json({
        error: 'No encontrado',
        message: 'Base de datos no encontrada',
      });
      return;
    }

    res.json({ database });
  } catch (error) {
    console.error('Error en updateDatabase:', error);
    res.status(500).json({
      error: 'Error interno',
      message: 'Error al actualizar base de datos',
    });
  }
}

export async function deleteDatabase(req: Request, res: Response): Promise<void> {
  try {
    const id = getParamId(req.params.id);

    if (id === null) {
      res.status(400).json({
        error: 'Parámetro inválido',
        message: 'ID de base de datos inválido',
      });
      return;
    }

    const deleted = await databaseService.deleteDatabase(id);

    if (!deleted) {
      res.status(404).json({
        error: 'No encontrado',
        message: 'Base de datos no encontrada',
      });
      return;
    }

    res.json({ message: 'Base de datos eliminada correctamente' });
  } catch (error) {
    console.error('Error en deleteDatabase:', error);
    res.status(500).json({
      error: 'Error interno',
      message: 'Error al eliminar base de datos',
    });
  }
}

export async function getDatabaseUsers(req: Request, res: Response): Promise<void> {
  try {
    const id = getParamId(req.params.id);

    if (id === null) {
      res.status(400).json({
        error: 'Parámetro inválido',
        message: 'ID de base de datos inválido',
      });
      return;
    }

    const users = await databaseService.getDatabaseUsers(id);

    res.json({ users });
  } catch (error) {
    console.error('Error en getDatabaseUsers:', error);
    res.status(500).json({
      error: 'Error interno',
      message: 'Error al obtener usuarios de la base de datos',
    });
  }
}

// Asignar usuario a base de datos (solo Master)
export async function assignUserToDatabase(req: Request, res: Response): Promise<void> {
  try {
    const { userId, databaseId, rol } = req.body;

    if (!userId || !databaseId) {
      res.status(400).json({
        error: 'Datos incompletos',
        message: 'Se requiere userId y databaseId',
      });
      return;
    }

    const userRole = rol === 'admin' ? 'admin' : 'user';
    const relation = await userService.assignUserToDatabase(userId, databaseId, userRole);

    res.json({ relation });
  } catch (error) {
    console.error('Error en assignUserToDatabase:', error);
    res.status(500).json({
      error: 'Error interno',
      message: 'Error al asignar usuario a base de datos',
    });
  }
}

export async function removeUserFromDatabase(req: Request, res: Response): Promise<void> {
  try {
    const { userId, databaseId } = req.body;

    if (!userId || !databaseId) {
      res.status(400).json({
        error: 'Datos incompletos',
        message: 'Se requiere userId y databaseId',
      });
      return;
    }

    const removed = await userService.removeUserFromDatabase(userId, databaseId);

    if (!removed) {
      res.status(404).json({
        error: 'No encontrado',
        message: 'Relación no encontrada',
      });
      return;
    }

    res.json({ message: 'Usuario removido de la base de datos correctamente' });
  } catch (error) {
    console.error('Error en removeUserFromDatabase:', error);
    res.status(500).json({
      error: 'Error interno',
      message: 'Error al remover usuario de base de datos',
    });
  }
}

// Listar todos los usuarios (solo Master)
export async function listAllUsers(req: Request, res: Response): Promise<void> {
  try {
    const users = await userService.listAllUsers();

    res.json({ users });
  } catch (error) {
    console.error('Error en listAllUsers:', error);
    res.status(500).json({
      error: 'Error interno',
      message: 'Error al listar usuarios',
    });
  }
}

// Configuración global (solo Master)
export async function getGlobalConfig(req: Request, res: Response): Promise<void> {
  try {
    const config = await permissionService.getGlobalConfig();

    res.json({ config });
  } catch (error) {
    console.error('Error en getGlobalConfig:', error);
    res.status(500).json({
      error: 'Error interno',
      message: 'Error al obtener configuración global',
    });
  }
}

export async function updateGlobalConfig(req: Request, res: Response): Promise<void> {
  try {
    const clave = getParamString(req.params.clave);
    const { valor } = req.body;

    if (!clave) {
      res.status(400).json({
        error: 'Parámetro inválido',
        message: 'Clave de configuración inválida',
      });
      return;
    }

    if (valor === undefined) {
      res.status(400).json({
        error: 'Datos incompletos',
        message: 'Se requiere el valor',
      });
      return;
    }

    const config = await permissionService.setGlobalConfigValue(clave, String(valor));

    if (!config) {
      res.status(404).json({
        error: 'No encontrado',
        message: 'Configuración no encontrada',
      });
      return;
    }

    res.json({ config });
  } catch (error) {
    console.error('Error en updateGlobalConfig:', error);
    res.status(500).json({
      error: 'Error interno',
      message: 'Error al actualizar configuración global',
    });
  }
}

// Sincronizar bases de datos desde PostgreSQL (solo Master)
export async function syncDatabases(req: Request, res: Response): Promise<void> {
  try {
    const result = await databaseService.syncDatabasesFromPostgres();

    res.json({
      message: 'Sincronización completada',
      added: result.added,
      removed: result.removed,
      existing: result.existing,
    });
  } catch (error) {
    console.error('Error en syncDatabases:', error);
    res.status(500).json({
      error: 'Error interno',
      message: 'Error al sincronizar bases de datos',
    });
  }
}

// Crear base de datos como copia de gestio_db (solo Master)
export async function createDatabaseFromTemplate(req: Request, res: Response): Promise<void> {
  try {
    const { suffix, nombre } = req.body;

    if (!suffix || !nombre) {
      res.status(400).json({
        error: 'Datos incompletos',
        message: 'Se requiere el sufijo y el nombre de la base de datos',
      });
      return;
    }

    // Validar el sufijo (solo alfanumérico)
    if (!/^[a-zA-Z0-9_]+$/.test(suffix)) {
      res.status(400).json({
        error: 'Sufijo inválido',
        message: 'El sufijo solo puede contener letras, números y guiones bajos',
      });
      return;
    }

    const result = await databaseService.createDatabaseFromTemplate(suffix, nombre);

    if (!result.success) {
      res.status(400).json({
        error: 'Error al crear base de datos',
        message: result.error,
      });
      return;
    }

    res.status(201).json({
      message: 'Base de datos creada correctamente',
      dbName: result.dbName,
    });
  } catch (error) {
    console.error('Error en createDatabaseFromTemplate:', error);
    res.status(500).json({
      error: 'Error interno',
      message: 'Error al crear base de datos desde plantilla',
    });
  }
}

// Obtener bases de datos de PostgreSQL (para diagnóstico)
export async function getPostgresDatabases(req: Request, res: Response): Promise<void> {
  try {
    const databases = await databaseService.getPostgresDatabases();

    res.json({ databases });
  } catch (error) {
    console.error('Error en getPostgresDatabases:', error);
    res.status(500).json({
      error: 'Error interno',
      message: 'Error al obtener bases de datos de PostgreSQL',
    });
  }
}

// ============================================================
// SINCRONIZACIÓN DE ESQUEMAS
// ============================================================

// Analizar diferencias de esquema entre gestio_db y las demás DBs
export async function analyzeSchemas(req: Request, res: Response): Promise<void> {
  try {
    const results = await databaseService.analyzeSchemasDifferences();

    // Calcular resumen
    const summary = {
      totalDatabases: results.length,
      databasesWithDifferences: results.filter(r => r.differences.length > 0).length,
      totalDifferences: results.reduce((acc, r) => acc + r.differences.length, 0),
      byType: {
        missing_table: results.reduce((acc, r) => acc + r.differences.filter(d => d.type === 'missing_table').length, 0),
        missing_column: results.reduce((acc, r) => acc + r.differences.filter(d => d.type === 'missing_column').length, 0),
        missing_index: results.reduce((acc, r) => acc + r.differences.filter(d => d.type === 'missing_index').length, 0),
      },
    };

    res.json({ results, summary });
  } catch (error) {
    console.error('Error en analyzeSchemas:', error);
    res.status(500).json({
      error: 'Error interno',
      message: 'Error al analizar esquemas',
    });
  }
}

// Sincronizar esquemas de todas las bases de datos
export async function syncSchemas(req: Request, res: Response): Promise<void> {
  try {
    const result = await databaseService.syncAllSchemas();

    res.json({
      message: result.applied > 0
        ? `Sincronización completada: ${result.applied} cambios aplicados`
        : 'No hay cambios que aplicar',
      ...result,
    });
  } catch (error) {
    console.error('Error en syncSchemas:', error);
    res.status(500).json({
      error: 'Error interno',
      message: 'Error al sincronizar esquemas',
    });
  }
}

// Aplicar diferencias a una base de datos específica
export async function applySchemasToDatabase(req: Request, res: Response): Promise<void> {
  try {
    const dbName = req.params.dbName;
    const { differences } = req.body;

    if (!dbName) {
      res.status(400).json({
        error: 'Parámetro inválido',
        message: 'Se requiere el nombre de la base de datos',
      });
      return;
    }

    if (!differences || !Array.isArray(differences)) {
      res.status(400).json({
        error: 'Datos incompletos',
        message: 'Se requiere el array de diferencias a aplicar',
      });
      return;
    }

    const result = await databaseService.applySchemaDifferences(dbName, differences);

    res.json({
      message: result.success
        ? `${result.applied} cambios aplicados correctamente`
        : `Se aplicaron ${result.applied} cambios con ${result.errors.length} errores`,
      ...result,
    });
  } catch (error) {
    console.error('Error en applySchemasToDatabase:', error);
    res.status(500).json({
      error: 'Error interno',
      message: 'Error al aplicar cambios de esquema',
    });
  }
}

// Eliminar base de datos completamente (requiere contraseña Master)
export async function deleteDatabaseCompletely(req: Request, res: Response): Promise<void> {
  try {
    const id = getParamId(req.params.id);
    const { masterPassword } = req.body;

    if (id === null) {
      res.status(400).json({
        error: 'Parámetro inválido',
        message: 'ID de base de datos inválido',
      });
      return;
    }

    if (!masterPassword) {
      res.status(400).json({
        error: 'Datos incompletos',
        message: 'Se requiere la contraseña del administrador Master',
      });
      return;
    }

    // Verificar la contraseña del Master
    const masterUsername = process.env.MASTER_USERNAME ?? 'master';
    if (!isMasterCredentials(masterUsername, masterPassword)) {
      res.status(401).json({
        error: 'No autorizado',
        message: 'Contraseña incorrecta',
      });
      return;
    }

    // Proceder a eliminar
    const result = await databaseService.deleteDatabaseCompletely(id);

    if (!result.success) {
      res.status(400).json({
        error: 'Error al eliminar',
        message: result.error,
      });
      return;
    }

    res.json({
      message: 'Base de datos eliminada completamente',
    });
  } catch (error) {
    console.error('Error en deleteDatabaseCompletely:', error);
    res.status(500).json({
      error: 'Error interno',
      message: 'Error al eliminar la base de datos',
    });
  }
}
