-- ============================================
-- SCRIPT COMPLETO - Ejecutar en HeidiSQL
-- Crea todas las tablas necesarias para:
-- - Modos de pago
-- - Facturas de venta
-- - Caja
-- - Validez presupuestos
-- ============================================

-- ============================================
-- 1. MODOS DE PAGO
-- ============================================
CREATE TABLE IF NOT EXISTS "ModosPago" (
    "IdModoPago" SERIAL PRIMARY KEY,
    "Descripcion" VARCHAR(100) NOT NULL,
    "UsaDatafono" BOOLEAN NOT NULL DEFAULT FALSE,
    "Activo" BOOLEAN NOT NULL DEFAULT TRUE,
    "Orden" INTEGER NOT NULL DEFAULT 0,
    "FechaCreacion" TIMESTAMP DEFAULT NOW(),
    "FechaModificacion" TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_modospago_orden ON "ModosPago" ("Orden", "Descripcion");

INSERT INTO "ModosPago" ("Descripcion", "UsaDatafono", "Activo", "Orden") VALUES
    ('Efectivo', FALSE, TRUE, 1),
    ('Tarjeta de crédito', TRUE, TRUE, 2),
    ('Tarjeta de débito', TRUE, TRUE, 3),
    ('Bizum', FALSE, TRUE, 4),
    ('Transferencia bancaria', FALSE, TRUE, 5),
    ('Domiciliación bancaria', FALSE, TRUE, 6),
    ('Financiación', FALSE, TRUE, 7),
    ('Cheque', FALSE, TRUE, 8)
ON CONFLICT DO NOTHING;

-- ============================================
-- 2. FACTURAS DE VENTA
-- ============================================
CREATE TABLE IF NOT EXISTS "Facturas" (
    "IdFactura" SERIAL PRIMARY KEY,
    "Serie" VARCHAR(10) NOT NULL DEFAULT 'F',
    "Numero" INT NOT NULL,
    "FechaFactura" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "IdCliente" INT NOT NULL,
    "TipoFactura" VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    "IdDocumento" INT,
    "IdFacturaAnticipo" INT,
    "TotalBaseImponible" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "TotalCuotaIva" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "TotalFactura" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "EstadoFiscal" VARCHAR(20) NOT NULL DEFAULT 'EMITIDA',
    "EstadoCobro" VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    "Estado" VARCHAR(20) NOT NULL DEFAULT 'ACTIVA',
    "Observaciones" TEXT,
    "FechaCreacion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "FechaModificacion" TIMESTAMP,
    UNIQUE("Serie", "Numero")
);

CREATE TABLE IF NOT EXISTS "FacturasLineas" (
    "IdLineaFactura" SERIAL PRIMARY KEY,
    "IdFactura" INT NOT NULL REFERENCES "Facturas"("IdFactura") ON DELETE CASCADE,
    "NumeroLinea" INT NOT NULL DEFAULT 1,
    "CodigoItem" VARCHAR(50),
    "DescripcionItem" VARCHAR(500) NOT NULL,
    "Cantidad" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "PrecioUnitario" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "BaseImporte" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "PcIva" DECIMAL(5,2) NOT NULL DEFAULT 21,
    "ImporteIva" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "PcDescuento" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "ImporteDescuento" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ImporteLinea" DECIMAL(12,2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_facturas_cliente ON "Facturas"("IdCliente");
CREATE INDEX IF NOT EXISTS idx_facturas_fecha ON "Facturas"("FechaFactura");
CREATE INDEX IF NOT EXISTS idx_facturas_serie_numero ON "Facturas"("Serie", "Numero");
CREATE INDEX IF NOT EXISTS idx_facturas_tipo ON "Facturas"("TipoFactura");
CREATE INDEX IF NOT EXISTS idx_facturas_documento ON "Facturas"("IdDocumento");
CREATE INDEX IF NOT EXISTS idx_facturas_estado ON "Facturas"("Estado");
CREATE INDEX IF NOT EXISTS idx_facturas_lineas_factura ON "FacturasLineas"("IdFactura");

-- Columnas en Documentos para referenciar facturas
ALTER TABLE "Documentos" ADD COLUMN IF NOT EXISTS "IdFacturaAnticipo" INT;
ALTER TABLE "Documentos" ADD COLUMN IF NOT EXISTS "IdFacturaFinal" INT;

-- ============================================
-- 3. CAJA
-- ============================================
CREATE TABLE IF NOT EXISTS "CajaMovimientos" (
    "IdMovimiento" SERIAL PRIMARY KEY,
    "Fecha" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Tipo" VARCHAR(20) NOT NULL,
    "IdModoPago" INT REFERENCES "ModosPago"("IdModoPago"),
    "Concepto" VARCHAR(500) NOT NULL,
    "Importe" DECIMAL(12,2) NOT NULL,
    "IdFactura" INT REFERENCES "Facturas"("IdFactura"),
    "IdDocumento" INT,
    "IdCliente" INT,
    "Referencia" VARCHAR(100),
    "Observaciones" TEXT,
    "FechaCreacion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "UsuarioCreacion" VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_caja_fecha ON "CajaMovimientos"("Fecha");
CREATE INDEX IF NOT EXISTS idx_caja_tipo ON "CajaMovimientos"("Tipo");
CREATE INDEX IF NOT EXISTS idx_caja_factura ON "CajaMovimientos"("IdFactura");
CREATE INDEX IF NOT EXISTS idx_caja_cliente ON "CajaMovimientos"("IdCliente");
CREATE INDEX IF NOT EXISTS idx_caja_modopago ON "CajaMovimientos"("IdModoPago");

-- ============================================
-- 4. VALIDEZ PRESUPUESTOS
-- ============================================
ALTER TABLE "Documentos" ADD COLUMN IF NOT EXISTS "ValidezDias" INT;

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
