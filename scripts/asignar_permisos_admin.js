// scripts/asignar_permisos_admin.js
// Asigna todos los permisos (excepto óptica) a usuarios admin
// Uso: node scripts/asignar_permisos_admin.js [--usuario=ID]

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

async function asignarPermisos() {
  console.log('Conectando a gestio_master...\n');

  try {
    // Parsear argumentos
    const args = process.argv.slice(2);
    const usuarioArg = args.find(a => a.startsWith('--usuario='));
    const usuarioId = usuarioArg ? parseInt(usuarioArg.split('=')[1]) : null;

    // 1. Obtener todos los menús EXCEPTO los de óptica
    const menus = await db('menus')
      .whereNot('grupo', 'optica')
      .select('id', 'codigo', 'nombre_es');

    console.log(`📋 Menús a asignar (${menus.length} - excluyendo óptica):`);
    menus.forEach(m => console.log(`   - ${m.codigo}`));

    // 2. Obtener usuarios a procesar
    let usuariosAProcesar = [];

    if (usuarioId) {
      // Usuario específico
      const usuario = await db('usuarios_bases_datos as ubd')
        .join('usuarios as u', 'ubd.id_usuario', 'u.id')
        .join('bases_datos as bd', 'ubd.id_base_datos', 'bd.id')
        .where('u.id', usuarioId)
        .where('ubd.activo', true)
        .select('u.id', 'u.nombre', 'u.username', 'bd.id as id_base_datos', 'bd.nombre as nombre_bd', 'ubd.rol');

      usuariosAProcesar = usuario;
      console.log(`\n👤 Usuario específico: ${usuarioId}`);
    } else {
      // Todos los admin
      usuariosAProcesar = await db('usuarios_bases_datos as ubd')
        .join('usuarios as u', 'ubd.id_usuario', 'u.id')
        .join('bases_datos as bd', 'ubd.id_base_datos', 'bd.id')
        .where('ubd.rol', 'admin')
        .where('ubd.activo', true)
        .where('u.activo', true)
        .select('u.id', 'u.nombre', 'u.username', 'bd.id as id_base_datos', 'bd.nombre as nombre_bd', 'ubd.rol');

      console.log(`\n👥 Usuarios admin encontrados: ${usuariosAProcesar.length}`);
    }

    if (usuariosAProcesar.length === 0) {
      console.log('\n⚠️  No hay usuarios para procesar.');
      console.log('   - Si quieres asignar permisos a un usuario específico, usa: --usuario=ID');
      console.log('   - Si quieres que un usuario sea admin, cambia su rol en usuarios_bases_datos');

      // Mostrar usuarios existentes
      const todosUsuarios = await db('usuarios_bases_datos as ubd')
        .join('usuarios as u', 'ubd.id_usuario', 'u.id')
        .join('bases_datos as bd', 'ubd.id_base_datos', 'bd.id')
        .where('ubd.activo', true)
        .select('u.id', 'u.nombre', 'bd.nombre as nombre_bd', 'ubd.rol');

      console.log('\n📋 Usuarios existentes:');
      todosUsuarios.forEach(u => console.log(`   ID: ${u.id} - ${u.nombre} - ${u.nombre_bd} - rol: ${u.rol}`));

      await db.destroy();
      return;
    }

    // 3. Asignar permisos
    console.log('\n🔧 Asignando permisos...\n');

    for (const usuario of usuariosAProcesar) {
      console.log(`👤 ${usuario.nombre} (${usuario.username}) - ${usuario.nombre_bd} [${usuario.rol}]`);

      let creados = 0;
      let actualizados = 0;

      for (const menu of menus) {
        // Verificar si ya existe el permiso
        const existente = await db('permisos_usuario')
          .where('id_usuario', usuario.id)
          .where('id_base_datos', usuario.id_base_datos)
          .where('id_menu', menu.id)
          .first();

        if (existente) {
          // Actualizar para dar todos los permisos
          if (!existente.puede_ver || !existente.puede_crear || !existente.puede_editar || !existente.puede_eliminar) {
            await db('permisos_usuario')
              .where('id', existente.id)
              .update({
                puede_ver: true,
                puede_crear: true,
                puede_editar: true,
                puede_eliminar: true,
              });
            actualizados++;
          }
        } else {
          // Crear nuevo permiso
          await db('permisos_usuario').insert({
            id_usuario: usuario.id,
            id_base_datos: usuario.id_base_datos,
            id_menu: menu.id,
            puede_ver: true,
            puede_crear: true,
            puede_editar: true,
            puede_eliminar: true,
          });
          creados++;
        }
      }

      console.log(`   ✅ Permisos creados: ${creados}, actualizados: ${actualizados}`);
    }

    console.log('\n✅ Proceso completado');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await db.destroy();
  }
}

asignarPermisos();
