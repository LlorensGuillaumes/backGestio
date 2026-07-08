-- ============================================
-- SCRIPT COMPLETO DE CONFIGURACIÓN DEL TENANT
-- Ejecutar en la base de datos gestio_db (neondb)
-- ============================================

-- ============================================
-- 1. SERVICIOS
-- ============================================
-- Familias de Servicios
CREATE TABLE IF NOT EXISTS "FamiliasServicios" (
    "IdFamiliaServicio" SERIAL PRIMARY KEY,
    "Descripcion" VARCHAR(200) NOT NULL,
    "Activa" SMALLINT DEFAULT 1
);

-- Subfamilias de Servicios
CREATE TABLE IF NOT EXISTS "SubFamiliasServicios" (
    "IdSubFamiliaServicio" SERIAL PRIMARY KEY,
    "IdFamiliaServicio" INT NOT NULL REFERENCES "FamiliasServicios"("IdFamiliaServicio"),
    "Descripcion" VARCHAR(200) NOT NULL,
    "Activa" SMALLINT DEFAULT 1
);

-- Tabla principal de Servicios
CREATE TABLE IF NOT EXISTS "Servicios" (
    "IdServicio" SERIAL PRIMARY KEY,
    "Codigo" VARCHAR(50),
    "Nombre" VARCHAR(300) NOT NULL,
    "Descripcion" TEXT,
    "PVP" DECIMAL(10, 2) DEFAULT 0,
    "PrecioCoste" DECIMAL(10, 2) DEFAULT 0,
    "IdTipoIva" INT,
    "PorcentajeIva" DECIMAL(5, 2) DEFAULT 21.00,
    "DuracionMinutos" INT DEFAULT 0,
    "RequiereCita" BOOLEAN DEFAULT FALSE,
    "Observaciones" TEXT,
    "Activo" SMALLINT DEFAULT 1,
    "FechaAlta" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "ImporteMatricula" DECIMAL(10, 2) DEFAULT 0
);

-- Relación Servicios - Subfamilias
CREATE TABLE IF NOT EXISTS "ServiciosSubFamilias" (
    "IdServicio" INT NOT NULL REFERENCES "Servicios"("IdServicio"),
    "IdSubFamiliaServicio" INT NOT NULL REFERENCES "SubFamiliasServicios"("IdSubFamiliaServicio"),
    PRIMARY KEY ("IdServicio", "IdSubFamiliaServicio")
);

-- Índices Servicios
CREATE INDEX IF NOT EXISTS "IX_Servicios_Codigo" ON "Servicios"("Codigo");
CREATE INDEX IF NOT EXISTS "IX_Servicios_Nombre" ON "Servicios"("Nombre");
CREATE INDEX IF NOT EXISTS "IX_Servicios_Activo" ON "Servicios"("Activo");

-- ============================================
-- 2. PROFESIONALES
-- ============================================
CREATE TABLE IF NOT EXISTS "Profesionales" (
    "IdProfesional" SERIAL PRIMARY KEY,
    "NombreCompleto" VARCHAR(200) NOT NULL,
    "Especialidad" VARCHAR(100) NULL,
    "NumColegiado" VARCHAR(50) NULL,
    "Activo" BOOLEAN NOT NULL DEFAULT TRUE,
    "FechaCreacion" TIMESTAMP DEFAULT NOW(),
    "FechaModificacion" TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS "IX_Profesionales_NombreCompleto" ON "Profesionales"("NombreCompleto");
CREATE INDEX IF NOT EXISTS "IX_Profesionales_Activo" ON "Profesionales"("Activo");

-- ============================================
-- 3. AULAS
-- ============================================
CREATE TABLE IF NOT EXISTS "Aulas" (
    "IdAula" SERIAL PRIMARY KEY,
    "Nombre" VARCHAR(100) NOT NULL,
    "Capacidad" INTEGER,
    "Observaciones" TEXT,
    "Activo" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_aulas_activo" ON "Aulas"("Activo");

-- ============================================
-- 4. CLASES RECURRENTES
-- ============================================
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

CREATE INDEX IF NOT EXISTS "idx_clases_activas" ON "ClasesRecurrentes"("Activo");

-- ============================================
-- 5. HORARIOS DE CLASES
-- ============================================
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

CREATE INDEX IF NOT EXISTS "idx_clasehorarios_clase" ON "ClaseHorarios"("IdClaseRecurrente");

-- ============================================
-- 6. MATRÍCULAS
-- ============================================
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

CREATE INDEX IF NOT EXISTS "idx_matriculas_clase" ON "Matriculas"("IdClaseRecurrente");
CREATE INDEX IF NOT EXISTS "idx_matriculas_cliente" ON "Matriculas"("IdCliente");

-- ============================================
-- 7. DATOS DE EJEMPLO
-- ============================================
-- Familias de Servicios
INSERT INTO "FamiliasServicios" ("Descripcion", "Activa") VALUES
    ('Música', 1),
    ('Clases', 1),
    ('Otros Servicios', 1)
ON CONFLICT DO NOTHING;

-- Profesionales
INSERT INTO "Profesionales" ("NombreCompleto", "Especialidad", "Activo") VALUES
    ('Profesor Ejemplo', 'Música', TRUE)
ON CONFLICT DO NOTHING;

-- Aulas
INSERT INTO "Aulas" ("Nombre", "Capacidad", "Activo") VALUES
    ('Aula 1', 10, TRUE),
    ('Aula 2', 15, TRUE)
ON CONFLICT DO NOTHING;

-- Servicios
INSERT INTO "Servicios" ("Codigo", "Nombre", "Descripcion", "PVP", "Activo") VALUES
    ('CLASE-001', 'Clase de Piano', 'Clase individual de piano', 30.00, 1),
    ('CLASE-002', 'Clase de Guitarra', 'Clase individual de guitarra', 25.00, 1)
ON CONFLICT DO NOTHING;

-- ============================================
-- VERIFICACIÓN
-- ============================================
SELECT 'FamiliasServicios' as tabla, COUNT(*) as registros FROM "FamiliasServicios"
UNION ALL
SELECT 'SubFamiliasServicios', COUNT(*) FROM "SubFamiliasServicios"
UNION ALL
SELECT 'Servicios', COUNT(*) FROM "Servicios"
UNION ALL
SELECT 'Profesionales', COUNT(*) FROM "Profesionales"
UNION ALL
SELECT 'Aulas', COUNT(*) FROM "Aulas"
UNION ALL
SELECT 'ClasesRecurrentes', COUNT(*) FROM "ClasesRecurrentes"
UNION ALL
SELECT 'ClaseHorarios', COUNT(*) FROM "ClaseHorarios"
UNION ALL
SELECT 'Matriculas', COUNT(*) FROM "Matriculas";