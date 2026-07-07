-- Crear tablas para Facturas de Venta
-- Ejecutar este script en PostgreSQL

-- Tabla principal de Facturas de Venta
CREATE TABLE IF NOT EXISTS "Facturas" (
    "IdFactura" SERIAL PRIMARY KEY,
    "Serie" VARCHAR(10) NOT NULL DEFAULT 'F',
    "Numero" INT NOT NULL,
    "FechaFactura" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "IdCliente" INT NOT NULL,

    -- Tipo de factura (NORMAL, ANTICIPO, FINAL)
    "TipoFactura" VARCHAR(20) NOT NULL DEFAULT 'NORMAL',

    -- Vinculación con documentos/encargos
    "IdDocumento" INT,
    "IdFacturaAnticipo" INT,

    -- Totales
    "TotalBaseImponible" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "TotalCuotaIva" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "TotalFactura" DECIMAL(12,2) NOT NULL DEFAULT 0,

    -- Estados
    "EstadoFiscal" VARCHAR(20) NOT NULL DEFAULT 'EMITIDA',
    "EstadoCobro" VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    "Estado" VARCHAR(20) NOT NULL DEFAULT 'ACTIVA',

    -- Otros
    "Observaciones" TEXT,
    "FechaCreacion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "FechaModificacion" TIMESTAMP,

    UNIQUE("Serie", "Numero")
);

-- Tabla de líneas de factura
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

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_facturas_cliente ON "Facturas"("IdCliente");
CREATE INDEX IF NOT EXISTS idx_facturas_fecha ON "Facturas"("FechaFactura");
CREATE INDEX IF NOT EXISTS idx_facturas_serie_numero ON "Facturas"("Serie", "Numero");
CREATE INDEX IF NOT EXISTS idx_facturas_tipo ON "Facturas"("TipoFactura");
CREATE INDEX IF NOT EXISTS idx_facturas_documento ON "Facturas"("IdDocumento");
CREATE INDEX IF NOT EXISTS idx_facturas_estado ON "Facturas"("Estado");
CREATE INDEX IF NOT EXISTS idx_facturas_lineas_factura ON "FacturasLineas"("IdFactura");

-- Añadir columnas a Documentos para referenciar facturas
ALTER TABLE "Documentos" ADD COLUMN IF NOT EXISTS "IdFacturaAnticipo" INT;
ALTER TABLE "Documentos" ADD COLUMN IF NOT EXISTS "IdFacturaFinal" INT;

-- Comentarios
COMMENT ON TABLE "Facturas" IS 'Facturas de venta a clientes';
COMMENT ON COLUMN "Facturas"."TipoFactura" IS 'NORMAL=venta directa, ANTICIPO=pago a cuenta, FINAL=entrega de encargo';
COMMENT ON COLUMN "Facturas"."IdDocumento" IS 'Referencia al documento/encargo origen';
COMMENT ON COLUMN "Facturas"."IdFacturaAnticipo" IS 'En facturas FINAL, referencia a la factura de anticipo si existe';
COMMENT ON COLUMN "Facturas"."EstadoFiscal" IS 'BORRADOR, EMITIDA, RECTIFICATIVA';
COMMENT ON COLUMN "Facturas"."EstadoCobro" IS 'PENDIENTE, COBRADA, COBRADA_PARCIAL, INCOBRABLE';
COMMENT ON COLUMN "Facturas"."Estado" IS 'ACTIVA, ANULADA';
