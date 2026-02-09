-- ============================================
-- SCRIPT DE LIMPIEZA Y CONFIGURACIÓN DE BASES DE DATOS
-- Ejecutar PASO A PASO en el orden indicado
-- ============================================

-- ============================================
-- PASO 1: Ejecutar conectado a "postgres" (DB del sistema)
-- ============================================

-- Ver todas las bases de datos actuales
SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname;

-- Terminar conexiones activas a las DBs que vamos a eliminar (ajusta los nombres según lo que veas)
-- SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname LIKE 'gestio%' AND pid <> pg_backend_pid();

-- Eliminar bases de datos duplicadas o innecesarias
-- DESCOMENTA y AJUSTA según las DBs que necesites eliminar:
-- DROP DATABASE IF EXISTS "nombre_db_duplicada";

-- Crear las bases de datos necesarias (si no existen)
-- NOTA: Ejecuta estos uno por uno, ignorando errores si ya existen

-- CREATE DATABASE gestio_master;
-- CREATE DATABASE gestio_db00;
-- CREATE DATABASE gestio_db01;
-- CREATE DATABASE gestio_db02;


-- ============================================
-- PASO 2: Ejecutar conectado a "gestio_master"
-- ============================================

-- Limpiar tabla bases_datos
DELETE FROM bases_datos;

-- Insertar las bases de datos correctas
INSERT INTO bases_datos (nombre, db_name, activa, es_template) VALUES
    ('gestioBase', 'gestio_db00', true, true),
    ('Empresa1', 'gestio_db01', true, false),
    ('Empresa2', 'gestio_db02', true, false);

-- Verificar
SELECT * FROM bases_datos;


-- ============================================
-- PASO 3: Ejecutar conectado a "gestio_db01" (Empresa1)
-- ============================================

-- Limpiar ModosPago y añadir datos sin duplicados
TRUNCATE TABLE "ModosPago" RESTART IDENTITY CASCADE;

INSERT INTO "ModosPago" ("Descripcion", "UsaDatafono", "Activo", "Orden") VALUES
    ('Efectivo', FALSE, TRUE, 1),
    ('Tarjeta de crédito', TRUE, TRUE, 2),
    ('Tarjeta de débito', TRUE, TRUE, 3),
    ('Bizum', FALSE, TRUE, 4),
    ('Transferencia bancaria', FALSE, TRUE, 5);

-- Añadir constraint único si no existe
ALTER TABLE "ModosPago" DROP CONSTRAINT IF EXISTS modospago_descripcion_unique;
ALTER TABLE "ModosPago" ADD CONSTRAINT modospago_descripcion_unique UNIQUE ("Descripcion");


-- ============================================
-- PASO 4: Ejecutar conectado a "gestio_db02" (Empresa2)
-- ============================================

-- Limpiar ModosPago y añadir datos sin duplicados
TRUNCATE TABLE "ModosPago" RESTART IDENTITY CASCADE;

INSERT INTO "ModosPago" ("Descripcion", "UsaDatafono", "Activo", "Orden") VALUES
    ('Efectivo', FALSE, TRUE, 1),
    ('Tarjeta de crédito', TRUE, TRUE, 2),
    ('Tarjeta de débito', TRUE, TRUE, 3),
    ('Bizum', FALSE, TRUE, 4),
    ('Transferencia bancaria', FALSE, TRUE, 5);

-- Añadir constraint único si no existe
ALTER TABLE "ModosPago" DROP CONSTRAINT IF EXISTS modospago_descripcion_unique;
ALTER TABLE "ModosPago" ADD CONSTRAINT modospago_descripcion_unique UNIQUE ("Descripcion");
