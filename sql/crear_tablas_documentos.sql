-- =============================================
-- DOCUMENTOS (PRESUPUESTOS/ENCARGOS) - CREACION DE TABLAS
-- =============================================

-- =============================================
-- TABLA PRINCIPAL DE DOCUMENTOS
-- =============================================

CREATE TABLE IF NOT EXISTS "Documentos" (
    "IdDocumento" SERIAL PRIMARY KEY,
    "IdCliente" INT NOT NULL,
    "Tipo" VARCHAR(50) DEFAULT 'PRESUPUESTO', -- PRESUPUESTO, ENCARGO
    "NumeroDocumento" VARCHAR(50),
    "Fecha" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "FechaEntrega" TIMESTAMP,
    "Estado" VARCHAR(50) DEFAULT 'PENDIENTE', -- PENDIENTE, CONFIRMADO, EN_PROCESO, LISTO, ENTREGADO, ANULADO
    "Observaciones" TEXT,
    "ObservacionesInternas" TEXT,

    -- Totales
    "BaseImponible" DECIMAL(12, 2) DEFAULT 0,
    "TotalIva" DECIMAL(12, 2) DEFAULT 0,
    "TotalDescuento" DECIMAL(12, 2) DEFAULT 0,
    "Total" DECIMAL(12, 2) DEFAULT 0,

    -- Datos de graduacion (si aplica)
    "OD_Esfera" DECIMAL(5, 2),
    "OD_Cilindro" DECIMAL(5, 2),
    "OD_Eje" INT,
    "OD_Adicion" DECIMAL(5, 2),
    "OD_Prisma" DECIMAL(5, 2),
    "OD_BasePrisma" VARCHAR(20),
    "OD_AV" VARCHAR(20),
    "OD_DNP" DECIMAL(5, 2),
    "OD_Altura" DECIMAL(5, 2),

    "OI_Esfera" DECIMAL(5, 2),
    "OI_Cilindro" DECIMAL(5, 2),
    "OI_Eje" INT,
    "OI_Adicion" DECIMAL(5, 2),
    "OI_Prisma" DECIMAL(5, 2),
    "OI_BasePrisma" VARCHAR(20),
    "OI_AV" VARCHAR(20),
    "OI_DNP" DECIMAL(5, 2),
    "OI_Altura" DECIMAL(5, 2),

    "DIP_Lejos" DECIMAL(5, 2),
    "DIP_Cerca" DECIMAL(5, 2),

    -- Montura
    "MonturaModelo" VARCHAR(255),
    "MonturaMarca" VARCHAR(100),
    "MonturaColor" VARCHAR(100),
    "MonturaTalla" VARCHAR(50),
    "MonturaPrecio" DECIMAL(10, 2),

    -- Lentes
    "LenteTipo" VARCHAR(100), -- Monofocal, Progresivo, Bifocal, etc.
    "LenteMaterial" VARCHAR(100),
    "LenteTratamiento" VARCHAR(255),
    "LenteColoracion" VARCHAR(100),

    -- Auditoria
    "CreadoPor" INT,
    "FechaCreacion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "ModificadoPor" INT,
    "FechaModificacion" TIMESTAMP
);

-- =============================================
-- LINEAS DE DOCUMENTO
-- =============================================

CREATE TABLE IF NOT EXISTS "DocumentosLineas" (
    "IdLinea" SERIAL PRIMARY KEY,
    "IdDocumento" INT NOT NULL REFERENCES "Documentos"("IdDocumento") ON DELETE CASCADE,
    "Orden" INT DEFAULT 0,
    "Tipo" VARCHAR(50) DEFAULT 'PRODUCTO', -- PRODUCTO, SERVICIO, LENTE, MONTURA
    "IdProducto" INT,
    "Codigo" VARCHAR(50),
    "Descripcion" VARCHAR(500) NOT NULL,
    "Cantidad" DECIMAL(10, 2) DEFAULT 1,
    "PrecioUnitario" DECIMAL(10, 2) DEFAULT 0,
    "Descuento" DECIMAL(5, 2) DEFAULT 0, -- porcentaje
    "DescuentoImporte" DECIMAL(10, 2) DEFAULT 0, -- importe fijo
    "IdTipoIva" INT DEFAULT 1,
    "PorcentajeIva" DECIMAL(5, 2) DEFAULT 21,
    "Subtotal" DECIMAL(12, 2) DEFAULT 0,
    "Observaciones" TEXT
);

-- =============================================
-- PAGOS DE DOCUMENTO
-- =============================================

CREATE TABLE IF NOT EXISTS "DocumentosPagos" (
    "IdPago" SERIAL PRIMARY KEY,
    "IdDocumento" INT NOT NULL REFERENCES "Documentos"("IdDocumento") ON DELETE CASCADE,
    "Fecha" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "Importe" DECIMAL(12, 2) NOT NULL,
    "FormaPago" VARCHAR(50) DEFAULT 'EFECTIVO', -- EFECTIVO, TARJETA, TRANSFERENCIA, FINANCIADO
    "Referencia" VARCHAR(100),
    "Observaciones" TEXT,
    "Activo" SMALLINT DEFAULT 1
);

-- =============================================
-- RELACION DOCUMENTOS - FACTURAS
-- =============================================

CREATE TABLE IF NOT EXISTS "DocumentosFacturasRel" (
    "IdDocumento" INT NOT NULL REFERENCES "Documentos"("IdDocumento") ON DELETE CASCADE,
    "IdFactura" INT NOT NULL,
    "FechaVinculo" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "Activo" SMALLINT DEFAULT 1,
    PRIMARY KEY ("IdDocumento", "IdFactura")
);

-- =============================================
-- INDICES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_documentos_cliente ON "Documentos"("IdCliente");
CREATE INDEX IF NOT EXISTS idx_documentos_fecha ON "Documentos"("Fecha");
CREATE INDEX IF NOT EXISTS idx_documentos_tipo ON "Documentos"("Tipo");
CREATE INDEX IF NOT EXISTS idx_documentos_estado ON "Documentos"("Estado");
CREATE INDEX IF NOT EXISTS idx_documentos_numero ON "Documentos"("NumeroDocumento");
CREATE INDEX IF NOT EXISTS idx_documentos_lineas_documento ON "DocumentosLineas"("IdDocumento");
CREATE INDEX IF NOT EXISTS idx_documentos_pagos_documento ON "DocumentosPagos"("IdDocumento");
