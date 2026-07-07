-- =============================================
-- MODULO VERIFACTU - INTEGRACION AEAT
-- =============================================
-- Tablas para configuracion y registro de comunicaciones
-- con el sistema VeriFactu de la AEAT

-- =============================================
-- TABLA DE CONFIGURACION VERIFACTU
-- =============================================

CREATE TABLE IF NOT EXISTS "VeriFactuConfig" (
    "IdConfig" SERIAL PRIMARY KEY,
    "ModoActivo" BOOLEAN NOT NULL DEFAULT FALSE,
    "EnvioAutomatico" BOOLEAN NOT NULL DEFAULT FALSE,
    "AmbienteAEAT" VARCHAR(20) NOT NULL DEFAULT 'PRUEBAS', -- PRUEBAS, PRODUCCION
    "CertificadoNombre" VARCHAR(200),
    "CertificadoExpiracion" TIMESTAMP,
    "NombreSIF" VARCHAR(100) DEFAULT 'OpticaGest',
    "VersionSIF" VARCHAR(20) DEFAULT '1.0',
    "UltimoHashVentas" VARCHAR(64),
    "UltimoHashCompras" VARCHAR(64),
    "FechaCreacion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "FechaModificacion" TIMESTAMP
);

-- Insertar configuracion inicial
INSERT INTO "VeriFactuConfig" ("ModoActivo", "EnvioAutomatico", "AmbienteAEAT")
SELECT FALSE, FALSE, 'PRUEBAS'
WHERE NOT EXISTS (SELECT 1 FROM "VeriFactuConfig");

-- =============================================
-- TABLA DE LOG DE COMUNICACIONES VERIFACTU
-- =============================================

CREATE TABLE IF NOT EXISTS "VeriFactuLog" (
    "IdLog" SERIAL PRIMARY KEY,
    "TipoDocumento" VARCHAR(20) NOT NULL, -- FACTURA_VENTA, FACTURA_COMPRA
    "IdFactura" INT,
    "IdFacturaCompra" INT,
    "SerieFactura" VARCHAR(10),
    "NumeroFactura" VARCHAR(50),
    "TipoRegistro" VARCHAR(20) NOT NULL, -- ALTA, ANULACION
    "HuellaHash" VARCHAR(64) NOT NULL,
    "EstadoEnvio" VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE', -- PENDIENTE, ENVIADO, ACEPTADO, RECHAZADO, ERROR
    "FechaEnvio" TIMESTAMP,
    "IntentoEnvio" INT DEFAULT 0,
    "CodigoRespuestaAEAT" VARCHAR(20),
    "MensajeRespuestaAEAT" TEXT,
    "CSVRespuesta" VARCHAR(50),
    "FechaRespuesta" TIMESTAMP,
    "XMLEnviado" TEXT,
    "XMLRespuesta" TEXT,
    "QRCodeData" TEXT,
    "UltimoError" TEXT,
    "FechaCreacion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indices para VeriFactuLog
CREATE INDEX IF NOT EXISTS idx_verifactu_log_factura ON "VeriFactuLog"("IdFactura");
CREATE INDEX IF NOT EXISTS idx_verifactu_log_factura_compra ON "VeriFactuLog"("IdFacturaCompra");
CREATE INDEX IF NOT EXISTS idx_verifactu_log_estado ON "VeriFactuLog"("EstadoEnvio");
CREATE INDEX IF NOT EXISTS idx_verifactu_log_tipo ON "VeriFactuLog"("TipoDocumento");
CREATE INDEX IF NOT EXISTS idx_verifactu_log_fecha ON "VeriFactuLog"("FechaCreacion");

-- =============================================
-- MODIFICACIONES A TABLAS EXISTENTES
-- =============================================

-- Agregar columnas VeriFactu a Facturas (ventas)
ALTER TABLE "Facturas" ADD COLUMN IF NOT EXISTS "VeriFactuEstado" VARCHAR(20) DEFAULT 'NO_ENVIADA';
ALTER TABLE "Facturas" ADD COLUMN IF NOT EXISTS "VeriFactuCSV" VARCHAR(50);

-- Agregar columnas VeriFactu a FacturasCompra
ALTER TABLE "FacturasCompra" ADD COLUMN IF NOT EXISTS "VeriFactuEstado" VARCHAR(20) DEFAULT 'NO_ENVIADA';
ALTER TABLE "FacturasCompra" ADD COLUMN IF NOT EXISTS "VeriFactuCSV" VARCHAR(50);

-- Indices adicionales
CREATE INDEX IF NOT EXISTS idx_facturas_verifactu_estado ON "Facturas"("VeriFactuEstado");
CREATE INDEX IF NOT EXISTS idx_facturas_compra_verifactu_estado ON "FacturasCompra"("VeriFactuEstado");

-- =============================================
-- COMENTARIOS
-- =============================================

COMMENT ON TABLE "VeriFactuConfig" IS 'Configuracion del sistema VeriFactu para comunicacion con AEAT';
COMMENT ON COLUMN "VeriFactuConfig"."ModoActivo" IS 'Si esta activo el envio a VeriFactu';
COMMENT ON COLUMN "VeriFactuConfig"."EnvioAutomatico" IS 'Si se envia automaticamente al crear facturas';
COMMENT ON COLUMN "VeriFactuConfig"."AmbienteAEAT" IS 'PRUEBAS o PRODUCCION';
COMMENT ON COLUMN "VeriFactuConfig"."UltimoHashVentas" IS 'Hash del ultimo registro enviado de ventas (encadenamiento)';
COMMENT ON COLUMN "VeriFactuConfig"."UltimoHashCompras" IS 'Hash del ultimo registro enviado de compras (encadenamiento)';

COMMENT ON TABLE "VeriFactuLog" IS 'Registro de todas las comunicaciones con VeriFactu/AEAT';
COMMENT ON COLUMN "VeriFactuLog"."TipoDocumento" IS 'FACTURA_VENTA o FACTURA_COMPRA';
COMMENT ON COLUMN "VeriFactuLog"."TipoRegistro" IS 'ALTA para nuevas facturas, ANULACION para anular';
COMMENT ON COLUMN "VeriFactuLog"."HuellaHash" IS 'Hash SHA-256 del registro segun especificacion AEAT';
COMMENT ON COLUMN "VeriFactuLog"."EstadoEnvio" IS 'PENDIENTE, ENVIADO, ACEPTADO, RECHAZADO, ERROR';
COMMENT ON COLUMN "VeriFactuLog"."CSVRespuesta" IS 'Codigo Seguro de Verificacion devuelto por AEAT';
COMMENT ON COLUMN "VeriFactuLog"."QRCodeData" IS 'Datos para generar QR de verificacion';

COMMENT ON COLUMN "Facturas"."VeriFactuEstado" IS 'Estado en VeriFactu: NO_ENVIADA, PENDIENTE, ACEPTADO, RECHAZADO, ERROR';
COMMENT ON COLUMN "Facturas"."VeriFactuCSV" IS 'CSV devuelto por AEAT';
COMMENT ON COLUMN "FacturasCompra"."VeriFactuEstado" IS 'Estado en VeriFactu: NO_ENVIADA, PENDIENTE, ACEPTADO, RECHAZADO, ERROR';
COMMENT ON COLUMN "FacturasCompra"."VeriFactuCSV" IS 'CSV devuelto por AEAT';
