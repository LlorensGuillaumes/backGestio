// scripts/ejecutar_fichajes.js
// Ejecutar con: node scripts/ejecutar_fichajes.js

import knex from 'knex';
import dotenv from 'dotenv';

dotenv.config();

const db = knex({
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.MASTER_DB_NAME || 'gestio_master',
  },
});

async function ejecutar() {
  console.log('Conectando a gestio_master...');

  try {
    // 1. Crear tabla fichajes
    console.log('\n1. Creando tabla fichajes...');

    const existeFichajes = await db.schema.hasTable('fichajes');
    if (!existeFichajes) {
      await db.schema.createTable('fichajes', (table) => {
        table.increments('id').primary();
        table.integer('id_usuario').notNullable().references('id').inTable('usuarios');
        table.integer('id_usuario_registro').notNullable().references('id').inTable('usuarios');
        table.date('fecha').notNullable();
        table.time('hora').notNullable();
        table.string('tipo', 10).notNullable();
        table.string('ip_address', 45);
        table.boolean('es_correccion').defaultTo(false);
        table.integer('id_fichaje_original').references('id').inTable('fichajes');
        table.text('motivo_correccion');
        table.jsonb('advertencias').defaultTo('[]');
        table.text('observaciones');
        table.boolean('activo').defaultTo(true);
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());

        table.index(['id_usuario', 'fecha']);
        table.index('fecha');
        table.index('tipo');
      });
      console.log('   Tabla fichajes creada');
    } else {
      console.log('   Tabla fichajes ya existe');
    }

    // 2. Insertar menús de fichajes
    console.log('\n2. Insertando menús de fichajes...');

    const menusFichajes = [
      { codigo: 'rrhh.fichajes', nombre_es: 'Fichajes', nombre_ca: 'Fitxatges', grupo: 'rrhh', orden: 50 },
      { codigo: 'rrhh.fichajes.gestionar', nombre_es: 'Gestionar Fichajes', nombre_ca: 'Gestionar Fitxatges', grupo: 'rrhh', orden: 51 },
    ];

    for (const menu of menusFichajes) {
      const existe = await db('menus').where('codigo', menu.codigo).first();
      if (!existe) {
        await db('menus').insert(menu);
        console.log(`   Menú ${menu.codigo} creado`);
      } else {
        console.log(`   Menú ${menu.codigo} ya existe`);
      }
    }

    // 3. Insertar menús faltantes (RRHH, Agenda, Inventario)
    console.log('\n3. Insertando menús faltantes...');

    const menusFaltantes = [
      { codigo: 'rrhh.trabajadores', nombre_es: 'Trabajadores', nombre_ca: 'Treballadors', grupo: 'rrhh', orden: 40 },
      { codigo: 'rrhh.festivos', nombre_es: 'Festivos', nombre_ca: 'Festius', grupo: 'rrhh', orden: 41 },
      { codigo: 'rrhh.convenios', nombre_es: 'Convenios', nombre_ca: 'Convenis', grupo: 'rrhh', orden: 42 },
      { codigo: 'rrhh.control_horario', nombre_es: 'Control Horario', nombre_ca: 'Control Horari', grupo: 'rrhh', orden: 43 },
      { codigo: 'agenda', nombre_es: 'Agenda', nombre_ca: 'Agenda', grupo: 'general', orden: 30 },
      { codigo: 'inventario', nombre_es: 'Inventario', nombre_ca: 'Inventari', grupo: 'general', orden: 60 },
    ];

    for (const menu of menusFaltantes) {
      const existe = await db('menus').where('codigo', menu.codigo).first();
      if (!existe) {
        await db('menus').insert(menu);
        console.log(`   Menú ${menu.codigo} creado`);
      } else {
        console.log(`   Menú ${menu.codigo} ya existe`);
      }
    }

    // 4. Mostrar todos los menús de RRHH
    console.log('\n4. Menús de RRHH actuales:');
    const menusRrhh = await db('menus').where('grupo', 'rrhh').orderBy('orden');
    menusRrhh.forEach(m => console.log(`   - ${m.codigo}: ${m.nombre_es}`));

    console.log('\n✅ Script ejecutado correctamente');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await db.destroy();
  }
}

ejecutar();
