-- Agregar campos faltantes a la tabla clientes (si no existen)
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "es_factura_simplificada" BOOLEAN;
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "telefono1" VARCHAR(30);
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "telefono2" VARCHAR(30);
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "iban" VARCHAR(50);
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "titular_cuenta" VARCHAR(200);
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "bic" VARCHAR(20);

-- Verificar que se agregaron correctamente
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'clientes' 
AND column_name IN ('id', 'tipo_cliente', 'documento_fiscal', 'es_factura_simplificada', 'telefono1', 'telefono2', 'iban', 'titular_cuenta', 'bic');
