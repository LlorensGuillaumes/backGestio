-- =====================================================
-- MIGRACION: Trabajadores -> Usuarios
-- Ejecutar en: gestio_db (cada empresa)
-- =====================================================

-- =====================================================
-- PARTE 1: ELIMINAR TABLAS DE TRABAJADORES
-- =====================================================

-- Eliminar en orden correcto (dependencias primero)
DROP TABLE IF EXISTS "AusenciasTrabajador" CASCADE;
DROP TABLE IF EXISTS "HorarioTrabajador" CASCADE;
DROP TABLE IF EXISTS "Trabajadores" CASCADE;
DROP TABLE IF EXISTS "Convenios" CASCADE;

-- =====================================================
-- PARTE 2: AÑADIR AUDITORIA IdUsuario A TABLAS
-- =====================================================

-- Facturas
ALTER TABLE "Facturas" ADD COLUMN IF NOT EXISTS "IdUsuario" INT;
CREATE INDEX IF NOT EXISTS "idx_facturas_usuario" ON "Facturas"("IdUsuario");
COMMENT ON COLUMN "Facturas"."IdUsuario" IS 'Usuario que creó/gestionó la factura';

-- CajaMovimientos
ALTER TABLE "CajaMovimientos" ADD COLUMN IF NOT EXISTS "IdUsuario" INT;
CREATE INDEX IF NOT EXISTS "idx_caja_usuario" ON "CajaMovimientos"("IdUsuario");
COMMENT ON COLUMN "CajaMovimientos"."IdUsuario" IS 'Usuario que realizó el movimiento';

-- Documentos (ya tiene CreadoPor y ModificadoPor como INT, los renombramos para claridad)
-- Primero verificamos si existen las columnas antiguas
DO $$
BEGIN
    -- Si existe CreadoPor pero no IdUsuarioCreacion, renombrar
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Documentos' AND column_name = 'CreadoPor')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Documentos' AND column_name = 'IdUsuarioCreacion') THEN
        ALTER TABLE "Documentos" RENAME COLUMN "CreadoPor" TO "IdUsuarioCreacion";
    END IF;

    -- Si existe ModificadoPor pero no IdUsuarioModificacion, renombrar
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Documentos' AND column_name = 'ModificadoPor')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Documentos' AND column_name = 'IdUsuarioModificacion') THEN
        ALTER TABLE "Documentos" RENAME COLUMN "ModificadoPor" TO "IdUsuarioModificacion";
    END IF;

    -- Si no existen ninguna, crear las nuevas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Documentos' AND column_name = 'IdUsuarioCreacion') THEN
        ALTER TABLE "Documentos" ADD COLUMN "IdUsuarioCreacion" INT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Documentos' AND column_name = 'IdUsuarioModificacion') THEN
        ALTER TABLE "Documentos" ADD COLUMN "IdUsuarioModificacion" INT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_documentos_usuario_creacion" ON "Documentos"("IdUsuarioCreacion");
CREATE INDEX IF NOT EXISTS "idx_documentos_usuario_modificacion" ON "Documentos"("IdUsuarioModificacion");
COMMENT ON COLUMN "Documentos"."IdUsuarioCreacion" IS 'Usuario que creó el documento';
COMMENT ON COLUMN "Documentos"."IdUsuarioModificacion" IS 'Último usuario que modificó el documento';

-- Citas
ALTER TABLE "Citas" ADD COLUMN IF NOT EXISTS "IdUsuario" INT;
CREATE INDEX IF NOT EXISTS "idx_citas_usuario" ON "Citas"("IdUsuario");
COMMENT ON COLUMN "Citas"."IdUsuario" IS 'Usuario que creó/gestionó la cita';

-- Revisiones
ALTER TABLE "Revisiones" ADD COLUMN IF NOT EXISTS "IdUsuario" INT;
CREATE INDEX IF NOT EXISTS "idx_revisiones_usuario" ON "Revisiones"("IdUsuario");
COMMENT ON COLUMN "Revisiones"."IdUsuario" IS 'Usuario que registró la revisión';

-- =====================================================
-- PARTE 3: FestivosEmpresa SE MANTIENE IGUAL
-- (ya existe y está correctamente en gestio_db)
-- =====================================================

-- Solo nos aseguramos de que tenga índice
CREATE INDEX IF NOT EXISTS "idx_festivos_fecha" ON "FestivosEmpresa"("FechaInicio", "FechaFin");
CREATE INDEX IF NOT EXISTS "idx_festivos_anyo" ON "FestivosEmpresa"("Anyo");
