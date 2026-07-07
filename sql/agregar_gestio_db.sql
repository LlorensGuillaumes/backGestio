-- Agregar/actualizar gestio_db en la tabla bases_datos
-- Ejecutar conectado a la base de datos master

INSERT INTO "bases_datos" ("nombre", "db_name", "db_host", "db_port", "activa") VALUES
('Gestio DB', 'gestio_db', 'ep-noisy-sound-asv7n572-pooler.c-4.eu-central-1.aws.neon.tech', 5432, true)
ON CONFLICT ("db_name") DO UPDATE SET
  db_host = 'ep-noisy-sound-asv7n572-pooler.c-4.eu-central-1.aws.neon.tech',
  db_port = 5432,
  activa = true;

-- Verificar que se agregó correctamente
SELECT * FROM bases_datos WHERE db_name = 'gestio_db';