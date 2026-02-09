import knex from 'knex';
import type { Knex } from 'knex';
import 'dotenv/config';

// Conexión a la base de datos master (gestio_master)
// Esta base de datos contiene usuarios, permisos, configuración global, etc.

let masterDbInstance: Knex | null = null;

export function getMasterDb(): Knex {
  if (!masterDbInstance) {
    masterDbInstance = knex({
      client: 'pg',
      connection: {
        host: process.env.DB_HOST ?? 'localhost',
        port: Number(process.env.DB_PORT ?? 5432),
        user: process.env.DB_USER ?? 'postgres',
        password: process.env.DB_PASSWORD ?? '',
        database: process.env.MASTER_DB_NAME ?? 'gestio_master',
      },
      pool: {
        min: 2,
        max: 10,
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 600000,
      },
    });
  }
  return masterDbInstance;
}

export async function testMasterDbConnection(): Promise<boolean> {
  try {
    const db = getMasterDb();
    await db.raw('SELECT 1 as ok');
    return true;
  } catch (error) {
    console.error('Error conectando a la base de datos master:', error);
    return false;
  }
}

export async function destroyMasterDb(): Promise<void> {
  if (masterDbInstance) {
    await masterDbInstance.destroy();
    masterDbInstance = null;
  }
}
