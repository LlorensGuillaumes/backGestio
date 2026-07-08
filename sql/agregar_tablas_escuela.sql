-- Agregar columnas y tablas faltantes a gestio_db
-- Ejecutar en la base de datos gestio_db (neondb)

-- Agregar ImporteMatricula a Servicios (si no existe)
ALTER TABLE "Servicios" ADD COLUMN IF NOT EXISTS "ImporteMatricula" DECIMAL(10, 2) DEFAULT 0;

-- Crear tablas de escuela (si no existen)
CREATE TABLE IF NOT EXISTS "Aulas" (
    "IdAula" SERIAL PRIMARY KEY,
    "Nombre" VARCHAR(100) NOT NULL,
    "Capacidad" INTEGER,
    "Observaciones" TEXT,
    "Activo" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ClasesRecurrentes" (
    "IdClaseRecurrente" SERIAL PRIMARY KEY,
    "Nombre" VARCHAR(200) NOT NULL,
    "IdServicio" INTEGER,
    "IdProfesional" INTEGER,
    "Tipo" VARCHAR(20) NOT NULL DEFAULT 'INDIVIDUAL',
    "CapacidadMax" INTEGER NOT NULL DEFAULT 1,
    "DiaSemana" INTEGER,
    "HoraInicio" TIME,
    "DuracionMinutos" INTEGER DEFAULT 60,
    "Aula" VARCHAR(100),
    "FechaInicio" DATE,
    "FechaFin" DATE,
    "Observaciones" TEXT,
    "Activo" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ClaseHorarios" (
    "IdHorario" SERIAL PRIMARY KEY,
    "IdClaseRecurrente" INTEGER NOT NULL REFERENCES "ClasesRecurrentes"("IdClaseRecurrente") ON DELETE CASCADE,
    "DiaSemana" INTEGER NOT NULL,
    "HoraInicio" TIME NOT NULL,
    "DuracionMinutos" INTEGER NOT NULL DEFAULT 60,
    "IdAula" INTEGER REFERENCES "Aulas"("IdAula"),
    "Activo" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Matriculas" (
    "IdMatricula" SERIAL PRIMARY KEY,
    "IdClaseRecurrente" INTEGER NOT NULL,
    "IdCliente" INTEGER NOT NULL,
    "CuotaMensual" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "Estado" VARCHAR(50) NOT NULL DEFAULT 'ACTIVA',
    "FechaAlta" DATE NOT NULL DEFAULT CURRENT_DATE,
    "FechaBaja" DATE,
    "Activo" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS "idx_aulas_activo" ON "Aulas"("Activo");
CREATE INDEX IF NOT EXISTS "idx_clases_activas" ON "ClasesRecurrentes"("Activo");
CREATE INDEX IF NOT EXISTS "idx_clasehorarios_clase" ON "ClaseHorarios"("IdClaseRecurrente");
CREATE INDEX IF NOT EXISTS "idx_matriculas_clase" ON "Matriculas"("IdClaseRecurrente");
CREATE INDEX IF NOT EXISTS "idx_matriculas_cliente" ON "Matriculas"("IdCliente");

-- Verificar
SELECT 'Servicios con ImporteMatricula' as tabla, COUNT(*) as registros FROM "Servicios"
UNION ALL
SELECT 'Aulas', COUNT(*) FROM "Aulas"
UNION ALL
SELECT 'ClasesRecurrentes', COUNT(*) FROM "ClasesRecurrentes"
UNION ALL
SELECT 'ClaseHorarios', COUNT(*) FROM "ClaseHorarios"
UNION ALL
SELECT 'Matriculas', COUNT(*) FROM "Matriculas";