-- ============================================
-- CONFIGURACIÓN DE gestio_master
-- Ejecutar conectado a gestio_master
-- ============================================

-- ============================================
-- LIMPIAR Y CONFIGURAR BASES DE DATOS
-- ============================================

-- Primero ver qué hay
SELECT * FROM bases_datos ORDER BY id;

-- Limpiar todo
DELETE FROM bases_datos;

-- Reiniciar secuencia
ALTER SEQUENCE bases_datos_id_seq RESTART WITH 1;

-- Insertar configuración correcta
INSERT INTO bases_datos (nombre, db_name, activa, es_template) VALUES
    ('gestioBase', 'gestio_db00', true, true),
    ('Empresa1', 'gestio_db01', true, false),
    ('Empresa2', 'gestio_db02', true, false);

-- Verificar resultado
SELECT * FROM bases_datos ORDER BY id;

-- ============================================
-- VERIFICAR/CREAR USUARIO DE PRUEBA
-- ============================================

-- Ver usuarios existentes
SELECT id, username, nombre, rol, activo FROM usuarios ORDER BY id;

-- Si necesitas crear un usuario de prueba (descomenta si hace falta):
-- INSERT INTO usuarios (username, password_hash, nombre, rol, activo)
-- VALUES ('admin', '$2b$10$...hash...', 'Administrador', 'admin', true);

-- ============================================
-- ASIGNAR USUARIOS A BASES DE DATOS
-- ============================================

-- Ver asignaciones actuales
SELECT
    u.username,
    bd.nombre as empresa,
    ubd.rol
FROM usuario_base_datos ubd
JOIN usuarios u ON u.id = ubd.id_usuario
JOIN bases_datos bd ON bd.id = ubd.id_base_datos
ORDER BY u.username, bd.nombre;

-- Ejemplo para asignar un usuario a todas las empresas:
-- INSERT INTO usuario_base_datos (id_usuario, id_base_datos, rol)
-- SELECT
--     (SELECT id FROM usuarios WHERE username = 'admin'),
--     bd.id,
--     'admin'
-- FROM bases_datos bd
-- WHERE bd.es_template = false
-- ON CONFLICT (id_usuario, id_base_datos) DO NOTHING;
