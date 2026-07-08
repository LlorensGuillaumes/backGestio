-- Agregar columna connection_string a la tabla bases_datos
ALTER TABLE bases_datos ADD COLUMN IF NOT EXISTS connection_string TEXT;

-- Actualizar gestio_db con su connection string
-- REEMPLAZA <CONNECTION_STRING> con la connection string real
UPDATE bases_datos 
SET connection_string = '<CONNECTION_STRING_GESTIO_DB>'
WHERE db_name = 'gestio_db';

-- Actualizar gestio_deb con su connection string
-- REEMPLAZA <CONNECTION_STRING> con la connection string real
UPDATE bases_datos 
SET connection_string = '<CONNECTION_STRING_GESTIO_DEB>'
WHERE db_name = 'gestio_deb';

-- Actualizar gestio_db_escola_musica con su connection string
-- REEMPLAZA <CONNECTION_STRING> con la connection string real
UPDATE bases_datos 
SET connection_string = '<CONNECTION_STRING_GESTIO_DB_ESCOLA_MUSICA>'
WHERE db_name = 'gestio_db_escola_musica';

-- Verificar que se agregó correctamente
SELECT id, nombre, db_name, connection_string FROM bases_datos;