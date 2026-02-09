-- =====================================================
-- MIGRACION: Trabajadores -> Usuarios
-- Ejecutar en: gestio_master
-- =====================================================

-- 1. Añadir campos de trabajador a usuarios
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "dni" VARCHAR(20);
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "telefono" VARCHAR(30);
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "puesto" VARCHAR(100);
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "id_convenio" INT;
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "fecha_alta" DATE;
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "fecha_baja" DATE;
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "observaciones" TEXT;

-- 2. Tabla de Convenios
CREATE TABLE IF NOT EXISTS "convenios" (
    "id" SERIAL PRIMARY KEY,
    "nombre" VARCHAR(200) NOT NULL,
    "horas_anuales" DECIMAL(8,2) NOT NULL,
    "dias_vacaciones" INT DEFAULT 22,
    "dias_convenio" INT DEFAULT 0,
    "descripcion" TEXT,
    "activo" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla de Horario por Usuario
CREATE TABLE IF NOT EXISTS "horarios_usuario" (
    "id" SERIAL PRIMARY KEY,
    "id_usuario" INT NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
    "dia_semana" SMALLINT NOT NULL,  -- 0=Lunes, 6=Domingo
    "hora_inicio" TIME,              -- NULL = día libre
    "hora_fin" TIME,
    "minutos_descanso" INT DEFAULT 0,
    "activo" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("id_usuario", "dia_semana")
);

-- 4. Tabla de Ausencias por Usuario (vacaciones, bajas, etc.)
CREATE TABLE IF NOT EXISTS "ausencias_usuario" (
    "id" SERIAL PRIMARY KEY,
    "id_usuario" INT NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
    "tipo" VARCHAR(50) NOT NULL,     -- VACACIONES, CONVENIO, BAJA_MEDICA, ASUNTOS_PROPIOS, OTRO
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE,                -- NULL = día suelto
    "computable" BOOLEAN DEFAULT true, -- FALSE para bajas (no restan días)
    "descripcion" TEXT,
    "estado" VARCHAR(30) DEFAULT 'APROBADA', -- PENDIENTE, APROBADA, RECHAZADA
    "activo" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Foreign key de usuarios a convenios
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_usuarios_convenio'
    ) THEN
        ALTER TABLE "usuarios"
        ADD CONSTRAINT "fk_usuarios_convenio"
        FOREIGN KEY ("id_convenio") REFERENCES "convenios"("id") ON DELETE SET NULL;
    END IF;
END $$;

-- 6. Índices
CREATE INDEX IF NOT EXISTS "idx_usuarios_convenio" ON "usuarios"("id_convenio");
CREATE INDEX IF NOT EXISTS "idx_usuarios_activo" ON "usuarios"("activo");
CREATE INDEX IF NOT EXISTS "idx_horarios_usuario" ON "horarios_usuario"("id_usuario");
CREATE INDEX IF NOT EXISTS "idx_ausencias_usuario" ON "ausencias_usuario"("id_usuario");
CREATE INDEX IF NOT EXISTS "idx_ausencias_fechas" ON "ausencias_usuario"("fecha_inicio", "fecha_fin");
CREATE INDEX IF NOT EXISTS "idx_ausencias_tipo" ON "ausencias_usuario"("tipo");

-- 7. Comentarios
COMMENT ON COLUMN "usuarios"."id_convenio" IS 'Convenio laboral del usuario';
COMMENT ON COLUMN "usuarios"."fecha_alta" IS 'Fecha de alta como trabajador';
COMMENT ON COLUMN "usuarios"."fecha_baja" IS 'Fecha de baja (NULL si sigue activo)';
COMMENT ON TABLE "convenios" IS 'Convenios laborales con horas anuales y días de vacaciones';
COMMENT ON TABLE "horarios_usuario" IS 'Horario semanal de cada usuario';
COMMENT ON TABLE "ausencias_usuario" IS 'Vacaciones, bajas y ausencias de usuarios';
