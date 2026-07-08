-- Agregar columnas para pre-matrícula y matrícula a la tabla Matriculas
-- Ejecutar en la base de datos gestio_db

-- Agregar columnas de precios
ALTER TABLE "Matriculas" ADD COLUMN IF NOT EXISTS "ImportePreMatricula" DECIMAL(10,2) DEFAULT 0;
ALTER TABLE "Matriculas" ADD COLUMN IF NOT EXISTS "ImporteMatricula" DECIMAL(10,2) DEFAULT 0;

-- Agregar columna de tipo de pago
ALTER TABLE "Matriculas" ADD COLUMN IF NOT EXISTS "TipoPago" VARCHAR(20) DEFAULT 'EFECTIVO'; -- EFECTIVO o GIRO_BANCARIO

-- Verificar cambios
SELECT 'Matriculas actualizada' as tabla, COUNT(*) as registros FROM "Matriculas";