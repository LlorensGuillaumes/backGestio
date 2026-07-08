-- Registrar gestio_db_escola_musica en la tabla bases_datos
-- Ejecutar conectado a la base de datos master
-- REEMPLAZA <CONNECTION_STRING> con la connection string real de gestio_db_escola_musica

INSERT INTO "bases_datos" ("nombre", "db_name", "db_host", "db_port", "connection_string", "activa") VALUES
('Escola Mataro', 'gestio_db_escola_musica', 'localhost', 5432, 
'<CONNECTION_STRING_GESTIO_DB_ESCOLA_MUSICA>', 
true)
ON CONFLICT ("db_name") DO UPDATE SET
  nombre = 'Escola Mataro',
  db_host = 'localhost',
  db_port = 5432,
  connection_string = '<CONNECTION_STRING_GESTIO_DB_ESCOLA_MUSICA>',
  activa = true;

-- Verificar que se agregó correctamente
SELECT * FROM bases_datos WHERE db_name = 'gestio_db_escola_musica';