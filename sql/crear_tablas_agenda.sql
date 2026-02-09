-- ============================================================
-- MODULO DE AGENDA / CITAS
-- Base de datos: gestio_db
-- ============================================================

-- CITAS (Agenda principal)
CREATE TABLE IF NOT EXISTS "Citas" (
    "IdCita" SERIAL PRIMARY KEY,
    "IdCliente" INT REFERENCES "clientes"("id"),   -- NULL si no es cliente registrado
    "NombreContacto" VARCHAR(200),                  -- Para no-clientes o nombre rápido
    "TelefonoContacto" VARCHAR(50),
    "EmailContacto" VARCHAR(200),
    "FechaHoraInicio" TIMESTAMP NOT NULL,
    "FechaHoraFin" TIMESTAMP NOT NULL,
    "TodoElDia" BOOLEAN DEFAULT FALSE,
    "MotivoVisita" VARCHAR(200),
    "TipoCita" VARCHAR(50) DEFAULT 'GENERAL',       -- GENERAL, REVISION, RECOGIDA, AJUSTE, CONSULTA, OTRO
    "Observaciones" TEXT,
    "Estado" VARCHAR(30) DEFAULT 'PROGRAMADA',      -- PROGRAMADA, CONFIRMADA, COMPLETADA, CANCELADA, NO_ASISTIO
    "IdProfesional" INT,                            -- Profesional asignado (referencia a Profesionales)
    "Color" VARCHAR(20) DEFAULT '#3b82f6',          -- Color para mostrar en calendario
    "Recordatorio" BOOLEAN DEFAULT FALSE,
    "MinutosRecordatorio" INT DEFAULT 60,           -- Minutos antes para recordar
    "Activo" SMALLINT DEFAULT 1,
    "FechaCreacion" TIMESTAMP DEFAULT NOW(),
    "FechaModificacion" TIMESTAMP
);

-- Indices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS "idx_citas_fecha" ON "Citas"("FechaHoraInicio", "FechaHoraFin");
CREATE INDEX IF NOT EXISTS "idx_citas_cliente" ON "Citas"("IdCliente");
CREATE INDEX IF NOT EXISTS "idx_citas_profesional" ON "Citas"("IdProfesional");
CREATE INDEX IF NOT EXISTS "idx_citas_estado" ON "Citas"("Estado");
CREATE INDEX IF NOT EXISTS "idx_citas_activo" ON "Citas"("Activo");
