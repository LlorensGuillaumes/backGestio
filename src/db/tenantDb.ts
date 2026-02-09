import knex from 'knex';
import type { Knex } from 'knex';
import 'dotenv/config';
import { getMasterDb } from './masterDb.js';
import type { BaseDatos } from '../auth/types.js';

// Cache de conexiones a bases de datos de tenants
const tenantConnections: Map<string, Knex> = new Map();

interface TenantConfig {
  dbName: string;
  dbHost: string;
  dbPort: number;
}

async function getTenantConfig(dbName: string): Promise<TenantConfig | null> {
  const masterDb = getMasterDb();

  const result = await masterDb<BaseDatos>('bases_datos')
    .where('db_name', dbName)
    .where('activa', true)
    .first();

  if (!result) {
    return null;
  }

  return {
    dbName: result.db_name,
    dbHost: result.db_host || process.env.DB_HOST || 'localhost',
    dbPort: result.db_port || Number(process.env.DB_PORT || 5432),
  };
}

export async function getTenantDb(dbName: string): Promise<Knex | null> {
  // Verificar si ya existe una conexión
  const existing = tenantConnections.get(dbName);
  if (existing) {
    return existing;
  }

  // Obtener configuración del tenant desde la base de datos master
  const config = await getTenantConfig(dbName);
  if (!config) {
    return null;
  }

  // Crear nueva conexión
  const connection = knex({
    client: 'pg',
    connection: {
      host: config.dbHost,
      port: config.dbPort,
      user: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASSWORD ?? '',
      database: config.dbName,
    },
    pool: {
      min: 1,
      max: 5,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 300000,
    },
  });

  tenantConnections.set(dbName, connection);
  return connection;
}

export function getCachedTenantDb(dbName: string): Knex | undefined {
  return tenantConnections.get(dbName);
}

export async function destroyTenantDb(dbName: string): Promise<void> {
  const connection = tenantConnections.get(dbName);
  if (connection) {
    await connection.destroy();
    tenantConnections.delete(dbName);
  }
}

export async function destroyAllTenantDbs(): Promise<void> {
  const destroyPromises = Array.from(tenantConnections.entries()).map(
    async ([dbName, connection]) => {
      await connection.destroy();
      tenantConnections.delete(dbName);
    }
  );
  await Promise.all(destroyPromises);
}

export function getActiveTenantCount(): number {
  return tenantConnections.size;
}

// Obtener el db legacy (para mantener compatibilidad)
export function getDefaultDb(): Knex {
  const defaultDbName = process.env.DB_NAME ?? 'gestio_db';

  if (!tenantConnections.has(defaultDbName)) {
    const connection = knex({
      client: 'pg',
      connection: {
        host: process.env.DB_HOST ?? 'localhost',
        port: Number(process.env.DB_PORT ?? 5432),
        user: process.env.DB_USER ?? 'postgres',
        password: process.env.DB_PASSWORD ?? '',
        database: defaultDbName,
      },
      pool: {
        min: 2,
        max: 10,
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 600000,
      },
    });
    tenantConnections.set(defaultDbName, connection);
  }

  return tenantConnections.get(defaultDbName)!;
}
