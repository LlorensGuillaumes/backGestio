-- Agregar/actualizar gestio_db en la tabla bases_datos
-- Ejecutar conectado a la base de datos master

INSERT INTO "bases_datos" ("nombre", "db_name", "db_host", "db_port", "connection_string", "activa") VALUES
('Gestio DB', 'gestio_db', 'ep-sparkling-rain-as59s678-pooler.c-4.eu-central-1.aws.neon.tech', 5432, 
'postgresql://neondb_owner:npg_tPaG1oI4cUWf@ep-sparkling-rain-as59s678-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require', 
true)
ON CONFLICT ("db_name") DO UPDATE SET
  db_host = 'ep-sparkling-rain-as59s678-pooler.c-4.eu-central-1.aws.neon.tech',
  db_port = 5432,
  connection_string = 'postgresql://neondb_owner:npg_tPaG1oI4cUWf@ep-sparkling-rain-as59s678-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  activa = true;

-- Verificar que se agregó correctamente
SELECT * FROM bases_datos WHERE db_name = 'gestio_db';