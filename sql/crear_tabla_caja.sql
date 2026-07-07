-- ============================================
-- TABLA: CajaMovimientos
-- Movimientos de caja (cobros y pagos)
-- ============================================

CREATE TABLE IF NOT EXISTS "CajaMovimientos" (
    "IdMovimiento" SERIAL PRIMARY KEY,
    "Fecha" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Tipo" VARCHAR(20) NOT NULL, -- COBRO, PAGO, APERTURA, CIERRE, AJUSTE
    "IdModoPago" INT REFERENCES "ModosPago"("IdModoPago"),
    "Concepto" VARCHAR(500) NOT NULL,
    "Importe" DECIMAL(12,2) NOT NULL,

    -- Referencias opcionales
    "IdFactura" INT REFERENCES "Facturas"("IdFactura"),
    "IdDocumento" INT,
    "IdCliente" INT,

    -- Info adicional
    "Referencia" VARCHAR(100), -- Num. ticket datafono, referencia bizum, etc.
    "Observaciones" TEXT,

    -- Auditoría
    "FechaCreacion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "UsuarioCreacion" VARCHAR(100)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_caja_fecha ON "CajaMovimientos"("Fecha");
CREATE INDEX IF NOT EXISTS idx_caja_tipo ON "CajaMovimientos"("Tipo");
CREATE INDEX IF NOT EXISTS idx_caja_factura ON "CajaMovimientos"("IdFactura");
CREATE INDEX IF NOT EXISTS idx_caja_cliente ON "CajaMovimientos"("IdCliente");
CREATE INDEX IF NOT EXISTS idx_caja_modopago ON "CajaMovimientos"("IdModoPago");

-- Vista para resumen diario de caja
CREATE OR REPLACE VIEW "VistaCajaDiaria" AS
SELECT
    DATE("Fecha") as "Dia",
    "Tipo",
    mp."Descripcion" as "ModoPago",
    COUNT(*) as "NumOperaciones",
    SUM("Importe") as "TotalImporte"
FROM "CajaMovimientos" cm
LEFT JOIN "ModosPago" mp ON cm."IdModoPago" = mp."IdModoPago"
GROUP BY DATE("Fecha"), "Tipo", mp."Descripcion"
ORDER BY DATE("Fecha") DESC, "Tipo";

-- Comentarios
COMMENT ON TABLE "CajaMovimientos" IS 'Registro de todos los movimientos de caja';
COMMENT ON COLUMN "CajaMovimientos"."Tipo" IS 'COBRO=entrada dinero, PAGO=salida dinero, APERTURA=saldo inicial, CIERRE=cuadre, AJUSTE=corrección';
COMMENT ON COLUMN "CajaMovimientos"."Importe" IS 'Positivo para entradas, negativo para salidas';
