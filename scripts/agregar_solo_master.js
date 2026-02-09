// scripts/agregar_solo_master.js
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
  console.log('1. Añadiendo campo solo_master a tabla menus...');

  // Verificar si el campo ya existe
  const hasColumn = await db.schema.hasColumn('menus', 'solo_master');
  if (!hasColumn) {
    await db.schema.alterTable('menus', (table) => {
      table.boolean('solo_master').defaultTo(false);
    });
    console.log('   Campo solo_master añadido');
  } else {
    console.log('   Campo solo_master ya existe');
  }

  console.log('\n2. Marcando menús de óptica como solo_master...');
  await db('menus')
    .where('grupo', 'optica')
    .update({ solo_master: true });

  const opticaMenus = await db('menus').where('grupo', 'optica').select('codigo', 'solo_master');
  opticaMenus.forEach(m => console.log('   ' + m.codigo + ' -> solo_master: ' + m.solo_master));

  console.log('\n✅ Completado');
  await db.destroy();
}

run();
