-- =============================================
-- TABLA DE FICHAJES (GESTIO_MASTER)
-- =============================================
-- Esta tabla se crea en la base de datos master
-- para centralizar todos los fichajes de empleados

-- Tabla principal de fichajes
CREATE TABLE IF NOT EXISTS fichajes (
  id SERIAL PRIMARY KEY,
  id_usuario INTEGER NOT NULL REFERENCES usuarios(id),
  id_usuario_registro INTEGER NOT NULL REFERENCES usuarios(id), -- Quien registra el fichaje (puede ser diferente si es correccion)
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('ENTRADA', 'SALIDA')),
  ip_address VARCHAR(45), -- Soporta IPv4 e IPv6
  es_correccion BOOLEAN DEFAULT FALSE,
  id_fichaje_original INTEGER REFERENCES fichajes(id), -- Si es correccion, referencia al fichaje original
  motivo_correccion TEXT,
  advertencias JSONB DEFAULT '[]', -- Array de codigos de advertencia
  observaciones TEXT,
  activo BOOLEAN DEFAULT TRUE, -- Soft delete
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices para optimizar consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_fichajes_usuario_fecha ON fichajes(id_usuario, fecha);
CREATE INDEX IF NOT EXISTS idx_fichajes_fecha ON fichajes(fecha);
CREATE INDEX IF NOT EXISTS idx_fichajes_tipo ON fichajes(tipo);
CREATE INDEX IF NOT EXISTS idx_fichajes_activo ON fichajes(activo) WHERE activo = TRUE;

-- Trigger para actualizar updated_at automaticamente
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

-- =============================================
-- PERMISOS DE MENU PARA FICHAJES
-- =============================================

-- Insertar permisos de menu para fichajes
INSERT INTO menus (codigo, nombre_es, nombre_ca, grupo, orden) VALUES
('rrhh.fichajes', 'Fichajes', 'Fitxatges', 'rrhh', 50),
('rrhh.fichajes.gestionar', 'Gestionar Fichajes', 'Gestionar Fitxatges', 'rrhh', 51)
ON CONFLICT (codigo) DO NOTHING;

-- =============================================
-- COMENTARIOS DE DOCUMENTACION
-- =============================================

COMMENT ON TABLE fichajes IS 'Registro de fichajes de entrada/salida de empleados';
COMMENT ON COLUMN fichajes.id_usuario IS 'Usuario que ficha (el empleado)';
COMMENT ON COLUMN fichajes.id_usuario_registro IS 'Usuario que registra el fichaje (puede ser admin en correcciones)';
COMMENT ON COLUMN fichajes.tipo IS 'ENTRADA o SALIDA';
COMMENT ON COLUMN fichajes.es_correccion IS 'True si este registro es una correccion de otro';
COMMENT ON COLUMN fichajes.id_fichaje_original IS 'Referencia al fichaje que se esta corrigiendo';
COMMENT ON COLUMN fichajes.advertencias IS 'Array JSON con codigos de advertencia: ENTRADA_SIN_SALIDA_PREVIA, EXCESO_HORAS_24, EXCESO_HORAS_12, FUERA_HORARIO, SALIDA_SIN_ENTRADA';
COMMENT ON COLUMN fichajes.activo IS 'False para soft delete';
