// scripts/verificar_y_agregar_menus.js
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
  console.log('=== VERIFICANDO MENUS ===\n');

  // 1. Mostrar todos los menus con solo_master
  console.log('1. Menus actuales con campo solo_master:');
  const allMenus = await db('menus').select('id', 'codigo', 'grupo', 'solo_master').orderBy('grupo').orderBy('orden');
  allMenus.forEach(m => {
    console.log(`   ${m.codigo} (${m.grupo}) -> solo_master: ${m.solo_master}`);
  });

  // 2. Verificar menus optica
  console.log('\n2. Menus de optica:');
  const opticaMenus = await db('menus').where('grupo', 'optica');
  if (opticaMenus.length === 0) {
    console.log('   No hay menus de optica');
  } else {
    opticaMenus.forEach(m => console.log(`   ${m.codigo}: solo_master=${m.solo_master}`));
  }

  // 3. Agregar menus faltantes de familias/subfamilias
  console.log('\n3. Agregando menus de familias/subfamilias...');

  const menusToAdd = [
    // Productos
    { codigo: 'productos.familias', nombre_es: 'Familias de Productos', nombre_ca: 'Famílies de Productes', grupo: 'productos', orden: 20, requiere_modulo_optica: false, solo_master: false },
    { codigo: 'productos.subfamilias', nombre_es: 'Subfamilias de Productos', nombre_ca: 'Subfamílies de Productes', grupo: 'productos', orden: 21, requiere_modulo_optica: false, solo_master: false },
    // Clientes
    { codigo: 'clientes.familias', nombre_es: 'Familias de Clientes', nombre_ca: 'Famílies de Clients', grupo: 'clientes', orden: 20, requiere_modulo_optica: false, solo_master: false },
    { codigo: 'clientes.subfamilias', nombre_es: 'Subfamilias de Clientes', nombre_ca: 'Subfamílies de Clients', grupo: 'clientes', orden: 21, requiere_modulo_optica: false, solo_master: false },
    // Proveedores
    { codigo: 'proveedores.familias', nombre_es: 'Familias de Proveedores', nombre_ca: 'Famílies de Proveïdors', grupo: 'proveedores', orden: 20, requiere_modulo_optica: false, solo_master: false },
    { codigo: 'proveedores.subfamilias', nombre_es: 'Subfamilias de Proveedores', nombre_ca: 'Subfamílies de Proveïdors', grupo: 'proveedores', orden: 21, requiere_modulo_optica: false, solo_master: false },
  ];

  for (const menu of menusToAdd) {
    const exists = await db('menus').where('codigo', menu.codigo).first();
    if (!exists) {
      await db('menus').insert(menu);
      console.log(`   Agregado: ${menu.codigo}`);
    } else {
      console.log(`   Ya existe: ${menu.codigo}`);
    }
  }

  // 4. Verificar usuario Joan
  console.log('\n4. Verificando usuario Joan:');
  const joan = await db('usuarios').where('username', 'Joan').orWhere('nombre', 'Joan').first();
  if (joan) {
    console.log(`   ID: ${joan.id}, Username: ${joan.username}, Nombre: ${joan.nombre}`);
    const joanDbs = await db('usuarios_bases_datos').where('id_usuario', joan.id);
    joanDbs.forEach(udb => console.log(`   -> Base datos ID ${udb.id_base_datos}, rol: ${udb.rol}`));
  } else {
    console.log('   Usuario Joan no encontrado');
  }

  console.log('\n=== COMPLETADO ===');
  await db.destroy();
}

run().catch(err => {
  console.error('Error:', err);
  db.destroy();
});
