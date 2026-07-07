import type { JWTPayload, DatabaseAccess, AuthenticatedUser } from './types.js';
import { generateToken } from './jwt.js';

const MASTER_USERNAME = process.env.MASTER_USERNAME || 'DaVinci';
const MASTER_PASSWORD = process.env.MASTER_PASSWORD || 'Vitruvio';

export function isMasterCredentials(username: string, password: string): boolean {
  return username === MASTER_USERNAME && password === MASTER_PASSWORD;
}

export function getMasterUsername(): string {
  return MASTER_USERNAME;
}

export async function createMasterToken(allDatabases: DatabaseAccess[]): Promise<string> {
  // El usuario Master tiene acceso a todas las bases de datos con rol admin
  const databases: DatabaseAccess[] = allDatabases.map(db => ({
    ...db,
    rol: 'admin' as const,
  }));

  const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
    userId: 'master',
    username: MASTER_USERNAME,
    role: 'master',
    databases,
    currentDatabase: databases[0]?.dbName || 'gestio_db',
  };

  return generateToken(payload);
}

export function createMasterUser(currentDatabase: string, allDatabases: DatabaseAccess[]): AuthenticatedUser {
  return {
    userId: 'master',
    username: MASTER_USERNAME,
    role: 'master',
    databases: allDatabases.map(db => ({ ...db, rol: 'admin' as const })),
    currentDatabase,
  };
}

export function isMasterUser(userId: number | 'master'): boolean {
  return userId === 'master';
}
