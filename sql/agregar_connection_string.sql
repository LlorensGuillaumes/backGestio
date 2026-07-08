-- Agregar columna connection_string a la tabla bases_datos
ALTER TABLE bases_datos ADD COLUMN IF NOT EXISTS connection_string TEXT;

-- Actualizar gestio_db con su connection string de Neon
UPDATE bases_datos 
SET connection_string = 'postgresql://neondb_owner:npg_23PlKAgSvqcu@ep-noisy-sound-asv7n572-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
WHERE db_name = 'gestio_db';

-- Actualizar gestio_deb con su connection string de Neon (si existe)
-- UPDATE bases_datos 
-- SET connection_string = 'postgresql://...@...neon.tech/gestio_deb?sslmode=require'
-- WHERE db_name = 'gestio_deb';

-- Verificar que se agregó correctamente
SELECT id, nombre, db_name, connection_string FROM bases_datos;