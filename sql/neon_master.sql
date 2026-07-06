-- =====================================================
-- NEON: gestio_master - SQL COMPLETO
-- Ejecutar en la DB: gestio_master
-- =====================================================

-- =====================================================
-- 1. TABLAS CORE (auth, usuarios, permisos)
-- =====================================================

CREATE TABLE IF NOT EXISTS "bases_datos" (
    "id" SERIAL PRIMARY KEY,
    "nombre" VARCHAR(100) NOT NULL,
    "db_name" VARCHAR(100) NOT NULL UNIQUE,
    "db_host" VARCHAR(255) DEFAULT 'localhost',
    "db_port" INTEGER DEFAULT 5432,
    "serie_facturacion" VARCHAR(10) DEFAULT 'F',
    "activa" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS "usuarios_bases_datos" (
    "id" SERIAL PRIMARY KEY,
    "id_usuario" INTEGER NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
    "id_base_datos" INTEGER NOT NULL REFERENCES "bases_datos"("id") ON DELETE CASCADE,
    "rol" VARCHAR(20) NOT NULL DEFAULT 'user',
    "activo" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("id_usuario", "id_base_datos")
);

CREATE TABLE IF NOT EXISTS "menus" (
    "id" SERIAL PRIMARY KEY,
    "codigo" VARCHAR(50) NOT NULL UNIQUE,
    "nombre_es" VARCHAR(100) NOT NULL,
    "nombre_ca" VARCHAR(100) NOT NULL,
    "grupo" VARCHAR(50) NOT NULL,
    "orden" INTEGER DEFAULT 0,
    "requiere_modulo_optica" BOOLEAN DEFAULT false
);

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

CREATE TABLE IF NOT EXISTS "configuracion_global" (
    "id" SERIAL PRIMARY KEY,
    "clave" VARCHAR(100) NOT NULL UNIQUE,
    "valor" TEXT,
    "tipo" VARCHAR(20) DEFAULT 'string',
    "descripcion" VARCHAR(255),
    "solo_master" BOOLEAN DEFAULT false
);

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

CREATE INDEX IF NOT EXISTS "idx_usuarios_bases_datos_usuario" ON "usuarios_bases_datos"("id_usuario");
CREATE INDEX IF NOT EXISTS "idx_usuarios_bases_datos_base" ON "usuarios_bases_datos"("id_base_datos");
CREATE INDEX IF NOT EXISTS "idx_permisos_usuario_compuesto" ON "permisos_usuario"("id_usuario", "id_base_datos");
CREATE INDEX IF NOT EXISTS "idx_sesiones_activas_usuario" ON "sesiones_activas"("id_usuario");
CREATE INDEX IF NOT EXISTS "idx_sesiones_activas_token" ON "sesiones_activas"("token_hash");

-- =====================================================
-- 2. MENUS DEL SISTEMA
-- =====================================================

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
('optica.historial', 'Historial Clínico', 'Historial Clínic', 'optica', 2, true),
('rrhh.trabajadores', 'Trabajadores', 'Treballadors', 'rrhh', 40, false),
('rrhh.festivos', 'Festivos', 'Festius', 'rrhh', 41, false),
('rrhh.convenios', 'Convenios', 'Convenis', 'rrhh', 42, false),
('rrhh.control_horario', 'Control Horario', 'Control Horari', 'rrhh', 43, false),
('rrhh.fichajes', 'Fichajes', 'Fitxatges', 'rrhh', 50, false),
('rrhh.fichajes.gestionar', 'Gestionar Fichajes', 'Gestionar Fitxatges', 'rrhh', 51, false),
('agenda', 'Agenda', 'Agenda', 'general', 30, false),
('inventario', 'Inventario', 'Inventari', 'general', 60, false),
('comunicacion', 'Comunicación', 'Comunicació', 'comunicacion', 1, false),
('comunicacion.notificaciones', 'Notificaciones', 'Notificacions', 'comunicacion', 10, false),
('comunicacion.mensajes', 'Mensajes', 'Missatges', 'comunicacion', 20, false),
('comunicacion.chat', 'Chat', 'Xat', 'comunicacion', 30, false),
('configuracion.departamentos', 'Departamentos', 'Departaments', 'configuracion', 60, false)
ON CONFLICT ("codigo") DO NOTHING;

INSERT INTO "configuracion_global" ("clave", "valor", "tipo", "descripcion", "solo_master") VALUES
('mostrar_modulo_optica', 'true', 'boolean', 'Mostrar módulo de óptica en el sistema', true)
ON CONFLICT ("clave") DO NOTHING;

-- =====================================================
-- 3. MIGRACION TRABAJADORES (campos extra en usuarios)
-- =====================================================

ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "dni" VARCHAR(20);
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "telefono" VARCHAR(30);
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "puesto" VARCHAR(100);
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "id_convenio" INT;
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "fecha_alta" DATE;
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "fecha_baja" DATE;
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "observaciones" TEXT;

CREATE TABLE IF NOT EXISTS "convenios" (
    "id" SERIAL PRIMARY KEY,
    "nombre" VARCHAR(200) NOT NULL,
    "horas_anuales" DECIMAL(8,2) NOT NULL,
    "dias_vacaciones" INT DEFAULT 22,
    "dias_convenio" INT DEFAULT 0,
    "descripcion" TEXT,
    "activo" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "horarios_usuario" (
    "id" SERIAL PRIMARY KEY,
    "id_usuario" INT NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
    "dia_semana" SMALLINT NOT NULL,
    "hora_inicio" TIME,
    "hora_fin" TIME,
    "minutos_descanso" INT DEFAULT 0,
    "activo" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("id_usuario", "dia_semana")
);

CREATE TABLE IF NOT EXISTS "ausencias_usuario" (
    "id" SERIAL PRIMARY KEY,
    "id_usuario" INT NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
    "tipo" VARCHAR(50) NOT NULL,
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE,
    "computable" BOOLEAN DEFAULT true,
    "descripcion" TEXT,
    "estado" VARCHAR(30) DEFAULT 'APROBADA',
    "activo" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_usuarios_convenio'
    ) THEN
        ALTER TABLE "usuarios"
        ADD CONSTRAINT "fk_usuarios_convenio"
        FOREIGN KEY ("id_convenio") REFERENCES "convenios"("id") ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_usuarios_convenio" ON "usuarios"("id_convenio");
CREATE INDEX IF NOT EXISTS "idx_usuarios_activo" ON "usuarios"("activo");
CREATE INDEX IF NOT EXISTS "idx_horarios_usuario" ON "horarios_usuario"("id_usuario");
CREATE INDEX IF NOT EXISTS "idx_ausencias_usuario" ON "ausencias_usuario"("id_usuario");
CREATE INDEX IF NOT EXISTS "idx_ausencias_fechas" ON "ausencias_usuario"("fecha_inicio", "fecha_fin");
CREATE INDEX IF NOT EXISTS "idx_ausencias_tipo" ON "ausencias_usuario"("tipo");

-- =====================================================
-- 4. FICHAJES
-- =====================================================

CREATE TABLE IF NOT EXISTS fichajes (
  id SERIAL PRIMARY KEY,
  id_usuario INTEGER NOT NULL REFERENCES usuarios(id),
  id_usuario_registro INTEGER NOT NULL REFERENCES usuarios(id),
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('ENTRADA', 'SALIDA')),
  ip_address VARCHAR(45),
  es_correccion BOOLEAN DEFAULT FALSE,
  id_fichaje_original INTEGER REFERENCES fichajes(id),
  motivo_correccion TEXT,
  advertencias JSONB DEFAULT '[]',
  observaciones TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fichajes_usuario_fecha ON fichajes(id_usuario, fecha);
CREATE INDEX IF NOT EXISTS idx_fichajes_fecha ON fichajes(fecha);
CREATE INDEX IF NOT EXISTS idx_fichajes_tipo ON fichajes(tipo);
CREATE INDEX IF NOT EXISTS idx_fichajes_activo ON fichajes(activo) WHERE activo = TRUE;

CREATE OR REPLACE FUNCTION update_fichajes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_fichajes_updated_at ON fichajes;
CREATE TRIGGER trigger_fichajes_updated_at
  BEFORE UPDATE ON fichajes
  FOR EACH ROW
  EXECUTE FUNCTION update_fichajes_updated_at();

-- =====================================================
-- 5. COMUNICACION Y NOTIFICACIONES
-- =====================================================

CREATE TABLE IF NOT EXISTS departamentos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usuarios_departamentos (
  id_usuario INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
  id_departamento INTEGER REFERENCES departamentos(id) ON DELETE CASCADE,
  PRIMARY KEY (id_usuario, id_departamento)
);

CREATE TABLE IF NOT EXISTS tipos_notificacion (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  nombre_es VARCHAR(100) NOT NULL,
  nombre_ca VARCHAR(100) NOT NULL,
  descripcion TEXT,
  permiso_requerido VARCHAR(100),
  activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS preferencias_notificacion (
  id_usuario INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
  id_tipo_notificacion INTEGER REFERENCES tipos_notificacion(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT FALSE,
  push_enabled BOOLEAN DEFAULT TRUE,
  PRIMARY KEY (id_usuario, id_tipo_notificacion)
);

CREATE TABLE IF NOT EXISTS notificaciones (
  id SERIAL PRIMARY KEY,
  id_tipo INTEGER REFERENCES tipos_notificacion(id),
  id_usuario_destino INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
  titulo VARCHAR(200) NOT NULL,
  mensaje TEXT NOT NULL,
  datos JSONB DEFAULT '{}',
  leida BOOLEAN DEFAULT FALSE,
  fecha_lectura TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario ON notificaciones(id_usuario_destino, leida);
CREATE INDEX IF NOT EXISTS idx_notificaciones_fecha ON notificaciones(created_at DESC);

CREATE TABLE IF NOT EXISTS conversaciones (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('DIRECTA', 'GRUPO')),
  nombre VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversacion_participantes (
  id_conversacion INTEGER REFERENCES conversaciones(id) ON DELETE CASCADE,
  id_usuario INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
  ultimo_mensaje_leido INTEGER,
  silenciada BOOLEAN DEFAULT FALSE,
  fecha_union TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id_conversacion, id_usuario)
);

CREATE TABLE IF NOT EXISTS mensajes_chat (
  id SERIAL PRIMARY KEY,
  id_conversacion INTEGER REFERENCES conversaciones(id) ON DELETE CASCADE,
  id_usuario_autor INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  contenido TEXT NOT NULL,
  tipo VARCHAR(20) DEFAULT 'TEXTO',
  archivo_url VARCHAR(500),
  editado BOOLEAN DEFAULT FALSE,
  eliminado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mensajes_conversacion ON mensajes_chat(id_conversacion, created_at DESC);

CREATE TABLE IF NOT EXISTS mensajes_formales (
  id SERIAL PRIMARY KEY,
  id_usuario_autor INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  asunto VARCHAR(200) NOT NULL,
  contenido TEXT NOT NULL,
  prioridad VARCHAR(20) DEFAULT 'NORMAL' CHECK (prioridad IN ('BAJA', 'NORMAL', 'ALTA', 'URGENTE')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mensajes_formales_destinatarios (
  id_mensaje INTEGER REFERENCES mensajes_formales(id) ON DELETE CASCADE,
  id_usuario INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
  leido BOOLEAN DEFAULT FALSE,
  fecha_lectura TIMESTAMPTZ,
  archivado BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (id_mensaje, id_usuario)
);

CREATE INDEX IF NOT EXISTS idx_mensajes_formales_dest ON mensajes_formales_destinatarios(id_usuario, leido);

CREATE TABLE IF NOT EXISTS permisos_comunicacion (
  id_departamento_origen INTEGER REFERENCES departamentos(id) ON DELETE CASCADE,
  id_departamento_destino INTEGER REFERENCES departamentos(id) ON DELETE CASCADE,
  puede_chat BOOLEAN DEFAULT TRUE,
  puede_mensaje_formal BOOLEAN DEFAULT TRUE,
  PRIMARY KEY (id_departamento_origen, id_departamento_destino)
);

INSERT INTO tipos_notificacion (codigo, nombre_es, nombre_ca, descripcion, permiso_requerido) VALUES
('stock_bajo', 'Stock bajo', 'Estoc baix', 'Alerta cuando el stock de un producto está por debajo del mínimo', 'productos.listado'),
('stock_critico', 'Stock crítico', 'Estoc crític', 'Alerta cuando el stock de un producto está en nivel crítico', 'productos.listado'),
('mensaje_nuevo', 'Mensaje nuevo', 'Missatge nou', 'Notificación de nuevo mensaje formal recibido', NULL),
('chat_nuevo', 'Chat nuevo', 'Xat nou', 'Notificación de nuevo mensaje de chat', NULL),
('sistema', 'Sistema', 'Sistema', 'Notificaciones generales del sistema', NULL)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO departamentos (nombre, descripcion) VALUES
('General', 'Departamento general para todos los usuarios')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 6. REGISTRAR BASE DE DATOS TENANT CON HOST NEON
-- =====================================================

INSERT INTO "bases_datos" ("nombre", "db_name", "db_host", "db_port") VALUES
('Empresa Principal', 'gestio_db', 'ep-damp-sound-aib16b8y-pooler.c-4.us-east-1.aws.neon.tech', 5432)
ON CONFLICT ("db_name") DO UPDATE SET
  db_host = 'ep-damp-sound-aib16b8y-pooler.c-4.us-east-1.aws.neon.tech',
  db_port = 5432;

-- =====================================================
-- FIN gestio_master
-- =====================================================
