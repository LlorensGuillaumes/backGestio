-- ===========================================
-- TABLAS PARA CAJA Y FACTURAS
-- ===========================================

-- MODOS DE PAGO (si no existe)
CREATE TABLE IF NOT EXISTS "ModosPago" (
    "IdModoPago" SERIAL PRIMARY KEY,
    "Descripcion" VARCHAR(100) NOT NULL,
    "UsaDatafono" BOOLEAN DEFAULT FALSE,
    "Activo" SMALLINT DEFAULT 1,
    "Orden" INT DEFAULT 0,
    "FechaCreacion" TIMESTAMP DEFAULT NOW()
);

-- Insertar modos de pago básicos si la tabla está vacía
INSERT INTO "ModosPago" ("Descripcion", "UsaDatafono", "Activo", "Orden")
SELECT 'Efectivo', FALSE, 1, 1
WHERE NOT EXISTS (SELECT 1 FROM "ModosPago" WHERE "Descripcion" = 'Efectivo');

INSERT INTO "ModosPago" ("Descripcion", "UsaDatafono", "Activo", "Orden")
SELECT 'Tarjeta', TRUE, 1, 2
WHERE NOT EXISTS (SELECT 1 FROM "ModosPago" WHERE "Descripcion" = 'Tarjeta');

INSERT INTO "ModosPago" ("Descripcion", "UsaDatafono", "Activo", "Orden")
SELECT 'Transferencia', FALSE, 1, 3
WHERE NOT EXISTS (SELECT 1 FROM "ModosPago" WHERE "Descripcion" = 'Transferencia');

INSERT INTO "ModosPago" ("Descripcion", "UsaDatafono", "Activo", "Orden")
SELECT 'Bizum', FALSE, 1, 4
WHERE NOT EXISTS (SELECT 1 FROM "ModosPago" WHERE "Descripcion" = 'Bizum');

-- FACTURAS DE VENTA
CREATE TABLE IF NOT EXISTS "Facturas" (
    "IdFactura" SERIAL PRIMARY KEY,
    "Serie" VARCHAR(10) NOT NULL DEFAULT 'F',
    "Numero" INT NOT NULL,
    "FechaFactura" TIMESTAMP NOT NULL DEFAULT NOW(),
    "IdCliente" INT,
    "TipoFactura" VARCHAR(30) DEFAULT 'NORMAL',  -- NORMAL, ANTICIPO, FINAL, RECTIFICATIVA
    "IdDocumento" INT,                            -- Referencia al documento/encargo
    "IdFacturaAnticipo" INT,                      -- Referencia a factura de anticipo
    "TotalBaseImponible" DECIMAL(12,2) DEFAULT 0,
    "TotalCuotaIva" DECIMAL(12,2) DEFAULT 0,
    "TotalFactura" DECIMAL(12,2) DEFAULT 0,
    "EstadoFiscal" VARCHAR(30) DEFAULT 'BORRADOR', -- BORRADOR, EMITIDA, RECTIFICATIVA
    "EstadoCobro" VARCHAR(30) DEFAULT 'PENDIENTE', -- PENDIENTE, COBRADA, COBRADA_PARCIAL, INCOBRABLE
    "Estado" VARCHAR(30) DEFAULT 'ACTIVA',         -- ACTIVA, ANULADA
    "Observaciones" TEXT,
    "VeriFactuEstado" VARCHAR(30),                 -- PENDIENTE, ENVIADA, ACEPTADA, RECHAZADA
    "VeriFactuCSV" VARCHAR(100),
    "VeriFactuFechaEnvio" TIMESTAMP,
    "FechaCreacion" TIMESTAMP DEFAULT NOW(),
    "FechaModificacion" TIMESTAMP,
    UNIQUE ("Serie", "Numero")
);

-- LÍNEAS DE FACTURA
CREATE TABLE IF NOT EXISTS "FacturasLineas" (
    "IdLineaFactura" SERIAL PRIMARY KEY,
    "IdFactura" INT NOT NULL REFERENCES "Facturas"("IdFactura"),
    "NumeroLinea" INT NOT NULL,
    "CodigoItem" VARCHAR(50),
    "DescripcionItem" VARCHAR(500),
    "Cantidad" DECIMAL(12,4) DEFAULT 1,
    "PrecioUnitario" DECIMAL(12,4) DEFAULT 0,
    "BaseImporte" DECIMAL(12,2) DEFAULT 0,
    "PcIva" DECIMAL(5,2) DEFAULT 21,
    "ImporteIva" DECIMAL(12,2) DEFAULT 0,
    "PcDescuento" DECIMAL(5,2) DEFAULT 0,
    "ImporteDescuento" DECIMAL(12,2) DEFAULT 0,
    "ImporteLinea" DECIMAL(12,2) DEFAULT 0
);

-- MOVIMIENTOS DE CAJA
CREATE TABLE IF NOT EXISTS "CajaMovimientos" (
    "IdMovimiento" SERIAL PRIMARY KEY,
    "Fecha" TIMESTAMP NOT NULL DEFAULT NOW(),
    "Tipo" VARCHAR(20) NOT NULL,  -- COBRO, PAGO, APERTURA, CIERRE, AJUSTE
    "IdModoPago" INT REFERENCES "ModosPago"("IdModoPago"),
    "Concepto" VARCHAR(500) NOT NULL,
    "Importe" DECIMAL(12,2) NOT NULL,
    "IdFactura" INT REFERENCES "Facturas"("IdFactura"),
    "IdDocumento" INT,
    "IdCliente" INT,
    "Referencia" VARCHAR(100),
    "Observaciones" TEXT,
    "FechaCreacion" TIMESTAMP DEFAULT NOW()
);

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_facturas_fecha ON "Facturas"("FechaFactura");
CREATE INDEX IF NOT EXISTS idx_facturas_cliente ON "Facturas"("IdCliente");
CREATE INDEX IF NOT EXISTS idx_facturas_estado ON "Facturas"("Estado");
CREATE INDEX IF NOT EXISTS idx_facturas_serie_numero ON "Facturas"("Serie", "Numero");

CREATE INDEX IF NOT EXISTS idx_caja_fecha ON "CajaMovimientos"("Fecha");
CREATE INDEX IF NOT EXISTS idx_caja_tipo ON "CajaMovimientos"("Tipo");
CREATE INDEX IF NOT EXISTS idx_caja_factura ON "CajaMovimientos"("IdFactura");

-- FACTURAS DE COMPRA
CREATE TABLE IF NOT EXISTS "FacturasCompra" (
    "IdFacturaCompra" SERIAL PRIMARY KEY,
    "SerieFactura" VARCHAR(20),
    "NumeroFactura" VARCHAR(50) NOT NULL,
    "FechaFactura" DATE NOT NULL,
    "IdProveedor" INT,
    "TotalBaseImponible" DECIMAL(12,2) DEFAULT 0,
    "TotalCuotaIva" DECIMAL(12,2) DEFAULT 0,
    "TotalFactura" DECIMAL(12,2) DEFAULT 0,
    "ImportePagado" DECIMAL(12,2) DEFAULT 0,
    "ImportePendiente" DECIMAL(12,2) DEFAULT 0,
    "Estado" VARCHAR(30) DEFAULT 'ACTIVA',
    "VeriFactuEstado" VARCHAR(30),
    "VeriFactuCSV" VARCHAR(100),
    "FechaCreacion" TIMESTAMP DEFAULT NOW()
);

-- Proveedores (si no existe)
CREATE TABLE IF NOT EXISTS "Proveedores" (
    "IdProveedor" SERIAL PRIMARY KEY,
    "Codigo" VARCHAR(20),
    "NombreComercial" VARCHAR(200) NOT NULL,
    "RazonSocial" VARCHAR(200),
    "CIF" VARCHAR(20),
    "Direccion" VARCHAR(300),
    "CodigoPostal" VARCHAR(10),
    "Poblacion" VARCHAR(100),
    "Provincia" VARCHAR(100),
    "Pais" VARCHAR(50) DEFAULT 'España',
    "Telefono" VARCHAR(30),
    "Email" VARCHAR(200),
    "PersonaContacto" VARCHAR(100),
    "Observaciones" TEXT,
    "Activo" SMALLINT DEFAULT 1,
    "FechaCreacion" TIMESTAMP DEFAULT NOW(),
    "FechaModificacion" TIMESTAMP
);

-- PRODUCTOS (si no existe, estructura básica)
CREATE TABLE IF NOT EXISTS "Productos" (
    "IdProducto" SERIAL PRIMARY KEY,
    "Codigo" VARCHAR(50),
    "Nombre" VARCHAR(300) NOT NULL,
    "Descripcion" TEXT,
    "IdFamilia" INT,
    "PVP" DECIMAL(12,2) DEFAULT 0,
    "PrecioCoste" DECIMAL(12,2) DEFAULT 0,
    "Stock" DECIMAL(12,2) DEFAULT 0,
    "StockMinimo" DECIMAL(12,2) DEFAULT 0,
    "Activo" SMALLINT DEFAULT 1,
    "FechaCreacion" TIMESTAMP DEFAULT NOW(),
    "FechaModificacion" TIMESTAMP
);

-- SERVICIOS (si no existe)
CREATE TABLE IF NOT EXISTS "Servicios" (
    "IdServicio" SERIAL PRIMARY KEY,
    "Codigo" VARCHAR(50),
    "Nombre" VARCHAR(300) NOT NULL,
    "Descripcion" TEXT,
    "PVP" DECIMAL(12,2) DEFAULT 0,
    "PorcentajeIva" DECIMAL(5,2) DEFAULT 21,
    "Activo" SMALLINT DEFAULT 1,
    "FechaCreacion" TIMESTAMP DEFAULT NOW()
);

-- MOVIMIENTOS DE STOCK
CREATE TABLE IF NOT EXISTS "MovimientosStock" (
    "IdMovimiento" SERIAL PRIMARY KEY,
    "IdProducto" INT NOT NULL,
    "TipoMovimiento" VARCHAR(30) NOT NULL,  -- ENTRADA_COMPRA, SALIDA_VENTA, AJUSTE, DEVOLUCION
    "Cantidad" DECIMAL(12,2) NOT NULL,
    "StockAnterior" DECIMAL(12,2),
    "StockPosterior" DECIMAL(12,2),
    "IdDocumentoRef" INT,
    "TipoDocumentoRef" VARCHAR(30),
    "Observaciones" TEXT,
    "FechaMovimiento" TIMESTAMP DEFAULT NOW()
);

