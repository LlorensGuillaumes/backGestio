-- =====================================================
-- Sistema de Autenticación y Permisos Multi-Tenant
-- Ejecutar en la base de datos: gestio_master
-- =====================================================

-- Bases de datos registradas (empresas/tenants)
CREATE TABLE IF NOT EXISTS "bases_datos" (
    "id" SERIAL PRIMARY KEY,
    "nombre" VARCHAR(100) NOT NULL,
    "db_name" VARCHAR(100) NOT NULL UNIQUE,
    "db_host" VARCHAR(255) DEFAULT 'localhost',
    "db_port" INTEGER DEFAULT 5432,
    "activa" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de usuarios (si no existe, crearla; si existe, añadir columnas)
CREATE TABLE IF NOT EXISTS "usuarios" (
    "id" SERIAL PRIMARY KEY,
    "username" VARCHAR(100) NOT NULL UNIQUE,
    "password_hash" VARCHAR(255) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255),
    "activo" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Añadir columnas si no existen (para tablas existentes)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'password_hash') THEN
        ALTER TABLE "usuarios" ADD COLUMN "password_hash" VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'username') THEN
        ALTER TABLE "usuarios" ADD COLUMN "username" VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'nombre') THEN
        ALTER TABLE "usuarios" ADD COLUMN "nombre" VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'email') THEN
        ALTER TABLE "usuarios" ADD COLUMN "email" VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'activo') THEN
        ALTER TABLE "usuarios" ADD COLUMN "activo" BOOLEAN DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'created_at') THEN
        ALTER TABLE "usuarios" ADD COLUMN "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'updated_at') THEN
        ALTER TABLE "usuarios" ADD COLUMN "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Relación usuario-base de datos (multi-tenant)
CREATE TABLE IF NOT EXISTS "usuarios_bases_datos" (
    "id" SERIAL PRIMARY KEY,
    "id_usuario" INTEGER NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
    "id_base_datos" INTEGER NOT NULL REFERENCES "bases_datos"("id") ON DELETE CASCADE,
    "rol" VARCHAR(20) NOT NULL DEFAULT 'user',  -- 'admin' | 'user'
    "activo" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("id_usuario", "id_base_datos")
);

-- Menús disponibles en el sistema
CREATE TABLE IF NOT EXISTS "menus" (
    "id" SERIAL PRIMARY KEY,
    "codigo" VARCHAR(50) NOT NULL UNIQUE,
    "nombre_es" VARCHAR(100) NOT NULL,
    "nombre_ca" VARCHAR(100) NOT NULL,
    "grupo" VARCHAR(50) NOT NULL,
    "orden" INTEGER DEFAULT 0,
    "requiere_modulo_optica" BOOLEAN DEFAULT false
);

-- Permisos granulares por usuario/base de datos/menú
CREATE TABLE IF NOT EXISTS "permisos_usuario" (
    "id" SERIAL PRIMARY KEY,
    "id_usuario" INTEGER NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
    "id_base_datos" INTEGER NOT NULL REFERENCES "bases_datos"("id") ON DELETE CASCADE,
    "id_menu" INTEGER NOT NULL REFERENCES "menus"("id") ON DELETE CASCADE,
    "puede_ver" BOOLEAN DEFAULT false,
    "puede_crear" BOOLEAN DEFAULT false,
    "puede_editar" BOOLEAN DEFAULT false,
    "puede_eliminar" BOOLEAN DEFAULT false,
    UNIQUE ("id_usuario", "id_base_datos", "id_menu")
);

-- Configuración global (solo Master modifica)
CREATE TABLE IF NOT EXISTS "configuracion_global" (
    "id" SERIAL PRIMARY KEY,
    "clave" VARCHAR(100) NOT NULL UNIQUE,
    "valor" TEXT,
    "tipo" VARCHAR(20) DEFAULT 'string',
    "descripcion" VARCHAR(255),
    "solo_master" BOOLEAN DEFAULT false
);

-- Sesiones activas (para tracking y revocación)
CREATE TABLE IF NOT EXISTS "sesiones_activas" (
    "id" SERIAL PRIMARY KEY,
    "id_usuario" INTEGER NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
    "token_hash" VARCHAR(64) NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "revoked" BOOLEAN DEFAULT false
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS "idx_usuarios_bases_datos_usuario" ON "usuarios_bases_datos"("id_usuario");
CREATE INDEX IF NOT EXISTS "idx_usuarios_bases_datos_base" ON "usuarios_bases_datos"("id_base_datos");
CREATE INDEX IF NOT EXISTS "idx_permisos_usuario_compuesto" ON "permisos_usuario"("id_usuario", "id_base_datos");
CREATE INDEX IF NOT EXISTS "idx_sesiones_activas_usuario" ON "sesiones_activas"("id_usuario");
CREATE INDEX IF NOT EXISTS "idx_sesiones_activas_token" ON "sesiones_activas"("token_hash");

-- =====================================================
-- DATOS INICIALES
-- =====================================================

-- Menús del sistema
INSERT INTO "menus" ("codigo", "nombre_es", "nombre_ca", "grupo", "orden", "requiere_modulo_optica") VALUES
('ventas.clientes', 'Clientes', 'Clients', 'ventas', 1, false),
('ventas.caja', 'Caja', 'Caixa', 'ventas', 2, false),
('compras.proveedores', 'Proveedores', 'Proveïdors', 'compras', 1, false),
('compras.ordenes', 'Órdenes de Compra', 'Ordres de Compra', 'compras', 2, false),
('compras.recepciones', 'Recepciones', 'Recepcions', 'compras', 3, false),
('compras.facturas', 'Facturas Compra', 'Factures Compra', 'compras', 4, false),
('productos.listado', 'Productos', 'Productes', 'productos', 1, false),
('servicios.listado', 'Servicios', 'Serveis', 'servicios', 1, false),
('contabilidad.caja', 'Caja', 'Caixa', 'contabilidad', 1, false),
('contabilidad.ventas', 'Facturas Venta', 'Factures Venda', 'contabilidad', 2, false),
('contabilidad.compras', 'Facturas Compra', 'Factures Compra', 'contabilidad', 3, false),
('configuracion.profesionales', 'Profesionales', 'Professionals', 'configuracion', 1, false),
('configuracion.servicios', 'Servicios', 'Serveis', 'configuracion', 2, false),
('configuracion.usuarios', 'Usuarios', 'Usuaris', 'configuracion', 3, false),
('configuracion.modos_pago', 'Modos de Pago', 'Modes de Pagament', 'configuracion', 4, false),
('configuracion.empresa', 'Datos Empresa', 'Dades Empresa', 'configuracion', 5, false),
('configuracion.aeat', 'AEAT / VeriFactu', 'AEAT / VeriFactu', 'configuracion', 6, false),
('optica.revisiones', 'Revisiones', 'Revisions', 'optica', 1, true),
('optica.historial', 'Historial Clínico', 'Historial Clínic', 'optica', 2, true)
ON CONFLICT ("codigo") DO NOTHING;

-- Configuración global inicial
INSERT INTO "configuracion_global" ("clave", "valor", "tipo", "descripcion", "solo_master") VALUES
('mostrar_modulo_optica', 'true', 'boolean', 'Mostrar módulo de óptica en el sistema', true)
ON CONFLICT ("clave") DO NOTHING;

-- Base de datos inicial (empresa principal)
INSERT INTO "bases_datos" ("nombre", "db_name") VALUES
('Empresa Principal', 'gestio_db')
ON CONFLICT ("db_name") DO NOTHING;
