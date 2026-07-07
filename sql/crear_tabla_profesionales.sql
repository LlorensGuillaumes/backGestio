-- Tabla de Profesionales (PostgreSQL)
-- Para gestionar los profesionales que realizan revisiones

CREATE TABLE IF NOT EXISTS "Profesionales" (
    "IdProfesional" SERIAL PRIMARY KEY,
    "NombreCompleto" VARCHAR(200) NOT NULL,
    "Especialidad" VARCHAR(100) NULL,
    "NumColegiado" VARCHAR(50) NULL,  -- Puede ser NULL (asistentes, vendedores)
    "Activo" BOOLEAN NOT NULL DEFAULT TRUE,
    "FechaCreacion" TIMESTAMP DEFAULT NOW(),
    "FechaModificacion" TIMESTAMP NULL
);

-- Índice para búsquedas por nombre
CREATE INDEX IF NOT EXISTS "IX_Profesionales_NombreCompleto" ON "Profesionales"("NombreCompleto");

-- Índice para filtrar activos
CREATE INDEX IF NOT EXISTS "IX_Profesionales_Activo" ON "Profesionales"("Activo");

-- Datos de ejemplo
INSERT INTO "Profesionales" ("NombreCompleto", "Especialidad", "NumColegiado", "Activo") VALUES
('Dr. Juan García López', 'Optometrista', 'COL-12345', TRUE),
('María Fernández Ruiz', 'Óptico', 'COL-67890', TRUE),
('Carlos Martínez Sánchez', 'Asistente', NULL, TRUE)
ON CONFLICT DO NOTHING;
