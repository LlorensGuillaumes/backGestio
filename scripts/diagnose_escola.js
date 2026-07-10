// scripts/diagnose_escola.js
// Script de diagnóstico para verificar el estado de las tablas de escuela
import knex from 'knex';
import dotenv from 'dotenv';
dotenv.config();

const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL,
  pool: { min: 1, max: 5 },
});

async function run() {
  console.log('=== DIAGNÓSTICO ESCUELA ===\n');

  // 1. Verificar tablas de escuela
  const tables = ['Aulas', 'ClasesRecurrentes', 'ClaseHorarios', 'Matriculas', 'Servicios', 'Profesionales'];
  
  for (const table of tables) {
    try {
      const exists = await db.schema.hasTable(table);
      if (exists) {
        const count = await db(table).count('* as total').first();
        console.log(`✓ ${table}: EXISTE (${count.total} registros)`);
      } else {
        console.log(`✗ ${table}: NO EXISTE - NECESITA CREARSE`);
      }
    } catch (error) {
      console.log(`✗ ${table}: ERROR - ${error.message}`);
    }
  }

  // 2. Verificar columna ImporteMatricula en Servicios
  try {
    const hasColumn = await db.schema.hasColumn('Servicios', 'ImporteMatricula');
    console.log(`\n${hasColumn ? '✓' : '✗'} Servicios.ImporteMatricula: ${hasColumn ? 'EXISTE' : 'NO EXISTE'}`);
  } catch (error) {
    console.log(`✗ Servicios.ImporteMatricula: ERROR - ${error.message}`);
  }

  // 3. Verificar bases_datos registradas
  console.log('\n=== BASES DE DATOS REGISTRADAS ===');
  try {
    const dbs = await db('bases_datos').select('id', 'nombre', 'db_name', 'activa');
    dbs.forEach(d => console.log(`  ${d.db_name}: ${d.activa ? 'ACTIVA' : 'INACTIVA'}`));
  } catch (error) {
    console.log('  Error leyendo bases_datos:', error.message);
  }

  await db.destroy();
}

run().catch(err => {
  console.error('Error:', err);
  db.destroy();
});