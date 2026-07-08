-- Agregar gestio_deb a la tabla bases_datos
-- Ejecutar conectado a la base de datos master
-- REEMPLAZA <CONNECTION_STRING> con la connection string real de gestio_deb

INSERT INTO "bases_datos" ("nombre", "db_name", "db_host", "db_port", "connection_string", "activa") VALUES
('Gestio Deb', 'gestio_deb', 'localhost', 5432,
'<CONNECTION_STRING_GESTIO_DEB>',
true)
ON CONFLICT ("db_name") DO UPDATE SET
  db_host = 'localhost',
  db_port = 5432,
  connection_string = '<CONNECTION_STRING_GESTIO_DEB>',
  activa = true;

-- Verificar que se agregó correctamente
SELECT * FROM bases_datos WHERE db_name = 'gestio_deb';