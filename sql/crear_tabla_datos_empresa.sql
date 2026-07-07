-- Crear tabla datos_empresa para configuración de la empresa
CREATE TABLE IF NOT EXISTS datos_empresa (
    id SERIAL PRIMARY KEY,
    nombre_empresa VARCHAR(200) NOT NULL DEFAULT '',
    nombre_comercial VARCHAR(200) DEFAULT '',
    cif VARCHAR(20) DEFAULT '',
    direccion VARCHAR(300) DEFAULT '',
    codigo_postal VARCHAR(10) DEFAULT '',
    poblacion VARCHAR(100) DEFAULT '',
    provincia VARCHAR(100) DEFAULT '',
    pais VARCHAR(100) DEFAULT 'España',
    telefono VARCHAR(20) DEFAULT '',
    email VARCHAR(150) DEFAULT '',
    web VARCHAR(200) DEFAULT '',
    logo_url VARCHAR(500) DEFAULT '',
    plazo_confirmacion_dias INTEGER DEFAULT 30,
    texto_pie_documento TEXT DEFAULT '',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion TIMESTAMP
);

-- Insertar registro por defecto si no existe
INSERT INTO datos_empresa (
    nombre_empresa,
    nombre_comercial,
    pais,
    plazo_confirmacion_dias
)
SELECT 'Mi Empresa', '', 'España', 30
WHERE NOT EXISTS (SELECT 1 FROM datos_empresa);

-- Comentarios
COMMENT ON TABLE datos_empresa IS 'Datos de configuración de la empresa para documentos';
COMMENT ON COLUMN datos_empresa.plazo_confirmacion_dias IS 'Días por defecto para calcular fecha de vencimiento de presupuestos';
COMMENT ON COLUMN datos_empresa.texto_pie_documento IS 'Texto legal o condiciones que aparece al pie de los documentos';
