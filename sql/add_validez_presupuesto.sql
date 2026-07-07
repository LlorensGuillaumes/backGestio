-- Añadir campo de validez a Documentos para presupuestos
ALTER TABLE "Documentos" ADD COLUMN IF NOT EXISTS "ValidezDias" INT;

-- Comentario
COMMENT ON COLUMN "Documentos"."ValidezDias" IS 'Días de validez del presupuesto desde la fecha de creación';
