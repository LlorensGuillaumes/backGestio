-- Crear tablas para el módulo de escuela
-- Ejecutar en la base de datos gestio_db

-- Tabla de aulas
CREATE TABLE IF NOT EXISTS "Aulas" (
  "IdAula" SERIAL PRIMARY KEY,
  "Nombre" VARCHAR(100) NOT NULL,
  "Capacidad" INTEGER,
  "Observaciones" TEXT,
  "Activo" BOOLEAN DEFAULT true,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de clases recurrentes
CREATE TABLE IF NOT EXISTS "ClasesRecurrentes" (
  "IdClaseRecurrente" SERIAL PRIMARY KEY,
  "Nombre" VARCHAR(200) NOT NULL,
  "IdServicio" INTEGER,
  "IdProfesional" INTEGER,
  "Tipo" VARCHAR(20) NOT NULL DEFAULT 'INDIVIDUAL', -- INDIVIDUAL o GRUPAL
  "CapacidadMax" INTEGER NOT NULL DEFAULT 1,
  "DiaSemana" INTEGER, -- Legacy: primer día
  "HoraInicio" TIME, -- Legacy: hora de inicio
  "DuracionMinutos" INTEGER DEFAULT 60, -- Legacy: duración
  "Aula" VARCHAR(100), -- Legacy: nombre del aula
  "FechaInicio" DATE,
  "FechaFin" DATE,
  "Observaciones" TEXT,
  "Activo" BOOLEAN DEFAULT true,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de horarios de clases (sesiones)
CREATE TABLE IF NOT EXISTS "ClaseHorarios" (
  "IdHorario" SERIAL PRIMARY KEY,
  "IdClaseRecurrente" INTEGER NOT NULL REFERENCES "ClasesRecurrentes"("IdClaseRecurrente") ON DELETE CASCADE,
  "DiaSemana" INTEGER NOT NULL, -- 1=Lunes ... 7=Domingo
  "HoraInicio" TIME NOT NULL,
  "DuracionMinutos" INTEGER NOT NULL DEFAULT 60,
  "IdAula" INTEGER REFERENCES "Aulas"("IdAula"),
  "Activo" BOOLEAN DEFAULT true,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de matrículas
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

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS "idx_aulas_activo" ON "Aulas"("Activo");
CREATE INDEX IF NOT EXISTS "idx_clases_activas" ON "ClasesRecurrentes"("Activo");
CREATE INDEX IF NOT EXISTS "idx_clasehorarios_clase" ON "ClaseHorarios"("IdClaseRecurrente");
CREATE INDEX IF NOT EXISTS "idx_matriculas_clase" ON "Matriculas"("IdClaseRecurrente");
CREATE INDEX IF NOT EXISTS "idx_matriculas_cliente" ON "Matriculas"("IdCliente");

-- Verificar que se crearon correctamente
SELECT 'Aulas' as tabla, COUNT(*) as registros FROM "Aulas"
UNION ALL
SELECT 'ClasesRecurrentes', COUNT(*) FROM "ClasesRecurrentes"
UNION ALL
SELECT 'ClaseHorarios', COUNT(*) FROM "ClaseHorarios"
UNION ALL
SELECT 'Matriculas', COUNT(*) FROM "Matriculas";