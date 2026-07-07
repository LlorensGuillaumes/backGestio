-- ============================================
-- TABLA: ModosPago
-- Modos de pago disponibles en el sistema
-- ============================================

CREATE TABLE IF NOT EXISTS "ModosPago" (
    "IdModoPago" SERIAL PRIMARY KEY,
    "Descripcion" VARCHAR(100) NOT NULL UNIQUE,
    "UsaDatafono" BOOLEAN NOT NULL DEFAULT FALSE,
    "Activo" BOOLEAN NOT NULL DEFAULT TRUE,
    "Orden" INTEGER NOT NULL DEFAULT 0,
    "FechaCreacion" TIMESTAMP DEFAULT NOW(),
    "FechaModificacion" TIMESTAMP NULL
);

-- Índice para ordenación
CREATE INDEX IF NOT EXISTS idx_modospago_orden ON "ModosPago" ("Orden", "Descripcion");

-- Si la tabla ya existe, añadir constraint UNIQUE (ignora error si ya existe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'modospago_descripcion_unique'
    ) THEN
        ALTER TABLE "ModosPago" ADD CONSTRAINT modospago_descripcion_unique UNIQUE ("Descripcion");
    END IF;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

-- ============================================
-- DATOS INICIALES
-- ============================================
INSERT INTO "ModosPago" ("Descripcion", "UsaDatafono", "Activo", "Orden") VALUES
    ('Efectivo', FALSE, TRUE, 1),
    ('Tarjeta de crédito', TRUE, TRUE, 2),
    ('Tarjeta de débito', TRUE, TRUE, 3),
    ('Bizum', FALSE, TRUE, 4),
    ('Transferencia bancaria', FALSE, TRUE, 5),
    ('Domiciliación bancaria', FALSE, TRUE, 6),
    ('Financiación', FALSE, TRUE, 7),
    ('Cheque', FALSE, TRUE, 8)
ON CONFLICT ("Descripcion") DO NOTHING;
