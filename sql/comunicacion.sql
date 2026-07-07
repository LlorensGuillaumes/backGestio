-- ============================================
-- Sistema de Comunicación y Notificaciones
-- Base de datos: gestio_master
-- ============================================

-- Departamentos para agrupar usuarios
CREATE TABLE IF NOT EXISTS departamentos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asignación usuario-departamento
CREATE TABLE IF NOT EXISTS usuarios_departamentos (
  id_usuario INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
  id_departamento INTEGER REFERENCES departamentos(id) ON DELETE CASCADE,
  PRIMARY KEY (id_usuario, id_departamento)
);

-- Tipos de notificación del sistema
CREATE TABLE IF NOT EXISTS tipos_notificacion (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(50) UNIQUE NOT NULL,  -- 'stock_bajo', 'mensaje_nuevo', etc.
  nombre_es VARCHAR(100) NOT NULL,
  nombre_ca VARCHAR(100) NOT NULL,
  descripcion TEXT,
  permiso_requerido VARCHAR(100),  -- código de menú requerido para recibir
  activo BOOLEAN DEFAULT TRUE
);

-- Preferencias de notificación por usuario
CREATE TABLE IF NOT EXISTS preferencias_notificacion (
  id_usuario INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
  id_tipo_notificacion INTEGER REFERENCES tipos_notificacion(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT FALSE,
  push_enabled BOOLEAN DEFAULT TRUE,  -- notificación en app
  PRIMARY KEY (id_usuario, id_tipo_notificacion)
);

-- Notificaciones generadas
CREATE TABLE IF NOT EXISTS notificaciones (
  id SERIAL PRIMARY KEY,
  id_tipo INTEGER REFERENCES tipos_notificacion(id),
  id_usuario_destino INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
  titulo VARCHAR(200) NOT NULL,
  mensaje TEXT NOT NULL,
  datos JSONB DEFAULT '{}',  -- datos extra: id_producto, etc.
  leida BOOLEAN DEFAULT FALSE,
  fecha_lectura TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario ON notificaciones(id_usuario_destino, leida);
CREATE INDEX IF NOT EXISTS idx_notificaciones_fecha ON notificaciones(created_at DESC);

-- Conversaciones de chat
CREATE TABLE IF NOT EXISTS conversaciones (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('DIRECTA', 'GRUPO')),
  nombre VARCHAR(100),  -- solo para grupos
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Participantes de conversación
CREATE TABLE IF NOT EXISTS conversacion_participantes (
  id_conversacion INTEGER REFERENCES conversaciones(id) ON DELETE CASCADE,
  id_usuario INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
  ultimo_mensaje_leido INTEGER,
  silenciada BOOLEAN DEFAULT FALSE,
  fecha_union TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id_conversacion, id_usuario)
);

-- Mensajes de chat
CREATE TABLE IF NOT EXISTS mensajes_chat (
  id SERIAL PRIMARY KEY,
  id_conversacion INTEGER REFERENCES conversaciones(id) ON DELETE CASCADE,
  id_usuario_autor INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  contenido TEXT NOT NULL,
  tipo VARCHAR(20) DEFAULT 'TEXTO',  -- TEXTO, ARCHIVO, IMAGEN
  archivo_url VARCHAR(500),
  editado BOOLEAN DEFAULT FALSE,
  eliminado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mensajes_conversacion ON mensajes_chat(id_conversacion, created_at DESC);

-- Mensajes formales (con asunto, prioridad)
CREATE TABLE IF NOT EXISTS mensajes_formales (
  id SERIAL PRIMARY KEY,
  id_usuario_autor INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  asunto VARCHAR(200) NOT NULL,
  contenido TEXT NOT NULL,
  prioridad VARCHAR(20) DEFAULT 'NORMAL' CHECK (prioridad IN ('BAJA', 'NORMAL', 'ALTA', 'URGENTE')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Destinatarios de mensajes formales
CREATE TABLE IF NOT EXISTS mensajes_formales_destinatarios (
  id_mensaje INTEGER REFERENCES mensajes_formales(id) ON DELETE CASCADE,
  id_usuario INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
  leido BOOLEAN DEFAULT FALSE,
  fecha_lectura TIMESTAMPTZ,
  archivado BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (id_mensaje, id_usuario)
);

CREATE INDEX IF NOT EXISTS idx_mensajes_formales_dest ON mensajes_formales_destinatarios(id_usuario, leido);

-- Permisos de comunicación entre departamentos
CREATE TABLE IF NOT EXISTS permisos_comunicacion (
  id_departamento_origen INTEGER REFERENCES departamentos(id) ON DELETE CASCADE,
  id_departamento_destino INTEGER REFERENCES departamentos(id) ON DELETE CASCADE,
  puede_chat BOOLEAN DEFAULT TRUE,
  puede_mensaje_formal BOOLEAN DEFAULT TRUE,
  PRIMARY KEY (id_departamento_origen, id_departamento_destino)
);

-- ============================================
-- Datos iniciales
-- ============================================

-- Tipos de notificación del sistema
INSERT INTO tipos_notificacion (codigo, nombre_es, nombre_ca, descripcion, permiso_requerido) VALUES
('stock_bajo', 'Stock bajo', 'Estoc baix', 'Alerta cuando el stock de un producto está por debajo del mínimo', 'productos.listado'),
('stock_critico', 'Stock crítico', 'Estoc crític', 'Alerta cuando el stock de un producto está en nivel crítico (0 o negativo)', 'productos.listado'),
('mensaje_nuevo', 'Mensaje nuevo', 'Missatge nou', 'Notificación de nuevo mensaje formal recibido', NULL),
('chat_nuevo', 'Chat nuevo', 'Xat nou', 'Notificación de nuevo mensaje de chat', NULL),
('sistema', 'Sistema', 'Sistema', 'Notificaciones generales del sistema', NULL)
ON CONFLICT (codigo) DO NOTHING;

-- Permisos de menú para el sistema de comunicación
INSERT INTO menus (codigo, nombre_es, nombre_ca, grupo, orden) VALUES
('comunicacion', 'Comunicación', 'Comunicació', 'comunicacion', 1),
('comunicacion.notificaciones', 'Notificaciones', 'Notificacions', 'comunicacion', 10),
('comunicacion.mensajes', 'Mensajes', 'Missatges', 'comunicacion', 20),
('comunicacion.chat', 'Chat', 'Xat', 'comunicacion', 30),
('configuracion.departamentos', 'Departamentos', 'Departaments', 'configuracion', 60)
ON CONFLICT (codigo) DO NOTHING;

-- Departamento por defecto
INSERT INTO departamentos (nombre, descripcion) VALUES
('General', 'Departamento general para todos los usuarios')
ON CONFLICT DO NOTHING;
