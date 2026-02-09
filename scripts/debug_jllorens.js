// scripts/debug_jllorens.js
import knex from 'knex';
import dotenv from 'dotenv';
dotenv.config();

const db = knex({
  client: 'pg',
  connection: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.MASTER_DB_NAME,
  },
});

async function run() {
  console.log('=== DEBUG JLLORENS ===\n');

  // 1. Usuario jllorens
  const joan = await db('usuarios').where('username', 'jllorens').first();
  console.log('1. Usuario jllorens:', joan);

  // 2. Bases de datos asignadas
  const userDbs = await db('usuarios_bases_datos')
    .join('bases_datos', 'usuarios_bases_datos.id_base_datos', 'bases_datos.id')
    .where('usuarios_bases_datos.id_usuario', joan.id)
    .select('bases_datos.id', 'bases_datos.nombre', 'bases_datos.db_name', 'usuarios_bases_datos.rol', 'usuarios_bases_datos.activo');
  console.log('\n2. Bases de datos asignadas:');
  userDbs.forEach(db => console.log('  ', db));

  // 3. Permisos por base de datos
  for (const udb of userDbs) {
    const permisos = await db('permisos_usuario')
      .join('menus', 'permisos_usuario.id_menu', 'menus.id')
      .where('permisos_usuario.id_usuario', joan.id)
      .where('permisos_usuario.id_base_datos', udb.id)
      .select('menus.codigo', 'permisos_usuario.puede_ver', 'permisos_usuario.puede_crear');

    console.log(`\n3. Permisos en ${udb.nombre} (${udb.db_name}):`);
    if (permisos.length === 0) {
      console.log('   (sin permisos asignados)');
    } else {
      permisos.forEach(p => console.log(`   ${p.codigo}: ver=${p.puede_ver}, crear=${p.puede_crear}`));
    }
  }

  // 4. Todas las bases de datos
  const allDbs = await db('bases_datos').select('id', 'nombre', 'db_name');
  console.log('\n4. Todas las bases de datos:');
  allDbs.forEach(d => console.log('  ', d));

  await db.destroy();
}

run().catch(err => {
  console.error('Error:', err);
  db.destroy();
});
