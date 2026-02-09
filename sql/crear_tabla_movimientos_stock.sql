-- Script para crear la tabla MovimientosStock
-- Sistema de gestión de stock - Registro de movimientos

CREATE TABLE IF NOT EXISTS "MovimientosStock" (
    "IdMovimiento" SERIAL PRIMARY KEY,
    "IdProducto" INT NOT NULL REFERENCES "Productos"("IdProducto"),
    "TipoMovimiento" VARCHAR(20) NOT NULL, -- ENTRADA_INICIAL, ENTRADA_COMPRA, SALIDA_VENTA, AJUSTE
    "Cantidad" INT NOT NULL,
    "StockAnterior" INT NOT NULL,
    "StockPosterior" INT NOT NULL,
    "FechaMovimiento" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "IdDocumentoOrigen" INT NULL,
    "TipoDocumentoOrigen" VARCHAR(50) NULL, -- RECEPCION_COMPRA, FACTURA_VENTA, etc.
    "Observaciones" TEXT NULL,
    "IdUsuario" INT NULL,
    "CreadoEn" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indices para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS "idx_movimientos_stock_producto" ON "MovimientosStock"("IdProducto");
CREATE INDEX IF NOT EXISTS "idx_movimientos_stock_fecha" ON "MovimientosStock"("FechaMovimiento");
CREATE INDEX IF NOT EXISTS "idx_movimientos_stock_tipo" ON "MovimientosStock"("TipoMovimiento");

-- Comentarios de documentacion
COMMENT ON TABLE "MovimientosStock" IS 'Registro historico de todos los movimientos de stock de productos';
COMMENT ON COLUMN "MovimientosStock"."TipoMovimiento" IS 'Tipo: ENTRADA_INICIAL, ENTRADA_COMPRA, SALIDA_VENTA, AJUSTE';
COMMENT ON COLUMN "MovimientosStock"."TipoDocumentoOrigen" IS 'Tipo documento origen: RECEPCION_COMPRA, FACTURA_VENTA, etc.';
