import { getMasterDb } from './masterDb.js';

export async function initMasterDbTables(): Promise<void> {
  const masterDb = getMasterDb();

  // Crear tabla bases_datos
  const hasBasesDatos = await masterDb.schema.hasTable('bases_datos');
  if (!hasBasesDatos) {
    await masterDb.schema.createTable('bases_datos', (table) => {
      table.increments('id').primary();
      table.string('nombre', 100).notNullable();
      table.string('db_name', 100).notNullable().unique();
      table.string('db_host', 255).defaultTo('localhost');
      table.integer('db_port').defaultTo(5432);
      table.string('serie_facturacion', 10).defaultTo('F'); // Serie para facturas de venta
      table.boolean('activa').defaultTo(true);
      table.timestamp('created_at').defaultTo(masterDb.fn.now());
      table.timestamp('updated_at').defaultTo(masterDb.fn.now());
    });
    console.log('Tabla bases_datos creada');
  } else {
    // Añadir columna serie_facturacion si no existe
    const hasSerieFacturacion = await masterDb.schema.hasColumn('bases_datos', 'serie_facturacion');
    if (!hasSerieFacturacion) {
      await masterDb.schema.alterTable('bases_datos', (table) => {
        table.string('serie_facturacion', 10).defaultTo('F');
      });
      console.log('Columna serie_facturacion añadida a bases_datos');
    }
  }

  // Crear tabla usuarios si no existe
  const hasUsuarios = await masterDb.schema.hasTable('usuarios');
  if (!hasUsuarios) {
    await masterDb.schema.createTable('usuarios', (table) => {
      table.increments('id').primary();
      table.string('username', 100).notNullable().unique();
      table.string('password_hash', 255).notNullable();
      table.string('nombre', 100).notNullable();
      table.string('email', 255);
      table.boolean('activo').defaultTo(true);
      table.timestamp('created_at').defaultTo(masterDb.fn.now());
      table.timestamp('updated_at').defaultTo(masterDb.fn.now());
    });
    console.log('Tabla usuarios creada');
  } else {
    // Añadir columnas faltantes a tabla existente
    const columns = ['password_hash', 'username', 'nombre', 'email', 'activo', 'created_at', 'updated_at'];
    for (const col of columns) {
      const hasColumn = await masterDb.schema.hasColumn('usuarios', col);
      if (!hasColumn) {
        await masterDb.schema.alterTable('usuarios', (table) => {
          switch (col) {
            case 'password_hash':
              table.string('password_hash', 255);
              break;
            case 'username':
              table.string('username', 100);
              break;
            case 'nombre':
              table.string('nombre', 100);
              break;
            case 'email':
              table.string('email', 255);
              break;
            case 'activo':
              table.boolean('activo').defaultTo(true);
              break;
            case 'created_at':
              table.timestamp('created_at').defaultTo(masterDb.fn.now());
              break;
            case 'updated_at':
              table.timestamp('updated_at').defaultTo(masterDb.fn.now());
              break;
          }
        });
        console.log(`Columna ${col} añadida a usuarios`);
      }
    }
  }

  // Crear tabla usuarios_bases_datos
  const hasUsuariosBasesDatos = await masterDb.schema.hasTable('usuarios_bases_datos');
  if (!hasUsuariosBasesDatos) {
    await masterDb.schema.createTable('usuarios_bases_datos', (table) => {
      table.increments('id').primary();
      table.integer('id_usuario').notNullable().references('id').inTable('usuarios').onDelete('CASCADE');
      table.integer('id_base_datos').notNullable().references('id').inTable('bases_datos').onDelete('CASCADE');
      table.string('rol', 20).notNullable().defaultTo('user');
      table.boolean('activo').defaultTo(true);
      table.timestamp('created_at').defaultTo(masterDb.fn.now());
      table.unique(['id_usuario', 'id_base_datos']);
    });
    console.log('Tabla usuarios_bases_datos creada');
  }

  // Crear tabla menus
  const hasMenus = await masterDb.schema.hasTable('menus');
  if (!hasMenus) {
    await masterDb.schema.createTable('menus', (table) => {
      table.increments('id').primary();
      table.string('codigo', 50).notNullable().unique();
      table.string('nombre_es', 100).notNullable();
      table.string('nombre_ca', 100).notNullable();
      table.string('grupo', 50).notNullable();
      table.integer('orden').defaultTo(0);
      table.boolean('requiere_modulo_optica').defaultTo(false);
    });
    console.log('Tabla menus creada');

    // Insertar menús iniciales
    await masterDb('menus').insert([
      { codigo: 'ventas.clientes', nombre_es: 'Clientes', nombre_ca: 'Clients', grupo: 'ventas', orden: 1, requiere_modulo_optica: false },
      { codigo: 'ventas.caja', nombre_es: 'Caja', nombre_ca: 'Caixa', grupo: 'ventas', orden: 2, requiere_modulo_optica: false },
      { codigo: 'compras.proveedores', nombre_es: 'Proveedores', nombre_ca: 'Proveïdors', grupo: 'compras', orden: 1, requiere_modulo_optica: false },
      { codigo: 'compras.ordenes', nombre_es: 'Órdenes de Compra', nombre_ca: 'Ordres de Compra', grupo: 'compras', orden: 2, requiere_modulo_optica: false },
      { codigo: 'compras.recepciones', nombre_es: 'Recepciones', nombre_ca: 'Recepcions', grupo: 'compras', orden: 3, requiere_modulo_optica: false },
      { codigo: 'compras.facturas', nombre_es: 'Facturas Compra', nombre_ca: 'Factures Compra', grupo: 'compras', orden: 4, requiere_modulo_optica: false },
      { codigo: 'productos.listado', nombre_es: 'Productos', nombre_ca: 'Productes', grupo: 'productos', orden: 1, requiere_modulo_optica: false },
      { codigo: 'servicios.listado', nombre_es: 'Servicios', nombre_ca: 'Serveis', grupo: 'servicios', orden: 1, requiere_modulo_optica: false },
      { codigo: 'contabilidad.caja', nombre_es: 'Caja', nombre_ca: 'Caixa', grupo: 'contabilidad', orden: 1, requiere_modulo_optica: false },
      { codigo: 'contabilidad.ventas', nombre_es: 'Facturas Venta', nombre_ca: 'Factures Venda', grupo: 'contabilidad', orden: 2, requiere_modulo_optica: false },
      { codigo: 'contabilidad.compras', nombre_es: 'Facturas Compra', nombre_ca: 'Factures Compra', grupo: 'contabilidad', orden: 3, requiere_modulo_optica: false },
      { codigo: 'configuracion.profesionales', nombre_es: 'Profesionales', nombre_ca: 'Professionals', grupo: 'configuracion', orden: 1, requiere_modulo_optica: false },
      { codigo: 'configuracion.servicios', nombre_es: 'Servicios', nombre_ca: 'Serveis', grupo: 'configuracion', orden: 2, requiere_modulo_optica: false },
      { codigo: 'configuracion.usuarios', nombre_es: 'Usuarios', nombre_ca: 'Usuaris', grupo: 'configuracion', orden: 3, requiere_modulo_optica: false },
      { codigo: 'configuracion.modos_pago', nombre_es: 'Modos de Pago', nombre_ca: 'Modes de Pagament', grupo: 'configuracion', orden: 4, requiere_modulo_optica: false },
      { codigo: 'configuracion.empresa', nombre_es: 'Datos Empresa', nombre_ca: 'Dades Empresa', grupo: 'configuracion', orden: 5, requiere_modulo_optica: false },
      { codigo: 'configuracion.aeat', nombre_es: 'AEAT / VeriFactu', nombre_ca: 'AEAT / VeriFactu', grupo: 'configuracion', orden: 6, requiere_modulo_optica: false },
      { codigo: 'optica.revisiones', nombre_es: 'Revisiones', nombre_ca: 'Revisions', grupo: 'optica', orden: 1, requiere_modulo_optica: true },
      { codigo: 'optica.historial', nombre_es: 'Historial Clínico', nombre_ca: 'Historial Clínic', grupo: 'optica', orden: 2, requiere_modulo_optica: true },
    ]);
    console.log('Menús iniciales insertados');
  }

  // Crear tabla permisos_usuario
  const hasPermisosUsuario = await masterDb.schema.hasTable('permisos_usuario');
  if (!hasPermisosUsuario) {
    await masterDb.schema.createTable('permisos_usuario', (table) => {
      table.increments('id').primary();
      table.integer('id_usuario').notNullable().references('id').inTable('usuarios').onDelete('CASCADE');
      table.integer('id_base_datos').notNullable().references('id').inTable('bases_datos').onDelete('CASCADE');
      table.integer('id_menu').notNullable().references('id').inTable('menus').onDelete('CASCADE');
      table.boolean('puede_ver').defaultTo(false);
      table.boolean('puede_crear').defaultTo(false);
      table.boolean('puede_editar').defaultTo(false);
      table.boolean('puede_eliminar').defaultTo(false);
      table.unique(['id_usuario', 'id_base_datos', 'id_menu']);
    });
    console.log('Tabla permisos_usuario creada');
  }

  // Crear tabla configuracion_global
  const hasConfigGlobal = await masterDb.schema.hasTable('configuracion_global');
  if (!hasConfigGlobal) {
    await masterDb.schema.createTable('configuracion_global', (table) => {
      table.increments('id').primary();
      table.string('clave', 100).notNullable().unique();
      table.text('valor');
      table.string('tipo', 20).defaultTo('string');
      table.string('descripcion', 255);
      table.boolean('solo_master').defaultTo(false);
    });
    console.log('Tabla configuracion_global creada');

    // Insertar configuración inicial
    await masterDb('configuracion_global').insert([
      { clave: 'mostrar_modulo_optica', valor: 'true', tipo: 'boolean', descripcion: 'Mostrar módulo de óptica en el sistema', solo_master: true },
    ]);
    console.log('Configuración global inicial insertada');
  }

  // Crear tabla sesiones_activas
  const hasSesionesActivas = await masterDb.schema.hasTable('sesiones_activas');
  if (!hasSesionesActivas) {
    await masterDb.schema.createTable('sesiones_activas', (table) => {
      table.increments('id').primary();
      table.integer('id_usuario').notNullable().references('id').inTable('usuarios').onDelete('CASCADE');
      table.string('token_hash', 64).notNullable();
      table.string('ip_address', 45);
      table.text('user_agent');
      table.timestamp('created_at').defaultTo(masterDb.fn.now());
      table.timestamp('expires_at').notNullable();
      table.boolean('revoked').defaultTo(false);
    });
    console.log('Tabla sesiones_activas creada');
  }

  // Insertar base de datos inicial si no existe
  const existingDb = await masterDb('bases_datos').where('db_name', 'gestio_db').first();
  if (!existingDb) {
    await masterDb('bases_datos').insert({
      nombre: 'Empresa Principal',
      db_name: 'gestio_db',
    });
    console.log('Base de datos inicial (gestio_db) registrada');
  }

  console.log('Inicialización de tablas de gestio_master completada');
}
