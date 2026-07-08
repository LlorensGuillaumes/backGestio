-- Registrar gestio_db en la tabla bases_datos
-- Ejecutar conectado a la base de datos master
-- REEMPLAZA <CONNECTION_STRING> con la connection string real de gestio_db

INSERT INTO "bases_datos" ("nombre", "db_name", "db_host", "db_port", "connection_string", "activa") VALUES
('Gestio DB', 'gestio_db', 'localhost', 5432, 
'<CONNECTION_STRING_GESTIO_DB>', 
true)
ON CONFLICT ("db_name") DO UPDATE SET
  db_host = 'localhost',
  db_port = 5432,
  connection_string = '<CONNECTION_STRING_GESTIO_DB>',
  activa = true;

-- Verificar que se agregó correctamente
SELECT * FROM bases_datos WHERE db_name = 'gestio_db';