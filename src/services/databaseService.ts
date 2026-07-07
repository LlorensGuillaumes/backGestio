import { getMasterDb } from '../db/masterDb.js';
import type { BaseDatos } from '../auth/types.js';
import knex from 'knex';
import type { Knex } from 'knex';

interface CreateDatabaseInput {
  nombre: string;
  dbName: string;
  dbHost?: string;
  dbPort?: number;
}

interface UpdateDatabaseInput {
  nombre?: string;
  dbHost?: string;
  dbPort?: number;
  serie_facturacion?: string;
  activa?: boolean;
}

export async function getAllDatabases(): Promise<BaseDatos[]> {
  const masterDb = getMasterDb();

  return masterDb<BaseDatos>('bases_datos').orderBy('nombre');
}

export async function getActiveDatabases(): Promise<BaseDatos[]> {
  const masterDb = getMasterDb();

  return masterDb<BaseDatos>('bases_datos')
    .where('activa', true)
    .orderBy('nombre');
}

export async function getDatabaseById(id: number): Promise<BaseDatos | null> {
  const masterDb = getMasterDb();

  const db = await masterDb<BaseDatos>('bases_datos').where('id', id).first();

  return db || null;
}

export async function getDatabaseByName(
  dbName: string
): Promise<BaseDatos | null> {
  const masterDb = getMasterDb();

  const db = await masterDb<BaseDatos>('bases_datos')
    .where('db_name', dbName)
    .first();

  return db || null;
}

export async function createDatabase(
  input: CreateDatabaseInput
): Promise<BaseDatos> {
  const masterDb = getMasterDb();

  // Verificar si ya existe
  const existing = await masterDb<BaseDatos>('bases_datos')
    .where('db_name', input.dbName)
    .first();

  if (existing) {
    throw new Error('Ya existe una base de datos con ese nombre');
  }

  const [database] = await masterDb<BaseDatos>('bases_datos')
    .insert({
      nombre: input.nombre,
      db_name: input.dbName,
      db_host: input.dbHost || 'localhost',
      db_port: input.dbPort || 5432,
      activa: true,
    })
    .returning('*');

  return database;
}

export async function updateDatabase(
  id: number,
  input: UpdateDatabaseInput
): Promise<BaseDatos | null> {
  const masterDb = getMasterDb();

  const [database] = await masterDb<BaseDatos>('bases_datos')
    .where('id', id)
    .update({
      ...input,
      updated_at: new Date(),
    })
    .returning('*');

  return database || null;
}

export async function toggleDatabaseActive(
  id: number,
  activa: boolean
): Promise<BaseDatos | null> {
  return updateDatabase(id, { activa });
}

export async function deleteDatabase(id: number): Promise<boolean> {
  const masterDb = getMasterDb();

  // El CASCADE se encarga de eliminar registros relacionados
  const result = await masterDb('bases_datos').where('id', id).delete();

  return result > 0;
}

/**
 * Elimina completamente una base de datos de PostgreSQL y de la tabla bases_datos
 * @param id - ID de la base de datos en la tabla bases_datos
 * @returns Resultado de la operación
 */
export async function deleteDatabaseCompletely(
  id: number
): Promise<{ success: boolean; error?: string }> {
  const masterDb = getMasterDb();

  // Obtener información de la base de datos
  const database = await masterDb<BaseDatos>('bases_datos')
    .where('id', id)
    .first();

  if (!database) {
    return { success: false, error: 'Base de datos no encontrada' };
  }

  // No permitir eliminar gestio_db (la plantilla principal)
  if (database.db_name === 'gestio_db') {
    return { success: false, error: 'No se puede eliminar la base de datos principal (gestio_db)' };
  }

  // No permitir eliminar gestio_master
  if (database.db_name === 'gestio_master') {
    return { success: false, error: 'No se puede eliminar la base de datos master' };
  }

  try {
    // 1. Desconectar todos los usuarios de la base de datos
    await masterDb.raw(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = ?
      AND pid <> pg_backend_pid()
    `, [database.db_name]);

    // 2. Eliminar la base de datos de PostgreSQL
    await masterDb.raw(`DROP DATABASE IF EXISTS "${database.db_name}"`);

    // 3. Eliminar el registro de la tabla bases_datos (CASCADE eliminará usuarios_bases_datos y permisos)
    await masterDb('bases_datos').where('id', id).delete();

    return { success: true };
  } catch (error) {
    console.error('Error eliminando base de datos:', error);
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return { success: false, error: message };
  }
}

// ============================================================
// SINCRONIZACIÓN DE ESQUEMAS
// ============================================================

interface ColumnInfo {
  column_name: string;
  data_type: string;
  character_maximum_length: number | null;
  numeric_precision: number | null;
  numeric_scale: number | null;
  is_nullable: string;
  column_default: string | null;
}

interface TableSchema {
  tableName: string;
  columns: ColumnInfo[];
}

interface IndexInfo {
  indexname: string;
  indexdef: string;
}

export interface SchemaDifference {
  type: 'missing_table' | 'missing_column' | 'missing_index';
  tableName: string;
  columnName?: string;
  indexName?: string;
  sql: string;
}

export interface SyncResult {
  database: string;
  differences: SchemaDifference[];
  applied: boolean;
  errors: string[];
}

/**
 * Crea una conexión a una base de datos específica
 */
function createDbConnection(dbName: string): Knex {
  return knex({
    client: 'pg',
    connection: {
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      user: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASSWORD ?? '',
      database: dbName,
    },
  });
}

/**
 * Obtiene el esquema de todas las tablas de una base de datos
 */
async function getDatabaseSchema(db: Knex): Promise<TableSchema[]> {
  const tables = await db.raw(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  const schemas: TableSchema[] = [];

  for (const table of tables.rows) {
    const columns = await db.raw(`
      SELECT
        column_name,
        data_type,
        character_maximum_length,
        numeric_precision,
        numeric_scale,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = ?
      ORDER BY ordinal_position
    `, [table.table_name]);

    schemas.push({
      tableName: table.table_name,
      columns: columns.rows,
    });
  }

  return schemas;
}

/**
 * Obtiene los índices de una base de datos
 */
async function getDatabaseIndexes(db: Knex): Promise<IndexInfo[]> {
  const result = await db.raw(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname NOT LIKE '%_pkey'
    ORDER BY indexname
  `);
  return result.rows;
}

/**
 * Genera el SQL para crear una columna
 */
function generateColumnSQL(tableName: string, col: ColumnInfo): string {
  let dataType = col.data_type.toUpperCase();

  // Manejar tipos con longitud
  if (col.character_maximum_length) {
    dataType = `${dataType}(${col.character_maximum_length})`;
  } else if (col.numeric_precision && col.data_type === 'numeric') {
    dataType = `NUMERIC(${col.numeric_precision}${col.numeric_scale ? `,${col.numeric_scale}` : ''})`;
  }

  let sql = `ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS "${col.column_name}" ${dataType}`;

  if (col.column_default && !col.column_default.includes('nextval')) {
    sql += ` DEFAULT ${col.column_default}`;
  }

  return sql + ';';
}

/**
 * Genera el SQL para crear una tabla completa
 */
function generateCreateTableSQL(schema: TableSchema): string {
  const columnDefs = schema.columns.map(col => {
    let dataType = col.data_type.toUpperCase();

    if (col.character_maximum_length) {
      dataType = `${dataType}(${col.character_maximum_length})`;
    } else if (col.numeric_precision && col.data_type === 'numeric') {
      dataType = `NUMERIC(${col.numeric_precision}${col.numeric_scale ? `,${col.numeric_scale}` : ''})`;
    }

    // Manejar SERIAL/BIGSERIAL
    if (col.column_default?.includes('nextval')) {
      if (col.data_type === 'integer') {
        dataType = 'SERIAL';
      } else if (col.data_type === 'bigint') {
        dataType = 'BIGSERIAL';
      }
    }

    let def = `  "${col.column_name}" ${dataType}`;

    if (col.is_nullable === 'NO') {
      def += ' NOT NULL';
    }

    if (col.column_default && !col.column_default.includes('nextval')) {
      def += ` DEFAULT ${col.column_default}`;
    }

    return def;
  });

  // Detectar primary key
  const pkColumn = schema.columns.find(c => c.column_default?.includes('nextval'));
  if (pkColumn) {
    columnDefs.push(`  PRIMARY KEY ("${pkColumn.column_name}")`);
  }

  return `CREATE TABLE IF NOT EXISTS "${schema.tableName}" (\n${columnDefs.join(',\n')}\n);`;
}

/**
 * Compara dos esquemas y genera las diferencias
 */
function compareSchemas(
  sourceSchemas: TableSchema[],
  targetSchemas: TableSchema[],
  sourceIndexes: IndexInfo[],
  targetIndexes: IndexInfo[]
): SchemaDifference[] {
  const differences: SchemaDifference[] = [];
  const targetTableNames = new Set(targetSchemas.map(s => s.tableName));
  const targetIndexNames = new Set(targetIndexes.map(i => i.indexname));

  for (const sourceTable of sourceSchemas) {
    if (!targetTableNames.has(sourceTable.tableName)) {
      // Tabla completa faltante
      differences.push({
        type: 'missing_table',
        tableName: sourceTable.tableName,
        sql: generateCreateTableSQL(sourceTable),
      });
    } else {
      // Comparar columnas
      const targetTable = targetSchemas.find(t => t.tableName === sourceTable.tableName)!;
      const targetColumnNames = new Set(targetTable.columns.map(c => c.column_name));

      for (const sourceCol of sourceTable.columns) {
        if (!targetColumnNames.has(sourceCol.column_name)) {
          differences.push({
            type: 'missing_column',
            tableName: sourceTable.tableName,
            columnName: sourceCol.column_name,
            sql: generateColumnSQL(sourceTable.tableName, sourceCol),
          });
        }
      }
    }
  }

  // Comparar índices
  for (const sourceIndex of sourceIndexes) {
    if (!targetIndexNames.has(sourceIndex.indexname)) {
      const sql = sourceIndex.indexdef.replace(
        'CREATE INDEX',
        'CREATE INDEX IF NOT EXISTS'
      ).replace(
        'CREATE UNIQUE INDEX',
        'CREATE UNIQUE INDEX IF NOT EXISTS'
      );

      differences.push({
        type: 'missing_index',
        tableName: sourceIndex.indexdef.match(/ON\s+"?(\w+)"?/i)?.[1] || 'unknown',
        indexName: sourceIndex.indexname,
        sql: sql + ';',
      });
    }
  }

  return differences;
}

/**
 * Analiza las diferencias de esquema entre gestio_db y todas las demás DBs
 */
export async function analyzeSchemasDifferences(): Promise<SyncResult[]> {
  const masterDb = getMasterDb();
  const results: SyncResult[] = [];

  // Obtener todas las bases de datos activas excepto gestio_db
  const databases = await masterDb<BaseDatos>('bases_datos')
    .where('activa', true)
    .whereNot('db_name', 'gestio_db')
    .select('db_name', 'nombre');

  // Conectar a gestio_db (plantilla) y obtener su esquema
  const sourceDb = createDbConnection('gestio_db');
  let sourceSchemas: TableSchema[];
  let sourceIndexes: IndexInfo[];

  try {
    sourceSchemas = await getDatabaseSchema(sourceDb);
    sourceIndexes = await getDatabaseIndexes(sourceDb);
  } finally {
    await sourceDb.destroy();
  }

  // Comparar con cada base de datos
  for (const database of databases) {
    const targetDb = createDbConnection(database.db_name);

    try {
      const targetSchemas = await getDatabaseSchema(targetDb);
      const targetIndexes = await getDatabaseIndexes(targetDb);

      const differences = compareSchemas(
        sourceSchemas,
        targetSchemas,
        sourceIndexes,
        targetIndexes
      );

      results.push({
        database: database.db_name,
        differences,
        applied: false,
        errors: [],
      });
    } catch (error) {
      results.push({
        database: database.db_name,
        differences: [],
        applied: false,
        errors: [error instanceof Error ? error.message : 'Error desconocido'],
      });
    } finally {
      await targetDb.destroy();
    }
  }

  return results;
}

/**
 * Aplica las diferencias de esquema a una base de datos específica
 */
export async function applySchemaDifferences(
  dbName: string,
  differences: SchemaDifference[]
): Promise<{ success: boolean; applied: number; errors: string[] }> {
  if (dbName === 'gestio_db') {
    return { success: false, applied: 0, errors: ['No se puede modificar gestio_db'] };
  }

  const targetDb = createDbConnection(dbName);
  const errors: string[] = [];
  let applied = 0;

  try {
    for (const diff of differences) {
      try {
        await targetDb.raw(diff.sql);
        applied++;
        console.log(`[${dbName}] Aplicado: ${diff.type} - ${diff.tableName}${diff.columnName ? '.' + diff.columnName : ''}`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Error desconocido';
        errors.push(`${diff.type} ${diff.tableName}: ${msg}`);
        console.error(`[${dbName}] Error aplicando ${diff.type}:`, msg);
      }
    }
  } finally {
    await targetDb.destroy();
  }

  return {
    success: errors.length === 0,
    applied,
    errors,
  };
}

/**
 * Sincroniza el esquema de gestio_db a todas las demás bases de datos
 */
export async function syncAllSchemas(): Promise<{
  analyzed: number;
  totalDifferences: number;
  applied: number;
  errors: string[];
}> {
  const analysisResults = await analyzeSchemasDifferences();

  let totalDifferences = 0;
  let totalApplied = 0;
  const allErrors: string[] = [];

  for (const result of analysisResults) {
    if (result.errors.length > 0) {
      allErrors.push(...result.errors.map(e => `[${result.database}] ${e}`));
      continue;
    }

    totalDifferences += result.differences.length;

    if (result.differences.length > 0) {
      const applyResult = await applySchemaDifferences(
        result.database,
        result.differences
      );

      totalApplied += applyResult.applied;
      allErrors.push(...applyResult.errors.map(e => `[${result.database}] ${e}`));
    }
  }

  return {
    analyzed: analysisResults.length,
    totalDifferences,
    applied: totalApplied,
    errors: allErrors,
  };
}

export async function getDatabaseUsers(
  databaseId: number
): Promise<{ userId: number; username: string; nombre: string; rol: string }[]> {
  const masterDb = getMasterDb();

  return masterDb('usuarios_bases_datos')
    .join('usuarios', 'usuarios_bases_datos.id_usuario', 'usuarios.id')
    .where('usuarios_bases_datos.id_base_datos', databaseId)
    .where('usuarios_bases_datos.activo', true)
    .select(
      'usuarios.id as userId',
      'usuarios.username',
      'usuarios.nombre',
      'usuarios_bases_datos.rol'
    );
}

/**
 * Obtiene la serie de facturación para una base de datos
 */
export async function getSerieFacturacion(dbName: string): Promise<string> {
  const masterDb = getMasterDb();

  const database = await masterDb<BaseDatos>('bases_datos')
    .where('db_name', dbName)
    .select('serie_facturacion')
    .first();

  return database?.serie_facturacion || 'F';
}

/**
 * Actualiza la serie de facturación de una base de datos
 */
export async function updateSerieFacturacion(
  dbName: string,
  serie: string
): Promise<BaseDatos | null> {
  const masterDb = getMasterDb();

  const [database] = await masterDb<BaseDatos>('bases_datos')
    .where('db_name', dbName)
    .update({
      serie_facturacion: serie.toUpperCase(),
      updated_at: new Date(),
    })
    .returning('*');

  return database || null;
}

/**
 * Obtiene todas las bases de datos de PostgreSQL que empiezan con 'gestio_db'
 */
export async function getPostgresDatabases(): Promise<string[]> {
  const masterDb = getMasterDb();

  const result = await masterDb.raw(`
    SELECT datname
    FROM pg_database
    WHERE datname LIKE 'gestio_db%'
    AND datistemplate = false
    ORDER BY datname
  `);

  return result.rows.map((row: { datname: string }) => row.datname);
}

/**
 * Sincroniza las bases de datos de PostgreSQL con la tabla bases_datos
 * - Añade las que faltan (detectadas automáticamente)
 * - Elimina las que ya no existen en PostgreSQL
 */
export async function syncDatabasesFromPostgres(): Promise<{
  added: string[];
  removed: string[];
  existing: string[];
}> {
  const masterDb = getMasterDb();

  // Obtener todas las DBs de PostgreSQL con prefijo gestio_db
  const postgresDbs = await getPostgresDatabases();
  const postgresDbSet = new Set(postgresDbs);

  // Obtener las que ya están registradas
  const registeredDbs = await masterDb<BaseDatos>('bases_datos')
    .select('db_name');

  const registeredNames = new Set(registeredDbs.map((db) => db.db_name));

  const added: string[] = [];
  const removed: string[] = [];
  const existing: string[] = [];

  // Añadir nuevas DBs que existen en PostgreSQL pero no en bases_datos
  for (const dbName of postgresDbs) {
    if (registeredNames.has(dbName)) {
      existing.push(dbName);
    } else {
      // Añadir la nueva base de datos con nombre descriptivo basado en el sufijo
      const suffix = dbName.replace('gestio_db', '');
      const nombreDescriptivo = suffix ? `Empresa ${suffix}` : 'Empresa Principal';

      await masterDb('bases_datos').insert({
        nombre: nombreDescriptivo,
        db_name: dbName,
        db_host: 'localhost',
        db_port: 5432,
        activa: true,
      });

      added.push(dbName);
    }
  }

  // Eliminar de bases_datos las que ya no existen en PostgreSQL
  for (const db of registeredDbs) {
    if (!postgresDbSet.has(db.db_name)) {
      await masterDb('bases_datos').where('db_name', db.db_name).delete();
      removed.push(db.db_name);
    }
  }

  return { added, removed, existing };
}

/**
 * Crea una nueva base de datos como copia de gestio_db (solo estructura, sin datos)
 * @param suffix - Sufijo para el nuevo nombre (ej: "02" creará "gestio_db02")
 * @param nombre - Nombre descriptivo de la empresa
 */
export async function createDatabaseFromTemplate(
  suffix: string,
  nombre: string
): Promise<{ success: boolean; dbName?: string; error?: string }> {
  const masterDb = getMasterDb();
  const newDbName = `gestio_db${suffix}`;

  // Verificar que no existe ya
  const existing = await masterDb<BaseDatos>('bases_datos')
    .where('db_name', newDbName)
    .first();

  if (existing) {
    return { success: false, error: 'Ya existe una base de datos con ese nombre' };
  }

  // Verificar que el template existe
  const postgresDbs = await getPostgresDatabases();
  if (!postgresDbs.includes('gestio_db')) {
    return { success: false, error: 'La base de datos plantilla gestio_db no existe' };
  }

  // Verificar que la nueva DB no existe ya en PostgreSQL
  if (postgresDbs.includes(newDbName)) {
    // Existe en PostgreSQL pero no en la tabla, la registramos
    await masterDb('bases_datos').insert({
      nombre,
      db_name: newDbName,
      db_host: 'localhost',
      db_port: 5432,
      activa: true,
    });
    return { success: true, dbName: newDbName };
  }

  try {
    // 1. Crear la base de datos vacía
    await masterDb.raw(`CREATE DATABASE "${newDbName}"`);

    // 2. Copiar solo el schema (estructura) usando pg_dump y psql
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    const dbHost = process.env.DB_HOST ?? 'localhost';
    const dbPort = process.env.DB_PORT ?? '5432';
    const dbUser = process.env.DB_USER ?? 'postgres';
    const dbPassword = process.env.DB_PASSWORD ?? '';

    // Configurar variable de entorno para la contraseña
    const env = { ...process.env, PGPASSWORD: dbPassword };

    // pg_dump --schema-only para obtener solo la estructura
    // Luego psql para aplicarla a la nueva base de datos
    const command = `pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} --schema-only gestio_db | psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d "${newDbName}"`;

    await execAsync(command, { env });

    // 3. Registrar en la tabla bases_datos
    await masterDb('bases_datos').insert({
      nombre,
      db_name: newDbName,
      db_host: 'localhost',
      db_port: 5432,
      activa: true,
    });

    return { success: true, dbName: newDbName };
  } catch (error) {
    console.error('Error creando base de datos:', error);

    // Intentar eliminar la base de datos si se creó pero falló el schema
    try {
      await masterDb.raw(`DROP DATABASE IF EXISTS "${newDbName}"`);
    } catch (dropError) {
      console.error('Error eliminando base de datos fallida:', dropError);
    }

    const message = error instanceof Error ? error.message : 'Error desconocido';
    return { success: false, error: message };
  }
}
